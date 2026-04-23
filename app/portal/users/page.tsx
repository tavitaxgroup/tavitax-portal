"use client";

import { useState, useEffect } from "react";
import { Users, User, Plus, Edit2, Trash2, CheckCircle, X, Shield, Lock, Loader2, Save, LayoutGrid, Eye, EyeOff } from "lucide-react";

export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ username: "", name: "", password: "", roles: [] as string[] });
  const [showPassword, setShowPassword] = useState(false);
  
  // Roles State
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: "", permissions: [] as string[] });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const systemPermissions = [
    { id: "quote", label: "Tạo Báo Giá" },
    { id: "news", label: "Quản Lý Tin Tức" },
    { id: "users", label: "Quản Trị Hệ Thống (Admin)" },
    { id: "crm", label: "Quản Lý Khách Hàng (CRM)" },
    { id: "docs", label: "Kho Tài Liệu" }
  ];

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/portal/users");
      if (res.ok) setUsers(await res.json());
    } catch(e) {} finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/portal/roles");
      if (res.ok) setRoles(await res.json());
    } catch(e) {} finally { setLoadingRoles(false); }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const generateRandomPassword = () => "Tavitax123@" + Math.floor(100000 + Math.random() * 900000);

  // --- User Handlers ---
  const openUserModal = (user?: any) => {
    if (user) {
      setFormData({ username: user.username, name: user.name, password: user.password, roles: user.roles || [] });
      setEditingUserId(user.id);
    } else {
      setFormData({ username: "", name: "", password: generateRandomPassword(), roles: [] });
      setEditingUserId(null);
    }
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const toggleUserRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId) ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId]
    }));
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const method = editingUserId ? "PUT" : "POST";
      const url = editingUserId ? `/api/portal/users/${editingUserId}` : "/api/portal/users";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        if (editingUserId) window.location.reload(); else fetchUsers();
      } else setErrorMsg(data.error || "Có lỗi xảy ra");
    } catch(e) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally { setSaving(false); }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhân sự này không?")) return;
    try {
      await fetch(`/api/portal/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch(e) { alert("Lỗi khi xóa"); }
  };

  // --- Role Handlers ---
  const openRoleModal = (role?: any) => {
    if (role) {
      setRoleFormData({ name: role.name, permissions: role.permissions || [] });
      setEditingRoleId(role.id);
    } else {
      setRoleFormData({ name: "", permissions: [] });
      setEditingRoleId(null);
    }
    setErrorMsg("");
    setIsRoleModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId) ? prev.permissions.filter(p => p !== permId) : [...prev.permissions, permId]
    }));
  };

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const method = editingRoleId ? "PUT" : "POST";
      const url = editingRoleId ? `/api/portal/roles/${editingRoleId}` : "/api/portal/roles";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(roleFormData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsRoleModalOpen(false);
        fetchRoles();
      } else setErrorMsg(data.error || "Có lỗi xảy ra");
    } catch(e) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally { setSaving(false); }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Xóa nhóm quyền này? Các nhân sự đang giữ quyền này có thể bị ảnh hưởng.")) return;
    try {
      await fetch(`/api/portal/roles/${id}`, { method: "DELETE" });
      fetchRoles();
    } catch(e) { alert("Lỗi khi xóa"); }
  };

  return (
    <div className="container mx-auto px-4 max-w-5xl py-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Users className="text-primary-600" /> Quản Lý Phân Quyền
          </h1>
          <p className="text-slate-500 mt-2">Thêm, sửa, xóa và cấp nhóm quyền cho các tài khoản nhân viên.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Nhân Sự
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'roles' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Nhóm Quyền (Roles)
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-end">
            <button onClick={() => openUserModal()} className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus size={16} /> Thêm Nhân Sự
            </button>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-4" size={32} />
              Đang tải dữ liệu...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">ID / Tên NV</th>
                    <th className="p-4 font-bold">Tài khoản</th>
                    <th className="p-4 font-bold">Nhóm quyền</th>
                    <th className="p-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-400">ID: {u.id}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-semibold inline-flex items-center gap-2">
                          <User size={14}/> {u.username}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((roleId: string) => {
                            const r = roles.find(rx => rx.id === roleId);
                            return r ? (
                              <span key={roleId} className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-1 rounded">
                                {r.name}
                              </span>
                            ) : null;
                          })}
                          {!u.roles?.length && <span className="text-slate-400 text-xs">Chưa gán quyền</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openUserModal(u)} className="p-2 text-slate-400 hover:text-blue-600 rounded">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có tài khoản nào.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-end">
            <button onClick={() => openRoleModal()} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Shield size={16} /> Tạo Nhóm Quyền Mới
            </button>
          </div>
          {loadingRoles ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-4" size={32} />
              Đang tải...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold">Tên Nhóm Quyền</th>
                    <th className="p-4 font-bold">Tính năng được phép (Permissions)</th>
                    <th className="p-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{r.name}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {r.permissions?.map((p: string) => {
                            const lbl = systemPermissions.find(sp => sp.id === p)?.label || p;
                            return <span key={p} className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded">{lbl}</span>;
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openRoleModal(r)} className="p-2 text-slate-400 hover:text-blue-600 rounded">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteRole(r.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-500">Chưa có vai trò nào.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-primary-600 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold text-xl flex items-center gap-2">
                {editingUserId ? <Edit2 size={20}/> : <Plus size={20}/>} {editingUserId ? "Cập nhật Nhân sự" : "Tạo Nhân sự mới"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={saveUser} className="p-6 overflow-y-auto">
              {errorMsg && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-semibold mb-6">{errorMsg}</div>}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Tên nhân viên</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="VD: Nguyễn Văn A"/>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Tên đăng nhập (Username / Email)</label>
                  <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="email@gmail.com"/>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1">Mật khẩu</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary-500 outline-none font-mono" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-primary-600"/> Gán Nhóm Quyền (Role)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map(role => {
                    const isChecked = formData.roles.includes(role.id);
                    return (
                      <div key={role.id} onClick={() => toggleUserRole(role.id)} className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isChecked ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-primary-600 text-white' : 'bg-slate-200 border border-slate-300'}`}>
                          {isChecked && <CheckCircle size={14} />}
                        </div>
                        <span className={`text-sm font-semibold ${isChecked ? 'text-primary-800' : 'text-slate-600'}`}>{role.name}</span>
                      </div>
                    );
                  })}
                  {roles.length === 0 && <p className="text-xs text-slate-500">Chưa có Nhóm quyền nào được tạo. Hãy sang tab Vai trò để tạo.</p>}
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                <button type="submit" disabled={saving} className="px-8 py-3 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center gap-2">
                  {saving && <Loader2 size={18} className="animate-spin" />} Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold text-xl flex items-center gap-2">
                {editingRoleId ? <Edit2 size={20}/> : <Plus size={20}/>} {editingRoleId ? "Cập nhật Nhóm Quyền" : "Tạo Nhóm Quyền"}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-white/70 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={saveRole} className="p-6 overflow-y-auto">
              {errorMsg && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-semibold mb-6">{errorMsg}</div>}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">Tên Nhóm Quyền (Chức vụ/Phòng ban)</label>
                  <input type="text" required value={roleFormData.name} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none" placeholder="VD: Phòng Hành Chính"/>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <LayoutGrid size={16} className="text-slate-600"/> Tính năng hệ thống được dùng
                </label>
                <div className="grid grid-cols-1 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {systemPermissions.map(perm => {
                    const isChecked = roleFormData.permissions.includes(perm.id);
                    return (
                      <div key={perm.id} onClick={() => togglePermission(perm.id)} className={`p-3 rounded-xl border bg-white cursor-pointer transition-all flex items-center gap-3 ${isChecked ? 'border-emerald-500 shadow-sm' : 'border-slate-100 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-100 border border-slate-200'}`}>
                          {isChecked && <CheckCircle size={14} />}
                        </div>
                        <span className={`text-sm font-semibold ${isChecked ? 'text-emerald-800' : 'text-slate-600'}`}>{perm.label} (Mã: {perm.id})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-8 pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Hủy</button>
                <button type="submit" disabled={saving} className="px-8 py-3 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl flex items-center gap-2">
                  {saving && <Loader2 size={18} className="animate-spin" />} Lưu Nhóm Quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
