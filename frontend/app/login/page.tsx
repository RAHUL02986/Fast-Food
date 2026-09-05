"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, requestOtp, loginWithOtp } = useAuth();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const afterLogin = (user: any) => {
    if (user.role === "admin") {
      router.push("/admin");
    } else if (user.role === "owner") {
      router.push("/owner/dashboard");
    } else if (user.role === "delivery_partner") {
      router.push("/delivery");
    } else {
      router.push("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      afterLogin(user);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const returnedOtp = await requestOtp(email);
      setOtpSent(true);
      setDevOtp(returnedOtp || "");
    } catch (err: any) {
      setError(err.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginWithOtp(email, otp);
      afterLogin(user);
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-visual">
          <div className="brand brand-dark"><span className="brand-mark"><img src="/logo.png" alt="Quick Food logo" /></span> quick food</div>
          <h2>Welcome back</h2>
          <p>Order, dine, and manage reservations in one place.</p>

          <div className="demo-boxes">
            <div className="demo-box">
              <span>Admin</span>
              <strong>admin@quickfood.com</strong>
            </div>
            <div className="demo-box">
              <span>Owner</span>
              <strong>owner@quickfood.com</strong>
            </div>
            <div className="demo-box">
              <span>Customer</span>
              <strong>customer@quickfood.com</strong>
            </div>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-header">
            <p className="eyebrow text-orange">Sign in</p>
            <h1>Access your account</h1>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "password" ? "auth-tab active" : "auth-tab"}
              onClick={() => { setMode("password"); setError(""); }}
            >
              Password
            </button>
            <button
              type="button"
              className={mode === "otp" ? "auth-tab active" : "auth-tab"}
              onClick={() => { setMode("otp"); setError(""); setOtpSent(false); setOtp(""); }}
            >
              OTP
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="field-wrap">
                <label>Email or Phone</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com or 9988776655"
                  required
                />
              </div>

              <div className="field-wrap">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="primary-btn full-width">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : otpSent ? (
            <form onSubmit={handleVerifyOtp} className="login-form">
              {devOtp && (
                <div className="form-info">
                  Demo OTP (no SMS provider configured): <strong>{devOtp}</strong>
                </div>
              )}
              <div className="field-wrap">
                <label>6-digit code sent to {email}</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="primary-btn full-width">
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => { setOtpSent(false); setOtp(""); setDevOtp(""); }}
              >
                ← Use a different identifier
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="login-form">
              <div className="field-wrap">
                <label>Email or Phone</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com or 9988776655"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="primary-btn full-width">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          <div className="login-footer">
            <p>
              Don’t have an account? <Link href="/signup">Create one</Link>
            </p>
            <p className="mt-2">
              <Link href="/" className="text-gray-500 hover:text-orange-600">← Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
