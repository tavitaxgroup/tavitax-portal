"use client";

import { useState, useEffect, useRef } from "react";
import { Search, PlusCircle, LayoutDashboard, Settings, FileText, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { TaskAddModal } from "@/components/portal/TaskAddModal";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bắt Ctrl + K hoặc Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen && !isTaskModalOpen) return null;

  const handleAction = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleCreateTask = () => {
    setIsOpen(false);
    setIsTaskModalOpen(true);
  };

  // Mock search Logic (co the ghep that sau)
  const results = [
    { type: 'Task', icon: PlusCircle, title: 'Tạo Task mới thật nhanh', action: handleCreateTask, badge: 'Phím tắt' },
    { type: 'Nav', icon: LayoutDashboard, title: 'Mở Bảng Dữ Liệu', action: () => handleAction('/') },
    { type: 'Nav', icon: FileText, title: 'Bảng quản trị Kanban', action: () => handleAction('/tasks') },
    { type: 'Nav', icon: Settings, title: 'Quản lý tài khoản', action: () => handleAction('/users') },
  ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || query === "");

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh]">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
              <Search className="text-slate-400" size={24} />
              <input 
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm kiếm hoặc gõ lệnh... (Thử: Tạo task)"
                className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-800 dark:text-slate-200"
              />
              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ESC để thoát</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
               {results.length > 0 ? (
                 <div className="flex flex-col gap-1">
                   {results.map((r, i) => (
                     <button key={i} onClick={r.action} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 group transition-all text-left w-full">
                       <div className="flex items-center gap-3">
                         <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-500">
                           <r.icon size={20} />
                         </div>
                         <div>
                           <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">{r.title}</div>
                           <div className="text-xs text-slate-400">{r.type}</div>
                         </div>
                       </div>
                       <ChevronRight className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                     </button>
                   ))}
                 </div>
               ) : (
                 <div className="p-8 text-center text-slate-400 font-medium text-sm">
                   Không tìm thấy kết quả nào cho "{query}"
                 </div>
               )}
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 text-center flex items-center justify-center gap-4">
              <span>Sử dụng mũi tên để di chuyển</span>
              <span>•</span>
              <span>Nhấn Enter để chọn</span>
            </div>

          </div>
        </div>
      )}

      {/* Global Task Modal Modal */}
      <TaskAddModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSaved={() => { setIsTaskModalOpen(false); router.push('/tasks'); }} />
    </>
  );
}
