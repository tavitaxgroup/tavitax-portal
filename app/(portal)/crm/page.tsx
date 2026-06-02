"use client";

import { useState, useEffect } from "react";
import { 
  Users, Phone, Mail, Clock, FileText, ChevronDown, CheckSquare, 
  XCircle, Search, Save, Loader2, RefreshCw, Download, Bot, 
  TrendingUp, Star, Award, Layers
} from "lucide-react";
import * as XLSX from "xlsx";
import CustomersList from "@/components/portal/crm/CustomersList";
import CrmDashboard from "@/components/portal/crm/CrmDashboard";

export default function CRMPage() {
  // Navigation Tabs: 'leads' (Khách tiềm năng), 'customers' (Khách chính thức), 'dashboard' (Báo cáo)
  const [activeTab, setActiveTab] = useState<"leads" | "customers" | "dashboard">("leads");
  
  // User Session State
  const [user, setUser] = useState<any>(null);

  // Original Leads States
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [viewingPayload, setViewingPayload] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDraft, setAiDraft] = useState<string>("");

  useEffect(() => {
    // 1. Fetch User Session
    fetch("/api/auth/me")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Unauthorized");
      })
      .then(data => setUser(data.user))
      .catch(err => console.error("Error fetching me session:", err));

    // 2. Fetch Leads (potential customers)
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/portal/crm");
      if (res.ok) setLeads(await res.json());
    } catch(e) {
      console.error(e);
    } finally { 
      setLoadingLeads(false); 
    }
  };

  const updateLead = async (id: number, status: string, notes: string) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/portal/crm/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads(leads.map(l => l.id === id ? updated : l));
      }
    } catch(e) {
      console.error(e);
    } finally { 
      setSaving(null); 
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'NEW': return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'IN_PROGRESS': return 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'CLOSED_WON': return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'CLOSED_LOST': return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'NEW': return 'Mới';
      case 'IN_PROGRESS': return 'Đang Xử Lý';
      case 'CLOSED_WON': return 'Thành Công';
      case 'CLOSED_LOST': return 'Thất Bại';
      default: return status;
    }
  };

  const exportToExcel = () => {
    const filteredLeads = leads.filter(l => selectedSource === 'ALL' || l.source === selectedSource);
    if (filteredLeads.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    const flatData = filteredLeads.map(lead => {
      const payloadData = typeof lead.payload === 'object' && lead.payload !== null ? lead.payload : {};
      
      return {
        "ID": lead.id,
        "Thời Gian Tạo": new Date(lead.created_at).toLocaleString('vi-VN'),
        "Nguồn": lead.source,
        "Khách Hàng": lead.name,
        "SĐT": lead.phone || '',
        "Email": lead.email || '',
        "Trạng Thái": getStatusLabel(lead.status || 'NEW'),
        "Ghi Chú Sale": lead.notes || '',
        ...payloadData 
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Khách Hàng Tiềm Năng");
    
    const wscols = Object.keys(flatData[0]).map(() => ({ wch: 20 }));
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Tavitax_Leads_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  const handleAIAnalyze = async () => {
    if (!viewingPayload) return;
    setAnalyzing(true);
    setAiDraft("");
    
    const prompt = `Bạn là chuyên gia tư vấn thuế Tavitax. Hãy phân tích ngắn gọn hồ sơ khách hàng sau: ${JSON.stringify(viewingPayload.payload, null, 2)}. Sau đó soạn MỘT email ngắn gọn, chuyên nghiệp để chào giá các dịch vụ phù hợp dựa rủi ro của họ. Định dạng rõ ràng, ngôn từ lịch sự.`;
    
    try {
      const response = await fetch("http://127.0.0.1:8000/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });
      if (!response.ok) throw new Error("API lỗi");
      const result = await response.json();
      setAiDraft(result.answer || "Không thể lấy dự thảo. Vui lòng thử lại.");
    } catch(err) {
      setAiDraft("Lỗi kết nối tới Tavibot Server. Vui lòng đảm bảo server đang chạy tại port 8000.");
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskTags = (payload: any) => {
    const risks: string[] = [];
    if (!payload || typeof payload !== 'object') return risks;

    if (payload.surveyType === "Khảo Sát Hộ Kinh Doanh") {
        if (payload.invoiceUsage === "Không" || payload.invoiceUsage === "Có (ít)") risks.push("Hóa đơn bán");
        if (payload.inputDocs === "Không" || payload.inputDocs === "Có (nhưng không đầy đủ)") risks.push("Thiếu đầu vào");
        if (payload.relatedTransactions === "Có") risks.push("Giao dịch LK");
        if (payload.issues && payload.issues.length > 0) risks.push("Lỗ hổng Q.Trị");
    }
    return risks;
  };

  const renderBold = (str: string) => {
    const chunks = str.split(/\*\*(.*?)\*\*/g);
    if (chunks.length === 1) return str;
    return chunks.map((chunk, i) => i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl py-6 relative space-y-8">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Users className="text-primary-600 dark:text-primary-400 animate-pulse" /> 
            Hệ Thống Quản Trị Khách Hàng (CRM)
          </h1>
          <p className="text-slate-400 mt-2 text-xs font-semibold">
            Theo dõi leads, lưu trữ tệp khách hàng chính thức và cập nhật hiệu suất phòng ban.
          </p>
        </div>
      </div>

      {/* SEGMENTED GLASSMORPHIC TAB NAVIGATION */}
      <div className="flex p-1 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-sm max-w-2xl gap-1">
        
        {/* Tab 1: Leads */}
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex-1 py-3 text-xs font-black rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "leads" ? "bg-primary-600 text-white shadow-md shadow-primary-600/10 scale-95" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"}`}
        >
          <Star size={16} /> 
          Khách Tiềm Năng (Leads)
        </button>

        {/* Tab 2: Customers */}
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex-1 py-3 text-xs font-black rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "customers" ? "bg-primary-600 text-white shadow-md shadow-primary-600/10 scale-95" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"}`}
        >
          <Layers size={16} />
          Khách Hàng Chính Thức
        </button>

        {/* Tab 3: Dashboard */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 py-3 text-xs font-black rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 ${activeTab === "dashboard" ? "bg-primary-600 text-white shadow-md shadow-primary-600/10 scale-95" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"}`}
        >
          <TrendingUp size={16} />
          Thống Kê & Báo Cáo
        </button>

      </div>

      {/* TAB CONTENT RENDERING */}
      
      {/* 1. LEADS TAB */}
      {activeTab === "leads" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controls Bar for Leads */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs gap-4 shrink-0">
            <div className="text-xs font-black text-slate-700 dark:text-slate-300">
              Danh sách Đăng ký từ Website & Phiếu khảo sát
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {!loadingLeads && (
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-xs shadow-xs"
                >
                  <option value="ALL">Tất cả Nguồn</option>
                  {Array.from(new Set(leads.map(l => l.source))).filter(Boolean).map(src => (
                    <option key={src as string} value={src as string}>{src}</option>
                  ))}
                </select>
              )}

              <button 
                onClick={fetchLeads}
                className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer"
              >
                <RefreshCw size={14} /> Làm Mới
              </button>
              
              <button 
                onClick={exportToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer"
              >
                <Download size={14} /> Xuất Excel
              </button>
            </div>
          </div>

          {/* Table Container for Leads */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {loadingLeads ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                Đang tải dữ liệu khách hàng tiềm năng...
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Khách Hàng / Thời Gian</th>
                      <th className="p-4">Liên Hệ</th>
                      <th className="p-4">Nhu Cầu / Lời Nhắn</th>
                      <th className="p-4 w-48">Trạng Thái</th>
                      <th className="p-4 pr-6 w-64">Ghi Chú Nội Bộ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leads.filter(l => selectedSource === 'ALL' || l.source === selectedSource).map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6 align-top">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-snug">{lead.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                            <Clock size={11}/> {new Date(lead.created_at).toLocaleString('vi-VN')}
                          </div>
                          <div className="mt-2 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full inline-block border border-slate-200/30">
                            {lead.source}
                          </div>
                        </td>
                        <td className="p-4 align-top text-xs">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                            <Phone size={12} className="text-slate-400"/> {lead.phone || (lead.payload && lead.payload.phone) || 'N/A'}
                          </div>
                          {(lead.email || (lead.payload && lead.payload.email)) && (
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                              <Mail size={12} className="text-slate-400"/> {lead.email || (lead.payload && lead.payload.email)}
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          {lead.service && <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">{lead.service}</div>}
                          {lead.message && <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 italic">"{lead.message}"</div>}
                          {!lead.service && !lead.message && lead.payload && (
                            <div className="space-y-2">
                              <div 
                                onClick={() => setViewingPayload(lead)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg cursor-pointer inline-block hover:bg-blue-100/50 dark:hover:bg-blue-900/50 font-bold border border-blue-100 dark:border-blue-900/40 transition-colors"
                              >
                                <FileText size={12} className="inline mr-1" />
                                Xem chi tiết phiếu khảo sát
                              </div>
                              
                              {(() => {
                                 const risks = getRiskTags(lead.payload);
                                 if (risks.length > 0) {
                                    return (
                                       <div className="flex flex-wrap gap-1.5 mt-1 border border-red-100 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 p-1.5 rounded-xl">
                                           <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded shadow-xs animate-pulse">RỦI RO PHÁP LÝ CAO!</span>
                                           {risks.map(r => <span key={r} className="text-[9px] bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 px-1.5 py-0.5 rounded">{r}</span>)}
                                       </div>
                                    )
                                 }
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-top">
                          <select
                            value={lead.status || 'NEW'}
                            onChange={(e) => updateLead(lead.id, e.target.value, lead.notes)}
                            className={`w-full appearance-none border rounded-xl px-3 py-2.5 text-xs font-black outline-none cursor-pointer transition-colors ${getStatusColor(lead.status || 'NEW')}`}
                            disabled={saving === lead.id}
                          >
                            <option value="NEW">MỚI CHƯA GỌI</option>
                            <option value="IN_PROGRESS">ĐANG TƯ VẤN</option>
                            <option value="CLOSED_WON">CHỐT HỢP ĐỒNG</option>
                            <option value="CLOSED_LOST">THẤT BẠI / TỪ CHỐI</option>
                          </select>
                          {saving === lead.id && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Đang lưu...</div>}
                        </td>
                        <td className="p-4 pr-6 align-top">
                          <textarea 
                            className="w-full text-xs box-border border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary-500 outline-none resize-none text-slate-800 dark:text-slate-200 font-medium"
                            rows={3}
                            placeholder="Ghi chú lịch sử gọi, nhu cầu..."
                            defaultValue={lead.notes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== lead.notes) {
                                updateLead(lead.id, lead.status, e.target.value);
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                    {leads.filter(l => selectedSource === 'ALL' || l.source === selectedSource).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-500 dark:text-slate-400 font-medium italic">Chưa có dữ liệu Khách hàng nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Original PAYLOAD VIEWER MODAL */}
          {viewingPayload && viewingPayload.payload && (
            <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-800 dark:bg-slate-950 p-6 flex justify-between items-center text-white shrink-0">
                  <div>
                    <h3 className="font-extrabold text-xl flex items-center gap-2">
                      <FileText size={20} className="text-primary-400" /> Chi tiết Khảo sát
                    </h3>
                    <p className="text-slate-300 text-xs mt-1">{viewingPayload.name} - {viewingPayload.source}</p>
                  </div>
                  <button onClick={() => setViewingPayload(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg">
                    ✕
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-6 flex-1">
                  {/* Left Column: Data info */}
                  <div className="flex-1 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    <h4 className="font-extrabold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      Dữ liệu Cung cấp từ Website
                    </h4>
                    {Object.entries(viewingPayload.payload).map(([key, value]) => {
                      if (key === 'riskScore' || key === 'riskLevel') return null;
                      return (
                        <div key={key} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{key}</div>
                          <div className="text-xs text-slate-800 dark:text-slate-200 font-bold whitespace-pre-wrap leading-relaxed">{value ? value.toString() : "Không có"}</div>
                        </div>
                      );
                    })}

                    {viewingPayload.payload.riskScore !== undefined && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 mt-4">
                         <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Kết quả đánh giá tự động (Risk Score)</div>
                         <div className="text-sm text-rose-700 dark:text-rose-400 font-black">
                           Mức độ rủi ro: {viewingPayload.payload.riskLevel} ({viewingPayload.payload.riskScore} điểm)
                         </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Tavibot consultancy script */}
                  <div className="flex-1">
                     <div className="bg-gradient-to-b from-primary-950 to-slate-950 rounded-3xl overflow-hidden shadow-xl border border-primary-900 flex flex-col h-full min-h-[350px]">
                        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-3">
                           <Bot className="text-primary-300 animate-bounce" size={22} />
                           <h4 className="text-white font-extrabold text-sm">Tavibot Phân Tích & Kịch Bản</h4>
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col items-center justify-center relative">
                           {!aiDraft && !analyzing ? (
                             <div className="text-center space-y-4">
                               <Bot size={44} className="mx-auto text-primary-500/40" />
                               <p className="text-slate-400 text-xs max-w-[220px] mx-auto leading-relaxed">
                                 Phân tích hồ sơ khách hàng gửi lên và tự động soạn thư tư vấn/chào giá tối ưu.
                               </p>
                               <button 
                                 onClick={handleAIAnalyze} 
                                 className="bg-primary-600 hover:bg-primary-500 text-white font-black py-2.5 px-5 rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center gap-2 mx-auto text-xs cursor-pointer"
                               >
                                  Phân tích & Soạn kịch bản
                               </button>
                             </div>
                           ) : analyzing ? (
                             <div className="flex flex-col items-center gap-3">
                                <Loader2 size={28} className="animate-spin text-primary-400" />
                                <p className="text-slate-400 font-semibold text-xs">Tavibot đang đọc dữ liệu & phân tích...</p>
                             </div>
                           ) : (
                             <div className="w-full h-full bg-white/5 rounded-2xl p-4 text-slate-200 text-xs overflow-y-auto leading-relaxed border border-white/10 whitespace-pre-wrap relative group">
                                {renderBold(aiDraft)}
                                <button 
                                  className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 py-1.5 px-3 rounded-lg text-[10px] font-bold text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiDraft);
                                    alert("Đã copy kịch bản!");
                                  }}
                                >
                                   Copy kịch bản
                                </button>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900 shrink-0">
                   <button 
                     onClick={() => { setViewingPayload(null); setAiDraft(""); }} 
                     className="px-5 py-2.5 font-bold text-xs text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                   >
                      Đóng
                   </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. CUSTOMERS TAB */}
      {activeTab === "customers" && (
        <div className="animate-fade-in">
          <CustomersList user={user} />
        </div>
      )}

      {/* 3. DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="animate-fade-in">
          <CrmDashboard />
        </div>
      )}

    </div>
  );
}
