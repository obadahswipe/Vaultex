import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const treasuryRouter = Router();

// Banks
treasuryRouter.get('/banks', requirePermission('treasury', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      'SELECT * FROM banks WHERE tenant_id=$1 ORDER BY name', [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

treasuryRouter.post('/banks', requirePermission('treasury', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { name, swift_code, country, branch } = req.body;
    const result = await db.query(
      `INSERT INTO banks (tenant_id,name,swift_code,country,branch) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tenant_id, name, swift_code, country, branch]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Bank accounts
treasuryRouter.get('/bank-accounts', requirePermission('treasury', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT ba.*, b.name AS bank_name, b.swift_code
       FROM bank_accounts ba JOIN banks b ON b.id = ba.bank_id
       WHERE ba.tenant_id=$1 ORDER BY b.name, ba.currency`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

treasuryRouter.post('/bank-accounts', requirePermission('treasury', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { bank_id, account_name, account_number, iban, currency, account_type, coa_account_id } = req.body;
    const result = await db.query(
      `INSERT INTO bank_accounts (tenant_id,bank_id,account_name,account_number,iban,currency,account_type,coa_account_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenant_id, bank_id, account_name, account_number, iban, currency, account_type, coa_account_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Payment providers
treasuryRouter.get('/providers', requirePermission('treasury', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      'SELECT * FROM payment_providers WHERE tenant_id=$1 ORDER BY name', [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

treasuryRouter.post('/providers', requirePermission('treasury', 'create'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { name, provider_type, currencies, min_deposit, max_deposit, fee_percent, fee_fixed } = req.body;
    const result = await db.query(
      `INSERT INTO payment_providers (tenant_id,name,provider_type,currencies,min_deposit,max_deposit,fee_percent,fee_fixed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenant_id, name, provider_type, currencies, min_deposit, max_deposit, fee_percent, fee_fixed]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Internal transfers
treasuryRouter.get('/transfers', requirePermission('treasury', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT tt.*, u.full_name AS approved_by_name, cb.full_name AS created_by_name
       FROM treasury_transfers tt
       LEFT JOIN users u  ON u.id  = tt.approved_by
       LEFT JOIN users cb ON cb.id = tt.created_by
       WHERE tt.tenant_id=$1 ORDER BY tt.created_at DESC LIMIT 200`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

treasuryRouter.post('/transfers', requirePermission('treasury', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const {
      transfer_type, from_account_type, from_account_id,
      to_account_type, to_account_id, amount, currency,
      amount_usd, exchange_rate, value_date, reference, narration
    } = req.body;
    const result = await db.query(
      `INSERT INTO treasury_transfers
       (tenant_id,transfer_type,from_account_type,from_account_id,to_account_type,to_account_id,
        amount,currency,amount_usd,exchange_rate,value_date,reference,narration,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [tenant_id, transfer_type, from_account_type, from_account_id,
       to_account_type, to_account_id, amount, currency,
       amount_usd, exchange_rate, value_date, reference, narration, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

// Cash accounts
treasuryRouter.get('/cash', requirePermission('treasury', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT ca.*, b.name AS branch_name
       FROM cash_accounts ca LEFT JOIN branches b ON b.id = ca.branch_id
       WHERE ca.tenant_id=$1 ORDER BY ca.name`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});
