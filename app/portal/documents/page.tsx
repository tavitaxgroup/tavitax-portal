"use client";

import { useState, useEffect } from "react";
import { FolderArchive, Upload, File as FileIcon, FileText, Download, Trash2, X, Plus, Image as ImageIcon, Loader2 } from "lucide-react";

export default function DocumentsVaultPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Hợp Đồng");
  const [file, setFile] = useState<File | null>(null);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  
  const categories = ["Hợp Đồng", "Biểu Mẫu", "Báo Cáo Kế Toán", "Giấy Tờ Pháp Lý", "Tài Liệu Nội Bộ", "Khác"];
  
  const departments = [
    { id: "dept_ketoan", label: "Phòng Kế Toán" },
    { id: "dept_kinhdoanh", label: "Phòng Kinh Doanh" },
    { id: "dept_phaply", label: "Phòng Pháp Lý" }
  ];

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/documents");
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const openUploadModal = () => {
    setTitle("");
    setCategory("Hợp Đồng");
    setFile(null);
    setAllowedRoles([]);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setErrorMsg("Vui lòng chọn file đính kèm");
    
    setUploading(true);
    setErrorMsg("");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("allowed_roles", JSON.stringify(allowedRoles));
    
    try {
      const res = await fetch("/api/portal/documents", {
        method: "POST",
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchDocs();
      } else {
        setErrorMsg(data.error || "Lỗi upload file");
      }
    } catch (e) {
      setErrorMsg("Lỗi kết nối tới máy chủ");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này khỏi hệ thống vĩnh viễn?")) return;
    try {
      const res = await fetch(`/api/portal/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDocs();
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa");
      }
    } catch(e) {
      alert("Lỗi khi xóa");
    }
  };

  const toggleRole = (roleId: string) => {
    setAllowedRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const filteredDocs = categoryFilter === "ALL" ? documents : documents.filter(d => d.category === categoryFilter);

  const getFileIcon = (type: string) => {
    if (!type) return <FileIcon size={32} className="text-slate-400" />;
    if (type.includes("pdf")) return <FileText size={32} className="text-rose-500" />;
    if (type.includes("image")) return <ImageIcon size={32} className="text-blue-500" />;
    if (type.includes("word") || type.includes("document")) return <FileIcon size={32} className="text-blue-600" />;
    if (type.includes("excel") || type.includes("spreadsheet")) return <FileIcon size={32} className="text-emerald-600" />;
    return <FileIcon size={32} className="text-slate-400" />;
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12 relative flex flex-col md:flex-row gap-8">
      
      {/* Sidebar: Thư Mục */}
      <div className="w-full md:w-64 shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <FolderArchive className="text-primary-600" /> Cây Thư Mục
        </h2>
        <div className="flex flex-col gap-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
           <button 
              onClick={() => setCategoryFilter("ALL")}
              className={`text-left px-4 py-2.5 rounded-xl font-semibold transition-colors ${categoryFilter === 'ALL' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             Tất cả tài nguyên
           </button>
           {categories.map(cat => (
             <button 
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-left px-4 py-2.5 rounded-xl font-semibold transition-colors ${categoryFilter === cat ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}`}
             >
               📁 {cat}
             </button>
           ))}
        </div>
        
        <button 
          onClick={openUploadModal}
          className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-600/30 flex justify-center items-center gap-2"
        >
          <Upload size={18} /> Tải Tài Liệu Lên
        </button>
      </div>

      {/* Main Content: Dịch Vụ */}
      <div className="flex-1">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Kho Lưu Trữ Nội Bộ</h1>
            <p className="text-slate-500 mt-1">Quản lý và tra cứu tài liệu công ty Tavitax an toàn.</p>
          </div>
          <div className="text-sm text-slate-400 font-semibold">{filteredDocs.length} tệp tin</div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200">
            <Loader2 className="animate-spin mx-auto mb-4 text-primary-600" size={32} />
            <p className="text-slate-500 font-bold">Đang tải cấu trúc thư mục...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200 flex flex-col items-center">
            <FolderArchive size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Thư mục trống</h3>
            <p className="text-slate-500">Chưa có tài liệu nào thuộc danh mục này hiển thị cho bạn.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <button onClick={() => handleDelete(doc.id)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Xóa">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-2 mb-1" title={doc.title}>{doc.title}</h3>
                <p className="text-xs font-mono text-slate-400 line-clamp-1 mb-4" title={doc.file_name}>{doc.file_name}</p>
                
                {/* Roles indicators */}
                <div className="flex flex-wrap gap-1 mb-4 mt-auto">
                   {(doc.allowed_roles || []).map((r: string) => {
                     const deptInfo = departments.find(d => d.id === r);
                     return deptInfo ? <span key={r} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{deptInfo.label.replace('Phòng ', 'P.')}</span> : null;
                   })}
                   {(!doc.allowed_roles || doc.allowed_roles.length === 0) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">Private</span>}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                   <div className="text-[10px] text-slate-400 font-semibold">
                     {new Date(doc.created_at).toLocaleDateString('vi-VN')} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                   </div>
                   <a 
                     href={`/api/portal/documents/${doc.id}/download`} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-primary-600 hover:text-primary-800 hover:bg-primary-50 p-2 rounded-lg transition-colors font-bold text-sm flex items-center gap-1"
                   >
                     <Download size={16} /> Tải Về
                   </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 flex justify-between items-center bg-slate-50 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                <Upload className="text-primary-600" size={24}/> Upload Tài Liệu Mới
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 overflow-y-auto">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-sm font-semibold mb-6">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Tên Tài Liệu (Bắt buộc)</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-primary-500 outline-none" placeholder="VD: Mẫu Hợp Đồng Dịch Vụ Thuế 2026"/>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Thư mục phân vùng</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-slate-700">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">File Đính Kèm (Dữ liệu Nhị Phân) &lt; 20MB</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors relative">
                     <input type="file" required onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                     {!file ? (
                       <div className="flex flex-col items-center pointer-events-none">
                         <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-2"><Plus size={24}/></div>
                         <p className="font-bold text-slate-600">Nhấn để chọn file hoặc Kéo thả</p>
                         <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, DOCX, XLSX, Ảnh...</p>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center pointer-events-none">
                         <FileText size={32} className="text-emerald-500 mb-2" />
                         <p className="font-bold text-slate-800 line-clamp-1 break-all px-4">{file.name}</p>
                         <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                       </div>
                     )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">Phân Quyền: Phòng nào được xem?</label>
                <div className="grid grid-cols-1 gap-2">
                  {departments.map(dept => {
                    const isChecked = allowedRoles.includes(dept.id);
                    return (
                      <div 
                        key={dept.id} 
                        onClick={() => toggleRole(dept.id)}
                        className={`px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isChecked ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary-600 text-white' : 'bg-slate-200 border border-slate-300'}`}>
                          {isChecked && <X style={{transform: "rotate(45deg)"}} size={14} className="text-white"/>}
                        </div>
                        <span className={`text-sm font-semibold ${isChecked ? 'text-primary-800' : 'text-slate-600'}`}>{dept.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-400 mt-2">* Admin hệ thống luôn xem được tất cả các file. Chỉ có nhân viên cấp phòng ban mới bị lọc hiển thị bởi các tick box này.</div>
              </div>
              
              <div className="mt-8 pt-4 flex justify-end gap-3">
                <button type="submit" disabled={uploading || !file} className="w-full py-3.5 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  Tải Lên Máy Chủ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
