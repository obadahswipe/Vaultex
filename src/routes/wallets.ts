import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const walletsRouter = Router();

walletsRouter.get('/', requirePermission('wallets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { client_id } = req.query;
    const result = await db.query(
      `SELECT w.*, c.full_name AS client_name, c.client_code
       FROM wallets w
       JOIN clients c ON c.id = w.client_id
       WHERE w.tenant_id = $1 ${client_id ? 'AND w.client_id = $2' : ''}
       ORDER BY c.full_name, w.currency`,
      client_id ? [tenant_id, client_id] : [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

walletsRouter.get('/:id/transactions', requirePermission('wallets', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT wt.*, u.full_name AS created_by_name
       FROM wallet_transactions wt
       LEFT JOIN users u ON u.id = wt.created_by
       WHERE wt.wallet_id = $1 AND wt.tenant_id = $2
       ORDER BY wt.created_at DESC LIMIT 200`,
      [req.params.id, tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

walletsRouter.post('/transfer', requirePermission('wallets', 'create'), async (req, res) => {
  const client = await db.connect();
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { from_wallet_id, to_wallet_id, amount, narration } = req.body;

    await client.query('BEGIN');

    const fromWallet = await client.query(
      'SELECT * FROM wallets WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [from_wallet_id, tenant_id]
    );
    const toWallet = await client.query(
      'SELECT * FROM wallets WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [to_wallet_id, tenant_id]
    );

    if (!fromWallet.rows[0] || !toWallet.rows[0]) throw new Error('Wallet not found');
    if (fromWallet.rows[0].balance < amount) throw new Error('Insufficient wallet balance');

    const fxRate = fromWallet.rows[0].currency === toWallet.rows[0].currency ? 1 : 1; // extend with real FX lookup
    const converted = amount * fxRate;

    const newFromBalance = fromWallet.rows[0].balance - amount;
    const newToBalance   = toWallet.rows[0].balance + converted;

    await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newFromBalance, from_wallet_id]);
    await client.query('UPDATE wallets SET balance=$1 WHERE id=$2', [newToBalance,   to_wallet_id]);

    const transfer = await client.query(
      `INSERT INTO wallet_transfers
       (tenant_id,from_wallet_id,to_wallet_id,amount,from_currency,to_currency,exchange_rate,amount_converted,narration,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenant_id, from_wallet_id, to_wallet_id, amount,
       fromWallet.rows[0].currency, toWallet.rows[0].currency,
       fxRate, converted, narration, user_id]
    );

    await client.query('COMMIT');
    return ok(res, transfer.rows[0], 201);
  } catch (e) {
    await client.query('ROLLBACK');
    return fail(res, e);
  } finally {
    client.release();
  }
});
