const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Add this import

async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key-change-this");
    
    // Fetch full user object from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    req.user = user; // Attach full user object
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Token invalid or expired" });
  }
}

module.exports = authMiddleware;