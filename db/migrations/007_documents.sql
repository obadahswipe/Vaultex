-- ================================================
-- MIGRATION: 007_documents
-- Document engine: KYC, contracts, attachments
-- ================================================

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type     VARCHAR(50) NOT NULL,
  -- CLIENT / IB / EMPLOYEE / ASSET / CONTRACT
  entity_id       UUID NOT NULL,
  document_type   VARCHAR(100) NOT NULL,
  -- PASSPORT / NATIONAL_ID / PROOF_OF_ADDRESS / BANK_STATEMENT
  -- CONTRACT / AGREEMENT / INVOICE / OTHER
  file_name       VARCHAR(500) NOT NULL,
  file_path       TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type       VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING / APPROVED / REJECTED / EXPIRED
  expiry_date     DATE,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMP,
  rejection_reason TEXT,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_entity  ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_status  ON documents(tenant_id, status);
CREATE INDEX idx_documents_expiry  ON documents(expiry_date) WHERE expiry_date IS NOT NULL;
