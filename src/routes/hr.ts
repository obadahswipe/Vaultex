import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const hrRouter = Router();

// Employees
hrRouter.get('/employees', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT e.*, b.name AS branch_name, d.name AS department_name,
              m.full_name AS manager_name
       FROM employees e
       LEFT JOIN branches b    ON b.id = e.branch_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN employees m   ON m.id = e.manager_id
       WHERE e.tenant_id=$1 ORDER BY e.full_name`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

hrRouter.post('/employees', requirePermission('hr', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { user_id, branch_id, department_id, employee_code, full_name, email, phone,
            position, employment_type, hire_date, base_salary, salary_currency, manager_id } = req.body;
    const result = await db.query(
      `INSERT INTO employees
       (tenant_id,user_id,branch_id,department_id,employee_code,full_name,email,phone,
        position,employment_type,hire_date,base_salary,salary_currency,manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tenant_id, user_id, branch_id, department_id, employee_code, full_name, email, phone,
       position, employment_type, hire_date, base_salary, salary_currency, manager_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

hrRouter.put('/employees/:id', requirePermission('hr', 'edit'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { position, branch_id, department_id, manager_id, base_salary, salary_currency, status } = req.body;
    const result = await db.query(
      `UPDATE employees SET position=$1,branch_id=$2,department_id=$3,manager_id=$4,
       base_salary=$5,salary_currency=$6,status=$7
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [position, branch_id, department_id, manager_id, base_salary, salary_currency, status, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

// Leave requests
hrRouter.get('/leave', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { status } = req.query;
    const result = await db.query(
      `SELECT lr.*, e.full_name AS employee_name, lt.name AS leave_type_name,
              u.full_name AS approved_by_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN users u ON u.id = lr.approved_by
       WHERE lr.tenant_id=$1 ${status ? 'AND lr.status=$2' : ''}
       ORDER BY lr.created_at DESC`,
      status ? [tenant_id, status] : [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

hrRouter.post('/leave', requirePermission('hr', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { employee_id, leave_type_id, start_date, end_date, days_requested, reason } = req.body;
    const result = await db.query(
      `INSERT INTO leave_requests (tenant_id,employee_id,leave_type_id,start_date,end_date,days_requested,reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant_id, employee_id, leave_type_id, start_date, end_date, days_requested, reason]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

hrRouter.patch('/leave/:id/approve', requirePermission('hr', 'approve'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { action, rejection_note } = req.body;
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const result = await db.query(
      `UPDATE leave_requests SET status=$1,approved_by=$2,approved_at=NOW(),rejection_note=$3
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [status, user_id, rejection_note, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

// Payroll
hrRouter.get('/payroll', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      'SELECT * FROM payroll_runs WHERE tenant_id=$1 ORDER BY period_start DESC', [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

hrRouter.post('/payroll', requirePermission('hr', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { period_start, period_end, currency } = req.body;
    const employees = await db.query(
      `SELECT id, base_salary, salary_currency FROM employees
       WHERE tenant_id=$1 AND status='ACTIVE'`, [tenant_id]
    );
    if (!employees.rows.length) return fail(res, 'No active employees found', 400);

    const run = await db.query(
      `INSERT INTO payroll_runs (tenant_id,period_start,period_end,currency,created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenant_id, period_start, period_end, currency, user_id]
    );
    const run_id = run.rows[0].id;
    let total_gross = 0;

    for (const emp of employees.rows) {
      const net = emp.base_salary || 0;
      total_gross += net;
      await db.query(
        `INSERT INTO payroll_items (tenant_id,payroll_run_id,employee_id,base_salary,net_pay,currency)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenant_id, run_id, emp.id, net, net, currency]
      );
    }
    await db.query(
      'UPDATE payroll_runs SET total_gross=$1,total_net=$1 WHERE id=$2',
      [total_gross, run_id]
    );
    return ok(res, { ...run.rows[0], total_gross, total_net: total_gross }, 201);
  } catch (e) { return fail(res, e); }
});

hrRouter.get('/payroll/:id/items', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT pi.*, e.full_name AS employee_name, e.position
       FROM payroll_items pi JOIN employees e ON e.id = pi.employee_id
       WHERE pi.payroll_run_id=$1 AND pi.tenant_id=$2`,
      [req.params.id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// Leave types
hrRouter.get('/leave-types', requirePermission('hr', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query('SELECT * FROM leave_types WHERE tenant_id=$1 AND is_active=true', [tenant_id]);
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});
