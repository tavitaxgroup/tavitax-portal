"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, ClipboardList, Clock, Flag, Search, Trash2 } from "lucide-react";
import { TaskAddModal } from "@/components/portal/TaskAddModal";
import { TaskViewModal } from "@/components/portal/TaskViewModal";

const AVAILABLE_TAGS = [
  { id: 'Bug', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
  { id: 'Tính Năng', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { id: 'CSKH', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  { id: 'Tài Liệu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { id: 'Khẩn Cấp', color: 'bg-red-500 text-white shadow-md shadow-red-500/20' }
];

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assignees_data?: { id: number; name: string; avatar_url: string }[];
  due_date?: string;
  created_at?: string;
  creator_name?: string;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'Cần làm', color: 'border-slate-300 dark:border-slate-600' },
  { id: 'IN_PROGRESS', title: 'Đang xử lý', color: 'border-amber-400' },
  { id: 'REVIEW', title: 'Chờ duyệt', color: 'border-purple-400' },
  { id: 'DONE', title: 'Hoàn thành', color: 'border-emerald-500' }
];

export default function KanbanTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [viewMode, setViewMode] = useState<'KANBAN' | 'GANTT'>('KANBAN');
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);

  const fetchBoards = async () => {
    try {
      const res = await fetch("/api/portal/boards");
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        if (data.length > 0 && !activeBoardId) setActiveBoardId(data[0].id);
      }
    } catch(e) {}
  };

  const fetchTasks = async (boardId?: number) => {
    const targetBoardId = boardId || activeBoardId;
    if (!targetBoardId) return;
    try {
      const res = await fetch(`/api/portal/tasks?boardId=${targetBoardId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (activeBoardId) {
      fetchTasks(activeBoardId);
      const poller = setInterval(() => {
        if (!isDraggingRef.current) fetchTasks(activeBoardId);
      }, 3000);
      return () => clearInterval(poller);
    }
  }, [activeBoardId]);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setActiveDragId(id);
    isDraggingRef.current = true;
    e.dataTransfer.setData("text/plain", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    if (!activeDragId) return;

    const task = tasks.find(t => t.id === activeDragId);
    if (!task || task.status === newStatus) {
      setActiveDragId(null);
      return;
    }

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === activeDragId ? { ...t, status: newStatus } : t));
    
    // API Sync
    try {
      await fetch("/api/portal/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeDragId, status: newStatus })
      });
    } catch {}

    setActiveDragId(null);
    isDraggingRef.current = false;
  };

  const removeTask = async (id: number) => {
    if(!confirm("Xóa thẻ công việc này?")) return;
    try {
      await fetch(`/api/portal/tasks?id=${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const getPriorityColor = (p: string) => {
    if (p === 'HIGH') return 'text-rose-500 bg-rose-50 dark:bg-rose-900/30';
    if (p === 'NORMAL') return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
    return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-indigo-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Quản trị Đầu việc
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <select 
                value={activeBoardId || ''} 
                onChange={e => setActiveBoardId(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 border-none text-sm font-bold text-slate-700 dark:text-slate-300 rounded-lg py-1 px-2 cursor-pointer outline-none hover:bg-slate-200 w-max appearance-none"
                title="Chuyển đổi Không gian làm việc"
              >
                {boards.map(b => (
                  <option key={b.id} value={b.id}>Bảng: {b.name}</option>
                ))}
              </select>
              <button 
                onClick={async () => {
                   const name = prompt("Nhập tên Bảng (Không gian) mới:");
                   if (name) {
                     const res = await fetch("/api/portal/boards", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name })
                     });
                     if (res.ok) {
                        const data = await res.json();
                        setBoards(prev => [...prev, data.board]);
                        setActiveBoardId(data.board.id);
                     }
                   }
                }}
                className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                + Bảng mới
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
            <button onClick={() => setViewMode('KANBAN')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'KANBAN' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Kanban</button>
            <button onClick={() => setViewMode('GANTT')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'GANTT' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Timeline</button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm tên việc..." className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 shadow-sm w-48" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95">
            <Plus size={16} /> Giao việc mới
          </button>
        </div>
      </div>

      {viewMode === 'KANBAN' && (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className="min-w-[300px] w-[320px] max-w-[350px] shrink-0 flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden snap-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-4 border-b ${col.color} bg-white dark:bg-slate-800/50 flex justify-between items-center shrink-0`}>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">{col.title}</h3>
                <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                {colTasks.map(task => {
                   const isDragging = activeDragId === task.id;
                   
                   return (
                     <div 
                       key={task.id}
                       draggable
                       onClick={(e) => {
                         // Ngăn không cho click khi đang kéo
                         if (!isDraggingRef.current) setSelectedTask(task);
                       }}
                       onDragStart={(e) => handleDragStart(e, task.id)}
                       onDragEnd={() => { setActiveDragId(null); isDraggingRef.current = false; }}
                       className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative ${isDragging ? 'opacity-40 scale-95 border-indigo-400 z-50' : ''}`}
                     >
                       <div className="flex justify-between items-start mb-2 gap-2">
                         <div className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase flex items-center gap-1 w-max ${getPriorityColor(task.priority)}`}>
                           <Flag size={10} /> {task.priority}
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); removeTask(task.id); }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={14} />
                         </button>
                       </div>

                       {task.tags && task.tags.length > 0 && (
                         <div className="flex flex-wrap gap-1 mb-2">
                           {task.tags.map((tg: string) => {
                             const found = AVAILABLE_TAGS.find(x => x.id === tg);
                             return (
                               <span key={tg} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${found ? found.color : 'bg-slate-100 text-slate-500'} bg-opacity-80`}>
                                 {tg}
                               </span>
                             )
                           })}
                         </div>
                       )}

                       <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 leading-snug">{task.title}</h4>

                       <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-3">
                         
                         {task.assignees_data && task.assignees_data.length > 0 ? (
                           <div className="flex items-center -space-x-2">
                             {task.assignees_data.map((assignee, idx) => (
                               <div key={assignee.id} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden text-[10px] flex items-center justify-center font-bold text-slate-500 border-2 border-white dark:border-slate-800 shadow-sm relative z-10" title={`Người xử lý: ${assignee.name}`} style={{ zIndex: 10 - idx }}>
                                 {assignee.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : assignee.name.charAt(0)}
                               </div>
                             ))}
                           </div>
                         ) : (
                           <span className="text-xs text-slate-400 italic">Chưa giao cho ai</span>
                         )}

                         {task.due_date && (
                           <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${new Date(task.due_date) < new Date() && task.status !== 'DONE' ? 'text-rose-500 border-rose-200 dark:border-rose-800/50' : 'text-slate-500'}`}>
                             <Clock size={12} /> {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month:'short' })}
                           </div>
                         )}
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          );
        })}
      </div>

      )}

      {viewMode === 'GANTT' && (
        (() => {
          const ganttTasks = tasks.filter(t => t.due_date);
          if (ganttTasks.length === 0) return <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center p-10 font-bold text-slate-400">Không có dữ liệu Timeline (Task chưa thiết lập Deadline).</div>;

          // Note: Add @ts-ignore for strict type checks on start_date as it was newly added to DB but interface might be missing it, using any to bypass
          const minDate = Math.min(...ganttTasks.map((t: any) => new Date(t.start_date || t.created_at || t.due_date).getTime()));
          const maxDate = Math.max(...ganttTasks.map((t: any) => new Date(t.due_date).getTime()));
          
          const chartStart = minDate - 3 * 24 * 60 * 60 * 1000;
          const chartEnd = maxDate + 3 * 24 * 60 * 60 * 1000;
          const totalDuration = chartEnd - chartStart;

          const days = [];
          for(let d = chartStart; d <= chartEnd; d += 24*60*60*1000) {
            days.push(new Date(d));
          }

          return (
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-auto p-4 shadow-inner custom-scrollbar relative">
              <div className="min-w-max pb-8">
                 <div className="flex border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-30">
                   <div className="w-[320px] shrink-0 font-bold text-sm text-slate-500 pl-2 uppercase tracking-wider flex items-center"><Flag size={14} className="mr-2"/> Đầu mục công việc</div>
                   <div className="flex-1 relative flex">
                      {days.map((day, i) => (
                        <div key={i} className={`flex-1 min-w-[40px] text-center text-[10px] font-bold py-1 rounded ${day.toLocaleDateString() === new Date().toLocaleDateString() ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}>
                          {day.getDate()}/{day.getMonth()+1}
                        </div>
                      ))}
                   </div>
                 </div>

                 <div className="space-y-3 relative">
                   <div className="absolute top-0 bottom-0 left-[320px] right-0 flex pointer-events-none opacity-20 z-0">
                      {days.map((d, i) => <div key={i} className={`flex-1 border-l ${d.toLocaleDateString() === new Date().toLocaleDateString() ? 'border-rose-400 bg-rose-500/5' : 'border-slate-300 dark:border-slate-700 dashed'} h-full min-h-[500px]`}></div>)}
                   </div>

                   {ganttTasks.map((task: any) => {
                      const s = new Date(task.start_date || task.created_at || task.due_date).getTime();
                      const e = new Date(task.due_date).getTime();
                      const left = ((s - chartStart) / totalDuration) * 100;
                      let width = ((e - s) / totalDuration) * 100;
                      if(width < 1.5) width = 1.5;

                      return (
                        <div key={task.id} className="flex items-center group relative z-10 cursor-pointer" onClick={() => setSelectedTask(task)}>
                          <div className="w-[320px] shrink-0 pr-4 pl-2">
                             <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-500 transition-colors" title={task.title}>{task.title}</h4>
                             <div className="flex items-center justify-between mt-1">
                                <div className="text-[10px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-1 py-0.5 rounded">{new Date(s).toLocaleDateString('vi-VN')} - {new Date(e).toLocaleDateString('vi-VN')}</div>
                                {task.assignees_data && task.assignees_data.length > 0 && (
                                   <div className="flex items-center -space-x-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-full px-0.5 shadow-sm">
                                     {task.assignees_data.map((assignee: any) => (
                                       <div key={assignee.id} className="w-4 h-4 rounded-full overflow-hidden text-[8px] flex items-center justify-center font-bold text-white bg-indigo-400 border border-white">
                                         {assignee.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : assignee.name.charAt(0)}
                                       </div>
                                     ))}
                                   </div>
                                )}
                             </div>
                          </div>
                          <div className="flex-1 relative h-6 bg-transparent">
                            <div 
                              className={`absolute top-0 bottom-0 rounded-md shadow-sm flex items-center px-2 overflow-hidden transition-all group-hover:brightness-110 group-hover:scale-y-105 active:scale-95 ${task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-indigo-500'} bg-opacity-90`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            >
                               <span className="text-[10px] font-bold text-white truncate drop-shadow-md">{task.title}</span>
                            </div>
                          </div>
                        </div>
                      );
                   })}
                 </div>
              </div>
            </div>
          );
        })()
      )}

      <TaskAddModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={() => { setIsModalOpen(false); fetchTasks(activeBoardId || undefined); }} boardId={activeBoardId} />
      <TaskViewModal task={selectedTask} onClose={() => setSelectedTask(null)} />

    </div>
  );
}
