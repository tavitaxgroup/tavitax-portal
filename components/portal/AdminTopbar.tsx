"use client";

import { LogOut, User as UserIcon, Bell, Search, Sun, Moon, KeyRound, Activity, Settings, HelpCircle, CheckCircle2, Clock, MinusCircle, ChevronDown, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/portal/ThemeProvider";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { InternalChatWidget } from "./InternalChatWidget";

export function AdminTopbar({ user }: { user: any }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  // Status Local State
  const [status, setStatus] = useState("ONLINE"); // ONLINE, BUSY, AWAY

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch user status on mount
    fetch('/api/portal/profile/status')
      .then(res => res.json())
      .then(data => { if (data.status) setStatus(data.status); })
      .catch(e => console.error(e));

    // Poll Unread Messages
    const fetchUnread = () => {
      fetch('/api/portal/chat/unread').then(res=>res.json()).then(d => setUnreadChatCount(d.unread || 0)).catch(()=>{});
    };
    fetchUnread();
    const unreadInterval = setInterval(fetchUnread, 5000);
    return () => clearInterval(unreadInterval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        fetch(`/api/portal/users/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => { setSearchResults(data); setIsSearching(false); })
          .catch(() => setIsSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await fetch('/api/portal/profile/status', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const getStatusDisplay = () => {
    switch(status) {
      case "ONLINE": return { color: "bg-emerald-500", text: "Sẵn sàng" };
      case "BUSY": return { color: "bg-rose-500", text: "Đang bận" };
      case "AWAY": return { color: "bg-amber-500", text: "Tạm vắng" };
      default: return { color: "bg-slate-400", text: "Offline" };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 p-4 px-8 flex justify-between items-center h-20 sticky top-0 z-10 transition-colors duration-300">
      <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 w-1/3 relative" ref={searchRef}>
         <Search size={20} />
         <input 
           type="text" 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           onFocus={() => {if(searchQuery.length > 1) setSearchQuery(searchQuery + ' '); setSearchQuery(searchQuery.trim());}}
           placeholder="Tra cứu tên hoặc email nhân viên..." 
           className="bg-transparent border-none outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 w-full dark:text-slate-200"
         />
         
         {/* Live Search Results Dropdown */}
         {searchResults.length > 0 && (
           <div className="absolute top-full left-0 mt-3 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden py-2 z-50 animate-fade-in origin-top">
             <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">Danh bạ tổ chức ({searchResults.length})</div>
             {searchResults.map((emp) => (
               <button 
                 key={emp.id}
                 onClick={() => {
                   router.push(`/directory/${emp.id}`);
                   setSearchResults([]);
                   setSearchQuery("");
                 }}
                 className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/30 last:border-0"
               >
                 <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 font-bold overflow-hidden shrink-0 relative">
                   {emp.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : emp.name.charAt(0).toUpperCase()}
                   <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 ${emp.status === 'ONLINE' ? 'bg-emerald-500' : (emp.status === 'BUSY' ? 'bg-rose-500' : 'bg-slate-400')}`}></span>
                 </div>
                 <div className="overflow-hidden">
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{emp.name}</p>
                   <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{emp.job_title || emp.username}</p>
                 </div>
               </button>
             ))}
           </div>
         )}
         
         {isSearching && (
           <div className="absolute right-0 top-1/2 -translate-y-1/2">
             <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
           </div>
         )}
      </div>
      
      <div className="flex items-center gap-5">

        <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-3 -my-1.5 -mx-3 rounded-2xl transition-all cursor-pointer group"
          >
            <div className="text-right hidden md:block">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">{user.name}</div>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-end gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${statusDisplay.color}`}></span>
                {statusDisplay.text}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center border-2 border-primary-50 dark:border-primary-800 relative">
              <UserIcon size={18} className="text-primary-700 dark:text-primary-400" />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${statusDisplay.color}`}></span>
            </div>
            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Overlay for clicking outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              ></div>
              
              <div className="absolute right-0 mt-4 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden py-2 z-50 animate-fade-in origin-top-right">
                
                {/* Header Information */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/80 mb-2 bg-slate-50/50 dark:bg-slate-900/50">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">{user.username}</p>
                </div>

                {/* Status Selector */}
                <div className="px-5 py-2 mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Trạng thái</p>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    <button 
                      onClick={() => handleStatusChange("ONLINE")}
                      className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${status === "ONLINE" ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600"}`}
                      title="Sẵn sàng"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleStatusChange("BUSY")}
                      className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${status === "BUSY" ? "bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400" : "text-slate-400 hover:text-slate-600"}`}
                      title="Đang bận"
                    >
                      <MinusCircle size={16} />
                    </button>
                    <button 
                      onClick={() => handleStatusChange("AWAY")}
                      className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${status === "AWAY" ? "bg-white dark:bg-slate-700 shadow-sm text-amber-500 dark:text-amber-400" : "text-slate-400 hover:text-slate-600"}`}
                      title="Tạm vắng"
                    >
                      <Clock size={16} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-2"></div>

                {/* Primary Features */}
                <div className="px-2">
                  <button onClick={() => { setIsDropdownOpen(false); router.push("/directory/me"); }} className="w-full text-left px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors flex items-center gap-3">
                    <UserIcon size={16} /> Thông tin cá nhân
                  </button>
                  <button onClick={() => { setIsDropdownOpen(false); alert("Đang phát triển trang Lịch sử cá nhân"); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors flex items-center gap-3">
                    <Activity size={16} /> Lịch sử hoạt động
                  </button>
                  <button onClick={() => { setIsDropdownOpen(false); alert("Đang phát triển thiết lập Thông báo"); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors flex items-center gap-3">
                    <Settings size={16} /> Cài đặt thông báo
                  </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-2"></div>

                {/* User Settings */}
                <div className="px-2">
                  {mounted && (
                    <button 
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />} 
                        Giao diện {theme === "dark" ? 'Tối' : 'Sáng'}
                      </div>
                      <div className="w-8 h-4 bg-primary-100 dark:bg-primary-900 rounded-full relative">
                        <div className={`absolute top-0.5 w-3 h-3 bg-primary-600 rounded-full transition-all ${theme === "dark" ? "right-0.5" : "left-0.5"}`}></div>
                      </div>
                    </button>
                  )}
                  <button onClick={() => { setIsDropdownOpen(false); setIsPasswordModalOpen(true); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors flex items-center gap-3">
                    <KeyRound size={16} /> Đổi mật khẩu
                  </button>
                  <button onClick={() => { setIsDropdownOpen(false); alert("Mở trang hướng dẫn"); }} className="w-full text-left px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors flex items-center gap-3">
                    <HelpCircle size={16} /> Trung tâm trợ giúp
                  </button>
                </div>
                
                <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-2"></div>

                {/* Logout */}
                <div className="px-2">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <LogOut size={16} /> Đăng xuất hệ thống
                  </button>
                </div>
                
              </div>
            </>
          )}
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      {mounted && typeof document !== "undefined" && createPortal(
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="fixed bottom-6 right-6 z-[8000] bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-2xl hover:shadow-primary-500/50 transition-all hover:-translate-y-1 group"
        >
          <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 text-[10px] text-white flex items-center justify-center font-bold animate-bounce shadow-sm">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>,
        document.body
      )}

      <InternalChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentUserId={user.id} />
    </div>
  );
}
