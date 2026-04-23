"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, Users, Type, AlignLeft, Flag, Tag, Repeat } from "lucide-react";
import { MarkdownEditor } from "@/components/portal/MarkdownEditor";

const AVAILABLE_TAGS = [
  { id: 'Bug', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
  { id: 'Tính Năng', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { id: 'CSKH', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  { id: 'Tài Liệu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { id: 'Khẩn Cấp', color: 'bg-red-500 text-white shadow-md shadow-red-500/20' }
];

export function TaskAddModal({ isOpen, onClose, onSaved, boardId }: { isOpen: boolean; onClose: () => void; onSaved: () => void; boardId?: number | null }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [assignees, setAssignees] = useState<number[]>([]);
  
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("17:00");
  const [tags, setTags] = useState<string[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState("");

  const [contacts, setContacts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(""); setDescription(""); setPriority("NORMAL"); setAssignees([]); setDueDate(""); setTags([]); setRecurrenceRule("");
      fetch('/api/portal/chat/contacts')
        .then(res => res.json())
        .then(data => setContacts(data))
        .catch(()=>{});
    }
  }, [isOpen]);

  const toggleAssignee = (id: number) => {
    if (assignees.includes(id)) {
      setAssignees(assignees.filter(a => a !== id));
    } else {
      setAssignees([...assignees, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);

    let finalDueDate = null;
    if (dueDate && dueTime) {
      const d = new Date(dueDate);
      const [h, m] = dueTime.split(':');
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      finalDueDate = d.toISOString();
    }

    try {
      const res = await fetch("/api/portal/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, 
          description, 
          priority, 
          assignees: assignees,
          due_date: finalDueDate,
          board_id: boardId,
          tags,
          recurrence_rule: recurrenceRule === "" ? null : recurrenceRule
        })
      });
      if(res.ok) {
        onSaved();
        setTitle(""); setDescription(""); setAssignees([]); setDueDate("");
      }
    } catch(err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
               <Flag size={20} />
             </div>
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Tạo Công việc mới
             </h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          <div className="space-y-4">
             {/* Title */}
             <div className="flex gap-4 items-center">
                <Type className="text-slate-400" size={20} />
                <input 
                  type="text" required value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="Tiêu đề (VD: Lập báo cáo thuế Q3...)"
                  className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-2 outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-slate-200"
                />
             </div>

             {/* Description */}
             <div className="flex gap-4 items-start pt-2">
                <AlignLeft className="text-slate-400 mt-2" size={20} />
                <MarkdownEditor value={description} onChange={setDescription} />
             </div>

             {/* Assignees & Priority */}
             <div className="flex gap-4 items-start pt-2">
                <Users className="text-slate-400 mt-2" size={20} />
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao cho ai? <span className="text-xs text-slate-400 font-normal ml-1">({assignees.length} người)</span></span>
                    <select value={priority} onChange={e=>setPriority(e.target.value)} className="w-[120px] bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none font-bold cursor-pointer text-center
                      ${priority === 'HIGH' ? 'text-rose-600' : priority === 'NORMAL' ? 'text-amber-600' : 'text-slate-500'}
                    ">
                      <option value="LOW" className="text-slate-500">Thấp</option>
                      <option value="NORMAL" className="text-amber-600">Bình thường</option>
                      <option value="HIGH" className="text-rose-600">Cao điểm</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    {contacts.map(c => {
                      const isSelected = assignees.includes(c.id);
                      return (
                        <button 
                          key={c.id} 
                          type="button"
                          onClick={() => toggleAssignee(c.id)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-xs font-medium ${isSelected ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300 shadow-sm scale-105' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-indigo-300'}`}
                        >
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[8px]">
                             {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : c.name.charAt(0)}
                          </div>
                          {c.name.split(' ').pop()}
                        </button>
                      );
                    })}
                  </div>
                </div>
             </div>

             {/* Due Date */}
             <div className="flex gap-4 items-center pt-2">
                <Clock className="text-slate-400" size={20} />
                <div className="flex items-center gap-2 w-full text-slate-800 dark:text-slate-200">
                   <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none w-[140px]" />
                   <input type="time" value={dueTime} onChange={e=>setDueTime(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none w-[100px]" />
                   <span className="text-xs text-slate-400 ml-2 italic">(Hạn chót)</span>
                </div>
             </div>
             {/* Tags & Recurrence */}
             <div className="flex gap-4 items-start pt-2">
                <Tag className="text-slate-400 mt-2" size={20} />
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map(t => {
                      const isSelected = tags.includes(t.id);
                      return (
                        <button
                          key={t.id} type="button"
                          onClick={() => {
                            if(isSelected) setTags(tags.filter(tg => tg !== t.id));
                            else setTags([...tags, t.id]);
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${isSelected ? t.color + ' border-transparent scale-105' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}
                        >
                          {t.id}
                        </button>
                      )
                    })}
                  </div>
                </div>
             </div>

             <div className="flex gap-4 items-center pt-2">
                <Repeat className="text-slate-400" size={20} />
                <div className="flex items-center gap-2 w-full">
                   <select value={recurrenceRule} onChange={e=>setRecurrenceRule(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none flex-1 text-slate-700 dark:text-slate-300">
                     <option value="">Không lặp lại (Một lần)</option>
                     <option value="DAILY">Lặp Mỗi Ngày (Daily)</option>
                     <option value="WEEKLY">Lặp Hàng Tuần (Weekly)</option>
                     <option value="MONTHLY">Lặp Theo Tháng (Monthly)</option>
                   </select>
                   <span className="text-xs text-slate-400 italic">(Đẻ Task mới khi Hoàn thành)</span>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-sm">Hủy</button>
             <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 text-sm">
               {isSubmitting ? "Đang xử lý..." : "Giao việc ngay"}
             </button>
          </div>
        </form>

      </div>
    </div>
  );
}
