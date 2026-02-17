import dns from "dns";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import { fileURLToPath } from "url";

import { supabase } from "./db.js";
import redis from "./redisClient.js";
// Mailgun API sending (replaces SMTP)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Startup Checks ----------------
const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL", "REDIS_URL"];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnv.join(", "));
  if (process.env.NODE_ENV === "production") process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ---------------- dirname ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- Middleware ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionParser = session({
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || "relayboy_secret_fallback",
  resave: false
});
app.use(sessionParser);

app.use("/static", express.static(path.join(__dirname, "public")));

// ---------------- Utils ----------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isPasswordStrong(password) {
  return (
    password &&
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

// ---------------- Pages ----------------
app.get("/", (_, res) => res.redirect("/login"));

app.get("/login", (_, res) =>
  res.sendFile(path.join(__dirname, "public/login.html"))
);

app.get("/verify-otp.html", (_, res) =>
  res.sendFile(path.join(__dirname, "public/verify-otp.html"))
);

app.get("/chat", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---------------- REGISTER (SEND OTP) ----------------
app.post("/register", async (req, res) => {
  const { email, username, password } = req.body;
  console.log(`[Registration] Attempt for user: ${username}, email: ${email}`);

  try {
    if (!email || !username || !password) {
      console.warn("[Registration] Missing fields");
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!isPasswordStrong(password)) {
      console.warn("[Registration] Weak password");
      return res.status(400).json({ error: "Weak password" });
    }

    console.log("[Registration] Checking for existing user...");
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("email, username")
      .or(`email.eq.${email},username.eq.${username}`);

    if (fetchError) {
      console.error("[Registration] Supabase fetch error:", fetchError);
      throw fetchError;
    }

    if (data?.length) {
      console.warn("[Registration] User already exists");
      return res.status(400).json({ error: "User already exists" });
    }

    const otp = generateOTP();
    const password_hash = bcrypt.hashSync(password, 10);

    console.log("[Registration] Saving OTP to Redis...");
    await redis.setEx(
      `register:${email}`,
      300,
      JSON.stringify({ email, username, password_hash, otp })
    );

    console.log(`[Registration] Sending OTP email to ${email} via SendGrid...`);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "RelayBoy Email Verification",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>. Valid for 5 minutes.</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log("[Registration] OTP sent successfully via SendGrid");
    } catch (sendgridError) {
      console.error("[Registration] SendGrid error:", sendgridError.response ? sendgridError.response.body : sendgridError.message);
      console.log("------------------------------------------");
      console.log(`[DEV FALLBACK] OTP for ${email} is: ${otp}`);
      console.log("------------------------------------------");

      // We continue with success status so the user can use the terminal fallback OTP
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ error: "Email send failed" });
      }
    }

    console.log("[Registration] OTP sent successfully");
    res.json({ ok: true });
  } catch (err) {
    console.error("[Registration] Critical Error:", err);
    res.status(500).json({ error: "Registration failed. Please try again later.", details: err.message });
  }
});

// ---------------- VERIFY OTP ----------------
app.post("/verify-register-otp", async (req, res) => {
  const { email, otp } = req.body;
  console.log(`[Verify OTP] Attempt for email: ${email}`);

  try {
    const cached = await redis.get(`register:${email}`);
    if (!cached) {
      console.warn("[Verify OTP] OTP expired or not found");
      return res.status(400).json({ error: "OTP expired" });
    }

    const pending = JSON.parse(cached);
    if (pending.otp !== otp) {
      console.warn("[Verify OTP] Invalid OTP entered");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    console.log("[Verify OTP] Inserting user into Supabase...");
    const { error: insertError } = await supabase.from("users").insert([{
      email: pending.email,
      username: pending.username,
      password_hash: pending.password_hash,
      is_verified: true
    }]);

    if (insertError) {
      console.error("[Verify OTP] Supabase insert error:", insertError);
      throw insertError;
    }

    await redis.del(`register:${email}`);

    req.session.authenticated = true;
    req.session.username = pending.username;

    console.log("[Verify OTP] Success");
    res.json({ ok: true });
  } catch (err) {
    console.error("[Verify OTP] Critical Error:", err);
    res.status(500).json({ error: "Verification failed. Please try again later.", details: err.message });
  }
});

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body;

  const { data } = await supabase
    .from("users")
    .select("*")
    .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
    .limit(1);

  const user = data?.[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(400).json({ error: "Invalid credentials" });

  req.session.authenticated = true;
  req.session.username = user.username;

  res.json({ ok: true });
});

