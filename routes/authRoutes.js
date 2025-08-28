// routes/authRoutes.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

// Register (for bootstrap)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password, role: role || "employee" });
    const token = signToken(user);
    res.status(201).json({ user: { id: user._id, name, email, role: user.role }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user);
    res.json({ user: { id: user._id, name: user.name, email, role: user.role }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
