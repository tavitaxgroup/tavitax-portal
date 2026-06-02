"use client";

import { useState, useEffect } from "react";
import { 
  Users, BarChart3, TrendingUp, Award, ArrowUpRight, 
  Loader2, RefreshCw, Layers, CheckSquare, Target
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, 
  BarChart, Bar
} from "recharts";

interface StatsData {
  kpis: {
    totalCustomers: number;
    totalLeads: number;
    newCustomersThisMonth: number;
    conversionRate: number;
  };
  departmentBreakdown: Array<{ name: string; value: number }>;
  servicesBreakdown: Array<{ name: string; count: number }>;
  growthTrend: Array<{
    name: string;
    customerCount: number;
    leadCount: number;
  }>;
}

const COLORS = [
  "#3b82f6", // Primary Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316"  // Orange
];

export default function CrmDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/crm/stats");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Lỗi fetchStats", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
        Đang tổng hợp dữ liệu phân tích hệ thống CRM...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-rose-500 font-medium">
        Không thể tải dữ liệu thống kê CRM. Vui lòng kiểm tra lại kết nối.
      </div>
    );
  }

  const { kpis, departmentBreakdown, servicesBreakdown, growthTrend } = data;

  return (
    <div className="space-y-6">
      
      {/* Action Header bar */}
      <div className="flex justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary-600" size={20} />
          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Báo cáo hiệu suất kinh doanh CRM</span>
        </div>
        <button 
          onClick={fetchStats}
          className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer"
        >
          <RefreshCw size={14} /> Cập nhật lại
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* KPI 1: Active Customers */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Khách hàng hiện tại</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{kpis.totalCustomers}</h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> Số khách hàng đã hợp tác
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/60 p-4 rounded-2xl group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/50 transition-colors">
            <Users className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
        </div>

        {/* KPI 2: Potential Leads */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Khách tiềm năng (Leads)</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{kpis.totalLeads}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              Phiếu khảo sát & Đăng ký tư vấn
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/60 p-4 rounded-2xl group-hover:bg-purple-100/50 dark:group-hover:bg-purple-900/50 transition-colors">
            <Target className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
        </div>

        {/* KPI 3: New Customers This Month */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Khách hàng mới tháng này</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">+{kpis.newCustomersThisMonth}</h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> Tăng trưởng thành viên mới
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-2xl group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/50 transition-colors">
            <Award className="text-emerald-600 dark:text-emerald-400" size={24} />
          </div>
        </div>

        {/* KPI 4: Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tỷ lệ chuyển đổi</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tight">{kpis.conversionRate}%</h3>
            <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5">
              Số khách / Tổng số leads đăng ký
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/60 p-4 rounded-2xl group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/50 transition-colors">
            <CheckSquare className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CHART A: 6-Month Growth Trend Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs md:col-span-2 flex flex-col">
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-600" />
            Xu hướng Tăng trưởng CRM (6 tháng gần đây)
          </h4>
          
          <div className="h-72 w-full flex-1 min-h-[250px] text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.9)", 
                    borderRadius: "16px",
                    border: "none",
                    color: "#fff"
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Area 
                  type="monotone" 
                  name="Khách hợp tác (Lũy kế)" 
                  dataKey="customerCount" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCust)" 
                />
                <Area 
                  type="monotone" 
                  name="Leads Mới trong tháng" 
                  dataKey="leadCount" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART B: Department Active Customers Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mb-6 flex items-center gap-2">
            <Layers size={16} className="text-primary-600" />
            Cơ cấu Khách hàng theo Phòng ban
          </h4>

          <div className="h-60 w-full flex-1 min-h-[200px] flex items-center justify-center text-xs relative">
            {departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {departmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "rgba(15, 23, 42, 0.9)", 
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 italic">Chưa có cơ cấu phòng ban.</p>
            )}
          </div>

          {/* Pie Legends list */}
          <div className="grid grid-cols-2 gap-2 mt-4 max-h-24 overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {departmentBreakdown.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Top Services Bar Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs flex flex-col">
        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mb-6 flex items-center gap-2">
          <BarChart3 size={16} className="text-primary-600" />
          Top Dịch vụ sử dụng nhiều nhất (Active Customers)
        </h4>

        <div className="h-72 w-full flex-1 min-h-[220px] text-xs">
          {servicesBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.9)", 
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff"
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Số khách đăng ký">
                  {servicesBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 italic">
              Chưa có dữ liệu dịch vụ đã đăng ký sử dụng.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
