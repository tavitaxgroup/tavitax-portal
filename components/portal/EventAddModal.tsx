"use client";

import { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, Users, Type, Eye, AlignLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function EventAddModal({ isOpen, onClose, selectedDate, onSaved }: { isOpen: boolean; onClose: () => void; selectedDate: Date | null; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("MEETING");
  const [visibility, setVisibility] = useState("PRIVATE");
  
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [contacts, setContacts] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<number[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch users for attendees
      fetch('/api/portal/users/search?q=')
        .then(res => res.json())
        .then(data => setContacts(data))
        .catch(()=>{});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !title) return;

    setIsSubmitting(true);

    const [sh, sm] = startTime.split(':');
    const start = new Date(selectedDate);
    start.setHours(parseInt(sh, 10), parseInt(sm, 10), 0, 0);

    const [eh, em] = endTime.split(':');
    const end = new Date(selectedDate);
    end.setHours(parseInt(eh, 10), parseInt(em, 10), 0, 0);

    try {
      const res = await fetch("/api/portal/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, start_time: start.toISOString(), end_time: end.toISOString(),
          type, visibility, attendees
        })
      });
      if(res.ok) {
        onSaved();
        setTitle(""); setDescription(""); setAttendees([]);
      }
    } catch(err) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl">
               <CalendarIcon size={20} />
             </div>
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Thêm Sự Kiện 
                <span className="text-sm font-medium text-slate-500 block">
                  {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
             </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
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
                  placeholder="Tiêu đề (VD: Họp giao ban, Check KPI...)"
                  className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-2 outline-none focus:border-primary-500 font-bold text-slate-800 dark:text-slate-200"
                />
             </div>

             {/* Time */}
             <div className="flex gap-4 items-center">
                <Clock className="text-slate-400" size={20} />
                <div className="flex items-center gap-2 w-full text-slate-800 dark:text-slate-200">
                   <input type="time" required value={startTime} onChange={e=>setStartTime(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none" />
                   <span className="text-slate-400">-</span>
                   <input type="time" required value={endTime} onChange={e=>setEndTime(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none" />
                </div>
             </div>

             {/* Type & Visibility */}
             <div className="flex gap-4 items-center">
                <Eye className="text-slate-400" size={20} />
                <div className="flex gap-2 w-full">
                  <select value={visibility} onChange={e=>setVisibility(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none text-slate-700 dark:text-slate-200 cursor-pointer">
                    <option value="PRIVATE">🔒 Lịch Nội Bộ (Chỉ Những người tham gia)</option>
                    <option value="PUBLIC">🌐 Lịch Công Ty (Tất cả mọi người)</option>
                  </select>
                  <select value={type} onChange={e=>setType(e.target.value)} className="w-1/3 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 outline-none text-slate-700 dark:text-slate-200 cursor-pointer text-center">
                    <option value="MEETING">Họp</option>
                    <option value="TASK">Công việc</option>
                    <option value="REMINDER">Nhắc nhở</option>
                  </select>
                </div>
             </div>

             {/* Description */}
             <div className="flex gap-4 items-start pt-2">
                <AlignLeft className="text-slate-400 mt-2" size={20} />
                <textarea 
                  value={description} onChange={e=>setDescription(e.target.value)}
                  placeholder="Thêm mô tả hoặc liên kết..." rows={3}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:border-primary-500 text-sm text-slate-700 dark:text-slate-200 resize-none"
                />
             </div>

             {/* Attendees */}
             <div className="flex gap-4 items-start pt-2">
                <Users className="text-slate-400 mt-2" size={20} />
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Thêm người tham gia</label>
                  <div className="flex flex-wrap gap-2">
                    {contacts.map(c => {
                      const isSelected = attendees.includes(c.id);
                      return (
                        <button
                          key={c.id} type="button"
                          onClick={() => setAttendees(isSelected ? attendees.filter(id => id !== c.id) : [...attendees, c.id])}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isSelected ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300'}`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-sm">Hủy</button>
             <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white transition disabled:opacity-50 text-sm">
               {isSubmitting ? "Đang xử lý..." : "Lưu sự kiện"}
             </button>
          </div>
        </form>

      </div>
    </div>
  );
}
