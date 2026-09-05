"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import Link from "next/link";
import {
  Activity,
  Bike,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import type { DeliveryOverviewStats } from "@/types";

const fmt = (n?: number | null) =>
  `₹${(typeof n === "number" ? n : 0).toLocaleString("en-IN")}`;

export default function AdminDeliveryOverview() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DeliveryOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await deliveryAPI.getOverview();
        setData(res.data);
      } catch (err) {
        console.error("Error fetching delivery overview:", err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user?.role === "admin") fetch();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const p = data?.partners || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Delivery Management</h1>
        <p className="text-gray-500 text-sm mb-6">
          Overview of delivery partners, active orders, and earnings.
        </p>

        {/* Partner Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard icon={<Users size={18} />} label="Total Partners" value={p.total || 0} color="bg-blue-50 text-blue-700" />
          <StatCard icon={<Clock size={18} />} label="Pending" value={p.pending || 0} color="bg-amber-50 text-amber-700" />
          <StatCard icon={<Activity size={18} />} label="Active" value={p.active || 0} color="bg-green-50 text-green-700" />
          <StatCard icon={<Bike size={18} />} label="Available" value={p.available || 0} color="bg-purple-50 text-purple-700" />
          <StatCard icon={<AlertCircle size={18} />} label="Suspended" value={p.suspended || 0} color="bg-red-50 text-red-700" />
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Package size={18} />} label="Waiting Assignment" value={data?.ordersWaitingForAssignment || 0} color="bg-orange-50 text-orange-700" />
          <StatCard icon={<Bike size={18} />} label="Active Deliveries" value={data?.activeDeliveries || 0} color="bg-indigo-50 text-indigo-700" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Completed Today" value={data?.completedToday || 0} color="bg-green-50 text-green-700" />
          <StatCard icon={<TrendingUp size={18} />} label="Total Completed" value={data?.completedDeliveries || 0} color="bg-teal-50 text-teal-700" />
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm font-semibold mb-1">Total Delivery Revenue</p>
            <p className="text-2xl font-bold text-orange-600">{fmt(data?.totalDeliveryCharges)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm font-semibold mb-1">Partner Earnings</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(data?.partnerEarnings)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm font-semibold mb-1">Platform Earnings</p>
            <p className="text-2xl font-bold text-green-600">{fmt(data?.adminEarnings)}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickLink href="/admin/delivery/partners" label="Delivery Partners" icon={<Users size={20} />} />
          <QuickLink href="/admin/delivery/pending" label="Pending Approvals" icon={<Clock size={20} />} />
          <QuickLink href="/admin/delivery/active" label="Active Deliveries" icon={<Bike size={20} />} />
          <QuickLink href="/admin/delivery/unassigned" label="Unassigned Orders" icon={<Package size={20} />} />
          <QuickLink href="/admin/delivery/completed" label="Completed Deliveries" icon={<CheckCircle2 size={20} />} />
          <QuickLink href="/admin/delivery/earnings" label="Earnings" icon={<DollarSign size={20} />} />
          <QuickLink href="/admin/delivery/payouts" label="Payouts" icon={<TrendingUp size={20} />} />
          <QuickLink href="/admin/delivery/settings" label="Settings" icon={<Activity size={20} />} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md transition border border-gray-100"
    >
      <span className="text-orange-600">{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
    </Link>
  );
}
