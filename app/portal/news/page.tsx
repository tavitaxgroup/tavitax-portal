"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Send, FileText, ImageIcon, Settings, ListPlus } from "lucide-react";
import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";

// ReactQuill cannot be rendered on server to avoid 'document is not defined'
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

function NewsEditorForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const quillRef = useRef<any>(null);

  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    imageUrl: "",
    imageCaption: "",
    content: "",
    tags: [] as string[],
  });

  const suggestedTags = ["Thuế", "AI", "Doanh nghiệp", "Thu nhập", "Kế toán", "Cập nhật Luật", "Đầu tư", "Tin tức", "Tài chính"];
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState("");

  // Load article if edit mode
  useEffect(() => {
    if (editId) {
      fetch(`/api/news/${editId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setFormData({
              title: data.title || "",
              excerpt: data.excerpt || "",
              imageUrl: data.image_url || "",
              imageCaption: data.image_caption || "",
              content: data.content || "",
              tags: data.tags || [],
            });
          }
        });
    }
  }, [editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (value: string) => {
    setFormData({ ...formData, content: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const submitPost = async () => {
    setIsPublishing(true);
    setMessage("");
    
    if (!formData.title || !formData.content) {
      setMessage("Vui lòng điền đủ Tiêu đề và Nội dung!");
      setIsPublishing(false);
      return;
    }

    // Tự động chuyển đổi link trần của Google Drive sang định dạng direct image link được hỗ trợ trong <img src>
    let finalImageUrl = formData.imageUrl;
    const driveMatch = finalImageUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      finalImageUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }

    const finalData = { ...formData, imageUrl: finalImageUrl };

    try {
      const url = editId ? `/api/news/${editId}` : "/api/news";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData)
      });
      
      const resData = await res.json();
      
      if (!res.ok) throw new Error(resData.error || "Lỗi lưu DB");
      
      setMessage(`✅ ${editId ? "Cập nhật" : "Đăng"} bài viết thành công!`);
      if (!editId) setFormData({ title: "", excerpt: "", imageUrl: "", imageCaption: "", content: "", tags: [] });
    } catch (err: any) {
      console.error(err);
      setMessage("❌ Lỗi: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: function() {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files ? input.files[0] : null;
            if (!file) return;

            const caption = prompt("Nhập chú thích cho hình ảnh (để trống nếu không cần):");
            const quill = quillRef.current?.getEditor();
            if (!quill) return;
            
            const reader = new FileReader();
            reader.onload = () => {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', reader.result);
              
              if (caption && caption.trim() !== "") {
                const captionText = '\n' + caption + '\n';
                quill.insertText(range.index + 1, captionText);
                quill.formatText(range.index + 1, captionText.length, {
                  'italic': true,
                  'color': '#64748b'
                });
                
                // Align center the image and the caption
                quill.formatLine(range.index, 1, { 'align': 'center' });
                quill.formatLine(range.index + 1, captionText.length, { 'align': 'center' });
                
                quill.setSelection(range.index + captionText.length);
              } else {
                quill.formatLine(range.index, 1, { 'align': 'center' });
                quill.setSelection(range.index + 1);
              }
            };
            reader.readAsDataURL(file);
          };
        }
      }
    }
  }), []);

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        .ql-editor p:has(img) {
          margin-bottom: 2px !important;
        }
        .ql-editor p:has(img) + p {
          margin-top: 0 !important;
        }
      `}} />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 rounded-3xl p-8 text-white shadow-xl mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold mb-2">{editId ? "Sửa Bài Viết" : "Đăng Bài Viết (CMS)"}</h1>
            <p className="text-slate-300">Công cụ soạn thảo nội dung chuẩn SEO cho Marketing</p>
          </div>
          <Link href="/portal/news/manage" className="bg-slate-700 hover:bg-slate-600 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors">
            <ListPlus size={20} /> Quản Lý Bài Viết
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><FileText size={16}/> Tiêu đề bài viết</label>
            <input 
              type="text" name="title" value={formData.title} onChange={handleChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-slate-900 text-lg" 
              placeholder="VD: Quy định về Kế toán năm 2026..." 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2"><ImageIcon size={16}/> Link ảnh thu nhỏ (Thumbnail)</label>
            <input 
              type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900" 
              placeholder="https://domain.com/hinh-anh.jpg" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">Ghi chú hình ảnh (Caption)</label>
            <input 
              type="text" name="imageCaption" value={formData.imageCaption} onChange={handleChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900" 
              placeholder="Nguồn hoặc chú thích cho ảnh thu nhỏ..." 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">Tóm tắt ngắn (Excerpt)</label>
            <textarea 
              name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900" 
              placeholder="Bài viết này đề cập đến..." 
            />
          </div>

          {/* CÔNG CỤ QUẢN LÝ TAGS */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 flex items-center gap-2">Thẻ Phân Loại (Tags)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900" 
                placeholder="Nhập tên tag và nhấn Enter (VD: Thuế Điện Tử...)" 
              />
              <button 
                type="button"
                onClick={handleAddTag}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl transition-colors shrink-0"
              >
                Thêm Tag
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm font-medium text-slate-500 mr-1 mt-1">Các thẻ đã có:</span>
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !formData.tags.includes(tag) && setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-200"
                >
                  + {tag}
                </button>
              ))}
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-2">
                {formData.tags.map((tag, idx) => (
                  <span key={idx} className="bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm">
                    <span className="text-primary-500">#</span>{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-rose-500 transition-colors ml-1">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-slate-600">Nội dung bài viết (Trình soạn thảo)</label>
              <button 
                type="button" 
                onClick={() => {
                  const quill = quillRef.current?.getEditor();
                  if (!quill) return;
                  const range = quill.getSelection();
                  if (range && range.length > 0) {
                    quill.formatText(range.index, range.length, { 'italic': true, 'color': '#64748b' });
                  } else {
                    alert("Mẹo: Hãy bôi đen (chọn) dòng chữ bạn muốn làm chú thích dưới ảnh, sau đó bấm nút này để định dạng chuẩn.");
                  }
                }}
                className="text-xs bg-slate-100 hover:bg-slate-200 font-semibold px-3 py-1.5 rounded border border-slate-200 transition-colors"
              >
                + Biến chữ đang chọn thành Chú Thích
              </button>
            </div>
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
              <ReactQuill 
                {...{ ref: quillRef } as any}
                theme="snow" 
                value={formData.content} 
                onChange={handleEditorChange} 
                modules={modules}
                className="h-64 mb-12"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={submitPost}
              disabled={isPublishing}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white shadow-lg font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPublishing ? "Đang xử lý..." : <><Send size={18}/> {editId ? "Lưu Thay Đổi Mới" : "Đăng lên Web"}</>}
            </button>

            {message && (
              <span className={message.includes('Lỗi') ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminNewsEditor() {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-slate-500 font-bold text-xl">Đang tải công cụ...</div>}>
      <NewsEditorForm />
    </Suspense>
  );
}
