import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const boardId = url.searchParams.get('boardId');
    let queryArgs: any[] = [];
    let boardCondition = "";

    if (boardId) {
      boardCondition = "WHERE t.board_id = $1";
      queryArgs.push(boardId);
    } else {
      // Default to first board if not provided
      boardCondition = "WHERE t.board_id = (SELECT id FROM task_boards ORDER BY id ASC LIMIT 1)";
    }

    const { rows } = await pool.query(
      `SELECT t.*, c.name as creator_name,
         (
           SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url))
           FROM admin_users u
           WHERE (t.assignees IS NOT NULL AND t.assignees::text != 'null') 
             AND u.id::text IN (SELECT jsonb_array_elements_text(t.assignees))
         ) as assignees_data
       FROM tasks t
       LEFT JOIN admin_users c ON t.created_by = c.id
       ${boardCondition}
       ORDER BY t.created_at DESC`,
       queryArgs
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const myId = userToken.id;

    const body = await req.json();
    const { title, description, priority, assignees, due_date, board_id } = body;

    if (!title) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const assigneesArray = Array.isArray(assignees) ? assignees : [];

    let finalBoardId = board_id;
    if (!finalBoardId) {
       const boardRes = await pool.query(`SELECT id FROM task_boards ORDER BY id ASC LIMIT 1`);
       if(boardRes.rowCount > 0) finalBoardId = boardRes.rows[0].id;
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, priority, assignees, due_date, created_by, board_id, start_date)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8) RETURNING *`,
      [title, description || '', priority || 'NORMAL', JSON.stringify(assigneesArray), due_date || null, myId, finalBoardId, body.start_date || new Date().toISOString()]
    );
    const newTask = rows[0];

    await pool.query(
      `INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
      [newTask.id, myId, 'CREATED', JSON.stringify({ title })]
    );

    // AUTOMATION: Send Chat bot message to ALL assignees (except creator)
    for (const assigneeId of assigneesArray) {
      if (assigneeId && assigneeId !== myId) {
        await pool.query(
          `INSERT INTO chat_messages (sender_id, receiver_id, content, message_type) 
           VALUES ($1, $2, $3, $4)`,
          [myId, assigneeId, `<div class="bg-primary-50 dark:bg-primary-900/30 p-3 rounded-lg border border-primary-200 dark:border-primary-800"><p class="font-bold text-primary-700 dark:text-primary-300">📋 Công việc Nhóm mới được giao</p><p class="text-sm mt-1">Sếp vừa giao cho nhóm công việc: <b>${title}</b>. Hãy kiểm tra bảng Kanban!</p></div>`, 'SYSTEM_NOTIFICATION']
        );
      }
    }

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userToken = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const myId = userToken.id;

    const body = await req.json();
    const { id, status, assignees, tags, recurrence_rule } = body;

    if (!id) return NextResponse.json({ error: 'Thiếu thông tin ID' }, { status: 400 });

    // Fetch original task to compare and trigger recurrence
    const oldTaskRes = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (oldTaskRes.rowCount === 0) return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    const oldTask = oldTaskRes.rows[0];

    // Cập nhật Status
    if (status && status !== oldTask.status) {
      await pool.query(
        `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, id]
      );
      // Ghi log
      await pool.query(
        `INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
        [id, myId, 'STATUS_CHANGED', JSON.stringify({ from: oldTask.status, to: status })]
      );

      // Rolling Recurrence Logic
      if (status === 'DONE' && oldTask.recurrence_rule) {
        let nextDueDate = new Date();
        const rule = oldTask.recurrence_rule;
        if(oldTask.due_date) nextDueDate = new Date(oldTask.due_date);
        
        if (rule === 'DAILY') nextDueDate.setDate(nextDueDate.getDate() + 1);
        else if (rule === 'WEEKLY') nextDueDate.setDate(nextDueDate.getDate() + 7);
        else if (rule === 'MONTHLY') nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        // Sinh Task con
        const newRes = await pool.query(
          `INSERT INTO tasks (title, description, priority, assignees, due_date, created_by, board_id, start_date, tags, recurrence_rule)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, CURRENT_TIMESTAMP, $8::jsonb, $9) RETURNING *`,
          [oldTask.title, oldTask.description, oldTask.priority, JSON.stringify(oldTask.assignees), nextDueDate.toISOString(), oldTask.created_by, oldTask.board_id, JSON.stringify(oldTask.tags), rule]
        );

        // Log Recurrence
        await pool.query(
           `INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
           [id, myId, 'RECURRED', JSON.stringify({ new_task_id: newRes.rows[0].id, rule })]
        );
      }
    }

    // Cập nhật Assignees
    if (assignees !== undefined) {
      const assigneesArray = Array.isArray(assignees) ? assignees : [];
      await pool.query(
        `UPDATE tasks SET assignees = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [JSON.stringify(assigneesArray), id]
      );
      await pool.query(
        `INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
        [id, myId, 'ASSIGNED', JSON.stringify({ count: assigneesArray.length })]
      );
    }

    // Cập nhật Tags / Recurrence Rule (thông qua bảng Modal info)
    if (tags !== undefined || recurrence_rule !== undefined) {
      const newTags = tags !== undefined ? tags : oldTask.tags;
      const newRecurrence = recurrence_rule !== undefined ? recurrence_rule : oldTask.recurrence_rule;
      
      await pool.query(
        `UPDATE tasks SET tags = $1::jsonb, recurrence_rule = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [JSON.stringify(newTags), newRecurrence, id]
      );
      if (tags !== undefined) {
        await pool.query(
          `INSERT INTO task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
          [id, myId, 'TAGGED', JSON.stringify({ tags })]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Tasks PUT error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tavitax-auth')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const { rowCount } = await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
    
    if (rowCount === 0) return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Tasks DELETE error:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
