import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

import collectionRoutes from "./routes/collections.js";
import environmentRoutes from "./routes/environments.js";
import historyRoutes from "./routes/history.js";

dotenv.config();

const app = express();
const server = createServer(app);

// WebSocket server for proxying WS connections
const wss = new WebSocketServer({ noServer: true });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/open-restman";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// Routes
app.use("/api/collections", collectionRoutes);
app.use("/api/environments", environmentRoutes);
app.use("/api/history", historyRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── HTTP Proxy ───────────────────────────────────────────────────────────────
app.post("/api/proxy", upload.any(), async (req, res) => {
  const start = Date.now();

  try {
    const { url, method, headers: reqHeaders, body, bodyType } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    const fetchOptions = {
      method: method || "GET",
      headers: {},
      redirect: "follow",
    };

    // Parse and apply headers
    if (reqHeaders) {
      const parsedHeaders =
        typeof reqHeaders === "string" ? JSON.parse(reqHeaders) : reqHeaders;
      Object.entries(parsedHeaders).forEach(([k, v]) => {
        if (k && v !== undefined && v !== "") fetchOptions.headers[k] = v;
      });
    }

    // Handle body types
    if (method !== "GET" && method !== "HEAD") {
      if (bodyType === "formdata" && req.files && req.files.length > 0) {
        const fd = new FormData();
        // Add text fields
        if (req.body.formFields) {
          const fields = JSON.parse(req.body.formFields);
          fields.forEach(({ key, value }) => {
            if (key) fd.append(key, value || "");
          });
        }
        // Add files
        req.files.forEach((file) => {
          fd.append(file.fieldname, file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
        });
        fetchOptions.body = fd;
        Object.assign(fetchOptions.headers, fd.getHeaders());
      } else if (bodyType === "urlencoded") {
        const fields = body ? JSON.parse(body) : [];
        const params = new URLSearchParams();
        fields.forEach(({ key, value }) => {
          if (key) params.append(key, value || "");
        });
        fetchOptions.body = params.toString();
        fetchOptions.headers["Content-Type"] =
          "application/x-www-form-urlencoded";
      } else if (bodyType === "json" && body) {
        fetchOptions.body =
          typeof body === "string" ? body : JSON.stringify(body);
        if (!fetchOptions.headers["Content-Type"]) {
          fetchOptions.headers["Content-Type"] = "application/json";
        }
      } else if (bodyType === "xml" && body) {
        fetchOptions.body = body;
        if (!fetchOptions.headers["Content-Type"]) {
          fetchOptions.headers["Content-Type"] = "application/xml";
        }
      } else if (bodyType === "text" && body) {
        fetchOptions.body = body;
        if (!fetchOptions.headers["Content-Type"]) {
          fetchOptions.headers["Content-Type"] = "text/plain";
        }
      } else if (bodyType === "binary" && req.files && req.files[0]) {
        fetchOptions.body = req.files[0].buffer;
      }
    }

    const response = await fetch(url, fetchOptions);
    const elapsed = Date.now() - start;

    // Collect response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get response body
    const contentType = response.headers.get("content-type") || "";
    let responseBody;
    let responseSize = 0;

    const buffer = await response.buffer();
    responseSize = buffer.length;

    // if (contentType.includes("application/json")) {
    //   try {
    //     responseBody = JSON.parse(buffer.toString("utf-8"));
    //   } catch {
    //     responseBody = buffer.toString("utf-8");
    //   }
    // } else if (
    //   contentType.includes("text/") ||
    //   contentType.includes("application/xml") ||
    //   contentType.includes("application/javascript")
    // ) {
    //   responseBody = buffer.toString("utf-8");
    // } else {
    //   responseBody = buffer.toString("base64");
    // }

    const isText =
      contentType.includes("application/json") ||
      contentType.includes("text/") ||
      contentType.includes("application/xml") ||
      contentType.includes("application/javascript") ||
      contentType.includes("application/x-ndjson") ||
      contentType.includes("application/ld+json") ||
      contentType.includes("charset") || // anything with charset is text
      contentType === ""; // unknown = try as text

    if (isText) {
      const text = buffer.toString("utf-8");
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    } else {
      responseBody = buffer.toString("base64");
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time: elapsed,
      size: responseSize,
      contentType,
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    res.status(500).json({
      error: err.message,
      time: elapsed,
      status: 0,
      statusText: "Network Error",
    });
  }
});

// ─── WebSocket Proxy ──────────────────────────────────────────────────────────
// Clients connect here, we forward to target WS
const wsConnections = new Map();

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/ws-proxy") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", async (clientWs, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = url.searchParams.get("target");
  const connectionId = url.searchParams.get("id") || Date.now().toString();

  if (!targetUrl) {
    clientWs.send(
      JSON.stringify({ type: "error", message: "No target URL provided" }),
    );
    clientWs.close();
    return;
  }

  clientWs.send(JSON.stringify({ type: "connecting", target: targetUrl }));

  let targetWs;
  try {
    const { WebSocket } = await import("ws").catch(() => ({ WebSocket: null }));
    // Use dynamic import for ws
    import("ws").then(({ default: WS }) => {
      targetWs = new WS.WebSocket(targetUrl);

      targetWs.on("open", () => {
        wsConnections.set(connectionId, { client: clientWs, target: targetWs });
        clientWs.send(JSON.stringify({ type: "connected", target: targetUrl }));
      });

      targetWs.on("message", (data) => {
        let message;
        try {
          message = data.toString();
        } catch {
          message = "[binary data]";
        }
        clientWs.send(
          JSON.stringify({
            type: "message",
            direction: "incoming",
            data: message,
            timestamp: Date.now(),
          }),
        );
      });

      targetWs.on("close", (code, reason) => {
        clientWs.send(
          JSON.stringify({
            type: "disconnected",
            code,
            reason: reason.toString(),
          }),
        );
        wsConnections.delete(connectionId);
      });

      targetWs.on("error", (err) => {
        clientWs.send(JSON.stringify({ type: "error", message: err.message }));
      });
    });
  } catch (err) {
    clientWs.send(JSON.stringify({ type: "error", message: err.message }));
  }

  clientWs.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "send" && targetWs && targetWs.readyState === 1) {
        targetWs.send(msg.data);
        clientWs.send(
          JSON.stringify({
            type: "message",
            direction: "outgoing",
            data: msg.data,
            timestamp: Date.now(),
          }),
        );
      }
    } catch {
      if (targetWs && targetWs.readyState === 1) {
        targetWs.send(data.toString());
      }
    }
  });

  clientWs.on("close", () => {
    if (targetWs) targetWs.close();
    wsConnections.delete(connectionId);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Open-RestMan backend running on http://localhost:${PORT}`);
});
