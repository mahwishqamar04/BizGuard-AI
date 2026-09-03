const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow localhost for development plus any production origins from CORS_ORIGINS env var.
// Example: CORS_ORIGINS=https://bizguard.example.com,https://www.bizguard.example.com
const allowedExtraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow all localhost ports
    const localhostRe = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostRe.test(origin)) return callback(null, true);
    // Allow explicitly configured production origins
    if (allowedExtraOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "BizGuard AI Backend is running"
  });
});

// Health-check endpoint for production monitoring / load balancers
app.get("/health", (req, res) => {
  const { isDBAvailable } = require("./config/database");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: isDBAvailable() ? "connected" : "in-memory fallback",
  });
});

// Global error handler — never expose stack traces or internals
app.use((err, req, res, _next) => {
  // Log full details for developers (server-side only)
  console.error('Unhandled error:', err.message);
  // Never leak internal error details to the client
  const statusCode = err.status || 500;
  const safeMessage = statusCode === 403 ? 'Access denied' : 'Internal server error';
  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
});

// Start server immediately — works both standalone and when require()'d by tests
const server = app.listen(PORT, () => {
  console.log(`BizGuard AI backend running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Kill the other process or set PORT env var.`);
  } else {
    console.error("Server error:", err);
  }
});

// Helper: returns a promise that resolves when the server is listening
function waitForServer() {
  return new Promise((resolve) => {
    if (server.listening) {
      resolve(server);
    } else {
      server.once("listening", () => resolve(server));
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

module.exports = { app, server, waitForServer, stopServer };
