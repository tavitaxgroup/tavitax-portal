import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

const pool = getDb();

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
      SELECT 'crm' AS type, name AS title, source AS meta, created_at 
      FROM crm_leads 
      UNION ALL
      SELECT 'news' AS type, title, '' AS meta, created_at 
      FROM articles
      UNION ALL
      SELECT 'docs' AS type, title, COALESCE(uploaded_by, 'Quản trị viên') AS meta, created_at
      FROM documents
      ORDER BY created_at DESC 
      LIMIT 8
    `;
    
    const { rows } = await pool.query(query);

    // Format the response
    const activities = rows.map((row, index) => {
      let actionText = '';
      let userDisplay = 'Hệ thống';
      let iconColor = 'text-slate-500';
      let bgStyle = 'bg-slate-100 dark:bg-slate-800';

      if (row.type === 'crm') {
        userDisplay = row.title; // Tên khách
        actionText = row.meta === 'SURVEY_TAX_RISK' ? 'vừa gửi một Khảo sát sức khỏe thuế' : 'vừa đăng ký Liên hệ nhận Tư vấn';
        iconColor = 'text-blue-500';
        bgStyle = 'bg-blue-100 dark:bg-blue-900/30';
      } else if (row.type === 'news') {
        userDisplay = 'Ban Biên tập';
        actionText = `vừa xuất bản bài: "${row.title}"`;
        iconColor = 'text-emerald-500';
        bgStyle = 'bg-emerald-100 dark:bg-emerald-900/30';
      } else if (row.type === 'docs') {
        userDisplay = row.meta; // uploaded_by
        actionText = `vừa tải lên tài liệu: "${row.title}"`;
        iconColor = 'text-violet-500';
        bgStyle = 'bg-violet-100 dark:bg-violet-900/30';
      }

      // Convert time
      const timeDiffMs = new Date().getTime() - new Date(row.created_at).getTime();
      const minutes = Math.floor(timeDiffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let timeAgo = 'Vừa xong';
      if (minutes > 0 && minutes < 60) timeAgo = `${minutes} phút trước`;
      else if (hours >= 1 && hours < 24) timeAgo = `${hours} giờ trước`;
      else if (days >= 1 && days <= 7) timeAgo = `${days} ngày trước`;
      else timeAgo = new Date(row.created_at).toLocaleDateString('vi-VN');

      return {
        id: index + 1,
        type: row.type,
        user: userDisplay,
        action: actionText,
        time: timeAgo,
        iconColor,
        bgStyle
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Lỗi lấy thông tin activity feed", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
