import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchAttendance, setBranchAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const branches = ["Hitech City", "Vanasthalipuram", "Nagole"];

  const PUBLIC_HOLIDAYS_2026 = [
    "2026-01-01", "2026-01-14", "2026-01-15", "2026-01-26",
    "2026-03-03", "2026-03-19", "2026-03-21", "2026-03-27",
    "2026-04-03", "2026-08-15", "2026-10-02", "2026-12-25",
  ];

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      window.location.href = "/";
    }
  }, []);

  const fetchBranchAttendance = async (branch) => {
    setLoading(true);
    setSelectedBranch(branch);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/branch/${encodeURIComponent(branch)}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      setBranchAttendance(data);
    } catch (err) {
      alert("Failed to load branch attendance");
      console.error(err);
      setBranchAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const viewFullAttendance = (employee) => {
    const params = new URLSearchParams({
      userId: employee.userId,
      name: employee.name,
      designation: employee.designation || "N/A",
      branch: selectedBranch,
    });
    window.location.href = `/attendance-details?${params.toString()}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const generateDateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current).toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const countWorkingDays = (start, end) => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      const dateStr = current.toISOString().split("T")[0];
      if (day !== 0 && day !== 6 && !PUBLIC_HOLIDAYS_2026.includes(dateStr)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Convert decimal hours to HH:MM:SS string
  const decimalToHMS = (decimal) => {
    if (!decimal || decimal <= 0) return "--:--:--";
    const totalSeconds = Math.round(decimal * 3600);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleExport = async () => {
    if (!selectedBranch) {
      alert("Please select a branch first");
      return;
    }
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates");
      return;
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    if (startDate > endDate) {
      alert("From date cannot be after To date");
      return;
    }

    const allDates = generateDateRange(startDate, endDate);
    const totalWorkingDays = countWorkingDays(startDate, endDate);

    setLoading(true);
    try {
      const exportRows = [];
      const sheetStyles = [];

      await Promise.all(
        branchAttendance.map(async (emp, rowIndex) => {
          let fullRecords = [];
          try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/api/attendance/${emp.userId}`);
            if (res.ok) fullRecords = await res.json();
          } catch (e) {
            console.warn(`No data for ${emp.userId}`);
          }

          const recordMap = new Map(fullRecords.map((r) => [r.date, r]));

          const row = {
            Name: emp.name,
            ID: emp.userId,
          };

          let presentCount = 0;
          let halfDayCount = 0;

          allDates.forEach((dateStr) => {
            const dateObj = new Date(dateStr);
            const dayOfWeek = dateObj.getDay();
            const isHoliday = PUBLIC_HOLIDAYS_2026.includes(dateStr);

            let cellValue = "A";
            let cellColor = null;
            let lateHours = 0;
            let earlyHours = 0;

            if (isHoliday) {
              cellValue = "HOL";
              cellColor = "FFFF0000";
            } else if (dayOfWeek === 0) {
              const rec = recordMap.get(dateStr);
              if (rec && rec.checkIn && rec.checkOut) {
                const [inH, inM, inS] = rec.checkIn.split(":").map(Number);
                const [outH, outM, outS] = rec.checkOut.split(":").map(Number);
                const checkInDecimal = inH + inM / 60 + inS / 3600;
                const checkOutDecimal = outH + outM / 60 + outS / 3600;

                lateHours = Math.max(0, checkInDecimal - 9.25);
                earlyHours = Math.max(0, 18.5 - checkOutDecimal);

                if (lateHours > 2 || earlyHours > 2) {
                  cellValue = "H";
                  halfDayCount++;
                } else {
                  cellValue = "P";
                  presentCount++;
                }
              } else {
                cellValue = "SUN";
                cellColor = "FFD3D3D3";
              }
            } else if (dayOfWeek === 6) {
              const rec = recordMap.get(dateStr);
              if (rec && rec.checkIn && rec.checkOut) {
                const [inH, inM, inS] = rec.checkIn.split(":").map(Number);
                const [outH, outM, outS] = rec.checkOut.split(":").map(Number);
                const checkInDecimal = inH + inM / 60 + inS / 3600;
                const checkOutDecimal = outH + outM / 60 + outS / 3600;

                lateHours = Math.max(0, checkInDecimal - 9.25);
                earlyHours = Math.max(0, 18.5 - checkOutDecimal);

                if (lateHours > 2 || earlyHours > 2) {
                  cellValue = "H";
                  halfDayCount++;
                } else {
                  cellValue = "P";
                  presentCount++;
                }
              } else {
                cellValue = "SAT";
                cellColor = "FFD3D3D3";
              }
            } else {
              // Regular working day
              const rec = recordMap.get(dateStr);
              if (rec && rec.checkIn && rec.checkOut) {
                const [inH, inM, inS] = rec.checkIn.split(":").map(Number);
                const [outH, outM, outS] = rec.checkOut.split(":").map(Number);
                const checkInDecimal = inH + inM / 60 + inS / 3600;
                const checkOutDecimal = outH + outM / 60 + outS / 3600;

                lateHours = Math.max(0, checkInDecimal - 9.25);
                earlyHours = Math.max(0, 18.5 - checkOutDecimal);

                if (lateHours > 2 || earlyHours > 2) {
                  cellValue = "H";
                  halfDayCount++;
                } else {
                  cellValue = "P";
                  presentCount++;
                }
              } else {
                cellValue = "A";
              }
            }

            row[dateStr] = cellValue;

            // Add Late & Early hours as separate fields (only for working days)
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
              row[`Late_${dateStr}`] = decimalToHMS(lateHours);
              row[`Early_${dateStr}`] = decimalToHMS(earlyHours);
            }

            if (cellColor) {
              const colIndex = 2 + allDates.indexOf(dateStr);
              const cellAddr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
              sheetStyles.push({ cell: cellAddr, style: { fill: { fgColor: { rgb: cellColor } } } });
            }
          });

          row["Total Working Days"] = totalWorkingDays;
          row["Present Days"] = presentCount;
          row["Half Days"] = halfDayCount;

          exportRows.push(row);
        })
      );

      const worksheet = XLSX.utils.json_to_sheet(exportRows, { skipHeader: false });

      // Adjust column widths
      const baseCols = [{ wch: 22 }, { wch: 12 }];
      const dateAndExtraCols = [];
      allDates.forEach(() => {
        dateAndExtraCols.push({ wch: 9 });   // Date status
        dateAndExtraCols.push({ wch: 12 });  // Late_YYYY-MM-DD
        dateAndExtraCols.push({ wch: 12 });  // Early_YYYY-MM-DD
      });
      const summaryCols = [{ wch: 18 }, { wch: 14 }, { wch: 12 }];
      worksheet["!cols"] = [...baseCols, ...dateAndExtraCols, ...summaryCols];

      // Apply colors
      sheetStyles.forEach(({ cell, style }) => {
        if (!worksheet[cell]) worksheet[cell] = {};
        if (!worksheet[cell].s) worksheet[cell].s = {};
        worksheet[cell].s.fill = style.fill;
      });

      // Bold header
      const range = XLSX.utils.decode_range(worksheet["!ref"]);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ c: C, r: 0 })];
        if (cell) {
          cell.s = { ...cell.s, font: { bold: true }, alignment: { horizontal: "center" } };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const fileName = `${selectedBranch}_Attendance_${fromDate}_to_${toDate}.xlsx`;

      saveAs(blob, fileName);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to generate export. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard - Attendance Overview</h1>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="branches-grid">
        {branches.map((branch) => (
          <div
            key={branch}
            className={`branch-card ${selectedBranch === branch ? "active" : ""}`}
            onClick={() => fetchBranchAttendance(branch)}
          >
            <h3>{branch}</h3>
            <p>Click to view today's attendance</p>
          </div>
        ))}
      </div>

      {selectedBranch && (
        <div className="attendance-section">
          <h2>Today's Attendance - {selectedBranch}</h2>
          <p className="current-date"><strong>Date:</strong> {new Date().toLocaleDateString()}</p>

          <div className="export-section">
            <div className="date-inputs">
              <div className="date-field">
                <label>From:</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="date-field">
                <label>To:</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={loading || !fromDate || !toDate}
              className="export-btn"
            >
              {loading ? "Exporting..." : "Export Attendance Report"}
            </button>
          </div>

          <div className="table-container">
            {loading && !branchAttendance.length ? (
              <p className="loading-msg">Loading attendance data...</p>
            ) : branchAttendance.length === 0 ? (
              <p className="no-data">No employees or attendance data for this branch today.</p>
            ) : (
              <table className="branch-attendance-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {branchAttendance.map((emp) => (
                    <tr key={emp.userId} className={emp.status === "Absent" ? "absent-row" : ""}>
                      <td>{emp.name}</td>
                      <td>{emp.userId}</td>
                      <td>{emp.designation}</td>
                      <td>
                        <span className={`status-badge status-${emp.status.toLowerCase().replace(" ", "-")}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td>{emp.checkIn}</td>
                      <td>{emp.checkOut}</td>
                      <td>{emp.hours}</td>
                      <td>
                        <button className="view-full-btn" onClick={() => viewFullAttendance(emp)}>
                          Full History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}