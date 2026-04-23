"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Lock, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

export function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }, 2000);
      } else {
        setError(data.error || "Có lỗi xảy ra.");
      }
    } catch (err) {
      setError("Không kết nối được đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <KeyRound size={20} className="text-primary-600 dark:text-primary-400"/> Đổi Mật Khẩu
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">Đổi thành công!</h4>
              <p className="text-sm text-slate-500 mt-2">Mật khẩu của bạn đã được cập nhật.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-semibold">{error}</div>}
              
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 block">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    required 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" 
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 block">Mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"} 
                    required 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" 
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 block">Xác nhận mật khẩu mới</label>
                <input 
                  type={showNew ? "text" : "password"} 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 dark:text-white" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Lưu Thay Đổi
              </button>
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
}
