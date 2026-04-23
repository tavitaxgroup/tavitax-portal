"use client";

import { useState, useEffect } from "react";
import { Users, Phone, Mail, Clock, FileText, ChevronDown, CheckSquare, XCircle, Search, Save, Loader2, RefreshCw, Download, Bot } from "lucide-react";
import * as XLSX from "xlsx";

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [viewingPayload, setViewingPayload] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDraft, setAiDraft] = useState<string>("");
  
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/crm");
      if (res.ok) setLeads(await res.json());
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, []);

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
    } catch(e) {} finally { setSaving(null); }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'NEW': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'CLOSED_WON': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CLOSED_LOST': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
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
      // Flatten the payload dynamically
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Khách Hàng");
    
    // Auto-size columns slightly
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

  // Hàm render Markdown bôi đậm
  const renderBold = (str: string) => {
    const chunks = str.split(/\*\*(.*?)\*\*/g);
    if (chunks.length === 1) return str;
    return chunks.map((chunk, i) => i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk);
  };

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Users className="text-primary-600" /> Quản Lý Khách Hàng (Mini CRM)
          </h1>
          <p className="text-slate-500 mt-2">Theo dõi, phân loại và cập nhật tiến độ tư vấn Khách hàng tiềm năng.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!loading && (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
            >
              <option value="ALL">Tất cả Nguồn</option>
              {Array.from(new Set(leads.map(l => l.source))).filter(Boolean).map(src => (
                <option key={src as string} value={src as string}>{src}</option>
              ))}
            </select>
          )}

          <button 
            onClick={fetchLeads}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={18} /> Làm Mới
          </button>
          
          <button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={18} /> Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            Đang tải dữ liệu khách hàng...
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Khách Hàng / Thời Gian</th>
                  <th className="p-4 font-bold">Liên Hệ</th>
                  <th className="p-4 font-bold">Nhu Cầu / Lời Nhắn</th>
                  <th className="p-4 font-bold w-48">Trạng Thái</th>
                  <th className="p-4 font-bold w-64">Ghi Chú Nội Bộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.filter(l => selectedSource === 'ALL' || l.source === selectedSource).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-800 text-sm">{lead.name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={12}/> {new Date(lead.created_at).toLocaleString('vi-VN')}
                      </div>
                      <div className="mt-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-block">
                        {lead.source}
                      </div>
                    </td>
                    <td className="p-4 align-top text-sm">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Phone size={14} className="text-slate-400"/> {lead.phone || (lead.payload && lead.payload.phone) || 'N/A'}
                      </div>
                      {(lead.email || (lead.payload && lead.payload.email)) && (
                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                          <Mail size={14} className="text-slate-400"/> {lead.email || (lead.payload && lead.payload.email)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      {lead.service && <div className="text-sm font-bold text-slate-700 mb-1">{lead.service}</div>}
                      {lead.message && <div className="text-xs text-slate-500 line-clamp-3 italic">"{lead.message}"</div>}
                      {!lead.service && !lead.message && lead.payload && (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setViewingPayload(lead)}
                            className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded cursor-pointer inline-block hover:bg-blue-100 font-semibold"
                          >
                            <FileText size={12} className="inline mr-1" />
                            Xem chi tiết phiếu khảo sát
                          </div>
                          
                          {(() => {
                             const risks = getRiskTags(lead.payload);
                             if (risks.length > 0) {
                                return (
                                   <div className="flex flex-wrap gap-1.5 mt-1 border border-red-100 bg-red-50/50 p-1.5 rounded-lg">
                                       <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse">RỦI RO PHÁP LÝ CAO!</span>
                                       {risks.map(r => <span key={r} className="text-[10px] bg-white text-red-600 border border-red-200 px-1.5 py-0.5 rounded">{r}</span>)}
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
                        className={`w-full appearance-none border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer transition-colors ${getStatusColor(lead.status || 'NEW')}`}
                        disabled={saving === lead.id}
                      >
                        <option value="NEW">MỚI CHƯA GỌI</option>
                        <option value="IN_PROGRESS">ĐANG TƯ VẤN</option>
                        <option value="CLOSED_WON">CHỐT HỢP ĐỒNG</option>
                        <option value="CLOSED_LOST">THẤT BẠI / TỪ CHỐI</option>
                      </select>
                      {saving === lead.id && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Đang lưu...</div>}
                    </td>
                    <td className="p-4 align-top">
                      <textarea 
                        className="w-full text-xs box-border border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
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
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">Chưa có dữ liệu Khách hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYLOAD VIEWER MODAL */}
      {viewingPayload && viewingPayload.payload && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white shrink-0 rounded-t-3xl">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <FileText size={20}/> Chi tiết Khảo sát
                </h3>
                <p className="text-slate-300 text-sm mt-1">{viewingPayload.name} - {viewingPayload.source}</p>
              </div>
              <button onClick={() => setViewingPayload(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex flex-col md:flex-row gap-6">
              {/* Cột Trái Dữ liệu */}
              <div className="flex-1 space-y-4">
                <h4 className="font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">Dữ liệu Cung cấp</h4>
                {Object.entries(viewingPayload.payload).map(([key, value]) => {
                  if (key === 'riskScore' || key === 'riskLevel') return null; // Can render separately if needed
                  return (
                    <div key={key} className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-bold mb-1">{key}</div>
                      <div className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{value ? value.toString() : "Không có"}</div>
                    </div>
                  );
                })}

                {viewingPayload.payload.riskScore !== undefined && (
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 mt-4">
                     <div className="text-xs text-rose-500 font-bold mb-1">Kết quả đánh giá tự động (Risk Score)</div>
                     <div className="text-lg text-rose-700 font-black">Mức độ rủi ro: {viewingPayload.payload.riskLevel} ({viewingPayload.payload.riskScore} điểm)</div>
                  </div>
                )}
              </div>

              {/* Cột Phải Tavibot */}
              <div className="flex-1">
                 <div className="bg-gradient-to-b from-primary-900 to-slate-900 rounded-3xl overflow-hidden shadow-xl border border-primary-800 flex flex-col h-full min-h-[400px]">
                    <div className="p-4 bg-white/10 flex items-center gap-3">
                       <Bot className="text-primary-300" size={24} />
                       <h4 className="text-white font-bold">Tavibot Phân Tích & Kịch Bản</h4>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col items-center justify-center relative">
                       {!aiDraft && !analyzing ? (
                         <div className="text-center">
                           <Bot size={48} className="mx-auto text-primary-500/50 mb-4" />
                           <p className="text-slate-300 text-sm mb-6 max-w-[200px] mx-auto">Click để AI phân tích hồ sơ và soạn email gửi khách hàng mục tiêu.</p>
                           <button onClick={handleAIAnalyze} className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-600/50 transition-all flex items-center gap-2 mx-auto">
                              Phân tích hồ sơ ngay
                           </button>
                         </div>
                       ) : analyzing ? (
                         <div className="flex flex-col items-center">
                            <Loader2 size={32} className="animate-spin text-primary-400 mb-4" />
                            <p className="text-slate-400 font-medium">Tavibot đang đọc dữ liệu...</p>
                         </div>
                       ) : (
                         <div className="w-full h-full bg-white/5 rounded-2xl p-4 text-slate-200 text-sm overflow-y-auto leading-relaxed border border-white/10 whitespace-pre-wrap relative group">
                            {renderBold(aiDraft)}
                            <button className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(aiDraft)}>
                               Copy
                            </button>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-white rounded-b-3xl">
               <button onClick={() => { setViewingPayload(null); setAiDraft(""); }} className="px-6 py-2 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all">
                  Đóng
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
