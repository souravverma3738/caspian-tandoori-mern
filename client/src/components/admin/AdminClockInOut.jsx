import { useEffect, useState } from "react";
import { adminApi } from "../../api";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatHours(minutes) {
  const hrs = Math.floor(Number(minutes || 0) / 60);
  const mins = Number(minutes || 0) % 60;
  return `${hrs}h ${mins}m`;
}

export default function AdminClockInOut() {
  const [records, setRecords] = useState([]);
  const [staffName, setStaffName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function loadRecords() {
    const data = await adminApi.staffAttendance();
    setRecords(data);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function clockIn() {
    try {
      setError("");
      await adminApi.clockInStaff({ staffName, pin });
      setStaffName("");
      setPin("");
      loadRecords();
    } catch (err) {
      setError(err.message || "Could not clock in");
    }
  }

  async function action(fn, id) {
    try {
      setError("");
      await fn(id);
      loadRecords();
    } catch (err) {
      setError(err.message || "Action failed");
    }
  }

  function exportPayroll() {
    const csv = [
      "Staff Name,Clock In,Clock Out,Break Minutes,Total Hours,Late,Status",
      ...records.map((record) =>
        [
          record.staffName,
          formatDate(record.clockIn),
          formatDate(record.clockOut),
          record.breakMinutes || 0,
          formatHours(record.totalMinutes),
          record.late ? "Yes" : "No",
          record.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payroll-hours.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-4xl font-black text-white">
          Clock In / Out
        </h2>
        <p className="mt-2 text-white/55">
          Staff attendance, breaks, shift history and payroll export.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h3 className="mb-4 text-xl font-black text-white">PIN Clock In</h3>

        <div className="grid gap-3 md:grid-cols-[1fr_180px_140px]">
          <input
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Employee name"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            type="password"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            onClick={clockIn}
            className="rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
          >
            Clock In
          </button>
        </div>

        {error && <p className="mt-4 text-red-300">{error}</p>}
      </div>

      <div className="mb-5 flex justify-end">
        <button
          onClick={exportPayroll}
          className="rounded-xl border border-white/10 px-5 py-3 font-black text-white"
        >
          Export Payroll CSV
        </button>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <p className="text-white/60">No staff attendance records yet.</p>
        ) : (
          records.map((record) => (
            <div
              key={record._id}
              className="rounded-2xl border border-white/10 bg-[#101010] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {record.staffName}
                  </h3>
                  <p className="mt-1 text-white/55">Status: {record.status}</p>
                  {record.late && (
                    <p className="mt-2 inline-block rounded-full bg-red-500/20 px-3 py-1 text-sm font-black text-red-300">
                      Late arrival
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:text-right">
                  <div>
                    <p className="text-sm text-white/45">Clock In</p>
                    <p className="font-bold text-white">{formatDate(record.clockIn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/45">Clock Out</p>
                    <p className="font-bold text-white">{formatDate(record.clockOut)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/45">Hours</p>
                    <p className="font-bold text-white">
                      {formatHours(record.totalMinutes)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {record.status === "Clocked In" && (
                  <button
                    onClick={() => action(adminApi.startBreak, record._id)}
                    className="rounded-xl bg-yellow-600 px-4 py-3 font-black text-white"
                  >
                    Start Break
                  </button>
                )}

                {record.status === "On Break" && (
                  <button
                    onClick={() => action(adminApi.endBreak, record._id)}
                    className="rounded-xl bg-blue-600 px-4 py-3 font-black text-white"
                  >
                    End Break
                  </button>
                )}

                {record.status !== "Clocked Out" && (
                  <button
                    onClick={() => action(adminApi.clockOutStaff, record._id)}
                    className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                  >
                    Clock Out
                  </button>
                )}

                <div className="rounded-xl bg-black/40 px-4 py-3 text-white/60">
                  Break: {record.breakMinutes || 0} minutes
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}