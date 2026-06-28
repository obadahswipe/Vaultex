-- ================================================
-- MIGRATION: 006_treasury
-- Full treasury management: banks, accounts, providers
-- ================================================

CREATE TABLE banks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  swift_code  VARCHAR(20),
  country     CHAR(2),
  branch      VARCHAR(255),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  bank_id         UUID REFERENCES banks(id),
  account_name    VARCHAR(255) NOT NULL,
  account_number  VARCHAR(100) NOT NULL,
  iban            VARCHAR(50),
  currency        CHAR(3) NOT NULL,
  account_type    VARCHAR(50) DEFAULT 'OPERATIONAL',
  -- OPERATIONAL / RESERVE / CLIENT_FUNDS / PAYROLL
  balance         DECIMAL(18,6) DEFAULT 0,
  coa_account_id  UUID REFERENCES chart_of_accounts(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, account_number)
);

CREATE TABLE cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),
  name            VARCHAR(255) NOT NULL,
  currency        CHAR(3) NOT NULL,
  balance         DECIMAL(18,6) DEFAULT 0,
  coa_account_id  UUID REFERENCES chart_of_accounts(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  provider_type   VARCHAR(50) NOT NULL,
  -- CARD / CRYPTO / WIRE / E_WALLET / LOCAL
  currencies      TEXT[],
  min_deposit     DECIMAL(18,6) DEFAULT 0,
  max_deposit     DECIMAL(18,6),
  fee_percent     DECIMAL(8,4) DEFAULT 0,
  fee_fixed       DECIMAL(18,6) DEFAULT 0,
  coa_account_id  UUID REFERENCES chart_of_accounts(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE treasury_transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  transfer_type       VARCHAR(50) NOT NULL,
  -- BANK_TO_BANK / CASH_TO_BANK / BANK_TO_CASH / PROVIDER_SETTLEMENT
  from_account_type   VARCHAR(20) NOT NULL,  -- BANK / CASH / PROVIDER
  from_account_id     UUID NOT NULL,
  to_account_type     VARCHAR(20) NOT NULL,
  to_account_id       UUID NOT NULL,
  amount              DECIMAL(18,6) NOT NULL,
  currency            CHAR(3) NOT NULL,
  amount_usd          DECIMAL(18,6) NOT NULL,
  exchange_rate       DECIMAL(18,6) DEFAULT 1,
  value_date          DATE,
  reference           VARCHAR(255),
  narration           TEXT,
  status              VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING / COMPLETED / CANCELLED
  approved_by         UUID REFERENCES users(id),
  journal_id          UUID REFERENCES journal_entries(id),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE treasury_reconciliation (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  bank_account_id     UUID REFERENCES bank_accounts(id),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  statement_balance   DECIMAL(18,6) NOT NULL,
  system_balance      DECIMAL(18,6) NOT NULL,
  difference          DECIMAL(18,6) GENERATED ALWAYS AS (statement_balance - system_balance) STORED,
  status              VARCHAR(20) DEFAULT 'OPEN',
  -- OPEN / RECONCILED / BREAK
  notes               TEXT,
  reconciled_by       UUID REFERENCES users(id),
  reconciled_at       TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_tenant   ON bank_accounts(tenant_id);
CREATE INDEX idx_treasury_transfers     ON treasury_transfers(tenant_id, created_at);
