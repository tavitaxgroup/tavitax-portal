"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

export function AdminChatbot() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{id: string, role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const userText = inputValue.trim();
    setInputValue("");
    
    const newUserMsg = { id: Date.now().toString(), role: "user", content: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (!response.ok) throw new Error("Network error");
      const result = await response.json();
      
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: result.answer }]);
    } catch (err) {
      console.error("Chat error:", err);
      alert("Lỗi kết nối tới AI. Hãy chắc chắn rằng bạn đang chạy Tavibot Backend!");
    } finally {
      setIsLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const renderMessageContent = (m: any) => {
    const text = m.content || "";
    if (typeof text !== 'string') return null;
    
    const renderBold = (str: string) => {
      const chunks = str.split(/\*\*(.*?)\*\*/g);
      if (chunks.length === 1) return str;
      return chunks.map((chunk, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{chunk}</strong> : chunk);
    };

    return <span className="whitespace-pre-wrap">{renderBold(text)}</span>;
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="bg-primary-600 p-4 shrink-0 flex items-center gap-3 text-white">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">Trợ lý AI Nội Bộ</h3>
          <p className="text-xs text-primary-100 opacity-90">Hỗ trợ tra cứu quy định, luật thuế dành riêng cho nhân viên</p>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 font-medium">
            Hãy thử hỏi AI về các quy định nội bộ hoặc luật thuế...
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${m.role === 'user' ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm break-words leading-relaxed ${m.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                {renderMessageContent(m)}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
             <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex shrink-0 items-center justify-center">
                <Bot size={16} />
             </div>
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm p-4 flex gap-2 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" style={{animationDelay: '0.2s'}}></span>
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" style={{animationDelay: '0.4s'}}></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSubmit} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="relative flex items-center">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="Nhấp vào đây để hỏi trợ lý..."
            className="w-full bg-slate-100 dark:bg-slate-800 dark:text-slate-100 pl-6 pr-14 py-4 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all disabled:opacity-50 border border-transparent dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 w-10 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-all shadow-md"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} className="translate-x-[1px]" />}
          </button>
        </div>
      </form>
    </div>
  );
}
