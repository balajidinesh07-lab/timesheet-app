// backend/routes/authRoutes.js
const express = require("express");
const { protect } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail"); // ✅ use your mailer

const router = express.Router();

// 🔑 Helper: sign JWT for login
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * POST /api/auth/login
 * - Normalize email: trim + lowercase so it matches how we store it.
 * - Return generic 401 on mismatch to avoid account enumeration.
 */
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustResetPassword: user.mustResetPassword,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generates reset token and sends email (uses plain token per your model)
 *
 * NOTE: Your earlier JWT approach is kept below as a comment (not removed).
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    // Always respond success to avoid email enumeration
    const publicMessage = "If that email exists, a reset link has been sent.";

    if (!user) {
      // still respond OK
      console.log("📧 Forgot-password requested for non-existent email:", email);
      return res.json({ message: publicMessage });
    }

    // ✅ Use your model helper to set token + expiry (plain token, select:false in schema)
    const rawToken = user.generatePasswordReset();
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetLink = `${clientUrl}/reset-password/${rawToken}`;

    // Send email with your helper
    const html = `
      <p>Hello ${user.name || ""},</p>
      <p>You requested a password reset for your Timesheet account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn’t request this, you can ignore this email.</p>
    `;
    try {
      await sendEmail(user.email, "Reset your Timesheet password", html);
    } catch (mailErr) {
      console.warn("⚠️ Failed to send reset email:", mailErr.message);
      // We still return success to avoid enumeration/leaking delivery status
    }

    // Log link for dev visibility
    console.log("📧 Reset link:", resetLink);

    return res.json({ message: publicMessage, resetLink });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }

  // ---------- ORIGINAL (kept as comment, not removed) ----------
  /*
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create reset token valid for 1 hour
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

    // TODO: send resetLink by email using nodemailer
    console.log("📧 Reset link:", resetLink);

    res.json({ message: "Password reset link sent to your email.", resetLink });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
  */
});

/**
 * POST /api/auth/reset-password/:token
 * Resets password using the plain token stored in your model
 *
 * If not found/expired, falls back to your previous JWT-based token logic (kept).
 */
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // ✅ Primary path: lookup by plain token + expiry (your schema stores plain token)
    let user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (user) {
      user.password = newPassword; // pre-save hook will hash
      user.mustResetPassword = false;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.json({ message: "Password updated successfully" });
    }

    // 🔁 Fallback to ORIGINAL JWT-based token (kept, not removed)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.password = newPassword; // pre-save hook will hash
      user.mustResetPassword = false;
      await user.save();

      return res.json({ message: "Password updated successfully" });
    } catch (jwtErr) {
      console.error("❌ Reset with token error (JWT path):", jwtErr);
      return res.status(400).json({ error: "Invalid or expired token" });
    }
  } catch (err) {
    console.error("❌ Reset with token error:", err);
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

/**
 * POST /api/auth/reset-password (protected)
 * For first login forced reset
 */
router.post("/reset-password", protect, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.password = newPassword;
    user.mustResetPassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

/* ---------- DUPLICATE EXPORT + STUB (kept but commented, to avoid breaking your app) ----------
const express2 = require('express');
const router2 = express2.Router();

// Stub list route
router2.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Demo Employee' }]);
});

module.exports = router2;
*/
