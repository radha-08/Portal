const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const createDefaultAdmin = require("./utils/createDefaultAdmin");
const createDefaultUsers = require("./utils/createDefaultUsers");

dotenv.config();

const app = express();

/* ✅ CORS — MUST BE FIRST */
app.use(cors({
  origin: true,           // allow all origins
  credentials: true,
}));

/* ✅ Handle preflight explicitly */
app.options("*", cors());
app.use(express.json());

// ✅ Connect MongoDB using ENV
mongoose.connect(process.env.MONGO_URI)
  .then(async() => {
    console.log("✅ MongoDB connected successfully");

    // ✅ Create default admin AFTER DB connection
    await createDefaultAdmin();
    await createDefaultUsers();

  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/attendance", require("./routes/attendance"));



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

