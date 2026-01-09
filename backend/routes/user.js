const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Get user by userId (existing)
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NEW: Get all employees in a specific branch
router.get("/branch/:branchName", async (req, res) => {
  try {
    const { branchName } = req.params;
    const employees = await User.find(
      { branch: branchName, role: "user" },
      { password: 0 } // exclude password
    );
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Optional: Get all branches (for dynamic cards)
router.get("/branches/list", async (req, res) => {
  try {
    const branches = await User.distinct("branch");
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;