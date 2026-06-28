import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const assetsRouter = Router();

// Asset categories
assetsRouter.get('/categories', requirePermission('assets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query('SELECT * FROM asset_categories WHERE tenant_id=$1', [tenant_id]);
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

assetsRouter.post('/categories', requirePermission('assets', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { name, depreciation_method, useful_life_years, salvage_percent } = req.body;
    const result = await db.query(
      `INSERT INTO asset_categories (tenant_id,name,depreciation_method,useful_life_years,salvage_percent)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenant_id, name, depreciation_method, useful_life_years, salvage_percent]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Assets
assetsRouter.get('/', requirePermission('assets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { status } = req.query;
    const result = await db.query(
      `SELECT a.*, ac.name AS category_name, b.name AS branch_name,
              d.name AS department_name, e.full_name AS assigned_to_name,
              COALESCE(SUM(ds.depreciation_amount),0) AS accumulated_depreciation,
              a.purchase_cost - COALESCE(SUM(ds.depreciation_amount),0) AS net_book_value
       FROM assets a
       LEFT JOIN asset_categories ac ON ac.id = a.category_id
       LEFT JOIN branches b    ON b.id = a.branch_id
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN employees e   ON e.id = a.assigned_to
       LEFT JOIN depreciation_schedule ds ON ds.asset_id = a.id AND ds.posted = true
       WHERE a.tenant_id=$1 ${status ? 'AND a.status=$2' : ''}
       GROUP BY a.id, ac.name, b.name, d.name, e.full_name
       ORDER BY a.name`,
      status ? [tenant_id, status] : [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

assetsRouter.post('/', requirePermission('assets', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { category_id, branch_id, department_id, asset_code, name, description,
            serial_number, purchase_date, purchase_cost, currency, cost_usd,
            useful_life_years, salvage_value, depreciation_method, location, assigned_to } = req.body;
    const result = await db.query(
      `INSERT INTO assets
       (tenant_id,category_id,branch_id,department_id,asset_code,name,description,
        serial_number,purchase_date,purchase_cost,currency,cost_usd,
        useful_life_years,salvage_value,depreciation_method,location,assigned_to,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [tenant_id, category_id, branch_id, department_id, asset_code, name, description,
       serial_number, purchase_date, purchase_cost, currency, cost_usd,
       useful_life_years, salvage_value, depreciation_method, location, assigned_to, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Generate depreciation schedule for an asset
assetsRouter.post('/:id/depreciation/generate', requirePermission('assets', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const asset = await db.query('SELECT * FROM assets WHERE id=$1 AND tenant_id=$2', [req.params.id, tenant_id]);
    if (!asset.rows[0]) return fail(res, 'Asset not found', 404);
    const a = asset.rows[0];

    const depreciable = a.purchase_cost - a.salvage_value;
    const annualDepr  = depreciable / a.useful_life_years;
    const monthlyDepr = annualDepr / 12;

    const rows = [];
    let accum = 0;
    let openNbv = a.purchase_cost;
    const start = new Date(a.purchase_date);

    for (let m = 0; m < a.useful_life_years * 12; m++) {
      const periodDate = new Date(start.getFullYear(), start.getMonth() + m + 1, 1);
      const depr = Math.min(monthlyDepr, openNbv - a.salvage_value);
      if (depr <= 0) break;
      accum += depr;
      const closeNbv = openNbv - depr;
      await db.query(
        `INSERT INTO depreciation_schedule
         (tenant_id,asset_id,period_date,opening_nbv,depreciation_amount,accumulated_depr,closing_nbv)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (asset_id, period_date) DO NOTHING`,
        [tenant_id, a.id, periodDate, openNbv, depr, accum, closeNbv]
      );
      rows.push({ period_date: periodDate, depreciation_amount: depr, closing_nbv: closeNbv });
      openNbv = closeNbv;
    }
    return ok(res, { periods_generated: rows.length, schedule: rows });
  } catch (e) { return fail(res, e); }
});

assetsRouter.get('/:id/depreciation', requirePermission('assets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      'SELECT * FROM depreciation_schedule WHERE asset_id=$1 AND tenant_id=$2 ORDER BY period_date',
      [req.params.id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// Maintenance
assetsRouter.get('/:id/maintenance', requirePermission('assets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT am.*, u.full_name AS created_by_name FROM asset_maintenance am
       LEFT JOIN users u ON u.id = am.created_by
       WHERE am.asset_id=$1 AND am.tenant_id=$2 ORDER BY am.maintenance_date DESC`,
      [req.params.id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

assetsRouter.post('/:id/maintenance', requirePermission('assets', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { maintenance_type, description, vendor, cost, currency, maintenance_date, next_due_date } = req.body;
    const result = await db.query(
      `INSERT INTO asset_maintenance
       (tenant_id,asset_id,maintenance_type,description,vendor,cost,currency,maintenance_date,next_due_date,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenant_id, req.params.id, maintenance_type, description, vendor, cost, currency, maintenance_date, next_due_date, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});
