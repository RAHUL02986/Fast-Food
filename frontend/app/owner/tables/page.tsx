"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { tableAPI, slotAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import { Plus, Trash2, QrCode, Armchair } from "lucide-react";

const TABLE_STATUS_STYLES: Record<string, string> = {
  free: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  reserved: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default function OwnerTablesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New table form
  const [newTable, setNewTable] = useState({ name: "", capacity: "4" });
  // New slot form
  const [newSlot, setNewSlot] = useState({ startTime: "18:00", endTime: "19:00", capacity: "4" });

  const fetchData = useCallback(async () => {
    try {
      const [tablesData, slotsData] = await Promise.all([
        tableAPI.getTables(),
        slotAPI.getSlots({ date: slotDate }),
      ]);
      setTables(tablesData.data || []);
      setSlots(slotsData.data || []);
    } catch (err: any) {
      setError(err.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  }, [slotDate]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "owner") fetchData();
  }, [authLoading, user, fetchData]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tableAPI.createTable({ name: newTable.name, capacity: parseInt(newTable.capacity) });
      setNewTable({ name: "", capacity: "4" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not create table");
    }
  };

  const setTableStatus = async (id: string, status: string) => {
    try {
      await tableAPI.setTableStatus(id, { status });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not update table");
    }
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    try {
      await tableAPI.deleteTable(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not delete table");
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await slotAPI.createSlots({
        date: slotDate,
        slots: [{ startTime: newSlot.startTime, endTime: newSlot.endTime, capacity: parseInt(newSlot.capacity) }],
      });
      setNewSlot({ startTime: "18:00", endTime: "19:00", capacity: "4" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not create slot");
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      await slotAPI.deleteSlot(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not delete slot");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading tables...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>}

        {/* ===== Tables ===== */}
        <div className="flex items-center gap-2 mb-4">
          <Armchair size={22} className="text-orange-600" />
          <h1 className="text-2xl font-bold">Tables</h1>
        </div>

        <form onSubmit={handleAddTable} className="bg-white p-5 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Table name</label>
            <input
              value={newTable.name}
              onChange={(e) => setNewTable((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. T5 / Terrace 1"
              required
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Capacity</label>
            <input
              type="number"
              min="1"
              value={newTable.capacity}
              onChange={(e) => setNewTable((p) => ({ ...p, capacity: e.target.value }))}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg w-24"
            />
          </div>
          <button type="submit" className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg">
            <Plus size={15} /> Add table
          </button>
        </form>

        {tables.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500 mb-10">No tables yet — add your first one above.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {tables.map((table: any) => (
              <div key={table._id} className="bg-white p-5 rounded-lg shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{table.name}</h3>
                    <p className="text-sm text-gray-600">Capacity: {table.capacity} guests</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TABLE_STATUS_STYLES[table.status] || "bg-gray-100"}`}>
                    {table.status}
                  </span>
                </div>

                {table.qrCode && (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                        typeof window !== "undefined" ? `${window.location.origin}/table/${table.qrCode}` : table.qrCode
                      )}`}
                      alt={`QR for ${table.name}`}
                      className="w-16 h-16"
                    />
                    <div className="text-xs text-gray-600">
                      <p className="flex items-center gap-1 font-semibold text-gray-800"><QrCode size={12} /> Table QR</p>
                      <p className="mt-0.5">{table.qrCode}</p>
                      <a href={`/table/${table.qrCode}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-semibold">
                        Preview table page →
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {["free", "occupied", "reserved", "inactive"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTableStatus(table._id, s)}
                      disabled={table.status === s}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                        table.status === s ? "bg-gray-100 text-gray-400 border-gray-200" : "border-gray-300 hover:border-orange-600 hover:text-orange-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  <button onClick={() => deleteTable(table._id)} className="ml-auto text-red-500 hover:text-red-700" title="Delete table">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== Time slots ===== */}
        <h2 className="text-2xl font-bold mb-4">Booking Slots</h2>

        <div className="bg-white p-5 rounded-lg shadow">
          <div className="flex flex-wrap gap-3 items-end mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start</label>
              <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End</label>
              <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((p) => ({ ...p, endTime: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Capacity</label>
              <input type="number" min="1" value={newSlot.capacity} onChange={(e) => setNewSlot((p) => ({ ...p, capacity: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg w-24" />
            </div>
            <button onClick={handleAddSlot} className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg">
              <Plus size={15} /> Add slot
            </button>
          </div>

          {slots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No slots on this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="py-2 px-3 font-semibold">Time</th>
                    <th className="py-2 px-3 font-semibold">Capacity</th>
                    <th className="py-2 px-3 font-semibold">Booked</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot: any) => (
                    <tr key={slot._id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-semibold">{slot.startTime} – {slot.endTime}</td>
                      <td className="py-2 px-3">{slot.capacity}</td>
                      <td className="py-2 px-3">{slot.booked}</td>
                      <td className="py-2 px-3">
                        {slot.booked >= slot.capacity ? (
                          <span className="text-red-600 font-semibold">Full</span>
                        ) : (
                          <span className="text-green-600 font-semibold">Open</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {slot.booked === 0 && (
                          <button onClick={() => deleteSlot(slot._id)} className="text-red-500 hover:text-red-700" title="Delete slot">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}