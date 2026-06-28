import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const branchesRouter = Router();

branchesRouter.get('/', requirePermission('branches', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const branches = await db.query(
      `SELECT b.*, u.full_name AS manager_name,
              COUNT(d.id) AS department_count
       FROM branches b
       LEFT JOIN users u ON u.id = b.manager_id
       LEFT JOIN departments d ON d.branch_id = b.id
       WHERE b.tenant_id = $1
       GROUP BY b.id, u.full_name
       ORDER BY b.name`,
      [tenant_id]
    );
    return ok(res, branches.rows);
  } catch (e) { return fail(res, e); }
});

branchesRouter.post('/', requirePermission('branches', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { name, code, country, city, address, phone, manager_id } = req.body;
    const result = await db.query(
      `INSERT INTO branches (tenant_id, name, code, country, city, address, phone, manager_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenant_id, name, code, country, city, address, phone, manager_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

branchesRouter.put('/:id', requirePermission('branches', 'edit'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { name, code, country, city, address, phone, manager_id, is_active } = req.body;
    const result = await db.query(
      `UPDATE branches SET name=$1,code=$2,country=$3,city=$4,address=$5,phone=$6,manager_id=$7,is_active=$8
       WHERE id=$9 AND tenant_id=$10 RETURNING *`,
      [name, code, country, city, address, phone, manager_id, is_active, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

// Departments under branches
branchesRouter.get('/departments', requirePermission('branches', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT d.*, b.name AS branch_name, u.full_name AS head_name
       FROM departments d
       LEFT JOIN branches b ON b.id = d.branch_id
       LEFT JOIN users u ON u.id = d.head_id
       WHERE d.tenant_id = $1 ORDER BY b.name, d.name`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

branchesRouter.post('/departments', requirePermission('branches', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { branch_id, name, code, head_id } = req.body;
    const result = await db.query(
      `INSERT INTO departments (tenant_id, branch_id, name, code, head_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenant_id, branch_id, name, code, head_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});
