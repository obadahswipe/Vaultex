import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const crmRouter = Router();

// ── Leads ──────────────────────────────────────────────────────────────────

crmRouter.get('/leads', requirePermission('crm', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { status, assigned_to } = req.query;
    const conditions: string[] = ['l.tenant_id = $1'];
    const params: unknown[] = [tenant_id];
    let i = 2;
    if (status)      { conditions.push(`l.status = $${i++}`);      params.push(status); }
    if (assigned_to) { conditions.push(`l.assigned_to = $${i++}`); params.push(assigned_to); }

    const result = await db.query(
      `SELECT l.*, u.full_name AS assigned_to_name, ib.full_name AS ib_name
       FROM leads l
       LEFT JOIN users u  ON u.id  = l.assigned_to
       LEFT JOIN ibs  ib ON ib.id = l.ib_id
       WHERE ${conditions.join(' AND ')} ORDER BY l.created_at DESC`,
      params
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

crmRouter.post('/leads', requirePermission('crm', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { full_name, email, phone, country, source, ib_id, assigned_to, notes, expected_deposit } = req.body;
    const result = await db.query(
      `INSERT INTO leads (tenant_id,full_name,email,phone,country,source,ib_id,assigned_to,notes,expected_deposit,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenant_id, full_name, email, phone, country, source, ib_id, assigned_to, notes, expected_deposit, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

crmRouter.put('/leads/:id', requirePermission('crm', 'edit'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { full_name, email, phone, country, source, ib_id, assigned_to, status, notes, expected_deposit, lost_reason } = req.body;
    const result = await db.query(
      `UPDATE leads SET full_name=$1,email=$2,phone=$3,country=$4,source=$5,ib_id=$6,
       assigned_to=$7,status=$8,notes=$9,expected_deposit=$10,lost_reason=$11
       WHERE id=$12 AND tenant_id=$13 RETURNING *`,
      [full_name, email, phone, country, source, ib_id, assigned_to, status, notes, expected_deposit, lost_reason, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

crmRouter.post('/leads/:id/convert', requirePermission('crm', 'edit'), async (req, res) => {
  const client = await db.connect();
  try {
    const { tenant_id, id: user_id } = req.user!;
    await client.query('BEGIN');
    const lead = await client.query('SELECT * FROM leads WHERE id=$1 AND tenant_id=$2', [req.params.id, tenant_id]);
    if (!lead.rows[0]) throw new Error('Lead not found');
    const l = lead.rows[0];
    const newClient = await client.query(
      `INSERT INTO clients (tenant_id,full_name,email,ib_id,created_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [tenant_id, l.full_name, l.email, l.ib_id]
    );
    await client.query(
      `UPDATE leads SET status='CONVERTED', converted_at=NOW(), converted_to=$1 WHERE id=$2`,
      [newClient.rows[0].id, req.params.id]
    );
    await client.query('COMMIT');
    return ok(res, newClient.rows[0], 201);
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, e);
  } finally { client.release(); }
});

// ── Activities ─────────────────────────────────────────────────────────────

crmRouter.get('/activities', requirePermission('crm', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { entity_type, entity_id } = req.query;
    const result = await db.query(
      `SELECT a.*, u.full_name AS performed_by_name
       FROM activities a LEFT JOIN users u ON u.id = a.performed_by
       WHERE a.tenant_id=$1
         ${entity_type ? 'AND a.entity_type=$2' : ''}
         ${entity_id   ? 'AND a.entity_id=$3'   : ''}
       ORDER BY a.created_at DESC LIMIT 500`,
      [tenant_id, ...(entity_type ? [entity_type] : []), ...(entity_id ? [entity_id] : [])]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

crmRouter.post('/activities', requirePermission('crm', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { entity_type, entity_id, activity_type, subject, description, outcome, scheduled_at, completed_at, duration_min } = req.body;
    const result = await db.query(
      `INSERT INTO activities
       (tenant_id,entity_type,entity_id,activity_type,subject,description,outcome,scheduled_at,completed_at,duration_min,performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenant_id, entity_type, entity_id, activity_type, subject, description, outcome, scheduled_at, completed_at, duration_min, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// ── Tickets ─────────────────────────────────────────────────────────────────

crmRouter.get('/tickets', requirePermission('crm', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { status, priority, assigned_to } = req.query;
    const conditions = ['t.tenant_id=$1'];
    const params: unknown[] = [tenant_id];
    let i = 2;
    if (status)      { conditions.push(`t.status=$${i++}`);      params.push(status); }
    if (priority)    { conditions.push(`t.priority=$${i++}`);    params.push(priority); }
    if (assigned_to) { conditions.push(`t.assigned_to=$${i++}`); params.push(assigned_to); }
    const result = await db.query(
      `SELECT t.*, u.full_name AS assigned_to_name
       FROM tickets t LEFT JOIN users u ON u.id = t.assigned_to
       WHERE ${conditions.join(' AND ')} ORDER BY t.created_at DESC`,
      params
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

crmRouter.post('/tickets', requirePermission('crm', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { entity_type, entity_id, subject, description, priority, category, assigned_to } = req.body;
    const result = await db.query(
      `INSERT INTO tickets
       (tenant_id,entity_type,entity_id,subject,description,priority,category,assigned_to,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenant_id, entity_type, entity_id, subject, description, priority, category, assigned_to, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

crmRouter.put('/tickets/:id', requirePermission('crm', 'edit'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { status, priority, assigned_to, category } = req.body;
    const resolved_at = status === 'RESOLVED' ? 'NOW()' : 'NULL';
    const resolved_by = status === 'RESOLVED' ? user_id : null;
    const result = await db.query(
      `UPDATE tickets SET status=$1,priority=$2,assigned_to=$3,category=$4,
       resolved_by=$5,resolved_at=${resolved_at}
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [status, priority, assigned_to, category, resolved_by, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

crmRouter.get('/tickets/:id/comments', requirePermission('crm', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT tc.*, u.full_name AS author
       FROM ticket_comments tc JOIN users u ON u.id = tc.created_by
       WHERE tc.ticket_id=$1 AND tc.tenant_id=$2 ORDER BY tc.created_at`,
      [req.params.id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

crmRouter.post('/tickets/:id/comments', requirePermission('crm', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { body, is_internal } = req.body;
    const result = await db.query(
      `INSERT INTO ticket_comments (tenant_id,ticket_id,body,is_internal,created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenant_id, req.params.id, body, is_internal, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});
