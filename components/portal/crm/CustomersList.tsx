"use client";

import { useState, useEffect } from "react";
import { 
  Users, Search, RefreshCw, FileSpreadsheet, Plus, HelpCircle, 
  Map, CheckCircle, AlertCircle, Eye, Loader2, ArrowRight, 
  FileText, Upload, Check, Trash2, Globe, Building2, MapPin, 
  Phone, Mail, Briefcase, Landmark
} from "lucide-react";
import * as XLSX from "xlsx";

interface Customer {
  id: number;
  company_name: string;
  tax_code?: string;
  representative?: string;
  phone?: string;
  email?: string;
  address?: string;
  services_used?: string[] | string;
  department_id?: string;
  department_name?: string;
  created_by_name?: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export default function CustomersList({ user }: { user: any }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [isBoss, setIsBoss] = useState(false);

  // Manual Add Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    company_name: "",
    tax_code: "",
    representative: "",
    phone: "",
    email: "",
    address: "",
    services_used: "",
    department_id: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Import flow state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importSource, setImportSource] = useState<"file" | "sheet">("file");
  const [sheetConfig, setSheetConfig] = useState({ spreadsheetId: "", range: "Sheet1!A1:Z100" });
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [parsedRawData, setParsedRawData] = useState<{ headers: string[]; rows: any[][] } | null>(null);

  // Mapping state
  const [mappings, setMappings] = useState<{ [targetField: string]: string }>({});
  const [importTargetDept, setImportTargetDept] = useState("");
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // List of target fields for mapping
  const targetFields = [
    { key: "company_name", label: "Tên Công ty (Bắt buộc)", required: true },
    { key: "tax_code", label: "Mã số thuế", required: false },
    { key: "representative", label: "Người đại diện", required: false },
    { key: "phone", label: "Số điện thoại", required: false },
    { key: "email", label: "Email", required: false },
    { key: "address", label: "Địa chỉ", required: false },
    { key: "services_used", label: "Dịch vụ sử dụng (Ngăn cách dấu phẩy/mảng)", required: false },
  ];

