import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const pool = getDb();

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar, u.job_title
       FROM task_comments c
       LEFT JOIN admin_users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Task comments GET error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = verifyToken(token);
    const myId = userToken.id;
    const myName = userToken.name || "Nhân sự";

    const body = await req.json();
    const { task_id, content, attachment_url, attachment_type, attachment_name } = body;

    if (!task_id || (!content && !attachment_url)) {
      return NextResponse.json({ error: 'Missing information' }, { status: 400 });
    }

    const { rows: taskRows } = await pool.query(
      `SELECT title, created_by, assignees FROM tasks WHERE id = $1`,
      [task_id]
    );
    if (taskRows.length === 0) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    const task = taskRows[0];

    const { rows } = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content, attachment_url, attachment_type, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [task_id, myId, content || '', attachment_url || null, attachment_type || null, attachment_name || null]
    );
    const newComment = rows[0];

    // Notification Router Automation
    // Find all people involved in this task (creator + assignees), excluding the sender
    let involvedIds = new Set<number>();
    if (task.created_by) involvedIds.add(task.created_by);
    if (task.assignees && Array.isArray(task.assignees)) {
      task.assignees.forEach((id: number) => involvedIds.add(id));
    }
    involvedIds.delete(myId); // don't notify self

    const notiHtml = `
      <div class="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p class="font-bold text-indigo-700 dark:text-indigo-300">🔔 Báo cáo tiến độ mới: ${task.title}</p>
        <p class="text-sm mt-1"><b>${myName}</b> vừa đăng một báo cáo/thoả luận mới ở Task này. Hãy mở Kanban để xem!</p>
      </div>
    `;

    for (const receiverId of Array.from(involvedIds)) {
      await pool.query(
        `INSERT INTO chat_messages (sender_id, receiver_id, content, message_type) VALUES ($1, $2, $3, $4)`,
        [myId, receiverId, notiHtml, 'SYSTEM_NOTIFICATION']
      );
    }

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error: any) {
    console.error("Task comments POST error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
