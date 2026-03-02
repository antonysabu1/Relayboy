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
import { KyberKeyGenerator, uint8ArrayToBase64 } from "./kyber/kyber-keygen.js";
import { KyberEncapsulator } from "./kyber/kyber-encapsulate.js";
import { KyberDecapsulator } from "./kyber/kyber-decapsulate.js";
import { base64ToUint8Array } from "./kyber/kyber-keygen.js";

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

app.use(express.static(path.join(__dirname, "dist")));

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

function normalizeUsername(value) {
  return String(value || "").toLowerCase();
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
// Legacy routes served by the SPA now, but we keep the /chat check if needed
// or just let the React app handle everything.
app.get("/login", (_, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "dist/index.html")));
app.get("/verify-otp", (_, res) => res.sendFile(path.join(__dirname, "dist/index.html")));

// ---------------- Catch-all for SPA ----------------
// Use middleware for the catch-all to avoid Express 5 path-to-regexp parsing issues
app.use((req, res, next) => {
  // Only handle GET requests that aren't for API, users, or websocket
  if (req.method === "GET" &&
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/users") &&
    !req.path.startsWith("/ws")) {
    return res.sendFile(path.join(__dirname, "dist/index.html"));
  }
  next();
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

    const { kyber_public_key } = req.body;
    if (!kyber_public_key) {
      return res.status(400).json({ error: "Missing Kyber public key" });
    }

    console.log("[Verify OTP] Inserting user into Supabase (non-custodial)...");
    const { error: insertError } = await withRetry(() =>
      supabase.from("users").insert([{
        email: pending.email,
        username: pending.username,
        password_hash: pending.password_hash,
        is_verified: true,
        kyber_public_key: kyber_public_key,
        // kyber_private_key is NOT stored here anymore (E2EE)
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
    res.json({ ok: true, username: pending.username });
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
      const socketKey = normalizeUsername(username);
      clearPendingOffline(socketKey);
      const userSockets = clients.get(socketKey);
      if (userSockets) {
        userSockets.forEach(ws => ws.close());
        clients.delete(socketKey);
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
const clients = new Map(); // normalized username -> Set(WebSocket)
const pendingOfflineTimers = new Map(); // normalized username -> timeout handle

function clearPendingOffline(socketKey) {
  const timer = pendingOfflineTimers.get(socketKey);
  if (timer) {
    clearTimeout(timer);
    pendingOfflineTimers.delete(socketKey);
  }
}

function scheduleOfflineUpdate(username, socketKey) {
  clearPendingOffline(socketKey);
  const timer = setTimeout(async () => {
    pendingOfflineTimers.delete(socketKey);
    const sockets = clients.get(socketKey);
    if (sockets && sockets.size > 0) {
      return;
    }

    console.log(`[Presence] Marking ${username} as OFFLINE (No active sockets)`);
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
  }, 1500);
  pendingOfflineTimers.set(socketKey, timer);
}

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
  if (!username) {
    ws.close();
    return;
  }
  const socketKey = normalizeUsername(username);
  clearPendingOffline(socketKey);

  ws.on("error", err => console.error(`⚠️ WS Error for ${username}:`, err));

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: "connected",
    username,
    avatar_url: req.session.avatar_url
  }));

  if (!clients.has(socketKey)) {
    clients.set(socketKey, new Set());
  }
  clients.get(socketKey).add(ws);

  // Mark online on every fresh WS connection to recover from stale/offline states.
  console.log(`[Presence] Marking ${username} as ONLINE`);
  await withRetry(() =>
    supabase
      .from("users")
      .update({ is_online: true, last_login: new Date().toISOString() })
      .eq("username", username)
  );
  console.log(`[Presence] Broadcasting online users...`);
  broadcastUsers();

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
        const isEncrypted = typeof data.message === "string" && data.message.startsWith("QE1:");
        if (!isEncrypted) {
          ws.send(JSON.stringify({
            type: "message_rejected",
            error: "Plaintext messages are blocked. Secure session required."
          }));
          return;
        }
        const { data: insertedData, error: insertError } = await withRetry(() =>
          supabase
            .from("messages")
            .insert([{
              from: username,
              to: data.to,
              message: data.message,
              timestamp: new Date().toISOString(),
              is_seen: false,
              encrypted: isEncrypted
            }])
            .select() // Get the inserted row back with its ID
            .single()
        );

        if (insertError) {
          console.error("❌ Supabase INSERT error:", insertError);
          return;
        }

        const msgRow = insertedData;
        console.log(`✅ Message saved (ID: ${msgRow.id}) from ${username} to ${msgRow.to}`);

        const targetSockets = clients.get(normalizeUsername(msgRow.to));
        if (targetSockets) {
          targetSockets.forEach(target => {
            if (target.readyState === 1) {
              target.send(JSON.stringify({
                type: "message",
                id: msgRow.id,
                from: username,
                message: msgRow.message,
                timestamp: msgRow.timestamp,
                encrypted: msgRow.encrypted
              }));
            }
          });
        }
      } else if (data.type === "typing") {
        const targetKey = normalizeUsername(data.to);
        const targetSockets = clients.get(targetKey);
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
        const targetUsername = data.to;
        const targetKey = normalizeUsername(targetUsername);
        // Persist seen status in DB
        const { error: seenError } = await withRetry(() =>
          supabase
            .from("messages")
            .update({ is_seen: true })
            .eq("from", targetUsername)
            .eq("to", username)
            .eq("is_seen", false)
        );

        if (seenError) console.error("❌ Seen update error:", seenError);

        const targetSockets = clients.get(targetKey);
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
        const peerKey = data.to;
        const myKey = username;
        console.log(`📜 Fetching history/handshake for ${myKey} ↔ ${peerKey}`);

        let handshakeData = null;
        try {
          const { data: existingHandshake, error: hsError } = await withRetry(() =>
            supabase
              .from("handshakes")
              .select("sender, receiver, ciphertext")
              .or(`and(sender.eq."${myKey}",receiver.eq."${peerKey}"),and(sender.eq."${peerKey}",receiver.eq."${myKey}")`)
              .limit(1)
          );

          if (hsError) {
            console.error("❌ Handshake lookup error:", hsError);
          } else if (existingHandshake && existingHandshake.length > 0) {
            handshakeData = existingHandshake[0];
            console.log(`🔗 Existing handshake found for ${myKey} ↔ ${peerKey}`);
          } else {
            // No handshake — fetch recipient's public key for the client to encapsulate
            console.log(`🤝 No handshake found. Fetching public key for ${peerKey}`);
            const { data: recipientData } = await withRetry(() =>
              supabase
                .from("users")
                .select("kyber_public_key")
                .eq("username", peerKey)
                .limit(1)
            );

            if (recipientData && recipientData[0]?.kyber_public_key) {
              handshakeData = {
                type: "provide_public_key",
                public_key: recipientData[0].kyber_public_key
              };
            }
          }
        } catch (hsErr) {
          console.error("⚠️ Handshake process error:", hsErr);
        }

        // ---- Fetch chat history ----
        const { data: history, error: historyError } = await withRetry(() =>
          supabase
            .from("messages")
            .select("*")
            .or(`and(from.eq."${myKey}",to.eq."${peerKey}"),and(from.eq."${peerKey}",to.eq."${myKey}")`)
            .order("timestamp", { ascending: true })
        );

        if (historyError) {
          console.error("❌ Supabase SELECT history error:", historyError);
        }

        ws.send(JSON.stringify({
          type: "history",
          with: data.to,
          handshake: handshakeData, // Contains either the ciphertext or the recipient's public key
          messages: (history || []).map(m => ({
            id: m.id,
            from: m.from,
            message: m.message,
            timestamp: m.timestamp,
            is_seen: m.is_seen,
            encrypted: m.encrypted
          }))
        }));
      }
      else if (data.type === "store_handshake") {
        // Client-side encapsulation finished, store the ciphertext
        const { to, ciphertext } = data;
        console.log(`🔐 Storing new handshake from ${username} to ${to}`);
        const { error } = await withRetry(() =>
          supabase.from("handshakes").insert([{
            sender: username,
            receiver: to,
            ciphertext: ciphertext
          }])
        );
        if (error) console.error("❌ Failed to store handshake:", error);
      }
    } catch (err) {
      console.error("⚠️ WS Message Error:", err);
    }
  });

  ws.on("close", async () => {
    const userSockets = clients.get(socketKey);
    if (userSockets) {
      userSockets.delete(ws);
      if (userSockets.size === 0) {
        clients.delete(socketKey);
        // Delay offline transition to avoid refresh races.
        scheduleOfflineUpdate(username, socketKey);
      }
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
