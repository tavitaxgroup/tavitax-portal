import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/google-sheets';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Hàm xác thực token
async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return false;
  try {
    const user = verifyToken(token);
    return !!user;
  } catch (e) {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { spreadsheetId, range } = await req.json();

    if (!spreadsheetId || !range) {
      return NextResponse.json({ error: 'Thiếu thông tin spreadsheetId hoặc tên trang tính (range).' }, { status: 400 });
    }

    // Khởi tạo Google Sheets API client
    const sheets = await getGoogleSheetsClient();

    // Lấy dữ liệu từ Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu hoặc trang tính trống.' }, { status: 404 });
    }

    // Trả về dữ liệu thô (mảng các dòng) để Client thực hiện Map Cột Thông Minh
    return NextResponse.json({
      success: true,
      headers: rows[0], // Dòng đầu tiên là tiêu đề cột
      data: rows.slice(1) // Các dòng dữ liệu tiếp theo
    });

  } catch (error: any) {
    console.error("Lỗi POST /api/portal/crm/customers/import-sheets:", error);
    
    // Đưa ra lỗi chi tiết hơn giúp người dùng gỡ lỗi (vd: quyền truy cập Service Account)
    let errorMsg = 'Kết nối Google Sheets thất bại.';
    if (error.status === 403) {
      errorMsg = 'Lỗi 403: Không có quyền truy cập. Vui lòng đảm bảo bạn đã chia sẻ Google Sheet này cho Service Account Email trong file cấu hình .env (GOOGLE_CLIENT_EMAIL).';
    } else if (error.status === 404) {
      errorMsg = 'Lỗi 404: Không tìm thấy Spreadsheet ID. Vui lòng kiểm tra lại link Google Sheet.';
    }

    return NextResponse.json({ 
      error: errorMsg,
      details: error.message || error
    }, { status: 500 });
  }
}
