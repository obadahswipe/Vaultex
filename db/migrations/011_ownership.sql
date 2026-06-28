-- ================================================
-- MIGRATION: 011_ownership
-- Ownership: shareholders, capital, profit distribution
-- ================================================

CREATE TABLE shareholders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name           VARCHAR(255) NOT NULL,
  email               VARCHAR(255),
  nationality         CHAR(2),
  shareholder_type    VARCHAR(30) DEFAULT 'INDIVIDUAL',
  -- INDIVIDUAL / COMPANY
  company_name        VARCHAR(255),
  ownership_percent   DECIMAL(8,4) NOT NULL,
  share_class         VARCHAR(50) DEFAULT 'ORDINARY',
  -- ORDINARY / PREFERRED
  share_count         INTEGER,
  face_value          DECIMAL(18,6),
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  CONSTRAINT ownership_percent_range CHECK (ownership_percent > 0 AND ownership_percent <= 100)
);

CREATE TABLE capital_contributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  shareholder_id      UUID REFERENCES shareholders(id),
  contribution_type   VARCHAR(50) NOT NULL,
  -- INITIAL_CAPITAL / ADDITIONAL_CAPITAL / LOAN
  amount              DECIMAL(18,6) NOT NULL,
  currency            CHAR(3) NOT NULL,
  amount_usd          DECIMAL(18,6) NOT NULL,
  exchange_rate       DECIMAL(18,6) DEFAULT 1,
  contribution_date   DATE NOT NULL,
  bank_reference      VARCHAR(255),
  narration           TEXT,
  journal_id          UUID REFERENCES journal_entries(id),
  approved_by         UUID REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profit_distributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  total_profit        DECIMAL(18,6) NOT NULL,
  distributable_amount DECIMAL(18,6) NOT NULL,
  distribution_date   DATE NOT NULL,
  status              VARCHAR(20) DEFAULT 'DRAFT',
  -- DRAFT / APPROVED / PAID
  notes               TEXT,
  approved_by         UUID REFERENCES users(id),
  journal_id          UUID REFERENCES journal_entries(id),
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profit_distribution_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id),
  distribution_id         UUID REFERENCES profit_distributions(id) ON DELETE CASCADE,
  shareholder_id          UUID REFERENCES shareholders(id),
  ownership_percent       DECIMAL(8,4) NOT NULL,
  amount                  DECIMAL(18,6) NOT NULL,
  currency                CHAR(3) DEFAULT 'USD',
  bank_account            VARCHAR(255),
  paid_date               DATE,
  status                  VARCHAR(20) DEFAULT 'PENDING'
  -- PENDING / PAID
);

CREATE INDEX idx_shareholders_tenant      ON shareholders(tenant_id);
CREATE INDEX idx_capital_contributions    ON capital_contributions(tenant_id, shareholder_id);
CREATE INDEX idx_profit_distributions     ON profit_distributions(tenant_id, period_start);
