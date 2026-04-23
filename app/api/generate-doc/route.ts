import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// @ts-ignore
import num2words from 'vn-num2words';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body; // type = 'quote' or 'contract'

    // 1. Chỉ định file template mẫu (Bạn cần đặt 2 file Word mẫu này trong C:\Users\Admin\tavitax-web\templates\)
    const templateFileName = type === 'quote' ? 'baogia_template.docx' : 'hopdong_template.docx';
    const templatePath = path.resolve(process.cwd(), 'templates', templateFileName);

    // 2. Kiểm tra template có tồn tại không
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `Không tìm thấy file mẫu: ${templateFileName}. Hãy tạo thư mục 'templates' ở thư mục gốc và nhúng file Word vào.` }, { status: 404 });
    }

    // 3. Đọc dữ liệu file Word
    const content = fs.readFileSync(templatePath, 'binary');

    // 4. Giải nén và nạp vào máy xử lý
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Ngày tháng động (Lấy từ Input user truyền lên, hoặc hôm nay)
    const activeDate = data.docDate ? new Date(data.docDate) : new Date();
    const dd = String(activeDate.getDate()).padStart(2, '0');
    const mm = String(activeDate.getMonth() + 1).padStart(2, '0');
    const yyyy = activeDate.getFullYear();

    // Xử lý Tính tổng phí cho các dịch vụ
    let totalFee = 0;
    if (data.services && Array.isArray(data.services)) {
      data.services.forEach((svc: any) => {
        // Loại bỏ chữ và dấu phân cách để tính tổng
        const numericFee = parseInt(String(svc.fee).replace(/[^0-9]/g, '')) || 0;
        totalFee += numericFee;
      });
    }

    // Tính toán Thuế VAT (8%) và Tổng cống sau thuế
    const vatFee = Math.round(totalFee * 0.08); // Làm tròn để tránh số lẻ
    const finalFee = totalFee + vatFee;
    
    // Định dạng giá tiền VNĐ (vd: 150.000.000)
    const formattedTotalFee = totalFee.toLocaleString('vi-VN');
    const formattedVatFee = vatFee.toLocaleString('vi-VN');
    const formattedFinalFee = finalFee.toLocaleString('vi-VN');

    // Chuyển số thành chữ (Ưu tiên Lấy từ User nhập tay, nếu rỗng thì mới cho thư viện sinh)
    let totalFeeInWords = data.totalFeeInWords || "Không đồng";
    let finalFeeInWords = data.finalFeeInWords || "Không đồng";

    if (!data.totalFeeInWords && totalFee > 0) {
      const rawWordsTotal = num2words(totalFee).trim();
      totalFeeInWords = rawWordsTotal.charAt(0).toUpperCase() + rawWordsTotal.slice(1) + " đồng chẵn";
    }

    if (!data.finalFeeInWords && finalFee > 0) {
      const rawWordsFinal = num2words(finalFee).trim();
      finalFeeInWords = rawWordsFinal.charAt(0).toUpperCase() + rawWordsFinal.slice(1) + " đồng chẵn";
    }

    // 5. Render (Bơm toàn bộ dữ liệu từ Web form vào các cặp ngoặc nhọn {key} trong Word)
    doc.render({
      ...data,               // Đổ toàn bộ form data vào (companyName, position, phone, email, etc.)
      services: data.services, // Mảng dịch vụ cho vòng lặp {#services}
      totalFee: formattedTotalFee, // Tổng phí trước Thuế
      totalFeeInWords: totalFeeInWords, // Chữ của tổng phí trước thuế
      vatFee: formattedVatFee, // Phí VAT 8%
      finalFee: formattedFinalFee, // Tổng phí sau Thuế
      finalFeeInWords: finalFeeInWords, // Chữ của tổng phí sau thuế
      date_day: dd,
      date_month: mm,
      date_year: yyyy,
      current_date: `${dd}/${mm}/${yyyy}`
    });

    // 6. Xuất file đầu ra dưới dạng Binary Buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 7. Trả file về trình duyệt Client để Tải Xuống
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=Tavitax_Generated.docx`,
      },
    });
  } catch (error: any) {
    console.error("Lỗi khởi tạo tài liệu:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
