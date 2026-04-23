import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taxCode = searchParams.get('code');

    if (!taxCode) {
      return NextResponse.json({ error: 'Thiếu mã số thuế' }, { status: 400 });
    }

    const res = await fetch(`https://api.vietqr.io/v2/business/${taxCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Lỗi gọi API Thuế:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
