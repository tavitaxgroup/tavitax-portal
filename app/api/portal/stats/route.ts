import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function isAuthenticated() {
  const cookieStore = await cookies();
  return !!cookieStore.get('tavitax-auth');
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const query = `
      WITH last_7_days AS (
          SELECT current_date - i AS d
          FROM generate_series(6, 0, -1) i
      )
      SELECT 
          to_char(d, 'DD/MM') as name,
          COALESCE(SUM(CASE WHEN source ILIKE '%Khảo Sát%' THEN 1 ELSE 0 END), 0)::int as leads,
          COALESCE(SUM(CASE WHEN source ILIKE '%Contact Form%' THEN 1 ELSE 0 END), 0)::int as quotes
      FROM last_7_days
      LEFT JOIN crm_leads ON date_trunc('day', crm_leads.created_at) = d
      GROUP BY d
      ORDER BY d ASC;
    `;
    
    const { rows } = await pool.query(query);

    // Xử lý lại nhãn "name" thành T2, T3... cho thân thiện hoặc giữ nguyên DD/MM
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const formattedRows = rows.map(r => {
      // Split DD/MM to get Date object for current year
      const [day, month] = r.name.split('/');
      const dateObj = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
      return {
        ...r,
        name: daysOfWeek[dateObj.getDay()] // Hiển thị "T2", "T3" thay vì "17/04"
      };
    });

    return NextResponse.json(formattedRows);
  } catch (error) {
    console.error("Lỗi lấy thông tin dashboard stats", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
