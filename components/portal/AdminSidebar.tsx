"use client";

import { usePathname } from 'next/navigation';
import Link from "next/link";
import { LayoutDashboard, FileText, Newspaper, Users, ShieldAlert, Bot, FolderArchive, Calendar, ClipboardList } from "lucide-react";
import { CommandPalette } from "@/components/portal/CommandPalette";

export function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const permissions = user.permissions || [];

  const navItems = [
    { name: "Bảng điều khiển", href: "/", icon: <LayoutDashboard size={20} />, always: true },
    { name: "Lịch biểu Cơ quan", href: "/calendar", icon: <Calendar size={20} />, always: true },
    { name: "Quản trị Đầu việc", href: "/tasks", icon: <ClipboardList size={20} />, always: true },
    { name: "Mini CRM (Leads)", href: "/crm", icon: <Users size={20} />, role: "crm" },
    { name: "Tạo Báo Giá", href: "/quote", icon: <FileText size={20} />, role: "quote" },
    { name: "Quản lý Bài Viết", href: "/news/manage", icon: <Newspaper size={20} />, role: "news" },
    { name: "Kho Tài Liệu", href: "/documents", icon: <FolderArchive size={20} />, role: "docs" },
    { name: "Tài khoản nội bộ", href: "/users", icon: <ShieldAlert size={20} />, role: "users" },
  ];

  return (
    <>
      <div className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-primary-600 text-white p-2 rounded-xl">
            <Bot size={24} />
          </div>
          <span className="text-white font-extrabold tracking-wider text-base">TAVITAX PORTAL</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-4">
          {navItems.map((item) => {
            if (!item.always && item.role && !permissions.includes(item.role)) {
               return null;
            }
            // Active check: exact match cho '/', startsWith cho các route khác
            const isActive = item.href === '/'
              ? pathname === '/' || pathname === ''
              : pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    isActive 
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" 
                      : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-6 border-t border-slate-800">
          <div className="flex flex-col items-center justify-between text-xs text-slate-500 gap-2">
            <div className="bg-slate-800 px-3 py-1.5 rounded text-slate-400 font-bold border border-slate-700">Cmd/Ctrl + K để tìm kiếm</div>
            <span>&copy; {new Date().getFullYear()} Tavitax</span>
          </div>
        </div>
      </div>
      <CommandPalette />
    </>
  );
}
