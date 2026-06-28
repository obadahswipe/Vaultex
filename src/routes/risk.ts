import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const riskRouter = Router();

// Live exposure summary from open trades
riskRouter.get('/exposure', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT
         t.symbol,
         t.book_type,
         COUNT(*) AS open_positions,
         SUM(CASE WHEN t.direction='BUY'  THEN t.volume ELSE 0 END) AS lots_buy,
         SUM(CASE WHEN t.direction='SELL' THEN t.volume ELSE 0 END) AS lots_sell,
         SUM(CASE WHEN t.direction='BUY'  THEN t.volume ELSE -t.volume END) AS net_lots,
         COALESCE(SUM(t.mt5_profit),0) AS floating_pnl
       FROM trades t
       WHERE t.tenant_id=$1
         AND t.journal_posted = false  -- open trades not yet closed/journaled
       GROUP BY t.symbol, t.book_type
       ORDER BY ABS(SUM(t.mt5_profit)) DESC`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// B-Book exposure summary
riskRouter.get('/bbook', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT
         t.symbol,
         COUNT(*) AS open_positions,
         SUM(t.volume) AS total_lots,
         COALESCE(SUM(t.bbook_pnl),0) AS bbook_pnl,
         COALESCE(SUM(t.mt5_profit),0) AS client_floating_pnl
       FROM trades t
       WHERE t.tenant_id=$1 AND t.book_type='B'
       GROUP BY t.symbol ORDER BY ABS(SUM(t.bbook_pnl)) DESC NULLS LAST`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// Risk limits
riskRouter.get('/limits', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      'SELECT rl.*, u.full_name AS created_by_name FROM risk_limits rl LEFT JOIN users u ON u.id=rl.created_by WHERE rl.tenant_id=$1 AND rl.is_active=true ORDER BY rl.limit_type',
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

riskRouter.post('/limits', requirePermission('risk', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { limit_type, symbol, limit_value, currency, alert_at_percent } = req.body;
    const result = await db.query(
      `INSERT INTO risk_limits (tenant_id,limit_type,symbol,limit_value,currency,alert_at_percent,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tenant_id, limit_type, symbol, limit_value, currency, alert_at_percent, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Active alerts
riskRouter.get('/alerts', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT ra.*, rl.limit_type, u.full_name AS resolved_by_name
       FROM risk_alerts ra
       JOIN risk_limits rl ON rl.id = ra.limit_id
       LEFT JOIN users u ON u.id = ra.resolved_by
       WHERE ra.tenant_id=$1 AND ra.is_resolved=false
       ORDER BY ra.created_at DESC`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

riskRouter.patch('/alerts/:id/resolve', requirePermission('risk', 'edit'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    await db.query(
      'UPDATE risk_alerts SET is_resolved=true,resolved_by=$1,resolved_at=NOW() WHERE id=$2 AND tenant_id=$3',
      [user_id, req.params.id, tenant_id]
    );
    return ok(res, { success: true });
  } catch (e) { return fail(res, e); }
});

// Historical snapshots
riskRouter.get('/snapshots', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { symbol } = req.query;
    const result = await db.query(
      `SELECT * FROM risk_snapshots WHERE tenant_id=$1
       ${symbol ? 'AND symbol=$2' : ''}
       ORDER BY snapshot_at DESC LIMIT 500`,
      symbol ? [tenant_id, symbol] : [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

// Top-loss clients
riskRouter.get('/top-loss-clients', requirePermission('risk', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT c.id, c.full_name, c.client_code,
              COALESCE(SUM(t.mt5_profit),0) AS total_pnl,
              COUNT(DISTINCT t.id) AS trade_count
       FROM clients c
       JOIN mt5_accounts ma ON ma.client_id = c.id
       JOIN trades t ON t.mt5_account_id = ma.id
       WHERE c.tenant_id=$1
       GROUP BY c.id ORDER BY total_pnl ASC LIMIT 20`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});
