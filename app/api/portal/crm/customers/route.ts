import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

// Hàm kiểm tra và giải mã token để lấy thông tin user
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

  // Sếp (Admin Tổng): có quyền 'users' hoặc giữ role Admin Tổng '5199d67b-52bf-465f-9d2c-aa2366f30ede'
  const isBoss = user.permissions?.includes('users') || user.roles?.includes('5199d67b-52bf-465f-9d2c-aa2366f30ede');

  try {
    let query = '';
    let values: any[] = [];

    if (isBoss) {
      // Sếp được xem toàn bộ khách hàng
      query = `
        SELECT c.*, u.name as created_by_name, r.name as department_name 
        FROM crm_customers c 
        LEFT JOIN admin_users u ON c.created_by = u.id 
        LEFT JOIN admin_roles r ON c.department_id = r.id 
        ORDER BY c.created_at DESC
      `;
    } else {
      // Nhân viên thường: chỉ xem khách hàng thuộc phòng ban của họ (roles) hoặc do họ tạo
      const userRoles = Array.isArray(user.roles) ? user.roles : [];
      query = `
        SELECT c.*, u.name as created_by_name, r.name as department_name 
        FROM crm_customers c 
        LEFT JOIN admin_users u ON c.created_by = u.id 
        LEFT JOIN admin_roles r ON c.department_id = r.id 
        WHERE c.department_id::text = ANY($1::text[]) OR c.created_by = $2
        ORDER BY c.created_at DESC
      `;
      values = [userRoles, user.id];
    }

    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Lỗi GET /api/portal/crm/customers:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const isArray = Array.isArray(body);
    const customersToInsert = isArray ? body : [body];

    // Xác định department_id mặc định của nhân viên tạo (lấy role đầu tiên trong danh sách roles của họ)
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const defaultDepartmentId = userRoles.length > 0 ? userRoles[0] : null;

    const insertedRows: any[] = [];

    // Chèn dữ liệu sử dụng Transaction cho an toàn
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of customersToInsert) {
        const {
          company_name,
          tax_code = null,
          representative = null,
          phone = null,
          email = null,
          address = null,
          services_used = [],
          department_id = null // Cho phép ghi đè department_id nếu truyền lên (ví dụ: Sếp tạo và chọn phòng ban)
        } = item;

        if (!company_name) {
          throw new Error("Tên công ty là bắt buộc");
        }

        // Quyết định department_id:
        // Nhân viên thường: Tự động gán defaultDepartmentId.
        // Sếp: Có thể chọn department_id cụ thể từ Client, hoặc mặc định defaultDepartmentId.
        const finalDepartmentId = department_id || defaultDepartmentId;

        const insertQuery = `
          INSERT INTO crm_customers (
            company_name, tax_code, representative, phone, email, address, services_used, department_id, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const insertValues = [
          company_name,
          tax_code,
          representative,
          phone,
          email,
          address,
          JSON.stringify(services_used), // Lưu dạng JSONB mảng
          finalDepartmentId,
          user.id
        ];

        const { rows } = await client.query(insertQuery, insertValues);
        insertedRows.push(rows[0]);
      }

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ 
      success: true, 
      count: insertedRows.length, 
      data: isArray ? insertedRows : insertedRows[0] 
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/portal/crm/customers:", error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu trữ khách hàng' }, { status: 500 });
  }
}
