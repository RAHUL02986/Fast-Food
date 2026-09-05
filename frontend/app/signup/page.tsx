"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
<<<<<<< HEAD
import { deliveryAPI, uploadAPI } from "@/lib/api";
import Link from "next/link";
import type { VehicleType } from "@/types";

type SignupMode = "customer" | "owner" | "delivery_partner";

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "bike", label: "🏍️ Bike" },
  { value: "scooter", label: "🛵 Scooter" },
  { value: "car", label: "🚗 Car" },
  { value: "bicycle", label: "🚲 Bicycle" },
  { value: "other", label: "🚚 Other" },
];
=======
import Link from "next/link";
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
<<<<<<< HEAD
  const [role, setRole] = useState<SignupMode>("customer");
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    invitationCode: "",
  });
  // Delivery partner specific fields
  const [partnerData, setPartnerData] = useState({
    vehicleType: "bike" as VehicleType,
    vehicleNumber: "",
    address: "",
    city: "",
  });
  const [avatar, setAvatar] = useState("");
  const [idDocument, setIdDocument] = useState("");
  const [uploading, setUploading] = useState(false);
=======
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

<<<<<<< HEAD
  const handlePartnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPartnerData((prev) => ({ ...prev, [name]: value }));
  };

  const selectRole = (r: SignupMode) => {
    setRole(r);
    setIsAdminSignup(false);
    setFormData((prev) => ({ ...prev, role: r === "owner" ? "owner" : "customer" }));
  };

  const uploadFile = async (file: File, target: "avatar" | "document") => {
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadAPI.uploadImage(file);
      if (target === "avatar") setAvatar(url);
      else setIdDocument(url);
    } catch (err: any) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

<<<<<<< HEAD
    // Validate admin signup
    if (isAdminSignup && !formData.invitationCode) {
      setError("Admin invitation code is required");
      return;
    }

    setLoading(true);

    try {
      if (role === "delivery_partner") {
        // Dedicated delivery partner registration — account starts "pending approval"
        const res = await deliveryAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          avatar: avatar || undefined,
          vehicleType: partnerData.vehicleType,
          vehicleNumber: partnerData.vehicleNumber,
          address: partnerData.address,
          city: partnerData.city,
          idDocument: idDocument || undefined,
        });
        localStorage.setItem("token", res.token);
        alert("Registration successful! Your account is pending admin approval.");
        router.push("/delivery");
        return;
      }

      const finalRole = isAdminSignup ? "admin" : role;

      const user = await signup(
        formData.name,
        formData.email,
        formData.password,
        finalRole,
        isAdminSignup ? formData.invitationCode : undefined,
        { phone: formData.phone || undefined }
      );
=======
    setLoading(true);

    try {
      const user = await signup(formData.name, formData.email, formData.password, formData.role);
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "owner") {
        router.push("/owner/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
<<<<<<< HEAD
          <img src="/logo.png" alt="Quick Food logo" className="h-16 w-[200px] rounded-xl object-cover mx-auto mb-4" />
=======
          <img src="/logo.png" alt="Quick Food logo" className="h-16 w-16 rounded-xl object-cover mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Quick Food</h1>
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
          <p className="text-center text-gray-600 mb-8">Create your account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
<<<<<<< HEAD
            <div className="pb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to sign up as</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => selectRole("customer")}
                  disabled={isAdminSignup}
                  className={`px-2 py-3 rounded-lg border-2 font-semibold text-sm transition disabled:opacity-40 ${
                    role === "customer" && !isAdminSignup
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-700 hover:border-orange-300"
                  }`}
                >
                  👤 Customer
                </button>
                <button
                  type="button"
                  onClick={() => selectRole("owner")}
                  disabled={isAdminSignup}
                  className={`px-2 py-3 rounded-lg border-2 font-semibold text-sm transition disabled:opacity-40 ${
                    role === "owner" && !isAdminSignup
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-700 hover:border-orange-300"
                  }`}
                >
                  🍽️ Restaurant Owner
                </button>
                <button
                  type="button"
                  onClick={() => selectRole("delivery_partner")}
                  disabled={isAdminSignup}
                  className={`px-2 py-3 rounded-lg border-2 font-semibold text-sm transition disabled:opacity-40 ${
                    role === "delivery_partner" && !isAdminSignup
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-700 hover:border-orange-300"
                  }`}
                >
                  🛵 Delivery Partner
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {role === "owner"
                  ? "Owners get a dashboard to manage their restaurant, menu, orders & tables."
                  : role === "delivery_partner"
                  ? "Deliver orders, manage your availability and track your earnings. Your account will be reviewed by an admin before you can accept deliveries."
                  : "Customers order food and book tables."}
              </p>
            </div>

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="your@email.com"
                required
              />
            </div>

<<<<<<< HEAD
            {(role === "customer" || role === "delivery_partner") && !isAdminSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">{role === "delivery_partner" ? "(customers & restaurants will contact you here)" : "(for OTP login)"}</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="9988776655"
                  required={role === "delivery_partner"}
                />
              </div>
            )}

            {role === "delivery_partner" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                  <select
                    name="vehicleType"
                    value={partnerData.vehicleType}
                    onChange={handlePartnerChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={partnerData.vehicleNumber}
                    onChange={handlePartnerChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. DL 8C AB 1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={partnerData.address}
                    onChange={handlePartnerChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Street / locality"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={partnerData.city}
                    onChange={handlePartnerChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Delhi"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "avatar")}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:font-semibold"
                    />
                    {avatar && <p className="text-xs text-green-600 mt-1">✓ Image uploaded</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID / Verification Document <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "document")}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:font-semibold"
                    />
                    {idDocument && <p className="text-xs text-green-600 mt-1">✓ Document uploaded</p>}
                  </div>
                </div>

                <p className="text-xs bg-orange-50 border border-orange-100 text-orange-700 rounded-lg px-3 py-2">
                  ℹ️ After registering, your account status will be <strong>Pending Approval</strong>. You will be able
                  to accept delivery assignments once an admin approves your account.
                </p>
              </>
            )}

            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdminSignup}
                  onChange={(e) => setIsAdminSignup(e.target.checked)}
                  className="w-4 h-4 text-orange-600"
                />
                <span className="text-sm font-medium text-gray-700">Register as Super Admin</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Admin account requires an invitation code</p>
            </div>

            {isAdminSignup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Invitation Code</label>
                <input
                  type="password"
                  name="invitationCode"
                  value={formData.invitationCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter invitation code"
                  required
                />
              </div>
            )}

=======
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="customer">Customer</option>
                <option value="owner">Restaurant Owner</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
