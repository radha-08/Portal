import React, { useState } from "react";
import "./LoginPage.css";
import welcomeImage from "../assets/CUSTQ.png";  // Your logo

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      console.log("API URL:", process.env.REACT_APP_API_URL);


      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("userId", data.user.userId);
        localStorage.setItem("role", data.role);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        if (data.role === "admin") {
          window.location.href = "/admin-dashboard";
        } else {
          window.location.href = "/user-dashboard";
        }
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="bg-shape pink"></div>
      <div className="bg-shape blue"></div>

      <div className="login-card">
        <div className="logo-container">
          <img 
            src={welcomeImage} 
            alt="Company Logo" 
            className="welcome-image" 
          />
        </div>
        
        <p className="subtitle">CustQ Employee's portal</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}