  useEffect(() => {
    const adminRoleUuid = "5199d67b-52bf-465f-9d2c-aa2366f30ede";
    const bossUser = user?.permissions?.includes("users") || user?.roles?.includes(adminRoleUuid);
    setIsBoss(bossUser);

    fetchCustomers();
    fetchRoles();
  }, [user]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/crm/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/portal/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-guesses column matching based on similarity
  const guessMapping = (headers: string[]) => {
    const newMappings: { [key: string]: string } = {};
    const rules: { [key: string]: string[] } = {
      company_name: ["tên", "công ty", "doanh nghiệp", "company", "name", "tên khách hàng", "khách hàng"],
      tax_code: ["mst", "mã số thuế", "tax", "code", "taxcode"],
      representative: ["đại diện", "người đại diện", "đại diện pháp luật", "representative", "rep"],
      phone: ["sđt", "điện thoại", "sdt", "phone", "tel", "di động"],
      email: ["email", "thư điện tử", "mail"],
      address: ["địa chỉ", "address", "nơi ở", "trụ sở"],
      services_used: ["dịch vụ", "dịch vụ sử dụng", "sản phẩm", "service", "services"]
    };

    headers.forEach(h => {
      const cleanH = h.toLowerCase().trim();
      Object.entries(rules).forEach(([field, keywords]) => {
        if (!newMappings[field]) {
          const match = keywords.some(k => cleanH.includes(k));
          if (match) {
            newMappings[field] = h;
          }
        }
      });
    });

    setMappings(newMappings);
  };

  // Local File Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length > 0) {
        const headers = data[0].map(h => String(h || "").trim()).filter(Boolean);
        const rows = data.slice(1).filter(r => r.some(val => val !== null && val !== ""));
        setParsedRawData({ headers, rows });
        guessMapping(headers);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Google Sheets API fetcher
  const handleFetchGoogleSheets = async () => {
    if (!sheetConfig.spreadsheetId || !sheetConfig.range) {
      alert("Vui lòng điền đầy đủ thông tin Spreadsheet ID và Trang tính!");
      return;
    }
    setFetchingSheet(true);
    try {
      const res = await fetch("/api/portal/crm/customers/import-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheetConfig)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const headers = result.headers.map((h: any) => String(h || "").trim()).filter(Boolean);
        const rows = result.data.filter((r: any[]) => r.some(val => val !== null && val !== ""));
        setParsedRawData({ headers, rows });
        guessMapping(headers);
      } else {
        alert(result.error || "Không thể nạp dữ liệu từ Google Sheets.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi kết nối Google Sheets.");
    } finally {
      setFetchingSheet(false);
    }
  };

  // Trực quan hóa 3 dòng xem thử
  useEffect(() => {
    if (!parsedRawData) {
      setImportPreview([]);
      return;
    }

    const { headers, rows } = parsedRawData;
    const previewCount = Math.min(rows.length, 3);
    const previews = [];

    for (let i = 0; i < previewCount; i++) {
      const row = rows[i];
      const customerPreview: any = {};
      targetFields.forEach(tf => {
        const mappedHeader = mappings[tf.key];
        if (mappedHeader) {
          const colIdx = headers.indexOf(mappedHeader);
          if (colIdx !== -1) {
            customerPreview[tf.key] = row[colIdx];
          }
        }
      });
      previews.push(customerPreview);
    }
    setImportPreview(previews);
  }, [mappings, parsedRawData]);

  // Execute bulk import POST
  const executeImport = async () => {
    if (!parsedRawData) return;
    const mappedHeader = mappings["company_name"];
    if (!mappedHeader) {
      alert("Bắt buộc phải ánh xạ cột 'Tên Công ty'!");
      return;
    }

    const { headers, rows } = parsedRawData;
    const finalCustomersList: any[] = [];

    rows.forEach(row => {
      const custObj: any = {};
      
      targetFields.forEach(tf => {
        const header = mappings[tf.key];
        if (header) {
          const colIdx = headers.indexOf(header);
          if (colIdx !== -1 && row[colIdx] !== undefined) {
            if (tf.key === "services_used") {
              const val = String(row[colIdx] || "");
              custObj.services_used = val.split(",").map(s => s.trim()).filter(Boolean);
            } else {
              custObj[tf.key] = String(row[colIdx] || "").trim();
            }
          }
        }
      });

      if (custObj.company_name) {
        if (importTargetDept) {
          custObj.department_id = importTargetDept;
        }
        finalCustomersList.push(custObj);
      }
    });

    if (finalCustomersList.length === 0) {
      alert("Không có khách hàng hợp lệ để import!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalCustomersList)
      });
      const result = await res.json();
      if (res.ok) {
        alert(`Đã nhập thành công ${result.count} khách hàng mới!`);
        setIsImportOpen(false);
        setParsedRawData(null);
        setMappings({});
        fetchCustomers();
      } else {
        alert(result.error || "Lỗi lưu dữ liệu khách hàng");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối API");
    } finally {
      setSubmitting(false);
    }
  };

  // Manual Add Form submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.company_name) {
      setErrorMsg("Tên công ty là bắt buộc!");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const payload = {
      ...newCust,
      services_used: newCust.services_used.split(",").map(s => s.trim()).filter(Boolean)
    };

    try {
      const res = await fetch("/api/portal/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAddOpen(false);
        setNewCust({
          company_name: "",
          tax_code: "",
          representative: "",
          phone: "",
          email: "",
          address: "",
          services_used: "",
          department_id: ""
        });
        fetchCustomers();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Lỗi tạo khách hàng");
      }
    } catch (e) {
      setErrorMsg("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering Logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tax_code && c.tax_code.includes(searchQuery)) ||
      (c.representative && c.representative.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDept = 
      selectedDept === "ALL" || 
      c.department_id === selectedDept;

    return matchesSearch && matchesDept;
  });

  const getServiceTags = (cust: Customer) => {
    let services: string[] = [];
    try {
      if (Array.isArray(cust.services_used)) {
        services = cust.services_used;
      } else if (typeof cust.services_used === "string") {
        services = JSON.parse(cust.services_used || "[]");
      }
    } catch (e) {
      services = [];
    }
    return services;
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên công ty, MST, SĐT, Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 font-medium text-sm transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Department Filter (Sếp only) */}
          {isBoss && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm shadow-sm transition-all animate-none"
            >
              <option value="ALL">Tất cả Phòng ban</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          )}

          <button 
            onClick={fetchCustomers}
            className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-sm cursor-pointer"
          >
            <RefreshCw size={16} /> Làm mới
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-sm cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Import Excel/Sheets
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md hover:shadow-primary-600/20 flex items-center gap-2 text-sm cursor-pointer"
          >
            <Plus size={16} /> Thêm khách hàng
          </button>

        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            Đang tải dữ liệu khách hàng CRM...
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="p-4 pl-6">Thông tin công ty / Đại diện</th>
                  <th className="p-4">Liên hệ</th>
                  <th className="p-4">Dịch vụ sử dụng</th>
                  <th className="p-4">Phòng ban phụ trách</th>
                  <th className="p-4 pr-6 w-32">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-50 dark:bg-primary-950/60 p-2.5 rounded-xl border border-primary-100/50 dark:border-primary-900/50">
                          <Building2 className="text-primary-600 dark:text-primary-400" size={18} />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-snug">{cust.company_name}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {cust.tax_code && (
                              <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                                MST: {cust.tax_code}
                              </span>
                            )}
                            {cust.representative && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Users size={11} /> Đại diện: {cust.representative}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {cust.phone && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Phone size={12} className="text-slate-400" /> {cust.phone}
                          </div>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail size={12} className="text-slate-400" /> {cust.email}
                          </div>
                        )}
                        {cust.address && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 max-w-[200px]" title={cust.address}>
                            <MapPin size={11} className="text-slate-400 mt-0.5 shrink-0" /> {cust.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {getServiceTags(cust).map(tag => (
                          <span key={tag} className="text-[10px] font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full border border-primary-100/50 dark:border-primary-900/50">
                            {tag}
                          </span>
                        ))}
                        {getServiceTags(cust).length === 0 && (
                          <span className="text-[10px] font-semibold text-slate-400 italic">Chưa đăng ký</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {cust.department_name || (
                          <span className="text-slate-400 dark:text-slate-600 font-normal italic">Chưa gán</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Tạo bởi: {cust.created_by_name || "Hệ thống"}
                      </div>
                    </td>
                    <td className="p-4 pr-6">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {new Date(cust.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-slate-400 italic">
                      Không tìm thấy dữ liệu khách hàng nào khớp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANUAL ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-slate-800 dark:bg-slate-950 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Plus size={20} /> Thêm Khách Hàng Thủ Công
                </h3>
                <p className="text-xs text-slate-300 mt-1">Điền thông tin doanh nghiệp chi tiết</p>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Tên Công ty <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newCust.company_name}
                  onChange={(e) => setNewCust({ ...newCust, company_name: e.target.value })}
                  placeholder="Công ty TNHH Tư vấn Tavitax"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Mã số thuế</label>
                  <input
                    type="text"
                    value={newCust.tax_code}
                    onChange={(e) => setNewCust({ ...newCust, tax_code: e.target.value })}
                    placeholder="0101234567"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Người Đại diện</label>
                  <input
                    type="text"
                    value={newCust.representative}
                    onChange={(e) => setNewCust({ ...newCust, representative: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Số điện thoại</label>
                  <input
                    type="text"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    placeholder="0901234567"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Email</label>
                  <input
                    type="email"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    placeholder="khachhang@gmail.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Địa chỉ</label>
                <input
                  type="text"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  placeholder="Quận 1, TP. Hồ Chí Minh"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Dịch vụ sử dụng <span className="text-[10px] text-slate-400">(Cách nhau dấu phẩy)</span></label>
                <input
                  type="text"
                  value={newCust.services_used}
                  onChange={(e) => setNewCust({ ...newCust, services_used: e.target.value })}
                  placeholder="Quyết toán thuế, Kế toán trọn gói"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              {isBoss && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Chọn phòng ban phụ trách</label>
                  <select
                    value={newCust.department_id}
                    onChange={(e) => setNewCust({ ...newCust, department_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-bold"
                  >
                    <option value="">-- Mặc định phòng của bạn --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MULTI-SOURCE WIZARD & SMART MAPPING UI */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-xl flex items-center gap-2.5">
                  <FileSpreadsheet className="text-emerald-400" size={24} /> 
                  Bàn Ánh Xạ Cột Thông Minh (Smart Import)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Nhập file Excel/CSV hoặc liên kết dữ liệu Google Sheets trực tiếp để tạo hàng loạt khách hàng.
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsImportOpen(false);
                  setParsedRawData(null);
                  setMappings({});
                }}
                className="text-slate-400 hover:text-white transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* STAGE 1: NẠP DỮ LIỆU */}
              {!parsedRawData ? (
                <div className="space-y-6">
                  {/* Mode switcher tabs */}
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                    <button
                      onClick={() => setImportSource("file")}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${importSource === "file" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Upload size={16} /> Upload file CSV / Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => setImportSource("sheet")}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${importSource === "sheet" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <Globe size={16} /> Đồng bộ từ Google Sheets công ty
                    </button>
                  </div>

                  {importSource === "file" ? (
                    <div className="border-3 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors relative group">
                      <input 
                        type="file" 
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="mx-auto text-slate-300 dark:text-slate-700 group-hover:text-primary-500 group-hover:scale-110 transition-all mb-4" size={56} />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Kéo & thả file của bạn vào đây hoặc click để chọn file
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        Hỗ trợ file định dạng Excel (.xlsx, .xls) hoặc CSV.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Spreadsheet ID</label>
                        <input
                          type="text"
                          value={sheetConfig.spreadsheetId}
                          onChange={(e) => setSheetConfig({ ...sheetConfig, spreadsheetId: e.target.value })}
                          placeholder="Nhập mã ID từ link Google Sheet (ví dụ: 1aBcDeFgHiJkLmNoP...)"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                        />
                        <p className="text-[10px] text-slate-400 leading-normal mt-1">
                          📌 Mẹo: Vui lòng nhấn nút <strong>Chia sẻ (Share)</strong> trên trang tính của bạn và cấp quyền đọc cho email Service Account trong hệ thống trước khi nạp.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Tên trang tính / Phạm vi nạp (Range)</label>
                        <input
                          type="text"
                          value={sheetConfig.range}
                          onChange={(e) => setSheetConfig({ ...sheetConfig, range: e.target.value })}
                          placeholder="Sheet1!A1:Z100"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 px-4 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 font-medium"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={fetchingSheet}
                        onClick={handleFetchGoogleSheets}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 w-full transition-all cursor-pointer text-sm"
                      >
                        {fetchingSheet ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            Đang kết nối Google Sheets và tải dữ liệu...
                          </>
                        ) : (
                          <>
                            <Globe size={18} />
                            Kết Nối & Nạp Dữ Liệu
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                
                // STAGE 2: MAPPING INTERFACE
                <div className="space-y-6 animate-fade-in">
                  
                  {/* File information alert */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-emerald-500 shrink-0" size={24} />
                      <div>
                        <div className="text-sm font-extrabold">Đã tải cấu trúc dữ liệu thành công!</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Đã quét được <strong>{parsedRawData.headers.length} cột</strong> và <strong>{parsedRawData.rows.length} dòng</strong> dữ liệu khách hàng.
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setParsedRawData(null)}
                      className="text-emerald-600 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-white font-bold text-xs bg-white dark:bg-emerald-900/50 py-1.5 px-3 rounded-lg border border-emerald-200/50 cursor-pointer transition-all"
                    >
                      Thay đổi nguồn nạp
                    </button>
                  </div>

                  {/* Mapping Form Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left: Fields mapping selector */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                        <Map size={16} className="text-primary-600" />
                        Phối Khớp Trường Dữ Liệu
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Vui lòng kết nối các trường thông tin trong CRM với cột tương ứng từ dữ liệu nguồn bạn đã tải lên.
                      </p>

                      <div className="space-y-3.5 pt-2">
                        {targetFields.map(field => {
                          const value = mappings[field.key] || "";
                          return (
                            <div key={field.key} className="flex flex-col gap-1.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                                  {field.label}
                                  {field.required && <span className="text-rose-500 ml-1 font-black">*</span>}
                                </span>
                                {value ? (
                                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                                    <Check size={10} /> Đã khớp
                                  </span>
                                ) : (
                                  field.required && (
                                    <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 font-black px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/40">
                                      Bắt buộc
                                    </span>
                                  )
                                )}
                              </div>
                              
                              <select
                                value={value}
                                onChange={(e) => setMappings({ ...mappings, [field.key]: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold py-2.5 px-3.5 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                              >
                                <option value="">-- Bỏ qua không ánh xạ --</option>
                                {parsedRawData.headers.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Data Preview */}
                    <div className="space-y-4 flex flex-col h-full">
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 flex-1 flex flex-col min-h-[300px]">
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2 shrink-0">
                          <Eye size={16} className="text-primary-600" />
                          Xem Trước Dữ Liệu Mẫu (3 dòng đầu)
                        </h4>
                        
                        <div className="flex-1 overflow-y-auto space-y-3.5 mt-4">
                          {importPreview.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs text-xs space-y-2 relative">
                              <span className="absolute top-3.5 right-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black">
                                Mẫu #{idx + 1}
                              </span>
                              
                              <div className="space-y-1.5 pt-1 pr-12">
                                <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                                  {item.company_name || <span className="text-rose-400 italic">Chưa ánh xạ Tên Công ty!</span>}
                                </div>
                                {item.tax_code && (
                                  <div><span className="text-slate-400 font-semibold">MST:</span> <strong className="text-slate-600 dark:text-slate-400">{item.tax_code}</strong></div>
                                )}
                                {item.representative && (
                                  <div><span className="text-slate-400 font-semibold">Đại diện:</span> <strong className="text-slate-600 dark:text-slate-400">{item.representative}</strong></div>
                                )}
                                {item.phone && (
                                  <div><span className="text-slate-400 font-semibold">SĐT:</span> <strong className="text-slate-600 dark:text-slate-400">{item.phone}</strong></div>
                                )}
                                {item.email && (
                                  <div><span className="text-slate-400 font-semibold">Email:</span> <strong className="text-slate-600 dark:text-slate-400">{item.email}</strong></div>
                                )}
                                {item.address && (
                                  <div className="line-clamp-1"><span className="text-slate-400 font-semibold">Địa chỉ:</span> <span className="text-slate-600 dark:text-slate-400">{item.address}</span></div>
                                )}
                                {item.services_used && (
                                  <div><span className="text-slate-400 font-semibold">Dịch vụ:</span> <span className="bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold px-1.5 py-0.5 rounded text-[10px]">{String(item.services_used)}</span></div>
                                )}
                              </div>
                            </div>
                          ))}

                          {importPreview.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-400 italic text-xs text-center p-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                              Vui lòng ánh xạ ít nhất cột Tên Công ty để hiển thị dữ liệu xem trước.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Department configuration for import */}
                      {isBoss && (
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shrink-0 space-y-3">
                          <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                            <Landmark size={14} className="text-primary-600" />
                            Gán các khách hàng import này cho Phòng ban phụ trách:
                          </label>
                          <select
                            value={importTargetDept}
                            onChange={(e) => setImportTargetDept(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 px-4 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                          >
                            <option value="">-- Mặc định theo phòng ban của bạn --</option>
                            {roles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setParsedRawData(null);
                  setMappings({});
                }}
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>

              {parsedRawData && (
                <button
                  type="button"
                  disabled={submitting || !mappings["company_name"]}
                  onClick={executeImport}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/10 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Đang xử lý import...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={14} />
                      Tiến Hành Nhập {parsedRawData.rows.length} Khách Hàng
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
