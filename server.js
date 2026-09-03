require("dotenv").config();

const express = require("express");
const cors = require("cors");

const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (allowed.test(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
}));
app.use(express.json({ limit: '10mb' }));

app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "BizGuard AI Backend is running"
  });
});

app.listen(PORT, () => {
  console.log(`BizGuard AI backend running on http://localhost:${PORT}`);
});