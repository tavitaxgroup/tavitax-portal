"use client";

import { useState } from "react";
import { Lock, User, LogIn, Loader2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Flow states
  const [mode, setMode] = useState<"login" | "forgot" | "otp" | "reset">("login");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        window.location.href = '/portal'; // Redirect to dashboard
      } else {
        const data = await res.json();
        setError(data.error || "Tài khoản hoặc mật khẩu không đúng.");
      }
    } catch (err) {
      setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMode("otp");
      } else {
        setError(data.error || "Có lỗi xảy ra.");
      }
    } catch (err) {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if(otp.length === 6) {
      setMode("reset");
    } else {
      setError("Mã OTP phải có 6 chữ số");
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Mật khẩu cập nhật thành công! Vui lòng đăng nhập lại.");
        setMode("login");
        setUsername(email);
        setPassword("");
      } else {
        setError(data.error || "Có lỗi xảy ra.");
      }
    } catch (err) {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-primary-600" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {mode === "login" ? "Đăng nhập Admin" : "Lấy lại mật khẩu"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {mode === "login" && "Truy cập cổng quản trị Tavitax"}
            {mode === "forgot" && "Nhập email tài khoản của bạn"}
            {mode === "otp" && "Nhập mã xác nhận lấy từ email"}
            {mode === "reset" && "Nhập mật khẩu mới"}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm font-semibold mb-6 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {successMsg && mode === "login" && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm font-semibold mb-6 flex items-center gap-2">
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Tên đăng nhập / Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={20} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                  placeholder="Nhập email tài khoản"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Mật khẩu</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setSuccessMsg(""); }}
                className="text-primary-600 hover:text-primary-800 text-sm font-semibold transition"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              Đăng nhập
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD MODE (Input Email) */}
        {mode === "forgot" && (
          <form onSubmit={handleSendOTP} className="space-y-6">
             <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Email đăng ký tài khoản</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={20} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                  placeholder="name@tavitax.com"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              Gửi Mã Xác Nhận
            </button>
            
            <button 
              type="button" onClick={() => setMode("login")}
              className="w-full text-slate-500 hover:text-slate-700 font-semibold py-2 text-sm"
            >
              Quay lại Đăng nhập
            </button>
          </form>
        )}

        {/* OTP MODE */}
        {mode === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm mb-4 border border-blue-100">
              Mã OTP 6 chữ số đã được gửi tới <strong>{email}</strong>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Mã xác nhận (OTP)</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-center tracking-[1em] text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="------"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={otp.length !== 6}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              Xác nhận mã
            </button>

            <button 
              type="button" onClick={() => setMode("login")}
              className="w-full text-slate-500 hover:text-slate-700 font-semibold py-2 text-sm"
            >
              Quay lại
            </button>
          </form>
        )}

        {/* RESET PASSWORD MODE */}
        {mode === "reset" && (
           <form onSubmit={handleResetPassword} className="space-y-6">
             <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Mật khẩu mới</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  placeholder="Nhập mật khẩu tĩnh"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              Lưu Mật Khẩu
            </button>
           </form>
        )}
        
      </div>
    </div>
  );
}
