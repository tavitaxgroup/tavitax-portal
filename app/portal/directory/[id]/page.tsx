"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, User, Mail, Phone, Building2, Briefcase, Network, Edit3, ArrowLeft, X, Camera } from "lucide-react";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", department: "", job_title: "", bio: "" });
  const [saving, setSaving] = useState(false);

  // Manager Search State
  const [managerQuery, setManagerQuery] = useState("");
  const [managerResults, setManagerResults] = useState<any[]>([]);
  const [selectedManager, setSelectedManager] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/portal/directory/${id}`);
        const data = await res.json();
        if (res.ok && data.profile) {
          setProfile(data.profile);
          setEditForm({
            phone: data.profile.phone || "",
            department: data.profile.department || "",
            job_title: data.profile.job_title || "",
            bio: data.profile.bio || ""
          });
          if (data.profile.reports_to) {
             setSelectedManager({
               id: data.profile.reports_to,
               name: data.profile.manager_name,
               job_title: data.profile.manager_title
             });
          }
        } else {
          setError(data.error || "Không tìm thấy thông tin.");
        }
      } catch (e) {
        setError("Lỗi kết nối.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (managerQuery.trim().length > 1) {
        fetch(`/api/portal/users/search?q=${encodeURIComponent(managerQuery)}`)
          .then(res => res.json())
          .then(data => setManagerResults(data.filter((u:any) => u.id !== profile?.id)))
          .catch(() => setManagerResults([]));
      } else {
        setManagerResults([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [managerQuery, profile]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/directory/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...editForm, 
          reports_to: selectedManager ? selectedManager.id : null 
        })
      });
      if (res.ok) {
        setProfile({ 
          ...profile, 
          ...editForm, 
          reports_to: selectedManager?.id || null,
          manager_name: selectedManager?.name || null,
          manager_title: selectedManager?.job_title || null
        });
        setIsEditing(false);
      } else {
        alert("Có lỗi xảy ra khi lưu.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Kích thước file quá lớn. Vui lòng chọn ảnh dưới 15MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/portal/profile/avatar", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setProfile({ ...profile, avatar_url: data.avatar_url });
      } else {
        alert(data.error || "Lỗi tải ảnh lên.");
      }
    } catch (err) {
      alert("Không kết nối được đến máy chủ.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary-500" size={40} /></div>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500 gap-4">
        <User size={64} className="text-slate-300" />
        <h2 className="text-xl font-bold">{error}</h2>
        <button onClick={() => router.back()} className="text-primary-600 font-medium">Quy lại</button>
      </div>
    );
  }

  const isMe = id === "me" || (profile && profile.id === "1"); // Approximate me logic

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium">
        <ArrowLeft size={18} /> Quay lại
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-primary-600 to-blue-500 w-full relative">
          <div className="absolute inset-0 bg-black/10"></div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Edit3 size={16} /> Chỉnh sửa hồ sơ
            </button>
          )}
        </div>

        {/* Profile Header Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-20 mb-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-slate-800 bg-primary-100 dark:bg-primary-900 flex items-center justify-center relative shadow-lg z-10 shrink-0 group">
               <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                 {profile.avatar_url ? (
                   <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-5xl font-black text-primary-600 dark:text-primary-400">{profile.name?.charAt(0).toUpperCase()}</span>
                 )}
               </div>
               
               {isMe && isEditing && (
                 <label className="absolute inset-0 bg-slate-900/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                   {uploadingAvatar ? (
                     <Loader2 className="animate-spin mb-1" size={24} />
                   ) : (
                     <Camera size={24} className="mb-1" />
                   )}
                   <span className="text-xs font-bold">Thay ảnh</span>
                   <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                 </label>
               )}
            </div>
            
            <div className="flex-1 pt-2 md:pt-0">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">{profile.name}</h1>
                {profile.status === 'ONLINE' && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>}
                {profile.status === 'BUSY' && <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Busy</span>}
              </div>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-1">
                {profile.job_title || "Chưa cập nhật Chức vụ"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Thông tin Liên hệ</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary-500 shadow-sm">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Email công việc</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-500 shadow-sm">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Số điện thoại</p>
                      {isEditing ? (
                        <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="mt-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 outline-none w-full" placeholder="Nhập SĐT..." />
                      ) : (
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.phone || "N/A"}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Giới thiệu bản thân</h3>
                {isEditing ? (
                  <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 outline-none resize-none" placeholder="Viết đôi dòng giới thiệu bản thân..."></textarea>
                ) : (
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                    {profile.bio || "Chưa có giới thiệu."}
                  </p>
                )}
              </div>

            </div>

            <div className="space-y-6">
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Tổ chức</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Building2 size={16} /> <span className="text-xs font-semibold">Phòng ban</span>
                    </div>
                    {isEditing ? (
                       <input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 outline-none" placeholder="VD: Kế toán" />
                    ) : (
                      <p className="font-bold text-slate-800 dark:text-slate-200">{profile.department || "N/A"}</p>
                    )}
                  </div>
                  
                  <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Briefcase size={16} /> <span className="text-xs font-semibold">Chức danh công việc</span>
                    </div>
                    {isEditing ? (
                       <input value={editForm.job_title} onChange={e => setEditForm({...editForm, job_title: e.target.value})} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 outline-none" placeholder="VD: Trưởng phòng" />
                    ) : (
                      <p className="font-bold text-slate-800 dark:text-slate-200">{profile.job_title || "N/A"}</p>
                    )}
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-slate-700/50"></div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-1.5">
                      <Network size={16} /> <span className="text-xs font-semibold">Báo cáo trực tiếp cho</span>
                    </div>
                    {isEditing ? (
                      <div className="relative">
                        {selectedManager ? (
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                               <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                 {selectedManager.name?.charAt(0)}
                               </div>
                               <p className="text-sm font-bold truncate dark:text-slate-200">{selectedManager.name}</p>
                            </div>
                            <button onClick={() => setSelectedManager(null)} className="text-slate-400 hover:text-rose-500 p-1 shrink-0 transition-colors"><X size={14}/></button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input 
                              value={managerQuery} 
                              onChange={e => setManagerQuery(e.target.value)} 
                              className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 outline-none" 
                              placeholder="Tìm tên hoặc email quản lý..." 
                            />
                            {managerResults.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                                {managerResults.map(mgr => (
                                  <button key={mgr.id} onClick={() => { setSelectedManager(mgr); setManagerQuery(""); setManagerResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 truncate flex items-center gap-2">
                                    <span className="font-bold">{mgr.name}</span>
                                    <span className="text-slate-400 text-[10px] truncate">{mgr.job_title || mgr.username}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : profile.manager_name ? (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 cursor-pointer hover:border-primary-200 transition-colors" onClick={() => router.push(`/portal/directory/${profile.reports_to}`)}>
                         <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                           {profile.manager_name.charAt(0)}
                         </div>
                         <div className="overflow-hidden">
                           <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{profile.manager_name}</p>
                           <p className="text-[10px] text-slate-500 truncate">{profile.manager_title || "Quản lý"}</p>
                         </div>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-400 italic">Không có cấp trên trực tiếp</p>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3">
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Hủy</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition flex justify-center items-center">
                    {saving ? <Loader2 size={18} className="animate-spin"/> : "Lưu Thay Đổi"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
