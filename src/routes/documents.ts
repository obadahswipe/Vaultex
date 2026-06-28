import { Router } from 'express';
import { requirePermission } from '../middleware/rbac';
import { db } from '../config/database';
import { ok, fail } from '../utils/response';

export const documentsRouter = Router();

documentsRouter.get('/', requirePermission('documents', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const { entity_type, entity_id, status } = req.query;
    const conditions: string[] = ['d.tenant_id = $1'];
    const params: unknown[] = [tenant_id];
    let i = 2;
    if (entity_type) { conditions.push(`d.entity_type = $${i++}`); params.push(entity_type); }
    if (entity_id)   { conditions.push(`d.entity_id = $${i++}`);   params.push(entity_id); }
    if (status)      { conditions.push(`d.status = $${i++}`);       params.push(status); }

    const result = await db.query(
      `SELECT d.*, u.full_name AS uploaded_by_name, r.full_name AS reviewed_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       LEFT JOIN users r ON r.id = d.reviewed_by
       WHERE ${conditions.join(' AND ')} ORDER BY d.created_at DESC`,
      params
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});

documentsRouter.post('/', requirePermission('documents', 'create'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { entity_type, entity_id, document_type, file_name, file_path, file_size_bytes, mime_type, expiry_date } = req.body;
    const result = await db.query(
      `INSERT INTO documents
       (tenant_id,entity_type,entity_id,document_type,file_name,file_path,file_size_bytes,mime_type,expiry_date,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenant_id, entity_type, entity_id, document_type, file_name, file_path, file_size_bytes, mime_type, expiry_date, user_id]
    );
    return ok(res, result.rows[0], 201);
  } catch (e) { return fail(res, e); }
});

documentsRouter.patch('/:id/review', requirePermission('documents', 'approve'), async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user!;
    const { status, rejection_reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return fail(res, 'Invalid status', 400);
    const result = await db.query(
      `UPDATE documents SET status=$1, reviewed_by=$2, reviewed_at=NOW(), rejection_reason=$3
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [status, user_id, rejection_reason, req.params.id, tenant_id]
    );
    return ok(res, result.rows[0]);
  } catch (e) { return fail(res, e); }
});

// Expiring documents alert
documentsRouter.get('/expiring', requirePermission('documents', 'view'), async (req, res) => {
  try {
    const { tenant_id } = req.user!;
    const result = await db.query(
      `SELECT * FROM documents
       WHERE tenant_id=$1 AND status='APPROVED'
         AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       ORDER BY expiry_date`,
      [tenant_id]
    );
    return ok(res, result.rows);
  } catch (e) { return fail(res, e); }
});
