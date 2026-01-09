import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import "./AttendanceDetailsPage.css";

export default function AttendanceDetailsPage() {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const name = params.get("name");
    const designation = params.get("designation");
    const branch = params.get("branch");

    if (!userId || !name) {
      alert("Invalid employee data. Redirecting to dashboard.");
      window.location.href = "/admin-dashboard";
      return;
    }

    const emp = {
      userId,
      name,
      designation: designation || "N/A",
      branch: branch || "Unknown",
    };
    setEmployee(emp);

    fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attendance records");
        return res.json();
      })
      .then((data) => {
        const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendance(sorted);
      })
      .catch((err) => {
        console.error("Error fetching attendance:", err);
        setAttendance([]);
        alert("Could not load attendance history.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Helper to generate date range
  const generateDateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current).toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Build filtered + filled display list
  let displayData = [...attendance];

  const todayStr = new Date().toISOString().split("T")[0];

  if (filter === "month") {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const allDates = generateDateRange(startDate, endDate);
    const recordMap = new Map(attendance.map((item) => [item.date, item]));

    displayData = allDates.map((dateStr) => {
      if (recordMap.has(dateStr)) return recordMap.get(dateStr);
      return {
        date: dateStr,
        checkIn: null,
        checkOut: null,
        hours: 0,
        reason: null,
        checkoutRequestReason: null,
        isAutoAbsent: true,
      };
    });
    displayData.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (filter === "range" && fromDate && toDate) {
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const allDates = generateDateRange(startDate, endDate);
    const recordMap = new Map(attendance.map((item) => [item.date, item]));

    displayData = allDates.map((dateStr) => {
      if (recordMap.has(dateStr)) return recordMap.get(dateStr);
      return {
        date: dateStr,
        checkIn: null,
        checkOut: null,
        hours: 0,
        reason: null,
        checkoutRequestReason: null,
        isAutoAbsent: true,
      };
    });
    displayData.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (filter === "today") {
    const todayRecord = attendance.find((item) => item.date === todayStr);
    displayData = todayRecord
      ? [todayRecord]
      : [{
          date: todayStr,
          checkIn: null,
          checkOut: null,
          hours: 0,
          reason: null,
          checkoutRequestReason: null,
          isAutoAbsent: true,
        }];
  }
  // "all" uses raw sorted attendance

  // Export to Excel
  const exportToExcel = () => {
    const exportData = displayData.map((record) => {
      const hours = parseFloat(record.hours || 0);
      let status = "Absent";
      if (hours > 0) {
        status = hours >= 9 ? "Full Day" : hours >= 4.5 ? "Half Day" : "Short";
      }

      return {
        Date: record.date,
        "Check In": record.checkIn || "--",
        "Check Out": record.checkOut || "--",
        "Hours Worked": hours.toFixed(2),
        "Late Reason": record.reason || "--",
        "Early Checkout Reason": record.checkoutRequestReason || "--",
        Status: status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    // Auto-size columns
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 12 }, // Check In
      { wch: 12 }, // Check Out
      { wch: 12 }, // Hours
      { wch: 30 }, // Late Reason
      { wch: 30 }, // Early Reason
      { wch: 12 }, // Status
    ];
    worksheet["!cols"] = colWidths;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const fileName = `${employee.name.replace(/ /g, "_")}_Attendance_${filter === "all" ? "AllTime" : filter === "today" ? "Today" : filter === "month" ? "ThisMonth" : `${fromDate}_to_${toDate}`}.xlsx`;

    saveAs(data, fileName);
  };

  const goBack = () => {
    window.location.href = "/admin-dashboard";
  };

  return (
    <div className="attendance-details-page">
      <div className="page-header">
        <button className="back-btn" onClick={goBack}>
          ← Back to Dashboard
        </button>
        <h1>Attendance Details</h1>
      </div>

      {employee && (
        <div className="employee-info">
          <h2>{employee.name}</h2>
          <p>
            <strong>ID:</strong> {employee.userId} | 
            <strong> Designation:</strong> {employee.designation} | 
            <strong> Branch:</strong> {employee.branch}
          </p>
        </div>
      )}

      {/* Filters Section */}
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
          <span className="towhite">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button onClick={() => setFilter("range")} disabled={!fromDate || !toDate}>
            Apply Range
          </button>
        </div>

        <button className="export-btn" onClick={exportToExcel}>
          Export to Excel
        </button>
      </div>

      <div className="attendance-records">
        {loading ? (
          <p className="loading">Loading attendance records...</p>
        ) : displayData.length === 0 ? (
          <p className="no-records">No attendance records found for this employee.</p>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours Worked</th>
                <th>Late Reason</th>
                <th>Early Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((record, i) => {
                const hours = parseFloat(record.hours || 0);
                let status = record.isAutoAbsent ? "Absent" : "Absent";
                if (hours > 0) {
                  status = hours >= 9 ? "Full Day" : hours >= 4.5 ? "Half Day" : "Short";
                }

                const statusClass =
                  status === "Full Day" ? "status-full" :
                  status === "Half Day" ? "status-half" :
                  status === "Short" ? "status-short" : "status-absent";

                return (
                  <tr key={record.date + i} className={record.isAutoAbsent ? "auto-absent-row" : ""}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.checkIn || "--"}</td>
                    <td>{record.checkOut || "--"}</td>
                    <td>{hours.toFixed(2)}</td>
                    <td>{record.reason || "--"}</td>
                    <td>{record.checkoutRequestReason || "--"}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {status}
                        {record.isAutoAbsent && <span className="auto-tag"> (Auto)</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}