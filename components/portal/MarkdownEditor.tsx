import React, { useState, useRef, useEffect } from 'react';
import { Type, Heading1, Heading2, Heading3, List, Bold } from 'lucide-react';

export function MarkdownEditor({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/') {
      // Show menu only if it's the first char of the line or preceeded by space
      const cursor = textareaRef.current?.selectionStart || 0;
      if (cursor === 0 || value.charAt(cursor - 1) === '\n' || value.charAt(cursor - 1) === ' ') {
        setShowMenu(true);
      }
    } else if (showMenu) {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
      // could implement arrows & enter here, but clicking is fine for prototype
    }
  };

  const insertCommand = (syntax: string, stripSlash: boolean = true) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    
    // Xoá dấu '/' đi
    let newValStr = value;
    let insertionPos = cursor;
    
    if (stripSlash && value.charAt(cursor - 1) === '/') {
       newValStr = value.slice(0, cursor - 1) + value.slice(cursor);
       insertionPos = cursor - 1;
    }

    const before = newValStr.slice(0, insertionPos);
    const after = newValStr.slice(insertionPos);

    onChange(before + syntax + after);
    setShowMenu(false);
    
    setTimeout(() => {
      if(textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = insertionPos + syntax.length;
        textareaRef.current.selectionEnd = insertionPos + syntax.length;
      }
    }, 10);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (showMenu && !e.target.value.includes('/')) setShowMenu(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Gõ / để dùng lệnh (Heading, List...)'}
        autoFocus
        className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:border-indigo-500 transition-colors resize-none min-h-[150px] shadow-inner text-slate-800 dark:text-slate-200"
      />
      
      {showMenu && (
        <div className="absolute top-1/2 left-8 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl z-50 w-64 p-2 flex flex-col gap-1 animate-scale-up">
           <div className="text-[10px] uppercase font-black text-slate-400 mb-1 px-2">Slash Commands</div>
           
           <button onClick={() => insertCommand('# ')} type="button" className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-bold">
             <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-md text-slate-500"><Heading1 size={16}/></div> Tiêu đề 1 (H1)
           </button>
           <button onClick={() => insertCommand('## ')} type="button" className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-bold">
             <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-md text-slate-500"><Heading2 size={16}/></div> Tiêu đề 2 (H2)
           </button>
           <button onClick={() => insertCommand('- ')} type="button" className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-bold">
             <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-md text-slate-500"><List size={16}/></div> Danh sách chấm
           </button>
           <button onClick={() => insertCommand('**In đậm** ')} type="button" className="flex items-center gap-3 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-bold">
             <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-md text-slate-500"><Bold size={16}/></div> Chữ Đậm
           </button>
        </div>
      )}
    </div>
  );
}
