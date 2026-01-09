const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User")

const router = express.Router();

// Add at the top with other requires
const cron = require("node-cron");

// New: Daily job to mark incomplete attendance as Absent
async function markIncompleteAsAbsent() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Find records where user checked in but did NOT check out today
    const incompleteRecords = await Attendance.find({
      date: todayStr,
      checkIn: { $exists: true, $ne: null },
      checkOut: { $exists: false }
    });

    if (incompleteRecords.length === 0) {
      console.log("No incomplete attendance records to mark as absent.");
      return;
    }

    const updatePromises = incompleteRecords.map(record =>
      Attendance.updateOne(
        { _id: record._id },
        {
          $set: {
            checkOut: null,
            hours: 0,
            isEarlyCheckout: false,
            checkoutRequestReason: null,
            status: "Absent", // optional field for clarity
            absentReason: "No checkout after check-in" // optional
          }
        }
      )
    );

    await Promise.all(updatePromises);
    console.log(`Marked ${incompleteRecords.length} incomplete records as Absent for ${todayStr}`);
  } catch (err) {
    console.error("Error in markIncompleteAsAbsent:", err);
  }
}

// Run every day at 23:59
cron.schedule("59 23 * * *", markIncompleteAsAbsent);

// Optional: Expose a manual trigger (for testing/admin)
router.post("/admin/mark-absent-incomplete", async (req, res) => {
  await markIncompleteAsAbsent();
  res.json({ message: "Incomplete attendance marked as absent" });
});

// Get all attendance for a user
router.get("/:userId", async (req, res) => {
  try {
    const history = await Attendance.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update attendance record (check-in / check-out)
router.post("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const date = req.body.date;

    const filter = { userId, date };
    const update = { $set: req.body };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const attendance = await Attendance.findOneAndUpdate(filter, update, options);
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New: Request early checkout
router.post("/:userId/request", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { date, checkoutRequestReason, requestedAt } = req.body;

    const filter = { userId, date };
    const update = {
      $set: {
        checkoutRequestReason,
        requestedAt,
      },
    };
    const options = { upsert: true, new: true };

    const attendance = await Attendance.findOneAndUpdate(filter, update, options);
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance summary for all employees in a branch (today + basic info)
router.get("/branch/:branchName", async (req, res) => {
  try {
    const { branchName } = req.params;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // First get all users in the branch
    const users = await User.find({ branch: branchName, role: "user" }, {
      userId: 1,
      name: 1,
      designation: 1,
      phone: 1,
      _id: 0
    });

    // Get today's attendance records for these users
    const userIds = users.map(u => u.userId);
    const todayRecords = await Attendance.find({
      userId: { $in: userIds },
      date: today
    });

    // Build summary
    const summary = users.map(user => {
      const record = todayRecords.find(r => r.userId === user.userId);
      
      let status = "Absent";
      let hours = 0;
      let checkIn = "--";
      let checkOut = "--";

      if (record) {
        checkIn = record.checkIn || "--";
        checkOut = record.checkOut || "--";
        hours = parseFloat(record.hours || 0).toFixed(2);
        
        if (record.checkOut) status = "Checked Out";
        else if (record.checkIn) status = "Checked In";
      }

      return {
        userId: user.userId,
        name: user.name,
        designation: user.designation,
        phone: user.phone || "-",
        status,
        checkIn,
        checkOut,
        hours,
        hasRecord: !!record
      };
    });

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;