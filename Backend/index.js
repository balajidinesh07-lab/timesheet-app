// Backend/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const timesheetRoutes = require("./routes/timesheetRoutes");
const managerRoutes = require("./routes/managerRoutes"); // ✅ Added

const app = express();

// Middleware (explicit CORS so Authorization + preflight work reliably)
app.use(
  cors({
    origin: true, // allow all origins during dev; set to your FE origin in prod
    credentials: true,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.options("*", cors()); // handle preflight quickly
app.use(express.json());

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/manager", managerRoutes); // ✅ /api/manager/*

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Root route
app.get("/", (req, res) => res.json({ ok: true, message: "Timesheet API root" }));

// Start server only if DB connection succeeds
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Mongo connection error:", err);
    process.exit(1); // Exit app if DB connection fails
  });
