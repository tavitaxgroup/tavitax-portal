"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, X, Send, Paperclip, Loader2, FileText, CheckCheck, Trash2, Heart, ThumbsUp, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

const POLL_INTERVAL = 3000;

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢"];

export function InternalChatWidget({ isOpen, onClose, currentUserId }: { isOpen: boolean; onClose: () => void; currentUserId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activePeer, setActivePeer] = useState<any>(null); // { id, name, ... }
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Contacts
  useEffect(() => {
    let interval: any;
    const fetchContacts = async () => {
      try {
        const res = await fetch("/api/portal/chat/contacts");
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
        }
      } catch (e) {}
    };

    if (isOpen) {
      setLoadingContacts(true);
      fetchContacts().finally(() => setLoadingContacts(false));
      interval = setInterval(fetchContacts, POLL_INTERVAL * 2); 
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  // Load Messages for Active Peer
  useEffect(() => {
    let interval: any;
    const fetchMessages = async () => {
      if (!activePeer || !isOpen) return;
      try {
        const res = await fetch(`/api/portal/chat/history?userId=${activePeer.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(prev => {
            // Need to deeply serialize to compare or just assume polling might update reactions/read status
            if (JSON.stringify(prev) !== JSON.stringify(data)) {
               setTimeout(scrollToBottom, 50);
               return data;
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    if (activePeer && isOpen) {
      setLoadingMessages(true);
      fetchMessages().finally(() => setLoadingMessages(false));
      interval = setInterval(fetchMessages, POLL_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [activePeer, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e?: React.FormEvent, attachmentData?: any) => {
    if(e) e.preventDefault();
    if (!activePeer) return;

    if (!attachmentData && !messageInput.trim()) return;

    const tmpMsg = { 
      id: "tmp-" + Date.now(), 
      sender_id: currentUserId, 
      receiver_id: activePeer.id, 
      content: messageInput, 
      created_at: new Date().toISOString(),
      status: "ACTIVE",
      attachment_url: attachmentData?.url || null,
      attachment_type: attachmentData?.type || null,
      attachment_name: attachmentData?.name || null,
      reactions: {}
    };
    
    setMessages(prev => [...prev, tmpMsg]);
    setMessageInput("");
    setTimeout(scrollToBottom, 10);

    try {
      await fetch("/api/portal/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          receiver_id: activePeer.id, 
          content: tmpMsg.content,
          attachment_url: tmpMsg.attachment_url,
          attachment_type: tmpMsg.attachment_type,
          attachment_name: tmpMsg.attachment_name
        })
      });
      // the next poll will pull the real DB message
    } catch (e) {
      console.error("Lỗi gửi tin nhắn");
    }
  };

  // Upload Avatar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    if(file.size > 15 * 1024 * 1024) {
      alert("Dung lượng vượt quá 15MB");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/portal/chat/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        await handleSendMessage(undefined, data);
      } else {
        alert("Lỗi tải tệp: " + (data.error || ""));
      }
    } catch (err) {
      alert("Mất kết nối máy chủ");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRevoke = async (msgId: any) => {
    if(typeof msgId === "string" && msgId.startsWith("tmp")) return; // ignore temp
    try {
      await fetch("/api/portal/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, action: "REVOKE" })
      });
      // Will auto update on next tick
      setMessages(messages.map(m => m.id === msgId ? { ...m, status: "REVOKED" } : m));
    } catch {}
  };

  const handleReact = async (msgId: any, emoji: string) => {
    if(typeof msgId === "string" && msgId.startsWith("tmp")) return;
    try {
      await fetch("/api/portal/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, action: "REACT", payload: emoji })
      });
      setMessages(messages.map(m => {
        if(m.id === msgId) {
          return { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions?.[emoji] || 0) + 1 }};
        }
        return m;
      }));
    } catch {}
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] transition-opacity" onClick={onClose}></div>
      <div className="fixed bottom-24 right-6 h-[80vh] min-h-[400px] max-h-[700px] w-[360px] sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-[9999] flex flex-col animate-scale-up rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-100 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 shadow-sm z-10">
          <div className="flex items-center gap-2">
            {activePeer && (
              <button onClick={() => setActivePeer(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 mr-1 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <MessageSquare size={20} className="text-primary-600" />
            {activePeer ? (
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{activePeer.name}</h3>
                <span className={`text-[10px] font-medium leading-none ${activePeer.status === 'ONLINE' ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {activePeer.status === 'ONLINE' ? 'Đang trực tuyến' : (activePeer.status === 'BUSY' ? 'Đang bận' : 'Tạm vắng')}
                </span>
              </div>
            ) : (
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Nhắn tin nội bộ</h3>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50 dark:bg-slate-900/50">
          {!activePeer ? (
             <div className="flex-1 overflow-y-auto">
               {loadingContacts ? (
                 <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
               ) : contacts.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">Chưa có người dùng nào.</div>
               ) : (
                 <div className="p-2 space-y-1">
                   {contacts.map((c: any) => (
                     <button key={c.id} onClick={() => setActivePeer(c)} className="w-full flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-left group">
                       <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0 border border-transparent group-hover:border-primary-200 relative overflow-hidden">
                         {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : <span className="font-bold text-primary-600 text-lg">{c.name.charAt(0)}</span>}
                         <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${c.status === 'ONLINE' ? 'bg-emerald-500' : (c.status === 'BUSY' ? 'bg-rose-500' : 'bg-slate-400')}`}></span>
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <div className="flex justify-between items-center mb-0.5">
                           <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                           {c.last_time && <span className="text-[10px] text-slate-400 shrink-0">{new Date(c.last_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                         </div>
                         <p className={`text-xs truncate ${c.unread > 0 ? "font-bold text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"}`}>
                           {c.last_message_sender_id == currentUserId ? "Bạn: " : ""}{c.last_message_content || (c.attachment_url ? "[Tệp đính kèm]" : c.job_title) || "Chưa có tin nhắn"}
                         </p>
                       </div>
                       {c.unread > 0 && (
                         <div className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                           {c.unread}
                         </div>
                       )}
                     </button>
                   ))}
                 </div>
               )}
             </div>
          ) : (
            <div className="flex-1 flex flex-col h-full bg-[url('/chat-bg-pattern.svg')] bg-[length:24px_24px] dark:opacity-20 z-0 relative">
              <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-950/90 z-[-1]"></div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-5 z-10 flex flex-col">
                {messages.map((m: any, idx: number) => {
                  const isMe = m.sender_id == currentUserId;
                  const isLastSent = isMe && idx === messages.map(x => x.sender_id).lastIndexOf(currentUserId);
                  const isRevoked = m.status === 'REVOKED';
                  const hasReactions = m.reactions && Object.keys(m.reactions).length > 0;

                  return (
                    <div key={m.id || idx} className={`flex flex-col group/msg ${isMe ? 'items-end' : 'items-start'} relative`}>
                      
                      {/* Message Bubble Block */}
                      <div className={`relative flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        <div className={`max-w-[80vw] sm:max-w-xs relative ${isRevoked ? 'opacity-50' : ''}`}>
                          
                          {isRevoked ? (
                             <div className="px-4 py-2 rounded-2xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 italic">
                               Tin nhắn đã bị thu hồi
                             </div>
                          ) : (
                             <>
                               {m.attachment_url && (
                                  <div className="mb-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-sm">
                                    {m.attachment_type === 'image' ? (
                                      <a href={m.attachment_url} target="_blank" rel="noreferrer">
                                        <img src={m.attachment_url} alt="đính kèm" className="max-w-full h-auto max-h-48 object-cover hover:opacity-90 transition"/>
                                      </a>
                                    ) : (
                                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileText size={16}/></div>
                                        <div className="overflow-hidden flex-1 shrink-0 whitespace-nowrap text-ellipsis max-w-40 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                          {m.attachment_name || "Tài liệu đính kèm"}
                                        </div>
                                      </a>
                                    )}
                                  </div>
                               )}

                               {m.content && (
                                 <div className={`px-4 py-2 rounded-2xl text-xs sm:text-sm shadow-sm ${
                                   isMe 
                                   ? 'bg-primary-600 text-white rounded-tr-sm shadow-primary-500/20' 
                                   : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                                 }`}>
                                   <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, '<br/>') }} className="break-words" />
                                 </div>
                               )}
                             </>
                          )}

                          {/* Reactions Badge */}
                          {hasReactions && !isRevoked && (
                            <div className={`absolute -bottom-4 ${isMe ? '-left-2' : '-right-2'} bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-md rounded-full px-1.5 py-0.5 flex items-center gap-1 text-[10px] z-10 scale-90`}>
                              {Object.entries(m.reactions).map(([reaction, count]: any) => (
                                <span key={reaction} className="flex items-center gap-0.5">{reaction} {count > 1 ? count : ''}</span>
                              ))}
                            </div>
                          )}

                        </div>

                        {/* Hover Actions Menu */}
                        {!isRevoked && (
                          <div className={`opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-800 shadow border border-slate-100 dark:border-slate-700 rounded-full px-1 pb-0.5 shrink-0 ${isMe ? 'flex-row-reverse mr-2' : 'ml-2'}`}>
                            <div className="group/emoji relative cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 shrink-0">
                               <Smile size={14} />
                               <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/emoji:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-full flex gap-1 p-1 z-50">
                                 {EMOJI_OPTIONS.map(e => (
                                   <button key={e} onClick={() => handleReact(m.id, e)} className="hover:scale-125 transition-transform text-base px-1">{e}</button>
                                 ))}
                               </div>
                            </div>
                            {isMe && (
                              <button onClick={() => handleRevoke(m.id)} title="Thu hồi" className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-full transition-colors shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}

                      </div>

                      <div className={`flex items-center gap-1 mt-1 text-[9px] text-slate-400 px-1 ${hasReactions ? 'pt-2' : ''}`}>
                        <span>{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {isMe && isLastSent && (
                          m.is_read ? (
                            <span className="flex items-center gap-0.5 text-primary-500 font-bold ml-1"><CheckCheck size={10} /> Đã xem</span>
                          ) : (
                            <span className="flex items-center gap-0.5 ml-1"><CheckCheck size={10} className="text-slate-300" /> Đã gửi</span>
                          )
                        )}
                      </div>

                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-2" />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-xl transition-colors shrink-0 flex items-center justify-center">
                  {uploadingFile ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>

                <input 
                  type="text" 
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Nhập tin nhắn..." 
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-none outline-none rounded-xl px-4 text-sm text-slate-700 dark:text-slate-200 focus:ring-1 ring-primary-500/50"
                  disabled={uploadingFile}
                />
                
                <button type="submit" disabled={!messageInput.trim() || uploadingFile} className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shrink-0 flex items-center justify-center shadow-md">
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </>, 
    document.body
  );
}
