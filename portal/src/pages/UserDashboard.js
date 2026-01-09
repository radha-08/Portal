import React, { useState, useEffect } from "react";
import "./UserDashboard.css";

export default function UserDashboard() {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [timer, setTimer] = useState("00:00:00");
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // CHANGE THIS TO YOUR HR/ADMIN EMAIL
  const HR_EMAIL = "hr@yourcompany.com"; // ← Update this!

  // Helper to open email client with pre-filled data
  const sendReasonEmail = (type, reason) => {
    if (!user || !user.email) {
      alert("Your email is not available. Reason recorded locally only.");
      return;
    }

    const subject = encodeURIComponent(
      type === "late"
        ? `Late Check-in Reason - ${user.name} (${new Date().toLocaleDateString()})`
        : `Early Checkout Request - ${user.name} (${new Date().toLocaleDateString()})`
    );

    const body = encodeURIComponent(`
Hello HR Team,

${type === "late" ? "I was late for check-in today." : "I am requesting early checkout today."}

Details:
- Employee: ${user.name}
- ID: ${user.userId}
- Designation: ${user.designation || "N/A"}
- Date: ${new Date().toLocaleDateString()}
- Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

Reason:
${reason}

Thank you.
Regards,
${user.name}
${user.email}
    `.trim());

    const mailtoLink = `mailto:${HR_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      window.location.href = "/";
      return;
    }

    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Corrupted user data");
      }
    }

    fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attendance");
        return res.json();
      })
      .then((data) => {
        const sorted = data.sort((a, b) => b.date.localeCompare(a.date));
        setHistory(sorted);

        const today = new Date().toISOString().split("T")[0];
        const todayEntry = sorted.find((item) => item.date === today);

        if (todayEntry) {
          if (todayEntry.checkIn) {
            setCheckIn(new Date(`${todayEntry.date}T${todayEntry.checkIn}`));
          }
          if (todayEntry.checkOut) {
            setCheckOut(new Date(`${todayEntry.date}T${todayEntry.checkOut}`));
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let interval = null;
    if (checkIn && !checkOut) {
      interval = setInterval(() => {
        const diff = Date.now() - checkIn.getTime();
        const hrs = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setTimer(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      setTimer("00:00:00");
    }
    return () => clearInterval(interval);
  }, [checkIn, checkOut]);

  const handleCheckIn = () => {
    if (checkIn) return alert("Already checked in today!");

    const now = new Date();
    const time = now.getHours() + now.getMinutes() / 60;
    const graceTime = 9.25; // 9:15 AM

    if (time < graceTime) {
      return alert("Check-in allowed only after 9:15 AM");
    }

    let reason = null;
    if (time > graceTime) {
      reason = prompt("Late check-in after 9:15 AM. Please provide reason:");
      if (!reason || reason.trim() === "") {
        alert("Reason required for late check-in");
        return;
      }
      reason = reason.trim();

      // Send email after reason is confirmed
      sendReasonEmail("late", reason);
    }

    setCheckIn(now);

    const userId = localStorage.getItem("userId");
    const date = now.toISOString().split("T")[0];
    const checkInStr = now.toTimeString().slice(0, 8);

    fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, checkIn: checkInStr, reason }),
    })
      .then((res) => res.json())
      .then((data) => {
        setHistory((prev) => [data, ...prev.filter((h) => h.date !== date)]);
      })
      .catch((err) => console.error(err));
  };

  const handleNormalCheckout = () => {
    if (!checkIn || checkOut) return;

    const now = new Date();
    const currentTime = now.getHours() + now.getMinutes() / 60;

    const isHalfDayWindow = currentTime >= 13 && currentTime <= 14;
    const isFullDayWindow = currentTime >= 18.5 && currentTime <= 19;

    if (!isHalfDayWindow && !isFullDayWindow) {
      return alert(
        "Normal checkout allowed only:\n• 1:00 PM – 2:00 PM (Half Day)\n• 6:30 PM – 7:00 PM (Full Day)"
      );
    }

    const workedHours = (now.getTime() - checkIn.getTime()) / 3600000;

    if (isHalfDayWindow && workedHours < 4) {
      const remaining = 4 - workedHours;
      const hrs = Math.floor(remaining);
      const mins = Math.round((remaining - hrs) * 60);
      return alert(`Minimum 4 hours required for half day.\nRemaining: ${hrs}h ${mins}m`);
    }

    performCheckout(now, false);
  };

  const handleEarlyCheckout = () => {
    if (!checkIn || checkOut) return;

    const reason = prompt("Requesting Early Checkout\nPlease provide valid reason:");
    if (!reason || reason.trim() === "") {
      return alert("Reason is required for early checkout");
    }

    const trimmedReason = reason.trim();

    // Send email before recording checkout
    sendReasonEmail("early", trimmedReason);

    performCheckout(new Date(), true, reason.trim());
  };

  const performCheckout = (checkoutTime, isEarly = false, earlyReason = null) => {
    setCheckOut(checkoutTime);

    const workedHours = ((checkoutTime.getTime() - checkIn.getTime()) / 3600000).toFixed(2);
    const userId = localStorage.getItem("userId");
    const date = checkIn.toISOString().split("T")[0];
    const checkOutStr = checkoutTime.toTimeString().slice(0, 8);

    const payload = {
      date,
      checkOut: checkOutStr,
      hours: workedHours,
      isEarlyCheckout: isEarly,
    };

    if (isEarly) {
      payload.checkoutRequestReason = earlyReason;
      payload.requestedAt = checkOutStr;
    }

    fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setHistory((prev) => [data, ...prev.filter((h) => h.date !== date)]);
        alert(isEarly ? "Early checkout request recorded!" : "Checkout recorded successfully!");
      })
      .catch((err) => console.error(err));
  };

  // Helper: Generate array of dates between start and end (inclusive)
  const generateDateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current).toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Convert decimal hours (e.g., 8.177) to HH:MM:SS string
  const decimalToHMS = (decimal) => {
    if (!decimal) return "--:--:--";
    const totalSeconds = Math.round(decimal * 3600);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Calculate worked hours from checkIn/checkOut strings
  const calculateWorkedHours = (checkInStr, checkOutStr) => {
    if (!checkInStr || !checkOutStr) return null;
    const inDate = new Date(`2000-01-01T${checkInStr}`);
    const outDate = new Date(`2000-01-01T${checkOutStr}`);
    const diffMs = outDate - inDate;
    if (diffMs < 0) return null;
    return diffMs / 3600000;
  };

  // Build display history with auto-absent for missing dates
  let displayHistory = [...history];

  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;

  if (filter === "month") {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // last day

    const allDates = generateDateRange(startDate, endDate);
    const historyMap = new Map(history.map((item) => [item.date, item]));

    displayHistory = allDates.map((dateStr) => {
      if (historyMap.has(dateStr)) {
        return historyMap.get(dateStr);
      }
      return {
        date: dateStr,
        checkIn: null,
        checkOut: null,
        hours: null,
        reason: null,
        checkoutRequestReason: null,
        isEarlyCheckout: false,
        isAutoAbsent: true,
      };
    });

    displayHistory.sort((a, b) => b.date.localeCompare(a.date));
  } else if (filter === "range" && fromDate && toDate) {
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const allDates = generateDateRange(startDate, endDate);
    const historyMap = new Map(history.map((item) => [item.date, item]));

    displayHistory = allDates.map((dateStr) => {
      if (historyMap.has(dateStr)) {
        return historyMap.get(dateStr);
      }
      return {
        date: dateStr,
        checkIn: null,
        checkOut: null,
        hours: null,
        reason: null,
        checkoutRequestReason: null,
        isEarlyCheckout: false,
        isAutoAbsent: true,
      };
    });

    displayHistory.sort((a, b) => b.date.localeCompare(a.date));
  } else if (filter === "today") {
    const todayRecord = history.find((item) => item.date === todayStr);
    if (todayRecord) {
      displayHistory = [todayRecord];
    } else {
      displayHistory = [{
        date: todayStr,
        checkIn: null,
        checkOut: null,
        hours: null,
        reason: null,
        checkoutRequestReason: null,
        isAutoAbsent: true,
      }];
    }
  }
  // "all" uses raw history

  return (
    <div className="dashboard">
      <div className="profile-card">
        {/* <img src="https://i.imgur.com/4Z7mK2K.png" alt="Employee Profile" /> */}
        {loading ? (
          <p>Loading profile...</p>
        ) : user ? (
          <>
            <h2>{user.name || "Employee"}</h2>
            <p className="designation">{user.designation || "N/A"}</p>
            <p className="id">ID: {user.userId}</p>
          </>
        ) : (
          <p>No user data found</p>
        )}
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.clear();
            window.location.href = "/";
          }}
        >
          Logout
        </button>
      </div>

      <div className="attendance-card">
        <h3>Attendance Dashboard</h3>

        <div className="time-grid">
          <div className="time-box">
            <span>Check In</span>
            <p>{checkIn ? checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
          </div>
          <div className="time-box">
            <span>Check Out</span>
            <p>{checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
          </div>
          <div className="time-box timer">
            <span>Working Time</span>
            <p>{timer}</p>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={handleCheckIn} disabled={!!checkIn} className="checkin-btn">
            {checkIn ? "Checked In" : "Check In"}
          </button>

          <button onClick={handleNormalCheckout} disabled={!checkIn || !!checkOut} className="checkout-btn">
            Normal Checkout
          </button>

          <button
            onClick={handleEarlyCheckout}
            disabled={!checkIn || !!checkOut}
            className="early-btn"
          >
            Request Early Checkout
          </button>
        </div>

        <div className="filters-section">
          <div className="filter-buttons">
            <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>
              All Time
            </button>
            <button onClick={() => setFilter("today")} className={filter === "today" ? "active" : ""}>
              Today
            </button>
            <button onClick={() => setFilter("month")} className={filter === "month" ? "active" : ""}>
              This Month
            </button>
          </div>

          <div className="date-range-filter">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button onClick={() => setFilter("range")} disabled={!fromDate || !toDate}>
              Apply
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Late Reason</th>
                <th>Early Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-records">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                displayHistory.map((item, i) => {
                  const isToday = item.date === todayStr;
                  const hasCheckIn = !!item.checkIn;
                  const hasCheckOut = !!item.checkOut;

                  let statusText = "A";
                  let statusClass = "absent";

                  if (hasCheckIn && hasCheckOut) {
                    statusText = "P";
                    statusClass = "present";
                  } else if (hasCheckIn && !hasCheckOut) {
                    if (isToday) {
                      if (currentHourDecimal >= 19) {
                        // After 7 PM today → likely absent
                        statusText = "A";
                        statusClass = "absent";
                      } else {
                        statusText = "IP";
                        statusClass = "inprogress";
                      }
                    } else {
                      // Past day: checked in but no checkout → Absent
                      statusText = "A";
                      statusClass = "absent";
                    }
                  } else if (!hasCheckIn) {
                    statusText = "A";
                    statusClass = "absent";
                  }

                  const workedDecimal = calculateWorkedHours(item.checkIn, item.checkOut);
                  const hoursDisplay = workedDecimal !== null
                    ? item.isEarlyCheckout
                      ? `${decimalToHMS(workedDecimal)} (Early)`
                      : decimalToHMS(workedDecimal)
                    : "--:--:--";

                  const isAutoAbsent = item.isAutoAbsent || (isToday && hasCheckIn && !hasCheckOut && currentHourDecimal >= 19);

                  return (
                    <tr key={item.date + i} className={isAutoAbsent ? "auto-absent" : ""}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.checkIn || "--:--"}</td>
                      <td>{item.checkOut || "--:--"}</td>
                      <td><strong>{hoursDisplay}</strong></td>
                      <td className="reason">{item.reason || "--"}</td>
                      <td className="reason">{item.checkoutRequestReason || item.absentReason || "--"}</td>
                      <td className={`status ${statusClass}`}>
                        {statusText}
                        {isAutoAbsent && <span className="auto-tag"> (Auto)</span>}
                        {isToday && hasCheckIn && !hasCheckOut && currentHourDecimal >= 19 && (
                          <span className="auto-tag"> (Likely Absent)</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}