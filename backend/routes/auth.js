const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

/**
 * REGISTER USER
 */
router.post("/register", async (req, res) => {
  const { email, password, userId, name, designation, phone } = req.body;

  // Validate required fields
  if (!email || !password || !userId || !name) {
    return res.status(400).json({ message: "Email, password, userId, and name are required" });
  }

  try {
    // Check if email or userId already exists
    const exists = await User.findOne({
      $or: [{ email }, { userId }]
    });
    if (exists) {
      return res.status(409).json({ 
        message: exists.email === email 
          ? "Email already registered" 
          : "Employee ID already exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userId,
      name,
      email,
      phone,
      designation,
      branch,
      password: hashedPassword,
      role: "user" // or allow admin to set role
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      role: user.role,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        designation: user.designation,
        role: user.role,
        branch: user.branch
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * LOGIN (USER + ADMIN)
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Login successful",
      role: user.role,
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        designation: user.designation,
        branch: user.branch

      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;  
