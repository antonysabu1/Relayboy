// server.js
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

const clients = new Map(); // username -> socket

wss.on("connection", (ws) => {
  let username = null;

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    // Register user
    if (msg.type === "register") {
      username = msg.username;
      clients.set(username, ws);
      return;
    }

    // Relay message
    if (msg.type === "message") {
      const target = clients.get(msg.to);
      if (target) {
        target.send(JSON.stringify({
          from: username,
          message: msg.message
        }));
      }
    }
  });

  ws.on("close", () => {
    if (username) clients.delete(username);
  });
});

console.log(`Relay server running on port ${PORT}`);
