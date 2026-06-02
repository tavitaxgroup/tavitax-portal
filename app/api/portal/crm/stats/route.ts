import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tavitax-auth')?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sếp: có quyền 'users' hoặc giữ role Admin Tổng
  const isBoss = user.permissions?.includes('users') || user.roles?.includes('5199d67b-52bf-465f-9d2c-aa2366f30ede');

  try {
    // 1. Lấy dữ liệu khách hàng hiện tại có lọc phân quyền
    let customerQuery = '';
    let customerValues: any[] = [];

    if (isBoss) {
      customerQuery = `
        SELECT c.created_at, c.services_used, r.name as department_name 
        FROM crm_customers c 
        LEFT JOIN admin_roles r ON c.department_id = r.id
      `;
    } else {
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      customerQuery = `
        SELECT c.created_at, c.services_used, r.name as department_name 
        FROM crm_customers c 
        LEFT JOIN admin_roles r ON c.department_id = r.id 
        WHERE c.department_id::text = ANY($1::text[]) OR c.created_by = $2
      `;
      customerValues = [userRoles, user.id];
    }

    const { rows: customers } = await pool.query(customerQuery, customerValues);

    // 2. Lấy dữ liệuleads tiềm năng (đây là số liệu tham chiếu chung)
    const { rows: leads } = await pool.query(`SELECT status, created_at FROM crm_leads`);

    // --- XỬ LÝ AGGREGATE THỐNG KÊ (IN-MEMORY NODEJS) ---
    
    // KPI 1: Tổng số khách hàng hiện tại
    const totalCustomers = customers.length;

    // KPI 2: Tổng số leads tiềm năng
    const totalLeads = leads.length;

    // KPI 3: Khách hàng mới trong tháng hiện tại
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newCustomersThisMonth = customers.filter(c => {
      const date = new Date(c.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    // A. Phân bổ theo Phòng ban (Department Breakdown)
    const deptMap: { [key: string]: number } = {};
    customers.forEach(c => {
      const name = c.department_name || 'Khác / Chưa gán';
      deptMap[name] = (deptMap[name] || 0) + 1;
    });
    const departmentBreakdown = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    // B. Phân bổ theo Dịch vụ (Services Breakdown)
    const serviceMap: { [key: string]: number } = {};
    customers.forEach(c => {
      let services: string[] = [];
      try {
        services = Array.isArray(c.services_used) 
          ? c.services_used 
          : JSON.parse(c.services_used || '[]');
      } catch (e) {
        services = [];
      }
      
      services.forEach((s: string) => {
        if (s && s.trim()) {
          const cleanName = s.trim();
          serviceMap[cleanName] = (serviceMap[cleanName] || 0) + 1;
        }
      });
    });
    // Sắp xếp top dịch vụ
    const servicesBreakdown = Object.entries(serviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Lấy top 10 dịch vụ

    // C. Xu hướng tăng trưởng theo thời gian (Growth Trend - 6 tháng gần nhất)
    // Tạo 6 tháng gần nhất động
    const last6Months: { name: string; year: number; month: number; customerCount: number; leadCount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
      last6Months.push({
        name: mName,
        year: d.getFullYear(),
        month: d.getMonth(),
        customerCount: 0,
        leadCount: 0
      });
    }

    // Gán dữ liệu cho xu hướng
    last6Months.forEach(slot => {
      // Đếm số khách hàng được tạo tính đến hết tháng đó (Cumulative Growth)
      slot.customerCount = customers.filter(c => {
        const date = new Date(c.created_at);
        return date.getFullYear() < slot.year || 
               (date.getFullYear() === slot.year && date.getMonth() <= slot.month);
      }).length;

      // Đếm số lượng leads được tạo trong tháng đó
      slot.leadCount = leads.filter(l => {
        const date = new Date(l.created_at);
        return date.getFullYear() === slot.year && date.getMonth() === slot.month;
      }).length;
    });

    return NextResponse.json({
      success: true,
      kpis: {
        totalCustomers,
        totalLeads,
        newCustomersThisMonth,
        conversionRate: totalLeads > 0 ? Math.round((totalCustomers / totalLeads) * 100) : 0
      },
      departmentBreakdown,
      servicesBreakdown,
      growthTrend: last6Months
    });

  } catch (error: any) {
    console.error("Lỗi GET /api/portal/crm/stats:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ thống kê' }, { status: 500 });
  }
}
