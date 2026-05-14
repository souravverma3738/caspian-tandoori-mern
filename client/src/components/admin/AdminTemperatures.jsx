import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api";

const areas = ["All", "Fridge", "Freezer", "Hot Holding", "Cooking", "Delivery Bag"];

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function complianceText(log) {
  return log.compliant ? "HACCP COMPLIANT" : "HACCP NON-COMPLIANT";
}

export default function AdminTemperatures() {
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [filterArea, setFilterArea] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    area: "Fridge",
    itemName: "",
    temperature: "",
    checkedBy: "",
    signature: "",
    notes: "",
  });

  const [error, setError] = useState("");

  async function loadData() {
  try {
    const params = {
      area: filterArea,
      startDate,
      endDate,
    };

    const [logsData, alertsData] = await Promise.all([
      adminApi.temperatureLogs(params),
      adminApi.temperatureAlerts(),
    ]);

    setLogs(logsData);
    setAlerts(alertsData);
  } catch (err) {
    setError(err.message || "Could not load temperatures");
  }
}

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = useMemo(() => {
    if (filterArea === "All") return logs;
    return logs.filter((log) => log.area === filterArea);
  }, [logs, filterArea]);

  async function submitLog(e) {
    e.preventDefault();

    try {
      setError("");

      await adminApi.createTemperatureLog({
        ...form,
        temperature: Number(form.temperature),
      });

      setForm({
        area: "Fridge",
        itemName: "",
        temperature: "",
        checkedBy: "",
        signature: "",
        notes: "",
      });

      loadData();
    } catch (err) {
      setError(err.message || "Could not save log");
    }
  }

  function printTemperatureSheet() {
    const rows = filteredLogs
      .map(
        (log) => `
          <tr>
            <td>${formatDate(log.createdAt)}</td>
            <td>${log.area}</td>
            <td>${log.itemName}</td>
            <td>${log.temperature}°C</td>
            <td>${log.checkedBy}</td>
            <td>${log.signature || "N/A"}</td>
            <td class="${log.compliant ? "good" : "bad"}">
              ${complianceText(log)}
            </td>
            <td>${log.notes || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Temperature Compliance Sheet</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #111;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }

            h1 {
              margin: 0;
              font-size: 28px;
            }

            h2 {
              margin: 8px 0 0;
              font-size: 18px;
              font-weight: normal;
            }

            .meta {
              margin-bottom: 24px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 14px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
              font-size: 12px;
            }

            th, td {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f2f2f2;
              font-weight: bold;
            }

            .good {
              color: #0a7a28;
              font-weight: bold;
            }

            .bad {
              color: #b00020;
              font-weight: bold;
            }

            .signature {
              margin-top: 48px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 48px;
            }

            .line {
              border-top: 1px solid #111;
              padding-top: 8px;
            }

            .footer {
              margin-top: 32px;
              font-size: 11px;
              color: #555;
              text-align: center;
            }

            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>Caspian Tandoori</h1>
            <h2>Food Safety Temperature Compliance Sheet</h2>
          </div>

          <div class="meta">
            <div><strong>Report Type:</strong> HACCP Temperature Records</div>
            <div><strong>Area Filter:</strong> ${filterArea}</div>
            <div><strong>Printed Date:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Total Records:</strong> ${filteredLogs.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Area</th>
                <th>Item / Equipment</th>
                <th>Temperature</th>
                <th>Checked By</th>
                <th>Signature</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="8">No temperature records found.</td></tr>`}
            </tbody>
          </table>

          <div class="signature">
            <div class="line">Manager Signature</div>
            <div class="line">Inspector / Officer Signature</div>
          </div>

          <div class="footer">
            Generated from Caspian Tandoori Admin System. Green = HACCP Compliant. Red = HACCP Non-Compliant.
          </div>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-4xl font-black text-white">
            Temperature Compliance
          </h2>
          <p className="mt-2 text-white/55">
            Inspector-ready HACCP food safety records.
          </p>
        </div>

        <button
          onClick={printTemperatureSheet}
          className="rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
        >
          Print HACCP Sheet
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <h3 className="mb-4 text-xl font-black text-white">
          Inspector View
        </h3>

       <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_140px]">
  <select
    value={filterArea}
    onChange={(e) => setFilterArea(e.target.value)}
    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
  >
    {areas.map((area) => (
      <option key={area}>{area}</option>
    ))}
  </select>

  <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
  />

  <input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
  />

  <button
    onClick={loadData}
    className="rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
  >
    Apply
  </button>
</div>
       </div>

      {alerts.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h3 className="mb-4 text-xl font-black text-red-200">
            Temperature Alerts
          </h3>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="rounded-xl border border-red-500/20 p-4 text-red-100"
              >
                <p className="font-black">
                  {alert.area} — {alert.itemName}
                </p>
                <p>Temperature: {alert.temperature}°C</p>
                <p>Checked by: {alert.checkedBy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={submitLog}
        className="mb-8 rounded-2xl border border-white/10 bg-[#101010] p-5"
      >
        <h3 className="mb-5 text-xl font-black text-white">
          Add Temperature Record
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          >
            {areas.filter((area) => area !== "All").map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>

          <input
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            placeholder="Equipment / food name"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            value={form.temperature}
            onChange={(e) => setForm({ ...form, temperature: e.target.value })}
            placeholder="Temperature °C"
            type="number"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            value={form.checkedBy}
            onChange={(e) => setForm({ ...form, checkedBy: e.target.value })}
            placeholder="Checked by"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            value={form.signature}
            onChange={(e) => setForm({ ...form, signature: e.target.value })}
            placeholder="Staff signature"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes / corrective action"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        {error && <p className="mt-4 text-red-300">{error}</p>}

        <button
          type="submit"
          className="mt-5 rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
        >
          Save Temperature Record
        </button>
      </form>

      <div className="mb-5">
        <h3 className="text-2xl font-black text-white">
          Digital Records
        </h3>
        <p className="mt-1 text-white/50">
          Inspector can view these directly on screen.
        </p>
      </div>

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <p className="text-white/60">No temperature records found.</p>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log._id}
              className={`rounded-2xl border p-5 ${
                log.compliant
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-red-500/20 bg-red-500/5"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff5b00]">
                    {log.area}
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-white">
                    {log.itemName}
                  </h3>

                  <p className="mt-2 text-white/60">
                    Checked by: {log.checkedBy}
                  </p>

                  <p className="text-white/60">
                    Signature: {log.signature || "None"}
                  </p>

                  <p className="text-white/50">
                    {formatDate(log.createdAt)}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-4xl font-black text-white">
                    {log.temperature}°C
                  </p>

                  <p
                    className={`mt-2 rounded-full px-4 py-2 text-center font-black ${
                      log.compliant
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {complianceText(log)}
                  </p>
                </div>
              </div>

              {log.notes && (
                <div className="mt-4 rounded-xl bg-black/30 p-4 text-white/60">
                  Notes / corrective action: {log.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}