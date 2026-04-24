import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { Bot, TrendingUp, Users, FileText, ArrowUpRight, Activity } from "lucide-react";
import { AdminChatbot } from "@/components/portal/AdminChatbot";
import { DashboardStats } from "@/components/portal/DashboardStats";
import { ActivityFeed } from "@/components/portal/ActivityFeed";
import { getDb } from "@/lib/db";


export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;

  let user: any = null;
  if (token) {
      try { user = verifyToken(token); } catch {}
  }

  if (!user) return null; // handled by layout

  const roles = user.roles || [];

  // Lấy dữ liệu thống kê từ PostgreSQL
  let totalNewLeads = 0;
  let totalPendingLeads = 0;
  try {
    const pool = getDb();
    
    // Đếm khách hàng mới trong tháng hiện tại
    const newLeadsRes = await pool.query(`
      SELECT COUNT(*) FROM crm_leads 
      WHERE date_trunc('month', created_at) = date_trunc('month', current_date)
    `);
    totalNewLeads = parseInt(newLeadsRes.rows[0].count, 10);

    // Đếm khách hàng đang chờ xử lý (status = NEW hoặc IN_PROGRESS)
    const pendingLeadsRes = await pool.query(`
      SELECT COUNT(*) FROM crm_leads 
      WHERE status IN ('NEW', 'IN_PROGRESS')
    `);
    totalPendingLeads = parseInt(pendingLeadsRes.rows[0].count, 10);
  } catch (e) {
    console.error("Lỗi lấy dữ liệu thống kê:", e);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12 relative z-10">
      
      {/* Decorative background blurs inside the scroll area */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/10 dark:bg-primary-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-40 left-0 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Xin chào, {user.name}! 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Theo dõi tổng quan tình hình hình doanh nghiệp hôm nay.</p>
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-2xl">
              <Users size={24} />
            </div>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-bold bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingUp size={14} className="mr-1" /> Live
            </span>
          </div>
          <div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Khách hàng mới (Tháng này)</h3>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{totalNewLeads}</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-start justify-between mb-4">
             <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-3 rounded-2xl">
              <FileText size={24} />
            </div>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-bold bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <TrendingUp size={14} className="mr-1" /> Live
            </span>
          </div>
          <div>
             <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Khách đang xử lý</h3>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{totalPendingLeads}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-primary-600 dark:to-primary-900 rounded-3xl p-6 shadow-lg text-white flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 cursor-pointer relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div className="bg-white/10 text-white p-3 rounded-2xl backdrop-blur-md border border-white/10">
              <Activity size={24} />
            </div>
            <ArrowUpRight size={20} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-300 dark:text-primary-100 text-sm font-medium mb-1">Hiệu suất Hệ thống</h3>
            <p className="text-xl font-bold text-white tracking-tight">Tối ưu 99.9%</p>
          </div>
        </div>
      </div>

      {/* Dashboard Analytics & Recharts */}
      <DashboardStats />

      {/* Chatbot & Activity Feed Split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Feature: Chatbot or Access Denied */}
        <div className="xl:col-span-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col h-[600px]">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Bot className="text-primary-600 dark:text-primary-400" size={20} />
              Trợ lý Tavitax AI
            </h2>
            <span className="text-xs font-bold px-3 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full uppercase tracking-wider">Online</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {roles.includes("chat") ? (
               <AdminChatbot />
            ) : (
               <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center flex-col text-slate-400">
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm border border-slate-100 dark:border-slate-700">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6">
                      <Bot size={40} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Chưa cấp quyền Chatbot</h3>
                    <p className="text-sm text-center text-slate-500 dark:text-slate-400 leading-relaxed">Tài khoản của bạn hiện tại không được cấp phép sử dụng công cụ Trợ lý AI. Vui lòng liên hệ Quản trị viên.</p>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="xl:col-span-1 h-[600px]">
          <ActivityFeed />
        </div>
      </div>

    </div>
  );
}
