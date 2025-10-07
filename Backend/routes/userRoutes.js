// backend/routes/userRoutes.js
const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/auth");
const sendEmail = require("../utils/sendEmail"); // ✅ optional, if you have email setup

const router = express.Router();

// ✅ Only admins can manage users
router.use(protect, requireRole("admin"));

/**
 * GET all users
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("manager", "name email role");
    res.json(users);
  } catch (err) {
    console.error("❌ Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * POST create a new user
 * Auto-generates a temporary password
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already exists" });

    // Generate random temp password
    const tempPassword = crypto.randomBytes(6).toString("hex");

    const user = await User.create({
      name,
      email,
      password: tempPassword, // 🔑 will be hashed in pre-save
      role,
      mustResetPassword: true, // ✅ enforce reset on first login
    });

    // ✅ Optional: send email with temp password
    try {
      await sendEmail(
        email,
        "Your Timesheet Account",
        `<p>Hello ${name},</p>
         <p>Your account has been created as <b>${role}</b>.</p>
         <p><b>Temporary password:</b> ${tempPassword}</p>
         <p>Please log in and reset your password immediately.</p>`
      );
    } catch (mailErr) {
      console.warn("⚠️ Failed to send email:", mailErr.message);
    }

    res.json({ id: user._id, name, email, role });
  } catch (err) {
    console.error("❌ User create error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * DELETE user
 */
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * PUT assign employee to a manager
 */
router.put("/:id/assign", async (req, res) => {
  const { managerId } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { manager: managerId },
      { new: true }
    ).populate("manager", "name email");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ Assign Manager error:", err);
    res.status(500).json({ error: "Failed to assign Manager" });
  }
});

module.exports = router;
