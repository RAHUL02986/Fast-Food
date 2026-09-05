"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { adminAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  reviewing: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

const CATEGORIES = ["", "order", "food-quality", "delivery", "booking", "staff", "other"];

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const fetchReports = () => {
    adminAPI
      .getReports({ status: status || undefined })
      .then((data) => setReports(data.data || []))
      .catch((error) => console.error("Error fetching reports:", error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") fetchReports();
  }, [authLoading, user, status]);

  const updateReport = async (id: string, newStatus: string) => {
    try {
      await adminAPI.updateReport(id, { status: newStatus });
      fetchReports();
    } catch (err: any) {
      alert(err.message || "Error updating report");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading reports...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Complaints & Reports</h1>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            {["", "open", "reviewing", "resolved", "dismissed"].map((s) => (
              <option key={s} value={s}>{s === "" ? "All" : s}</option>
            ))}
          </select>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">No reports found.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((r: any) => (
              <div key={r._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{r.subject}</h3>
                    <p className="text-sm text-gray-600">
                      by {r.customer?.name} ({r.customer?.email})
                      {r.restaurant?.name ? <> · about <strong>{r.restaurant.name}</strong></> : null}
                      {r.order?.orderNumber ? <> · order {r.order.orderNumber}</> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] || "bg-gray-100"}`}>
                      {r.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{r.category}</p>
                  </div>
                </div>

                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 mb-3 text-sm">{r.description}</p>
                {r.adminNotes && <p className="text-xs text-gray-500 mb-3"><strong>Admin notes:</strong> {r.adminNotes}</p>}

                <div className="flex gap-2 flex-wrap">
                  {["reviewing", "resolved", "dismissed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateReport(r._id, s)}
                      disabled={r.status === s}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                        r.status === s
                          ? "bg-gray-100 text-gray-400 border-gray-200"
                          : "border-gray-300 hover:border-orange-600 hover:text-orange-600"
                      }`}
                    >
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}