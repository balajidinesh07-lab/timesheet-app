const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware: protect route
const protect = async (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer")) {
    try {
      token = token.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ error: "User not found" });
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Not authorized, token failed" });
    }
  }
  return res.status(401).json({ error: "No token provided" });
};

// Middleware: check role
const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authorized" });
  if (req.user.role !== role)
    return res.status(403).json({ error: "Forbidden" });
  next();
};

module.exports = { protect, requireRole };
