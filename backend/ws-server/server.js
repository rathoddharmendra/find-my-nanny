import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.WS_PORT || 5050;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/publish") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { contact_request_id, message } = payload;
        if (!contact_request_id || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "contact_request_id and message required" }));
          return;
        }
        broadcastToThread(String(contact_request_id), message);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

const wss = new WebSocketServer({ server });
const subscriptions = new Map(); // ws -> Set(threadId)

wss.on("connection", (ws) => {
  subscriptions.set(ws, new Set());

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "subscribe" && msg.contact_request_id) {
        const set = subscriptions.get(ws);
        set.add(String(msg.contact_request_id));
      }
      if (msg.type === "unsubscribe" && msg.contact_request_id) {
        const set = subscriptions.get(ws);
        set.delete(String(msg.contact_request_id));
      }
    } catch (err) {
      // ignore invalid messages
    }
  });

  ws.on("close", () => {
    subscriptions.delete(ws);
  });
});

function broadcastToThread(threadId, message) {
  for (const [ws, set] of subscriptions.entries()) {
    if (ws.readyState === ws.OPEN && set.has(String(threadId))) {
      ws.send(
        JSON.stringify({
          type: "message",
          contact_request_id: String(threadId),
          message,
        })
      );
    }
  }
}

server.listen(PORT, () => {
  console.log(`WS server listening on ${PORT}`);
});
