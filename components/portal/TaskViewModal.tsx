"use client";

import { useState, useEffect, useRef } from "react";
import { X, Clock, Users, AlignLeft, Flag, Send, Paperclip, ImageIcon, FileText, CheckSquare, Trash2, Plus, Tag, Activity, Repeat } from "lucide-react";
import { MarkdownRenderer } from "@/components/portal/MarkdownRenderer";

const AVAILABLE_TAGS = [
  { id: 'Bug', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
  { id: 'Tính Năng', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { id: 'CSKH', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  { id: 'Tài Liệu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { id: 'Khẩn Cấp', color: 'bg-red-500 text-white shadow-md shadow-red-500/20' }
];

export function TaskViewModal({ task, onClose }: { task: any; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [attachmentParams, setAttachmentParams] = useState<any>(null); // { url, type, name }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [assignees, setAssignees] = useState<number[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const [checklists, setChecklists] = useState<any[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  const loadChecklists = async () => {
    try {
      const res = await fetch(`/api/portal/tasks/checklists?taskId=${task.id}`);
      if(res.ok) setChecklists(await res.json());
    } catch(e){}
  };

  const addChecklist = async (e?: React.KeyboardEvent) => {
    if(e && e.key !== 'Enter') return;
    if(!newChecklistText.trim()) return;
    try {
       const res = await fetch("/api/portal/tasks/checklists", {
          method: "POST", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ task_id: task.id, content: newChecklistText })
       });
       if(res.ok) {
         setNewChecklistText("");
         loadChecklists();
       }
    } catch(e){}
  };

  const toggleChecklist = async (id: number, current: boolean) => {
    setChecklists(prev => prev.map(c => c.id === id ? {...c, is_completed: !current} : c));
    fetch("/api/portal/tasks/checklists", {
      method: "PUT", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ id, is_completed: !current })
    });
  };

  const deleteChecklist = async (id: number) => {
    setChecklists(prev => prev.filter(c => c.id !== id));
    fetch(`/api/portal/tasks/checklists?id=${id}`, { method: "DELETE" });
  };

  useEffect(() => {
    if (task && task.assignees_data) {
      setAssignees(task.assignees_data.map((a: any) => a.id));
    }
  }, [task]);

  const handleEditMembersClick = async () => {
    setIsEditingMembers(true);
    if(contacts.length === 0) {
      try {
        const res = await fetch('/api/portal/chat/contacts');
        setContacts(await res.json());
      } catch(e){}
    }
  };

  const toggleAssignee = (id: number) => {
    if (assignees.includes(id)) {
      setAssignees(assignees.filter(a => a !== id));
    } else {
      setAssignees([...assignees, id]);
    }
  };

  const handleSaveMembers = async () => {
    setIsSavingMembers(true);
    try {
      await fetch("/api/portal/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, assignees: assignees })
      });
      setIsEditingMembers(false);
      // Ghi chú: UX sẽ tự update sau 3 giây nhờ Poller ở trang gốc.
    } catch(e) {}
    setIsSavingMembers(false);
  };

  useEffect(() => {
    if (!task) return;
    
    const fetchComments = async () => {
      try {
        const [cmtRes, logRes] = await Promise.all([
          fetch(`/api/portal/tasks/comments?taskId=${task.id}`),
          fetch(`/api/portal/tasks/logs?taskId=${task.id}`)
        ]);

        let combinedFeed: any[] = [];
        
        if (cmtRes.ok) {
          const cmtData = await cmtRes.json();
          const mappedCmt = cmtData.map((c: any) => ({ ...c, type: 'comment' }));
          combinedFeed = [...combinedFeed, ...mappedCmt];
        }

        if (logRes.ok) {
          const logData = await logRes.json();
          const mappedLog = logData.map((l: any) => ({ ...l, type: 'log' }));
          combinedFeed = [...combinedFeed, ...mappedLog];
        }

        // Sort ascending by created_at
        combinedFeed.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setComments(combinedFeed);

      } catch(e) {}
    };

    fetchComments();
    loadChecklists();
    const poller = setInterval(fetchComments, 3000); // 3 seconds realtime sync
    return () => clearInterval(poller);
  }, [task]);

  if (!task) return null;

  const getPriorityColor = (p: string) => {
    if (p === 'HIGH') return 'text-rose-500 bg-rose-50 dark:bg-rose-900/30';
    if (p === 'NORMAL') return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
    return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
  };

  const statusMap: any = {
    'TODO': 'Cần làm',
    'IN_PROGRESS': 'Đang xử lý',
    'REVIEW': 'Chờ duyệt',
    'DONE': 'Hoàn thành'
  };

  const getLogMessage = (log: any) => {
    let raw = "đã cập nhật công việc";
    if (log.action === 'CREATED') raw = `đã khởi tạo thẻ công việc.`;
    if (log.action === 'STATUS_CHANGED') {
      const details = log.details || {};
      raw = `đã chuyển trạng thái sang <b>${statusMap[details.to] || details.to}</b>.`;
    }
    if (log.action === 'ASSIGNED') raw = `đã cập nhật danh sách người phụ trách (${log.details?.count} người).`;
    if (log.action === 'TAGGED') raw = `đã cập nhật Nhãn (Tags).`;
    if (log.action === 'RECURRED') raw = `đã Tự Động Kích Hoạt chu kỳ lặp (${log.details?.rule}). Một thẻ con mới đã được sinh ra!`;
    return <span dangerouslySetInnerHTML={{__html: raw}} />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachmentParams({
        url: dataUrl,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitComment = async () => {
    if (!newComment.trim() && !attachmentParams) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/portal/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          content: newComment,
          attachment_url: attachmentParams?.url,
          attachment_type: attachmentParams?.type,
          attachment_name: attachmentParams?.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment("");
        setAttachmentParams(null);
        setTimeout(() => {
          if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    } catch(e) {}
    
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800 relative flex flex-col max-h-[85vh]">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5 ${getPriorityColor(task.priority)}`}>
               <Flag size={12} /> {task.priority}
             </div>
             <div className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
               {statusMap[task.status] || task.status}
             </div>
             <h2 className="ml-2 font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* LẼ TRÁI: INFO TASK */}
          <div className="w-full lg:w-[350px] shrink-0 border-r border-slate-100 dark:border-slate-800 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {task.tags.map((tg: string) => {
                    const found = AVAILABLE_TAGS.find(x => x.id === tg);
                    return (
                      <span key={tg} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${found ? found.color : 'bg-slate-200 text-slate-600'} bg-opacity-80`}>
                        {tg}
                      </span>
                    )
                  })}
                </div>
              )}
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {task.title}
              </h1>
              <p className="text-xs text-slate-400 mt-2 font-medium">Giao bởi: <b className="text-indigo-500">{task.creator_name || "Sếp"}</b><br/>{new Date(task.created_at).toLocaleString('vi-VN')}</p>
            </div>

            <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
               <div>
                 <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                   <AlignLeft size={16} className="text-slate-400" /> Mô tả nhiệm vụ
                 </h3>
                 {task.description ? (
                   <div className="text-sm pl-6">
                     <MarkdownRenderer content={task.description} />
                   </div>
                 ) : (
                   <p className="text-sm text-slate-400 italic pl-6">Không có mô tả chi tiết.</p>
                 )}
               </div>
            </div>

            {/* CHECKLISTS SECTION */}
            <div className="mt-6 pl-1">
               <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 mb-3">
                 <span className="flex items-center gap-2"><CheckSquare size={16} className="text-slate-400" /> Bảng Kiểm Hành Động (Checklists)</span>
                 {checklists.length > 0 && (
                   <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                     {checklists.filter(c=>c.is_completed).length}/{checklists.length}
                   </span>
                 )}
               </h3>
               
               {checklists.length > 0 && (
                 <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-4 overflow-hidden">
                   <div className="bg-emerald-500 h-1.5 transition-all duration-500" style={{width: `${(checklists.filter(c=>c.is_completed).length / checklists.length) * 100}%`}}></div>
                 </div>
               )}

               <div className="space-y-2 mb-3">
                  {checklists.map(c => (
                    <div key={c.id} className="flex gap-2 items-start group">
                      <input type="checkbox" checked={c.is_completed} onChange={() => toggleChecklist(c.id, c.is_completed)} className="mt-1 w-4 h-4 cursor-pointer accent-emerald-500 rounded border-slate-300" />
                      <span className={`text-sm flex-1 ${c.is_completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{c.content}</span>
                      <button onClick={() => deleteChecklist(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><Trash2 size={14}/></button>
                    </div>
                  ))}
               </div>

               <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 shadow-sm">
                 <Plus size={16} className="text-slate-400" />
                 <input 
                   type="text" 
                   value={newChecklistText} 
                   onChange={e => setNewChecklistText(e.target.value)} 
                   onKeyDown={addChecklist}
                   placeholder="Thêm đầu việc con (Enter để lưu)..." 
                   className="flex-1 text-sm bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 py-1"
                 />
               </div>
            </div>

            <div className="flex flex-col gap-5 mt-6 pl-1">
               <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                       <Users size={16} className="text-slate-400" /> Thành viên tham gia
                    </h3>
                    {!isEditingMembers ? (
                       <button onClick={handleEditMembersClick} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md transition-colors">Sửa</button>
                    ) : (
                       <button onClick={handleSaveMembers} disabled={isSavingMembers} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-md transition-colors">{isSavingMembers ? "..." : "Lưu"}</button>
                    )}
                  </div>
                  
                  {isEditingMembers ? (
                    <div className="flex flex-wrap gap-2 pl-6 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                      {contacts.map(c => {
                        const isSelected = assignees.includes(c.id);
                        return (
                          <button 
                            key={c.id} type="button" onClick={() => toggleAssignee(c.id)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-all text-xs font-medium ${isSelected ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300 shadow-sm scale-105' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-indigo-300'}`}
                          >
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[8px]">{c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : c.name.charAt(0)}</div>
                            {c.name.split(' ').pop()}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    task.assignees_data && task.assignees_data.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pl-6">
                        {task.assignees_data.map((assignee: any) => (
                          <div key={assignee.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg shadow-sm">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-500">
                               {assignee.avatar_url ? <img src={assignee.avatar_url} className="w-full h-full object-cover" /> : assignee.name.charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{assignee.name.split(' ').pop()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic pl-6">Chưa có người phụ trách.</p>
                    )
                  )}
               </div>

               {task.due_date && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                      <Clock size={16} className={new Date(task.due_date) < new Date() && task.status !== 'DONE' ? 'text-rose-500' : 'text-slate-400'} /> Hạn chót (Deadline)
                    </h3>
                    <div className={`pl-6 text-sm font-bold ${new Date(task.due_date) < new Date() && task.status !== 'DONE' ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {new Date(task.due_date).toLocaleString('vi-VN')}
                      {new Date(task.due_date) < new Date() && task.status !== 'DONE' && <span className="ml-2 text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">QUÁ HẠN</span>}
                    </div>
                  </div>
               )}

               {task.recurrence_rule && (
                  <div className="pt-2">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                      <Repeat size={16} className="text-emerald-500" /> Tự động Lặp
                    </h3>
                    <div className="pl-6 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-max border border-emerald-200 dark:border-emerald-800">
                      {task.recurrence_rule === 'DAILY' ? 'Hàng ngày' : task.recurrence_rule === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}
                    </div>
                  </div>
               )}
            </div>
          </div>
          {/* LẼ PHẢI: THẢO LUẬN & BÁO CÁO */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 h-full">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Luồng báo cáo & Thảo luận</h3>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                {comments.length === 0 ? (
                  <div className="h-full flex items-center justify-center flex-col text-slate-400 opacity-50">
                     <Activity size={48} className="mb-4" />
                     <p className="font-medium">Chưa có theo dõi lịch sử nào</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-5 w-px bg-slate-200 dark:bg-slate-800 -z-10"></div>
                    {comments.map((c, i) => {
                      if (c.type === 'log') {
                         return (
                           <div key={`log-${c.id}`} className="flex gap-4 mb-5 items-center">
                             <div className="w-10 flex justify-center shrink-0">
                               <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900 pointer-events-none ring-4 ring-slate-50 dark:ring-slate-900/50"></div>
                             </div>
                             <div className="flex-1 text-xs text-slate-500 dark:text-slate-400">
                               <b className="text-slate-700 dark:text-slate-300 mr-1">{c.user_name || "Hệ thống"}</b>
                               {getLogMessage(c)}
                               <span className="ml-2 text-[10px] opacity-70 border-l border-slate-300 dark:border-slate-700 pl-2">
                                 {new Date(c.created_at).toLocaleString('vi-VN')}
                               </span>
                             </div>
                           </div>
                         );
                      }

                      return (
                        <div key={`cmt-${c.id}`} className="flex gap-4 animate-fade-in mb-6 relative">
                           <div className="w-10 h-10 rounded-full shrink-0 bg-slate-200 dark:bg-slate-700 text-[10px] border-2 border-white dark:border-slate-900 shadow-sm overflow-hidden flex items-center justify-center font-bold text-slate-500">
                              {c.user_avatar ? <img src={c.user_avatar} className="w-full h-full object-cover" /> : c.user_name.charAt(0)}
                           </div>
                           <div className="flex-1 space-y-1">
                              <div className="flex items-end gap-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.user_name}</span>
                                <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleTimeString('vi-VN')} {new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                              </div>
                              
                              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm w-fit max-w-[85%] text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {c.content && <p>{c.content}</p>}
                                
                                {c.attachment_url && (
                                  <div className="mt-3">
                                    {c.attachment_type?.startsWith('image/') ? (
                                      <a href={c.attachment_url} target="_blank"><img src={c.attachment_url} alt="attachment" className="rounded-xl max-h-48 border border-slate-200 dark:border-slate-700 object-contain hover:opacity-90" /></a>
                                    ) : (
                                      <a href={c.attachment_url} download={c.attachment_name} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400">
                                        <FileText className="text-indigo-500" size={24} />
                                        <span className="font-medium text-xs truncate max-w-xs">{c.attachment_name || 'Tài liệu đính kèm'}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>

             {/* CHAT BOX */}
             <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                
                {attachmentParams && (
                  <div className="mb-3 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800 max-w-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                       {attachmentParams.type.startsWith('image/') ? <ImageIcon size={16} className="text-indigo-500 shrink-0" /> : <FileText size={16} className="text-indigo-500 shrink-0" />}
                       <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">{attachmentParams.name}</span>
                    </div>
                    <button onClick={() => setAttachmentParams(null)} className="text-indigo-400 hover:text-indigo-700"><X size={16}/></button>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 transition-colors shadow-sm">
                   <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-xl transition-colors">
                      <Paperclip size={20} />
                   </button>
                   <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                   
                   <textarea
                     value={newComment} onChange={e=>setNewComment(e.target.value)}
                     placeholder="Báo cáo tiến độ / đính kèm ảnh..."
                     className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 text-sm outline-none resize-none text-slate-800 dark:text-slate-200"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
                     }}
                   />

                   <button onClick={submitComment} disabled={isSubmitting || (!newComment.trim() && !attachmentParams)} className="p-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-xl transition-colors shadow-md">
                      <Send size={20} className={isSubmitting ? 'animate-pulse' : ''} />
                   </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">Gõ <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Enter</kbd> để nộp báo cáo. Hệ thống sẽ nhắn tin cho các người liên quan.</p>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
}
