import { Router } from 'express';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id=$1 AND tenant_id=$2
       ORDER BY created_at DESC LIMIT 50`,
      [user_id, tenant_id]
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    return ok(res, { notifications: result.rows, unread_count: unread });
  } catch (e) { return fail(res, e); }
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    const { id: user_id } = req.user!;
    await db.query(
      'UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1 AND user_id=$2',
      [req.params.id, user_id]
    );
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
});

notificationsRouter.patch('/read-all', async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    await db.query(
      'UPDATE notifications SET is_read=true, read_at=NOW() WHERE user_id=$1 AND tenant_id=$2 AND is_read=false',
      [user_id, tenant_id]
    );
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
});

// Internal helper — called by other services to push a notification
export async function pushNotification(params: {
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  entity_type?: string;
  entity_id?: string;
}) {
  await db.query(
    `INSERT INTO notifications (tenant_id,user_id,type,title,body,link,entity_type,entity_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [params.tenant_id, params.user_id, params.type, params.title,
     params.body, params.link, params.entity_type, params.entity_id]
  );
}