// ---------------- LOGOUT ----------------
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------------- USER SEARCH ----------------
app.get("/users/search", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });
  const { q } = req.query;
  const username = req.session.username;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("username")
      .neq("username", username)
      .ilike("username", `%${q}%`)
      .limit(10);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("[Search] Error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

// ---------------- RECENT CHATS ----------------
app.get("/users/recent-chats", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });
  const username = req.session.username;

  try {
    // Fetch all messages involving the user
    const { data, error } = await supabase
      .from("messages")
      .select("from, to, timestamp")
      .or(`from.eq."${username}",to.eq."${username}"`)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Extract unique chat partners and their latest message timestamp
    const partnersMap = new Map();
    data.forEach(m => {
      const partner = m.from === username ? m.to : m.from;
      if (!partnersMap.has(partner)) {
        partnersMap.set(partner, m.timestamp);
      }
    });

    const recentChats = Array.from(partnersMap.entries()).map(([username, last_message]) => ({
      username,
      last_message
    }));

    res.json(recentChats);
  } catch (err) {
    console.error("[Recent Chats] Error:", err);
    res.status(500).json({ error: "Failed to fetch recent chats" });
  }
});

// ---------------- WEBSOCKET ----------------
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const clients = new Map();

function broadcastUsers() {
  const users = Array.from(clients.keys());
  const msg = JSON.stringify({ type: "users", users });
  clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

server.on("upgrade", (req, socket, head) => {
  sessionParser(req, {}, () => {
    if (!req.session.authenticated) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws =>
      wss.emit("connection", ws, req)
    );
  });
});

wss.on("connection", async (ws, req) => {
  const username = req.session.username;
  clients.set(username, ws);

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: "connected", username }));

  // Broadcast updated user list
  broadcastUsers();

  // Notify about unread messages (since last_login)
  try {
    const { data: user } = await supabase
      .from("users")
      .select("last_login")
      .eq("username", username)
      .single();

    if (user) {
      const lastLogin = user.last_login;
      if (lastLogin) {
        console.log(`🔍 Checking missed messages for ${username} since ${lastLogin}`);
        const { data: missed, error: missedError } = await supabase
          .from("messages")
          .select("from, timestamp")
          .eq("to", username)
          .gt("timestamp", lastLogin);

        if (missedError) console.error("❌ Missed messages fetch error:", missedError);

        if (missed && missed.length > 0) {
          console.log(`🔔 Found ${missed.length} missed messages for ${username}`);
          // Count messages per sender
          const counts = missed.reduce((acc, m) => {
            acc[m.from] = (acc[m.from] || 0) + 1;
            return acc;
          }, {});

          ws.send(JSON.stringify({
            type: "missed_messages",
            counts
          }));
        }
      } else {
        console.log(`🆕 First login for ${username}, initializing last_login.`);
      }
    }

    // Update last_login to now so they don't get the same notifications again
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("username", username);

  } catch (e) {
    console.error("Error checking unread:", e);
  }

  ws.on("message", async msg => {
    try {
      const data = JSON.parse(msg);
      console.log(`📩 Received WS message: ${data.type} from ${username}`);

      if (data.type === "message") {
        // Save to Supabase
        const { error: insertError } = await supabase.from("messages").insert([{
          from: username,
          to: data.to,
          message: data.message
        }]);

        if (insertError) {
          console.error("❌ Supabase INSERT error:", insertError);
        } else {
          console.log(`✅ Message saved from ${username} to ${data.to}`);
        }

        // Send to target
        const target = clients.get(data.to);
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({
            type: "message",
            from: username,
            message: data.message,
            timestamp: new Date().toLocaleTimeString()
          }));
        }
      } else if (data.type === "typing") {
        const target = clients.get(data.to);
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({
            type: "typing",
            from: username
          }));
        }
      } else if (data.type === "seen") {
        const target = clients.get(data.to);
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({
            type: "seen",
            from: username
          }));
        }
      } else if (data.type === "get_history") {
        console.log(`📜 Fetching history between ${username} and ${data.to}`);
        // Fetch history between username and data.to
        const { data: history, error: historyError } = await supabase
          .from("messages")
          .select("*")
          .or(`and(from.eq."${username}",to.eq."${data.to}"),and(from.eq."${data.to}",to.eq."${username}")`)
          .order("timestamp", { ascending: true });

        if (historyError) {
          console.error("❌ Supabase SELECT history error:", historyError);
        }

        ws.send(JSON.stringify({
          type: "history",
          with: data.to,
          messages: (history || []).map(m => ({
            from: m.from,
            message: m.message,
            timestamp: m.timestamp
          }))
        }));
      }
    } catch (err) {
      console.error("⚠️ WS Message Error:", err);
    }
  });

  ws.on("close", () => {
    clients.delete(username);
    broadcastUsers();
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
