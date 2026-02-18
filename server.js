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
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`⚠️ Supabase operation failed, retrying (${i + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
app.get("/api/config", (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  });
});

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
    const { data, error: fetchError } = await withRetry(() =>
      supabase
        .from("users")
        .select("email, username")
        .or(`email.eq.${email},username.eq.${username}`)
    );

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
    const { error: insertError } = await withRetry(() =>
      supabase.from("users").insert([{
        email: pending.email,
        username: pending.username,
        password_hash: pending.password_hash,
        is_verified: true
      }])
    );

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

  const { data } = await withRetry(() =>
    supabase
      .from("users")
      .select("*")
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .limit(1)
  );

  const user = data?.[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(400).json({ error: "Invalid credentials" });

  req.session.authenticated = true;
  req.session.username = user.username;
  req.session.avatar_url = user.avatar_url;

  res.json({ ok: true, avatar_url: user.avatar_url });
});

// ---------------- PROFILE UPDATE ----------------
app.post("/api/user/profile", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });
  const { avatar_url } = req.body;
  const username = req.session.username;

  try {
    const { error } = await withRetry(() =>
      supabase
        .from("users")
        .update({ avatar_url })
        .eq("username", username)
    );

    if (error) throw error;

    req.session.avatar_url = avatar_url;
    res.json({ ok: true });

    // Re-broadcast users to update everyone's view
    broadcastUsers();
  } catch (err) {
    console.error("[Profile Update] Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ---------------- LOGOUT ----------------
app.post("/logout", async (req, res) => {
  const username = req.session.username;
  try {
    if (username) {
      console.log(`[Logout] Marking ${username} as OFFLINE`);
      await withRetry(() =>
        supabase
          .from("users")
          .update({ is_online: false })
          .eq("username", username)
      );

      // Force close all WS connections for this user if they exist
      const userSockets = clients.get(username);
      if (userSockets) {
        userSockets.forEach(ws => ws.close());
        clients.delete(username);
      }

      broadcastUsers();
    }
  } catch (err) {
    console.error("[Logout] Presence update error:", err);
  }

  req.session.destroy(() => {
    res.clearCookie('connect.sid'); // Ensure cookie is cleared
    res.json({ ok: true });
  });
});

// ---------------- USER SEARCH ----------------
app.get("/users/search", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });
  const { q } = req.query;
  const username = req.session.username;

  try {
    const { data, error } = await withRetry(() =>
      supabase
        .from("users")
        .select("username")
        .neq("username", username)
        .ilike("username", `%${q}%`)
        .limit(10)
    );

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
    const { data, error } = await withRetry(() =>
      supabase
        .from("messages")
        .select("from, to, timestamp")
        .or(`from.eq."${username}",to.eq."${username}"`)
        .order("timestamp", { ascending: false })
    );

    if (error) throw error;

    // Extract unique chat partners and their latest message timestamp
    const partnersMap = new Map();
    data.forEach(m => {
      const partner = m.from === username ? m.to : m.from;
      if (!partnersMap.has(partner)) {
        partnersMap.set(partner, m.timestamp);
      }
    });

    // Fetch avatars for these partners
    const partners = Array.from(partnersMap.keys());
    const { data: userData } = await withRetry(() =>
      supabase
        .from("users")
        .select("username, avatar_url, is_online")
        .in("username", partners)
    );

    const partnersDataMap = new Map(userData?.map(u => [u.username, { avatar_url: u.avatar_url, is_online: u.is_online }]));

    const recentChats = Array.from(partnersMap.entries()).map(([username, last_message]) => ({
      username,
      last_message,
      avatar_url: partnersDataMap.get(username)?.avatar_url,
      is_online: partnersDataMap.get(username)?.is_online
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
const clients = new Map(); // username -> Set(WebSocket)

async function broadcastUsers() {
  try {
    // Only fetch users who are actually marked as online in the DB
    const { data: usersData, error } = await withRetry(() =>
      supabase
        .from("users")
        .select("username, avatar_url, is_online")
        .eq("is_online", true)
    );

    if (error) throw error;

    const users = usersData || [];
    const msg = JSON.stringify({ type: "users", users });
    clients.forEach(userSockets => {
      userSockets.forEach(client => {
        if (client.readyState === 1) client.send(msg);
      });
    });
  } catch (err) {
    console.error("Broadcast error:", err);
  }
}

server.on("upgrade", (req, socket, head) => {
  sessionParser(req, {}, () => {
    if (!req.session.authenticated) return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws =>
      wss.emit("connection", ws, req)
    );
  });
});

wss.on("error", err => console.error("⚠️ WSS Error:", err));

wss.on("connection", async (ws, req) => {
  const username = req.session.username;

  ws.on("error", err => console.error(`⚠️ WS Error for ${username}:`, err));

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: "connected",
    username,
    avatar_url: req.session.avatar_url
  }));

  // 1. Mark user as online in DB (only if first tab)
  const isFirstTab = !clients.has(username) || clients.get(username).size === 0;

  if (!clients.has(username)) {
    clients.set(username, new Set());
  }
  clients.get(username).add(ws);

  if (isFirstTab) {
    console.log(`[Presence] Marking ${username} as ONLINE (First connection)`);
    await withRetry(() =>
      supabase
        .from("users")
        .update({ is_online: true, last_login: new Date().toISOString() })
        .eq("username", username)
    );
    console.log(`[Presence] Broadcasting online users...`);
    broadcastUsers();
  }

  // 3. Fetch accurate unread counts from DB
  try {
    const { data: unreadData, error: unreadError } = await withRetry(() =>
      supabase
        .from("messages")
        .select("from, is_seen")
        .eq("to", username)
        .eq("is_seen", false)
    );

    if (unreadError) throw unreadError;

    if (unreadData && unreadData.length > 0) {
      const counts = unreadData.reduce((acc, m) => {
        acc[m.from] = (acc[m.from] || 0) + 1;
        return acc;
      }, {});

      ws.send(JSON.stringify({
        type: "unread_counts",
        counts
      }));
    }
  } catch (e) {
    console.error("Error fetching unread counts:", e);
  }

  ws.on("message", async msg => {
    try {
      const data = JSON.parse(msg);
      console.log(`📩 Received WS message: ${data.type} from ${username}`);

      if (data.type === "message") {
        const { error: insertError } = await withRetry(() =>
          supabase
            .from("messages")
            .insert([{
              from: username,
              to: data.to,
              message: data.message,
              timestamp: new Date().toISOString(),
              is_seen: false
            }])
        );

        if (insertError) {
          console.error("❌ Supabase INSERT error:", insertError);
          return;
        }

        console.log(`✅ Message saved from ${username} to ${data.to}`);

        const targetSockets = clients.get(data.to);
        if (targetSockets) {
          targetSockets.forEach(target => {
            if (target.readyState === 1) {
              target.send(JSON.stringify({
                type: "message",
                from: username,
                message: data.message,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
      } else if (data.type === "typing") {
        const targetSockets = clients.get(data.to);
        if (targetSockets) {
          targetSockets.forEach(target => {
            if (target.readyState === 1) {
              target.send(JSON.stringify({
                type: "typing",
                from: username
              }));
            }
          });
        }
      } else if (data.type === "seen") {
        // Persist seen status in DB
        const { error: seenError } = await withRetry(() =>
          supabase
            .from("messages")
            .update({ is_seen: true })
            .eq("from", data.to)
            .eq("to", username)
            .eq("is_seen", false)
        );

        if (seenError) console.error("❌ Seen update error:", seenError);

        const targetSockets = clients.get(data.to);
        if (targetSockets) {
          targetSockets.forEach(target => {
            if (target.readyState === 1) {
              target.send(JSON.stringify({
                type: "seen",
                from: username
              }));
            }
          });
        }
      }
      else if (data.type === "get_history") {
        console.log(`📜 Fetching history between ${username} and ${data.to}`);
        // Fetch history with retry
        const { data: history, error: historyError } = await withRetry(() =>
          supabase
            .from("messages")
            .select("*")
            .or(`and(from.eq."${username}",to.eq."${data.to}"),and(from.eq."${data.to}",to.eq."${username}")`)
            .order("timestamp", { ascending: true })
        );

        if (historyError) {
          console.error("❌ Supabase SELECT history error:", historyError);
        }

        ws.send(JSON.stringify({
          type: "history",
          with: data.to,
          messages: (history || []).map(m => ({
            from: m.from,
            message: m.message,
            timestamp: m.timestamp,
            is_seen: m.is_seen
          }))
        }));
      }
    } catch (err) {
      console.error("⚠️ WS Message Error:", err);
    }
  });

  ws.on("close", async () => {
    const userSockets = clients.get(username);
    if (userSockets) {
      userSockets.delete(ws);
      if (userSockets.size === 0) {
        clients.delete(username);
        // Mark user as offline in DB ONLY if all tabs closed
        console.log(`[Presence] Marking ${username} as OFFLINE (Last tab closed)`);
        try {
          await withRetry(() =>
            supabase
              .from("users")
              .update({ is_online: false })
              .eq("username", username)
          );
          console.log(`[Presence] ${username} is now offline in DB`);
          broadcastUsers();
        } catch (err) {
          console.error(`[Presence] Failed to mark ${username} as offline:`, err);
        }
      }
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
