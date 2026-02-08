import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

import { supabase } from "./db.js";
import redis from "./redisClient.js";
import transporter from "./nodemailer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- dirname ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- Middleware ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionParser = session({
  saveUninitialized: false,
  secret: "relayboy_secret_change_me",
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

  if (!email || !username || !password)
    return res.status(400).json({ error: "Missing fields" });

  if (!isPasswordStrong(password))
    return res.status(400).json({ error: "Weak password" });

  const { data } = await supabase
    .from("users")
    .select("email, username")
    .or(`email.eq.${email},username.eq.${username}`);

  if (data?.length)
    return res.status(400).json({ error: "User already exists" });

  const otp = generateOTP();
  const password_hash = bcrypt.hashSync(password, 10);

  await redis.setEx(
    `register:${email}`,
    300,
    JSON.stringify({ email, username, password_hash, otp })
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "RelayBoy Email Verification",
    text: `Your OTP is ${otp}. Valid for 5 minutes.`
  });

  res.json({ ok: true });
});

// ---------------- VERIFY OTP ----------------
app.post("/verify-register-otp", async (req, res) => {
  const { email, otp } = req.body;

  const cached = await redis.get(`register:${email}`);
  if (!cached) return res.status(400).json({ error: "OTP expired" });

  const pending = JSON.parse(cached);
  if (pending.otp !== otp)
    return res.status(400).json({ error: "Invalid OTP" });

  await supabase.from("users").insert([{
    email: pending.email,
    username: pending.username,
    password_hash: pending.password_hash,
    is_verified: true
  }]);

  await redis.del(`register:${email}`);

  req.session.authenticated = true;
  req.session.username = pending.username;

  res.json({ ok: true });
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