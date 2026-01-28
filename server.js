const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// Simple user store (JSON file)
const USERS_FILE = path.join(__dirname, "users.json");
function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    return {};
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

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

// Serve public assets (login is public; chat will be protected by routes)
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

app.post('/register', (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });
  const users = loadUsers();
  // ensure unique email and username
  for (const u in users) {
    if (users[u].email === email) return res.status(400).json({ error: 'Email taken' });
    if (u === username) return res.status(400).json({ error: 'Username taken' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  users[username] = { email, password: hashed };
  saveUsers(users);
  req.session.authenticated = true;
  req.session.username = username;
  res.json({ ok: true });
});

app.post('/login', (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).json({ error: 'Missing fields' });
  const users = loadUsers();
  // Find by username or email
  let found = null;
  for (const u in users) {
    if (u === emailOrUsername || users[u].email === emailOrUsername) { found = { username: u, ...users[u] }; break; }
  }
  if (!found) return res.status(400).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, found.password)) return res.status(400).json({ error: 'Invalid credentials' });
  req.session.authenticated = true;
  req.session.username = found.username;
  res.json({ ok: true });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Map username -> ws
const clients = new Map();

function broadcastUsers() {
  const users = Array.from(clients.keys());
  const data = JSON.stringify({ type: "users", users });
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

server.on('upgrade', (req, socket, head) => {
  // parse session
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

wss.on('connection', (ws, req) => {
  const username = req.session.username;
  if (!username) {
    ws.close();
    return;
  }
  console.log(`${username} connected via websocket`);
  clients.set(username, ws);
  // send initial info
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'connected', username }));
  }
  broadcastUsers();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'message') {
        const target = clients.get(msg.to);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({ type: 'message', from: username, message: msg.message, timestamp: new Date().toLocaleTimeString() }));
        }
      }
    } catch (err) {
      console.error('Invalid message', err);
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
