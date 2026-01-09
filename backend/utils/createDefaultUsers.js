const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createDefaultUsers() {
  const users = [
    { 
      userId: 'CQ006', 
      name: "Tulasi", 
      email: "tulasi@gmail.com", 
      password: "Tulasi@123",
      phone: "9876543219", 
      designation: "Frontend", 
      branch: "Hitech City"
    },
    { 
      userId: 'CQ023', 
      name: "Harsha", 
      email: "harsha@gmail.com", 
      password: "Harsha@123",
      phone: "9876543211", 
      designation: "Frontend", 
      branch: "Hitech City"
    },
    {
      userId: "CQ007",
      name: "Ravi Kumar",
      email: "ravi@gmail.com",
      password: "Ravi@123",
      phone: "8765432190",
      designation: "Backend Developer",
      branch: "Vanasthalipuram"
    },
    {
      userId: "CQ008",
      name: "Priya Sharma",
      email: "priya@gmail.com",
      password: "Priya@123",
      phone: "7654321980",
      designation: "UI/UX Designer",
      branch: "Nagole"
    },

   
  ];

  for (const u of users) {
    try{
      const exists = await User.findOne({
        $or: [{ email: u.email }, { userId: u.userId }]
      });

    if (exists) {
      console.log(`User already exists: ${u.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(u.password, 10);

    const newUser = await User.create({
      userId: u.userId,
      name: u.name,
        email: u.email,
        password: hashedPassword,
        phone: u.phone,
        designation: u.designation,
        branch: u.branch,
        role: "user"
    });

    console.log(`✅ Created user: ${newUser.name}`);
  }
  catch (err) {
      console.error(`❌ Failed to create user ${newUser.name}:`, err.message);
    }
    
    }
}

module.exports = createDefaultUsers;
