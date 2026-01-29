import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import path from "path";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import session from "express-session";
import { supabase } from "./db.js";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------- Supabase Setup --------------------
// (Supabase is initialized in db.js)

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionParser = session({
  saveUninitialized: false,
  secret: "relayboy_secret_change_me",
  resave: false
});
app.use(sessionParser);

// Serve public assets
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/chat', (req, res) => {
  if (!req.session || !req.session.authenticated) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------- REGISTER --------------------
app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    // Check if user exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`);

    if (checkError) throw checkError;

    if (existingUsers && existingUsers.length > 0) {
      if (existingUsers.some(u => u.email === email)) return res.status(400).json({ error: 'Email taken' });
      if (existingUsers.some(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });
    }

    const hashed = bcrypt.hashSync(password, 10);

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          username,
          email,
          password_hash: hashed,
          // created_at defaults to now() in SQL
          last_login: null,
          is_verified: false
        }
      ]);

    if (insertError) throw insertError;

    console.log("✅ User saved:", username);

    req.session.authenticated = true;
    req.session.username = username;
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// -------------------- LOGIN --------------------
app.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${emailOrUsername},email.eq.${emailOrUsername}`)
      .limit(1);

    if (fetchError) throw fetchError;
    const user = users && users.length > 0 ? users[0] : null;

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last_login
    await supabase.from('users').update({ last_login: new Date() }).eq('id', user.id);
    console.log("✅ User logged in:", user.username);

    req.session.authenticated = true;
    req.session.username = user.username;
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// -------------------- WebSocket --------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Map username -> ws
const clients = new Map();

function broadcastUsers() {
  const users = Array.from(clients.keys());
  const data = JSON.stringify({ type: "users", users });
  for (const ws of clients.values()) {
    if (ws.readyState === 1) ws.send(data);
  }
}

server.on('upgrade', (req, socket, head) => {
  sessionParser(req, {}, () => {
    if (!req.session || !req.session.authenticated) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

wss.on('connection', async (ws, req) => {
  const username = req.session.username;
  if (!username) {
    ws.close();
    return;
  }

  console.log(`${username} connected via websocket`);
  clients.set(username, ws);

  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'connected', username }));
  }

  broadcastUsers();

  // Load last 50 messages for this user
  // Load last 50 messages for this user
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('from, to, message, timestamp')
    .or(`from.eq.${username},to.eq.${username}`)
    .order('timestamp', { ascending: true }) // Get oldest first, but limit usually applies to top... wait, we want last 50.
    // Actually, SQL standard is usually Sort desc limit 50 then reverse? Or just sort asc and take all?
    // Let's assume we want the MOST RECENT 50 messages.
    // So order by timestamp DESC, limit 50, then reverse.
    // But the client expects them in chronological order.
    // So:
    .order('timestamp', { ascending: false })
    .limit(50);

  if (msgError) console.error("Error fetching history:", msgError);

  // They effectively come out reversed (newest first), so we need to reverse them back for the client
  const sortedMessages = messages ? messages.reverse() : [];



  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'get_history') {
        const targetUser = msg.to;
        const { data: history, error: historyError } = await supabase
          .from('messages')
          .select('from, to, message, timestamp')
          .or(`and(from.eq.${username},to.eq.${targetUser}),and(from.eq.${targetUser},to.eq.${username})`)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (historyError) {
          console.error("Error fetching history:", historyError);
        } else {
          const sortedHistory = history.reverse();
          ws.send(JSON.stringify({ type: 'history', with: targetUser, messages: sortedHistory }));
        }
      } else if (msg.type === 'message') {
        const target = clients.get(msg.to);
        const timestamp = new Date();

        // Save message to Supabase
        await supabase.from('messages').insert([
          { from: username, to: msg.to, message: msg.message, timestamp }
        ]);
        console.log(`✅ Message saved from ${username} to ${msg.to}:`, msg.message);

        // Send message to target if online
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({ type: 'message', from: username, message: msg.message, timestamp: timestamp.toLocaleTimeString() }));
        }
      }
    } catch (err) {
      console.error('❌ Invalid message', err);
    }
  });

  ws.on('close', () => {
    clients.delete(username);
    console.log(`${username} disconnected`);
    broadcastUsers();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
