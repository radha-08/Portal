const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createDefaultAdmin() {
  const adminEmail = "admin@custq.com";

  const adminExists = await User.findOne({ email: adminEmail });
  if (adminExists) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("CustQ@0313", 10);

  await User.create({
    userId: "ADMIN001",
    name: "Administrator",
    email: adminEmail,
    password: hashedPassword,
    designation: "System Administrator",
    branch: "Vanasthalipuram",
    role: "admin"
    
  });

  console.log("✅ Default admin created");
}

module.exports = createDefaultAdmin;
