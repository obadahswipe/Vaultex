import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const ownershipRouter = Router();

// Shareholders
ownershipRouter.get('/shareholders', requirePermission('ownership', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT s.*,
              COALESCE(SUM(cc.amount_usd),0) AS total_contributed_usd
       FROM shareholders s
       LEFT JOIN capital_contributions cc ON cc.shareholder_id = s.id
       WHERE s.tenant_id=$1
       GROUP BY s.id ORDER BY s.ownership_percent DESC`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

ownershipRouter.post('/shareholders', requirePermission('ownership', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { full_name, email, nationality, shareholder_type, company_name,
            ownership_percent, share_class, share_count, face_value } = req.body;

    const total = await db.query(
      'SELECT COALESCE(SUM(ownership_percent),0) AS total FROM shareholders WHERE tenant_id=$1 AND is_active=true',
      [tenant_id]
    );
    if (parseFloat(total.rows[0].total) + ownership_percent > 100) {
      return fail(res, 'Total ownership cannot exceed 100%', 400);
    }
    const result = await db.query(
      `INSERT INTO shareholders
       (tenant_id,full_name,email,nationality,shareholder_type,company_name,
        ownership_percent,share_class,share_count,face_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenant_id, full_name, email, nationality, shareholder_type, company_name,
       ownership_percent, share_class, share_count, face_value]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Capital contributions
ownershipRouter.get('/capital', requirePermission('ownership', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT cc.*, s.full_name AS shareholder_name, u.full_name AS approved_by_name
       FROM capital_contributions cc
       JOIN shareholders s ON s.id = cc.shareholder_id
       LEFT JOIN users u ON u.id = cc.approved_by
       WHERE cc.tenant_id=$1 ORDER BY cc.contribution_date DESC`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

ownershipRouter.post('/capital', requirePermission('ownership', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { shareholder_id, contribution_type, amount, currency, amount_usd,
            exchange_rate, contribution_date, bank_reference, narration } = req.body;
    const result = await db.query(
      `INSERT INTO capital_contributions
       (tenant_id,shareholder_id,contribution_type,amount,currency,amount_usd,
        exchange_rate,contribution_date,bank_reference,narration,approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenant_id, shareholder_id, contribution_type, amount, currency, amount_usd,
       exchange_rate, contribution_date, bank_reference, narration, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Profit distributions
ownershipRouter.get('/distributions', requirePermission('ownership', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT pd.*, u.full_name AS approved_by_name,
              json_agg(json_build_object(
                'shareholder', s.full_name,
                'percent', pdi.ownership_percent,
                'amount', pdi.amount,
                'status', pdi.status
              )) AS items
       FROM profit_distributions pd
       LEFT JOIN profit_distribution_items pdi ON pdi.distribution_id = pd.id
       LEFT JOIN shareholders s ON s.id = pdi.shareholder_id
       LEFT JOIN users u ON u.id = pd.approved_by
       WHERE pd.tenant_id=$1
       GROUP BY pd.id, u.full_name
       ORDER BY pd.distribution_date DESC`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

ownershipRouter.post('/distributions', requirePermission('ownership', 'create'), async (req, res) => {
  const client = await db.connect();
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { period_start, period_end, total_profit, distributable_amount, distribution_date, notes } = req.body;

    await client.query('BEGIN');
    const dist = await client.query(
      `INSERT INTO profit_distributions
       (tenant_id,period_start,period_end,total_profit,distributable_amount,distribution_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant_id, period_start, period_end, total_profit, distributable_amount, distribution_date, notes]
    );
    const shareholders = await client.query(
      'SELECT * FROM shareholders WHERE tenant_id=$1 AND is_active=true', [tenant_id]
    );
    for (const sh of shareholders.rows) {
      const amount = (distributable_amount * sh.ownership_percent) / 100;
      await client.query(
        `INSERT INTO profit_distribution_items
         (tenant_id,distribution_id,shareholder_id,ownership_percent,amount)
         VALUES ($1,$2,$3,$4,$5)`,
        [tenant_id, dist.rows[0].id, sh.id, sh.ownership_percent, amount]
      );
    }
    await client.query('COMMIT');
    return ok(res, dist.rows[0], 201);
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, e);
  } finally { client.release(); }
});
