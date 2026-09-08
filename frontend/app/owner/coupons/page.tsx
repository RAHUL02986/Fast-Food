"use client";
/**
 * Owner — Coupon management.
 * Owners create coupons and assign them to the entire menu or to one/multiple
 * specific products. Customers apply the code at checkout; the server
 * re-validates everything (validity, min order, product assignment) at order time.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { couponAPI, menuAPI, restaurantAPI } from "@/lib/api";
import type { Coupon, CouponDiscountType } from "@/types";
import { OwnerNav } from "@/components/Navs";

/** Format a Date for a datetime-local input */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDiscount = (coupon: Coupon) =>
  coupon.discountType === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`;

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage" as CouponDiscountType,
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  applyToAllItems: true,
  applicableItems: [] as string[],
  validFrom: "",
  validUntil: "",
  usageLimit: "",
};

export default function ManageCoupons() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restData = await restaurantAPI.getOwnerRestaurant();
        setRestaurant(restData.data);
        if (restData.data) {
          const [menuData, couponData] = await Promise.all([
            menuAPI.getMenuItems(restData.data._id),
            couponAPI.getCoupons(restData.data._id),
          ]);
          setMenuItems(menuData.data || []);
          setCoupons(couponData.data || []);
        }
      } catch (err: any) {
        console.error("Error fetching coupon data:", err);
        setError(err.message || "Could not load coupons");
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingCoupon(null);
    setShowForm(false);
    setError("");
    setItemSearch("");
  };

  const handleCreateClick = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Default validFrom to now so the coupon is immediately active
    setFormData({ ...EMPTY_FORM, validFrom: toLocalInput(now), validUntil: toLocalInput(nextWeek) });
    setEditingCoupon(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditClick = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || "",
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue != null ? String(coupon.discountValue) : "",
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : "",
      applyToAllItems: !!coupon.applyToAllItems,
      applicableItems: (coupon.applicableItems || []).map((i: any) => (typeof i === "string" ? i : i._id)),
      validFrom: coupon.validFrom ? toLocalInput(new Date(coupon.validFrom)) : "",
      validUntil: coupon.validUntil ? toLocalInput(new Date(coupon.validUntil)) : "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
    });
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleItemSelection = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicableItems: prev.applicableItems.includes(itemId)
        ? prev.applicableItems.filter((id) => id !== itemId)
        : [...prev.applicableItems, itemId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setError("");

    const payload: any = {
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      maxDiscount: formData.discountType === "percentage" ? Number(formData.maxDiscount) || 0 : 0,
      applyToAllItems: formData.applyToAllItems,
      applicableItems: formData.applyToAllItems ? [] : formData.applicableItems,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
      usageLimit: Number(formData.usageLimit) || 0,
    };

    if (!payload.code) return setError("Please enter a coupon code");
    if (!payload.discountValue || payload.discountValue <= 0) return setError("Please enter a discount value");
    if (!payload.applyToAllItems && payload.applicableItems.length === 0)
      return setError("Select at least one product, or choose 'Entire menu'");
    if (!payload.validUntil) return setError("Please choose a validity end date");

    setSaving(true);
    try {
      if (editingCoupon) {
        const res = await couponAPI.updateCoupon(restaurant._id, editingCoupon._id, payload);
        setCoupons((prev) => prev.map((c) => (c._id === editingCoupon._id ? res.data : c)));
      } else {
        const res = await couponAPI.createCoupon(restaurant._id, payload);
        setCoupons((prev) => [res.data, ...prev]);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Could not save the coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      const res = await couponAPI.toggleCoupon(restaurant._id, coupon._id, { isActive: !coupon.isActive });
      setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? res.data : c)));
    } catch (err: any) {
      alert(err.message || "Could not update the coupon");
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      await couponAPI.deleteCoupon(restaurant._id, coupon._id);
      setCoupons((prev) => prev.filter((c) => c._id !== coupon._id));
      if (editingCoupon && editingCoupon._id === coupon._id) resetForm();
    } catch (err: any) {
      alert(err.message || "Could not delete the coupon");
    }
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const isExpired = (coupon: Coupon) => !!coupon.validUntil && new Date(coupon.validUntil) < new Date();

  if (authLoading || loading) {
    return (
      <>
        <OwnerNav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <OwnerNav />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Coupons</h1>
              <p className="text-gray-600 text-sm mt-1">
                Create coupons and assign them to specific products or the entire menu.
              </p>
            </div>
            {!showForm && (
              <button
                onClick={handleCreateClick}
                className="bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-700 whitespace-nowrap"
              >
                + Create Coupon
              </button>
            )}
          </div>

          {!restaurant && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Register your restaurant first to create coupons.
            </div>
          )}

          {restaurant && showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">{editingCoupon ? `Edit Coupon ${editingCoupon.code}` : "New Coupon"}</h2>
              {error && <p className="bg-red-50 text-red-600 border border-red-200 rounded p-3 mb-4 text-sm">{error}</p>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Coupon Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. WELCOME50"
                      className="w-full border rounded px-3 py-2 uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. 50% off on starters"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Discount Type *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="discountType"
                          checked={formData.discountType === "percentage"}
                          onChange={() => setFormData((p) => ({ ...p, discountType: "percentage" }))}
                        />
                        Percentage (%)
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="discountType"
                          checked={formData.discountType === "flat"}
                          onChange={() => setFormData((p) => ({ ...p, discountType: "flat" }))}
                        />
                        Flat (₹)
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Discount Value * {formData.discountType === "percentage" ? "(%)" : "(₹)"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={formData.discountType === "percentage" ? 100 : undefined}
                      step="any"
                      value={formData.discountValue}
                      onChange={(e) => setFormData((p) => ({ ...p, discountValue: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>

                {/* Product assignment — entire menu or specific products */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="flex items-center gap-2 font-semibold text-sm">
                    <input
                      type="checkbox"
                      checked={formData.applyToAllItems}
                      onChange={(e) => setFormData((p) => ({ ...p, applyToAllItems: e.target.checked }))}
                    />
                    Apply to entire menu
                  </label>

                  {!formData.applyToAllItems && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold mb-2">
                        Assign products ({formData.applicableItems.length} selected) *
                      </p>
                      {menuItems.length === 0 ? (
                        <p className="text-sm text-gray-500">No menu items yet — add items from the Menu page first.</p>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            placeholder="Search products…"
                            className="w-full border rounded px-3 py-2 mb-2 text-sm bg-white"
                          />
                          <div className="max-h-56 overflow-y-auto border rounded bg-white divide-y">
                            {filteredItems.length === 0 ? (
                              <p className="p-3 text-sm text-gray-500">No products match your search</p>
                            ) : (
                              filteredItems.map((item) => (
                                <label
                                  key={item._id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.applicableItems.includes(item._id)}
                                    onChange={() => toggleItemSelection(item._id)}
                                  />
                                  <span className="flex-1 text-sm font-medium">{item.name}</span>
                                  <span className="text-xs text-gray-500">{item.category}</span>
                                  <span className="text-sm font-semibold">₹{item.price}</span>
                                </label>
                              ))
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Tip: select one product for a single-item offer, or multiple products for a combo offer.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData((p) => ({ ...p, minOrderAmount: e.target.value }))}
                      placeholder="0"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  {formData.discountType === "percentage" && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">Max Discount Cap (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData((p) => ({ ...p, maxDiscount: e.target.value }))}
                        placeholder="No cap"
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Valid From</label>
                    <input
                      type="datetime-local"
                      value={formData.validFrom}
                      onChange={(e) => setFormData((p) => ({ ...p, validFrom: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Valid Until *</label>
                    <input
                      type="datetime-local"
                      value={formData.validUntil}
                      onChange={(e) => setFormData((p) => ({ ...p, validUntil: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Usage Limit (total redemptions)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData((p) => ({ ...p, usageLimit: e.target.value }))}
                      placeholder="0 = unlimited"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-orange-600 text-white px-6 py-2 rounded font-bold hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    {saving ? "Saving…" : editingCoupon ? "Update Coupon" : "Create Coupon"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="border border-gray-300 px-6 py-2 rounded font-bold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {restaurant && !showForm && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">All Coupons ({coupons.length})</h2>
              </div>
              <div className="divide-y">
                {coupons.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No coupons yet. Create one to offer discounts on your products.
                  </div>
                ) : (
                  coupons.map((coupon) => {
                    const expired = isExpired(coupon);
                    const live = coupon.isActive && !expired;
                    const assignedNames = (coupon.applicableItems || []).map((i: any) =>
                      typeof i === "string" ? "Product" : i.name
                    );
                    return (
                      <div key={coupon._id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded tracking-wide">
                                {coupon.code}
                              </span>
                              <span className="font-semibold">{formatDiscount(coupon)}</span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  live
                                    ? "bg-green-100 text-green-700"
                                    : expired
                                    ? "bg-gray-200 text-gray-600"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {expired ? "Expired" : coupon.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {coupon.description && <p className="text-gray-600 text-sm mb-2">{coupon.description}</p>}
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <span className="font-semibold">Applies to:</span>{" "}
                                {coupon.applyToAllItems
                                  ? "Entire menu"
                                  : assignedNames.length > 0
                                  ? assignedNames.join(", ")
                                  : "—"}
                              </p>
                              <p>
                                <span className="font-semibold">Validity:</span>{" "}
                                {coupon.validFrom ? new Date(coupon.validFrom).toLocaleString() : "—"} →{" "}
                                {coupon.validUntil ? new Date(coupon.validUntil).toLocaleString() : "—"}
                              </p>
                              <p>
                                <span className="font-semibold">Min order:</span> ₹{coupon.minOrderAmount || 0}
                                {coupon.discountType === "percentage" && (coupon.maxDiscount ?? 0) > 0 && (
                                  <> · <span className="font-semibold">Cap:</span> ₹{coupon.maxDiscount}</>
                                )}
                                <> · <span className="font-semibold">Used:</span>{" "}
                                {coupon.usedCount || 0}
                                {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (unlimited)"}</>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end whitespace-nowrap">
                            <div className="flex gap-2">
                              <button onClick={() => handleEditClick(coupon)} className="text-blue-600 hover:underline text-sm">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(coupon)} className="text-red-600 hover:underline text-sm">
                                Delete
                              </button>
                            </div>
                            <button
                              onClick={() => handleToggle(coupon)}
                              disabled={expired}
                              className={`text-sm px-3 py-1 rounded border font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                                coupon.isActive
                                  ? "border-gray-300 text-gray-700 hover:bg-gray-100"
                                  : "border-green-500 text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {coupon.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
