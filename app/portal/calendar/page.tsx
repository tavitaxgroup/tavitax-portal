"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Clock, Users, LayoutGrid, Rows4 } from "lucide-react";
import { EventAddModal } from "@/components/portal/EventAddModal";

const HOUR_HEIGHT = 60; // 60px per hour
const HOURS = Array.from({ length: 24 }).map((_, i) => i);

export default function CalendarPage({ params }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"MONTH" | "WEEK">("WEEK");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to 8 AM on initial load of Week View
  useEffect(() => {
    if (viewMode === "WEEK" && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT; // scroll to 8 AM
    }
  }, [viewMode]);

  const fetchEvents = async () => {
    setLoading(true);
    // Fetch a generous window around the current date (e.g. +/- 45 days) to cover both week and month views seamlessly
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0, 23, 59, 59);
    
    try {
      const res = await fetch(`/api/portal/calendar?start=${start.toISOString()}&end=${end.toISOString()}`);
      if(res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const removeEvent = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(!confirm("Bạn có chắc chắn muốn xóa lịch này?")) return;
    try {
      const res = await fetch(`/api/portal/calendar?id=${id}`, { method: 'DELETE' });
      if(res.ok) {
        setEvents(events.filter(ev => ev.id !== id));
      } else {
        alert("Bạn không có quyền xóa Lịch của người khác!");
      }
    } catch(e) {}
  };

  const nextRange = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };
  const prevRange = () => {
    if (viewMode === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };
  const today = () => setCurrentDate(new Date());

  const getTypeColor = (type: string, isSolid = false) => {
    if(type === 'MEETING') return isSolid ? "bg-primary-500 text-white" : "bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800/50 border-l-4 border-l-primary-500";
    if(type === 'TASK') return isSolid ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/50 border-l-4 border-l-amber-500";
    if(type === 'REMINDER') return isSolid ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/50 border-l-4 border-l-rose-500";
    return isSolid ? "bg-slate-500 text-white" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 border-l-4 border-l-slate-500";
  };

  // -------------------------------------------------------------
  // MONTH VIEW LOGIC
  // -------------------------------------------------------------
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  const offsetMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon to Sun mapping
  const blankDays = Array.from({ length: offsetMonth }).map((_, i) => i);
  const monthDaysArray = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

  // -------------------------------------------------------------
  // WEEK VIEW LOGIC
  // -------------------------------------------------------------
  const getStartOfWeek = (d: Date) => {
    const dt = new Date(d);
    const day = dt.getDay(); // 0 = Sun
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(dt.setDate(diff));
  };
  
  const weekStart = getStartOfWeek(currentDate);
  const weekDaysArray = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventPosition = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // Top position
    const topPx = (start.getHours() * HOUR_HEIGHT) + (start.getMinutes() / 60 * HOUR_HEIGHT);
    // Height
    const diffMs = end.getTime() - start.getTime();
    const diffMins = diffMs / (1000 * 60);
    const heightPx = Math.max((diffMins / 60) * HOUR_HEIGHT, 24); // min height 24px

    return { top: `${topPx}px`, height: `${heightPx}px` };
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-primary-600">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Lịch biểu Hệ thống
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Quản lý và điều phối luồng công việc tuyệt đối</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          
          {/* View Toggles */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setViewMode("WEEK")} 
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === "WEEK" ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Rows4 size={16} /> Tuần
            </button>
            <button 
              onClick={() => setViewMode("MONTH")} 
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === "MONTH" ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <LayoutGrid size={16} /> Tháng
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm leading-none">
            <button onClick={today} className="px-4 py-2 font-bold text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Hôm nay
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <button onClick={prevRange} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="w-40 text-center font-black text-slate-800 dark:text-slate-200 text-sm">
              {viewMode === "MONTH" 
                ? `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`
                : `${weekDaysArray[0].getDate()}/${weekDaysArray[0].getMonth()+1} - ${weekDaysArray[6].getDate()}/${weekDaysArray[6].getMonth()+1}, ${weekDaysArray[6].getFullYear()}`
              }
            </span>
            <button onClick={nextRange} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

        </div>
      </div>

      {/* View Engine */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative z-0">
        
        {viewMode === "MONTH" ? (
          // -------------------------------------------------------------
          // MONTH VIEW RENDER
          // -------------------------------------------------------------
          <>
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((day, idx) => (
                <div key={day} className={`p-3 sm:p-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider ${idx > 4 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
               <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 dark:bg-slate-800 gap-px min-h-full">
                 {blankDays.map(d => (
                   <div key={`blank-${d}`} className="bg-slate-50 dark:bg-slate-900/50 min-h-[120px]"></div>
                 ))}
                 
                 {monthDaysArray.map(day => {
                   const dObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                   const dateStr = dObj.toLocaleDateString("en-CA"); // YYYY-MM-DD local
                   const isToday = new Date().toLocaleDateString("en-CA") === dateStr;
                   const dayEvents = events.filter(e => new Date(e.start_time).toLocaleDateString("en-CA") === dateStr);

                   return (
                      <div 
                        key={day} 
                        onClick={() => { setSelectedDate(dObj); setIsAddModalOpen(true); }}
                        className="bg-white dark:bg-slate-900 min-h-[120px] p-1.5 sm:p-2 flex flex-col group hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer relative"
                      >
                        <div className="flex justify-between items-center mb-1 relative z-10">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold ${isToday ? 'bg-primary-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300'}`}>
                            {day}
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 z-10">
                          {dayEvents.map(e => {
                            const st = new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            return (
                              <div key={e.id} className={`px-1.5 py-1 rounded text-[10px] sm:text-xs relative group/item border 
                                ${e.type === 'MEETING' ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300' : ''}
                                ${e.type === 'TASK' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300' : ''}
                                ${e.type === 'REMINDER' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300' : ''}
                              `}>
                                <div className="font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-1.5">
                                  <span className="truncate">{e.title}</span>
                                  <span className="opacity-70 shrink-0 hidden lg:inline">{st}</span>
                                </div>
                                <button title="Xóa lịch" onClick={(evt) => removeEvent(evt, e.id)} className="hidden group-hover/item:flex absolute -top-1.5 -right-1.5 bg-rose-500 text-white w-4 h-4 rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                  <Trash2 size={8} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                   );
                 })}
                 
                 {Array.from({ length: 42 - (blankDays.length + monthDaysArray.length) }).map((_, i) => (
                    <div key={`end-blank-${i}`} className="bg-slate-50 dark:bg-slate-900/50 min-h-[120px]"></div>
                 ))}
               </div>
            </div>
          </>
        ) : (
          // -------------------------------------------------------------
          // WEEK VIEW (TIMELINE RENDER)
          // -------------------------------------------------------------
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
             
             {/* Timeline Grid (Scrollable) */}
             <div ref={scrollRef} className="flex-1 overflow-y-scroll overflow-x-hidden relative bg-slate-50 dark:bg-slate-950/20">

               {/* Week Header (Dates) - Sticky to align perfectly with scrollbar */}
               <div className="sticky top-0 z-40 flex border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shrink-0 shadow-sm">
                 <div className="w-14 sm:w-16 border-r border-slate-200 dark:border-slate-800 shrink-0"></div> {/* Gutter Space */}
                 <div className="flex-1 grid grid-cols-7 relative">
                   {weekDaysArray.map((d, idx) => {
                     const isToday = new Date().toLocaleDateString("en-CA") === d.toLocaleDateString("en-CA");
                     const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
                     return (
                       <div key={`head-${idx}`} className={`p-2 sm:p-4 text-center border-l first:border-l-0 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center`}>
                          <span className={`text-[10px] sm:text-xs font-bold uppercase ${idx > 4 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                            {dayNames[idx]}
                          </span>
                          <div className={`mt-1 w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-sm sm:text-lg font-black ${isToday ? 'bg-primary-600 text-white shadow-md' : 'text-slate-800 dark:text-slate-200'}`}>
                            {d.getDate()}
                          </div>
                       </div>
                     );
                   })}
                 </div>
               </div>

               <div className="flex relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                 
                 {/* Left Hour Axis */}
                 <div className="w-14 sm:w-16 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative z-10">
                   {HOURS.map(h => (
                     <div key={`hour-${h}`} className="relative border-b border-transparent" style={{ height: `${HOUR_HEIGHT}px` }}>
                       <span className="absolute -top-2 right-2 text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-1">
                         {h === 0 ? "" : `${h}:00`}
                       </span>
                     </div>
                   ))}
                 </div>

                 {/* 7 Days Columns & Absolute Events Grid */}
                 <div className="flex-1 grid grid-cols-7 relative">
                   
                   {/* Background Horizontal Lines (Shared across grid) */}
                   <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                      {HOURS.map(h => (
                        <div key={`line-${h}`} className="border-b border-slate-200 dark:border-slate-800/50 w-full shrink-0" style={{ height: `${HOUR_HEIGHT}px` }}></div>
                      ))}
                   </div>

                   {/* Vertical Event Columns */}
                   {weekDaysArray.map((d, colIdx) => {
                     const dateStr = d.toLocaleDateString("en-CA");
                     const dayEvents = events.filter(e => new Date(e.start_time).toLocaleDateString("en-CA") === dateStr);

                     return (
                       <div 
                         key={`col-${colIdx}`} 
                         className="relative border-l first:border-l-0 border-slate-200 dark:border-slate-800"
                         onClick={(e) => {
                           // Extract hour clicked
                           const rect = e.currentTarget.getBoundingClientRect();
                           const y = e.clientY - rect.top; // pixel offset within this col
                           const clickedHour = Math.floor(y / HOUR_HEIGHT);
                           const minutes = Math.floor(((y % HOUR_HEIGHT) / HOUR_HEIGHT) * 60);

                           const targetDate = new Date(d);
                           targetDate.setHours(clickedHour, minutes > 30 ? 30 : 0, 0, 0);
                           setSelectedDate(targetDate);
                           setIsAddModalOpen(true);
                         }}
                       >
                         {/* Cell Hover effects via empty divs logic or just general col hover */}
                         <div className="absolute inset-0 hover:bg-slate-500/5 dark:hover:bg-slate-400/5 cursor-pointer z-0 transition-colors"></div>

                         {/* Events */}
                         {dayEvents.map(e => {
                           const pos = getEventPosition(e.start_time, e.end_time);
                           const startTimeRaw = new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                           
                           return (
                             <div 
                               key={e.id}
                               onClick={(evt) => evt.stopPropagation()} // prevent clicking col underlying
                               className={`absolute left-1 right-1 sm:left-2 sm:right-2 rounded-md p-1.5 sm:p-2 border border-slate-200/50 dark:border-slate-700/50 shadow-sm opacity-90 hover:opacity-100 hover:shadow-md hover:scale-[1.02] transform transition-all z-10 group/timeitem overflow-hidden ${getTypeColor(e.type, false)} backdrop-blur-md`}
                               style={{ top: pos.top, height: pos.height, minHeight: '24px' }}
                             >
                                <div className="text-[10px] font-black opacity-80 leading-none mb-1">{startTimeRaw}</div>
                                <div className="text-xs font-bold leading-tight line-clamp-2">{e.title}</div>

                                {/* Absolute Delete Button */}
                                <button 
                                  title="Xóa lịch"
                                  onClick={(evt) => removeEvent(evt, e.id)} 
                                  className="hidden group-hover/timeitem:flex absolute top-1 right-1 bg-rose-500 text-white w-5 h-5 rounded-md items-center justify-center hover:bg-rose-600 transition-colors shadow"
                                >
                                  <Trash2 size={12} />
                                </button>
                             </div>
                           );
                         })}

                       </div>
                     );
                   })}
                 </div>

               </div>
             </div>

          </div>
        )}

      </div>

      <EventAddModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        selectedDate={selectedDate} 
        onSaved={() => {
          setIsAddModalOpen(false);
          fetchEvents();
        }}
      />

    </div>
  );
}
