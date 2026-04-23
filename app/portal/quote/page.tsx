"use client";

import { useState, useMemo } from "react";
import { FileText, Download, Building2, UserCircle, Briefcase, FileSignature, CheckCircle, PlusCircle, Trash2, Calculator, Search, Loader2 } from "lucide-react";

export default function AdminDocsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    companyName: "",
    position: "Giám đốc", // chức vụ
    taxCode: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    totalFeeInWords: "", // Người dùng nhập thủ công số tiền chữ
    finalFeeInWords: "", // Người dùng nhập thủ công số tiền chữ sau thuế
    docDate: new Date().toISOString().split('T')[0], // Mặc định là ngày hôm nay dạng YYYY-MM-DD
  });

  const [services, setServices] = useState([
    { serviceName: "Dịch vụ Kiểm toán Báo cáo Tài chính", fee: "50.000.000" }
  ]);

  const handleSetToday = () => {
    setFormData({ ...formData, docDate: new Date().toISOString().split('T')[0] });
  };

  const handleAddService = () => {
    setServices([...services, { serviceName: "", fee: "" }]);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: string, value: string) => {
    const newServices = [...services];
    let finalValue = value;

    if (field === "fee") {
      // Tự động chèn dấu chấm phân cách tiền tệ
      const numericVal = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numericVal)) {
        finalValue = numericVal.toLocaleString("vi-VN");
      } else {
        finalValue = "";
      }
    }

    newServices[index] = { ...newServices[index], [field]: finalValue };
    setServices(newServices);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ⚡ TíNH TOÁ TỔNG TIỀN TRỰC TIẾP TRÊN UI
  const { totalFeeUI, vatFeeUI, finalFeeUI } = useMemo(() => {
    let total = 0;
    services.forEach(svc => {
      const num = parseInt(String(svc.fee).replace(/[^0-9]/g, '')) || 0;
      total += num;
    });
    const vat = Math.round(total * 0.08);
    const final = total + vat;
    return {
      totalFeeUI: total,
      vatFeeUI: vat,
      finalFeeUI: final
    };
  }, [services]);

  // HÀM TRA CỨU MÃ SỐ THUẾ TỰ ĐỘNG
  const lookupTaxCode = async () => {
    if (!formData.taxCode || formData.taxCode.length < 10) {
      alert("Vui lòng nhập đúng ít nhất 10 số của Mã số thuế!");
      return;
    }
    
    setIsLookingUp(true);
    try {
      // Gọi API Nội bộ của chúng ta để làm Cầu Nối (Proxy) tránh rào cản CORS của Trình duyệt
      const res = await fetch(`/api/lookup-tax?code=${formData.taxCode}`);
      const responseCode = await res.json();
      
      if (responseCode.code === "00" && responseCode.data) {
        setFormData(prev => ({
          ...prev,
          companyName: responseCode.data.name || prev.companyName,
          address: responseCode.data.address || prev.address,
        }));
      } else {
        alert("Không tìm thấy dữ liệu Công ty với mã số thuế này trên Cổng thông tin Quốc gia!");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối khi tra cứu mã số thuế.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const generateDocument = async (type: "quote" | "contract") => {
    setIsGenerating(true);
    setSuccess(false);

    try {
      const payload = {
        ...formData,
        services, // Mảng dịch vụ truyền xuống API
        // Tính tổng tiền tự động hoặc truyền rỗng (tùy format file word)
      };

      const res = await fetch("/api/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: payload }),
      });

      if (!res.ok) throw new Error("Lỗi khi tạo tài liệu");

      // 2. Chuyển kết quả về dạng Blob để Tải xuống
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tavitax_${type === 'quote' ? 'BaoGia' : 'HopDong'}_${formData.companyName.replace(/\s+/g, '_') || 'Khach_Hang'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Đã có lỗi xảy ra. Hãy chắc chắn bạn đã chạy API đúng cách.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setSuccess(false), 3000); // Ẩn thông báo sau 3s
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="bg-slate-800 rounded-3xl p-8 md:p-12 text-white shadow-xl mb-10 overflow-hidden relative">
          <div className="absolute -right-20 -top-20 opacity-10">
            <FileSignature size={300} />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">Cổng Quản Trị Tavitax</h1>
            <p className="text-primary-100 text-lg">Hệ thống tạo tự động Báo Giá & Hợp Đồng Dịch Vụ</p>
          </div>
        </div>

        {/* Bảng điền thông tin */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4 inline-flex items-center gap-2">
            <Briefcase className="text-primary-500" /> Nhập thông tin Khách hàng
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 inline-flex items-center gap-2"><Building2 size={16}/> Tên Doanh Nghiệp (Pháp nhân)</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: CÔNG TY TNHH ABC" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 inline-flex items-center gap-2"><UserCircle size={16}/> Người Đại Diện</label>
              <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: Ông Nguyễn Văn A" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">Chức Vụ</label>
              <input type="text" name="position" value={formData.position} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: Giám Đốc" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-600 flex items-center justify-between">
                Mã Số Thuế
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  name="taxCode" 
                  value={formData.taxCode} 
                  onChange={handleChange} 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-slate-900" 
                  placeholder="VD: 0312345678" 
                />
                <button 
                  onClick={lookupTaxCode}
                  disabled={isLookingUp}
                  title="Tra cứu mã số thuế tự động"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-12 w-12 rounded-xl transition-all flex items-center justify-center disabled:opacity-50 shrink-0"
                  type="button"
                >
                  {isLookingUp ? <Loader2 size={20} className="animate-spin"/> : <Search size={20}/>}
                </button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-600">Địa Chỉ Trụ Sở</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="Địa chỉ chi tiết sẽ được tự động điền" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">Số Điện Thoại</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: 0909123456" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">Email LH</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: lienhe@congty.com" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-600">Website Doanh nghiệp (Tuỳ chọn)</label>
              <input type="text" name="website" value={formData.website} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: https://tavitax.com" />
            </div>

            {/* Phần chọn ngày tháng */}
            <div className="space-y-2 md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <label className="text-sm font-bold text-slate-600 block">Ngày tháng ghi trên Giấy Tờ</label>
              <div className="flex items-center gap-4">
                <input 
                  type="date" 
                  name="docDate" 
                  value={formData.docDate} 
                  onChange={handleChange} 
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold text-slate-700" 
                />
                <button 
                  onClick={handleSetToday}
                  className="text-sm font-bold text-primary-600 bg-primary-50 px-4 py-2 border border-primary-100 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  📍 Lấy Hôm Nay
                </button>
              </div>
            </div>

          </div>

          {/* Bảng Dịch Vụ */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-lg font-bold text-slate-800">Danh Sách Dịch Vụ Cung Cấp</h3>
              <button 
                onClick={handleAddService} 
                className="text-sm font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors inline-flex items-center gap-2"
              >
                <PlusCircle size={16} /> Thêm Dịch Vụ Mới
              </button>
            </div>

            <div className="space-y-4">
              {services.map((svc, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên dịch vụ</label>
                    <input type="text" value={svc.serviceName} onChange={(e) => handleServiceChange(index, "serviceName", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold text-primary-700" placeholder="VD: Dịch vụ Tư vấn Thuế" />
                  </div>
                  <div className="md:w-1/3 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trị giá (VNĐ)</label>
                    <input type="text" value={svc.fee} onChange={(e) => handleServiceChange(index, "fee", e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900" placeholder="50.000.000" />
                  </div>
                  {services.length > 1 && (
                    <button onClick={() => handleRemoveService(index)} className="absolute -top-3 -right-3 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-6 mt-4 bg-slate-50 p-6 rounded-2xl relative">
              <div className="absolute top-4 right-6 text-slate-300 opacity-20"><Calculator size={100} /></div>
              
              <h3 className="font-bold text-xl text-slate-800 mb-6 relative z-10">Bảng Tổng Kết & Đọc Số</h3>
              
              {/* Box hiển thị thống kê tổng */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 mb-8">
                <div className="pt-2 md:pt-0">
                  <span className="block text-sm text-slate-500 font-bold mb-1">Cộng tiền Hàng (Trước thuế)</span>
                  <span className="block text-2xl font-black text-slate-800">{totalFeeUI.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="pt-4 md:pt-0">
                  <span className="block text-sm text-slate-500 font-bold mb-1">Thuế VAT (8%)</span>
                  <span className="block text-2xl font-black text-slate-600">{vatFeeUI.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="pt-4 md:pt-0">
                  <span className="block text-sm text-slate-500 font-bold mb-1">TỔNG THANH TOÁN</span>
                  <span className="block text-2xl font-black text-primary-700">{finalFeeUI.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <label className="text-sm font-bold text-slate-600 border-l-4 border-slate-400 pl-2">Số Tiền {totalFeeUI.toLocaleString('vi-VN')} đ (Bằng chữ)</label>
                <input type="text" name="totalFeeInWords" value={formData.totalFeeInWords} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: Năm mươi triệu đồng chẵn (Để trống tự đọc)" />
              </div>
  
              <div className="space-y-2 relative z-10 pt-4">
                <label className="text-sm font-bold text-slate-600 border-l-4 border-primary-500 pl-2">Số Tiền {finalFeeUI.toLocaleString('vi-VN')} đ (Bằng chữ) - <span className="text-primary-700">Ghi vào Hợp Đồng</span></label>
                <input type="text" name="finalFeeInWords" value={formData.finalFeeInWords} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium text-slate-900" placeholder="VD: Năm mươi tư triệu đồng chẵn (Để trống tự đọc)" />
              </div>
            </div>
          </div>

          {/* Controller Group */}
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center gap-4">
            <button 
              onClick={() => generateDocument("quote")}
              disabled={isGenerating}
              className="w-full md:w-auto bg-white border-2 border-primary-500 text-primary-600 hover:bg-primary-50 hover:shadow-md font-bold py-3 px-8 rounded-xl transition-all inline-flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <FileText size={20} /> Xuất Báo Giá
            </button>

            <button 
              onClick={() => generateDocument("contract")}
              disabled={isGenerating}
              className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 font-bold py-3 px-8 rounded-xl transition-all inline-flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Download size={20} /> Xuất Hợp Đồng
            </button>

            {success && (
              <span className="ml-auto text-emerald-600 font-bold inline-flex items-center gap-2 animate-bounce">
                <CheckCircle size={20} /> Tạo file thành công!
              </span>
            )}
            {isGenerating && (
              <span className="ml-auto text-slate-500 font-bold inline-flex items-center gap-2 animate-pulse">
                Đang nén dữ liệu...
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
