import React from 'react';

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInlineStyles = (text: string, keyPrefix: string) => {
    // Xử lý Bold ** ** -> cực kỳ basic
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={keyPrefix+i} className="font-bold text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushList = (index: number) => {
    if (inList && listItems.length > 0) {
      elements.push(<ul key={`ul-${index}`} className="list-disc pl-6 space-y-1 my-2 text-slate-700 dark:text-slate-300">{listItems}</ul>);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(<h1 key={idx} className="text-2xl font-black mt-4 mb-2 text-slate-900 dark:text-white">{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(<h2 key={idx} className="text-xl font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(<h3 key={idx} className="text-lg font-bold mt-3 mb-1 text-slate-800 dark:text-slate-100">{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(<li key={`li-${idx}`}>{parseInlineStyles(trimmed.slice(2), `p-${idx}`)}</li>);
    } else if (trimmed === '') {
      flushList(idx);
      elements.push(<div key={`br-${idx}`} className="h-2"></div>);
    } else {
      flushList(idx);
      elements.push(<p key={idx} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-1">{parseInlineStyles(line, `p-${idx}`)}</p>);
    }
  });
  
  flushList(lines.length);

  return <div className="markdown-render break-words">{elements}</div>;
}
