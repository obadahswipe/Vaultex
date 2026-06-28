import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const workflowsRouter = Router();

// Templates
workflowsRouter.get('/templates', requirePermission('workflows', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT wt.*,
              json_agg(ws.* ORDER BY ws.step_order) FILTER (WHERE ws.id IS NOT NULL) AS steps
       FROM workflow_templates wt
       LEFT JOIN workflow_steps ws ON ws.template_id = wt.id
       WHERE wt.tenant_id=$1 GROUP BY wt.id ORDER BY wt.process_type`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

workflowsRouter.post('/templates', requirePermission('workflows', 'create'), async (req, res) => {
  const client = await db.connect();
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { name, process_type, description, is_default, steps } = req.body;
    await client.query('BEGIN');
    const tmpl = await client.query(
      `INSERT INTO workflow_templates (tenant_id,name,process_type,description,is_default,created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenant_id, name, process_type, description, is_default, user_id]
    );
    for (const step of (steps || [])) {
      await client.query(
        `INSERT INTO workflow_steps
         (template_id,step_order,name,step_type,assigned_role,assigned_user,sla_hours,can_reject,can_skip,instructions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tmpl.rows[0].id, step.step_order, step.name, step.step_type,
         step.assigned_role, step.assigned_user, step.sla_hours,
         step.can_reject ?? true, step.can_skip ?? false, step.instructions]
      );
    }
    await client.query('COMMIT');
    return ok(res, tmpl.rows[0], 201);
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, e);
  } finally { client.release(); }
});

// Instances
workflowsRouter.get('/instances', requirePermission('workflows', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { status, process_type } = req.query;
    const conditions = ['wi.tenant_id=$1'];
    const params: unknown[] = [tenant_id];
    let i = 2;
    if (status)       { conditions.push(`wi.status=$${i++}`);       params.push(status); }
    if (process_type) { conditions.push(`wi.process_type=$${i++}`); params.push(process_type); }
    const result = await db.query(
      `SELECT wi.*, wt.name AS template_name, u.full_name AS created_by_name
       FROM workflow_instances wi
       LEFT JOIN workflow_templates wt ON wt.id = wi.template_id
       LEFT JOIN users u ON u.id = wi.created_by
       WHERE ${conditions.join(' AND ')} ORDER BY wi.started_at DESC`,
      params
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// My pending tasks
workflowsRouter.get('/my-tasks', async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const result = await db.query(
      `SELECT wt.*, wi.process_type, wi.entity_type, wi.entity_id, wt2.name AS template_name
       FROM workflow_tasks wt
       JOIN workflow_instances wi ON wi.id = wt.instance_id
       LEFT JOIN workflow_templates wt2 ON wt2.id = wi.template_id
       WHERE wt.assigned_to=$1 AND wt.tenant_id=$2 AND wt.status='PENDING'
       ORDER BY wt.due_at ASC NULLS LAST`,
      [user_id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// Act on a task (approve / reject / skip)
workflowsRouter.patch('/tasks/:id/action', async (req, res) => {
  const client = await db.connect();
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { action, note } = req.body;
    if (!['APPROVED', 'REJECTED', 'SKIPPED'].includes(action)) return fail(res, 'Invalid action', 400);

    await client.query('BEGIN');
    const task = await client.query(
      'SELECT * FROM workflow_tasks WHERE id=$1 AND tenant_id=$2 FOR UPDATE',
      [req.params.id, tenant_id]
    );
    if (!task.rows[0]) throw new Error('Task not found');
    const t = task.rows[0];

    await client.query(
      `UPDATE workflow_tasks SET status=$1,action_taken=$1,action_note=$2,acted_by=$3,acted_at=NOW()
       WHERE id=$4`,
      [action, note, user_id, t.id]
    );

    if (action === 'REJECTED') {
      await client.query(
        'UPDATE workflow_instances SET status=$1,completed_at=NOW() WHERE id=$2',
        ['REJECTED', t.instance_id]
      );
    } else {
      // Advance to next step
      const nextStep = await client.query(
        `SELECT ws.* FROM workflow_steps ws
         JOIN workflow_instances wi ON wi.template_id = ws.template_id
         WHERE wi.id=$1 AND ws.step_order > $2 ORDER BY ws.step_order LIMIT 1`,
        [t.instance_id, t.step_order]
      );
      if (nextStep.rows[0]) {
        const ns = nextStep.rows[0];
        await client.query(
          `INSERT INTO workflow_tasks
           (tenant_id,instance_id,step_id,step_order,step_name,assigned_to,assigned_role,
            due_at,status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + ($8 || ' hours')::INTERVAL,'PENDING')`,
          [tenant_id, t.instance_id, ns.id, ns.step_order, ns.name,
           ns.assigned_user, ns.assigned_role, ns.sla_hours || 72]
        );
        await client.query('UPDATE workflow_instances SET current_step=$1 WHERE id=$2',
          [ns.step_order, t.instance_id]);
      } else {
        await client.query(
          'UPDATE workflow_instances SET status=$1,completed_at=NOW() WHERE id=$2',
          ['COMPLETED', t.instance_id]
        );
      }
    }
    await client.query('COMMIT');
    return ok(res, { success: true, action });
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, e);
  } finally { client.release(); }
});

// Helper to start a workflow instance from any service
export async function startWorkflow(params: {
  tenant_id: string;
  process_type: string;
  entity_type: string;
  entity_id: string;
  created_by: string;
}) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const tmpl = await client.query(
      `SELECT wt.*, ws.id AS first_step_id, ws.step_order, ws.name AS step_name,
              ws.assigned_user, ws.assigned_role, ws.sla_hours
       FROM workflow_templates wt
       JOIN workflow_steps ws ON ws.template_id = wt.id
       WHERE wt.tenant_id=$1 AND wt.process_type=$2 AND wt.is_default=true AND wt.is_active=true
       ORDER BY ws.step_order LIMIT 1`,
      [params.tenant_id, params.process_type]
    );
    if (!tmpl.rows[0]) return null; // no template configured, skip workflow

    const t = tmpl.rows[0];
    const inst = await client.query(
      `INSERT INTO workflow_instances (tenant_id,template_id,process_type,entity_type,entity_id,created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [params.tenant_id, t.id, params.process_type, params.entity_type, params.entity_id, params.created_by]
    );
    await client.query(
      `INSERT INTO workflow_tasks
       (tenant_id,instance_id,step_id,step_order,step_name,assigned_to,assigned_role,
        due_at,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW() + ($8 || ' hours')::INTERVAL,'PENDING')`,
      [params.tenant_id, inst.rows[0].id, t.first_step_id, t.step_order,
       t.step_name, t.assigned_user, t.assigned_role, t.sla_hours || 72]
    );
    await client.query('COMMIT');
    return inst.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}
