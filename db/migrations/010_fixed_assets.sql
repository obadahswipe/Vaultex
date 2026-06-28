-- ================================================
-- MIGRATION: 010_fixed_assets
-- Fixed asset register, depreciation, maintenance
-- ================================================

CREATE TABLE asset_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  depreciation_method VARCHAR(30) DEFAULT 'STRAIGHT_LINE',
  -- STRAIGHT_LINE / DECLINING_BALANCE
  useful_life_years   INTEGER,
  salvage_percent     DECIMAL(5,2) DEFAULT 0,
  coa_asset_account   UUID REFERENCES chart_of_accounts(id),
  coa_depreciation_account UUID REFERENCES chart_of_accounts(id),
  coa_accum_depr_account   UUID REFERENCES chart_of_accounts(id),
  is_active           BOOLEAN DEFAULT true
);

CREATE TABLE assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES asset_categories(id),
  branch_id           UUID REFERENCES branches(id),
  department_id       UUID REFERENCES departments(id),
  asset_code          VARCHAR(50) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  serial_number       VARCHAR(255),
  purchase_date       DATE NOT NULL,
  purchase_cost       DECIMAL(18,6) NOT NULL,
  currency            CHAR(3) DEFAULT 'USD',
  cost_usd            DECIMAL(18,6) NOT NULL,
  useful_life_years   INTEGER NOT NULL,
  salvage_value       DECIMAL(18,6) DEFAULT 0,
  depreciation_method VARCHAR(30) DEFAULT 'STRAIGHT_LINE',
  status              VARCHAR(30) DEFAULT 'ACTIVE',
  -- ACTIVE / DISPOSED / SOLD / WRITTEN_OFF / UNDER_REPAIR
  location            VARCHAR(255),
  assigned_to         UUID REFERENCES employees(id),
  disposal_date       DATE,
  disposal_amount     DECIMAL(18,6),
  disposal_reason     TEXT,
  document_id         UUID REFERENCES documents(id),
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, asset_code)
);

CREATE TABLE depreciation_schedule (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  asset_id            UUID REFERENCES assets(id) ON DELETE CASCADE,
  period_date         DATE NOT NULL,
  opening_nbv         DECIMAL(18,6) NOT NULL,  -- net book value
  depreciation_amount DECIMAL(18,6) NOT NULL,
  accumulated_depr    DECIMAL(18,6) NOT NULL,
  closing_nbv         DECIMAL(18,6) NOT NULL,
  posted              BOOLEAN DEFAULT false,
  journal_id          UUID REFERENCES journal_entries(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(asset_id, period_date)
);

CREATE TABLE asset_maintenance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  asset_id        UUID REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50),
  -- PREVENTIVE / CORRECTIVE / INSPECTION
  description     TEXT,
  vendor          VARCHAR(255),
  cost            DECIMAL(18,6) DEFAULT 0,
  currency        CHAR(3) DEFAULT 'USD',
  maintenance_date DATE NOT NULL,
  next_due_date   DATE,
  status          VARCHAR(20) DEFAULT 'COMPLETED',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assets_tenant      ON assets(tenant_id, status);
CREATE INDEX idx_assets_category    ON assets(category_id);
CREATE INDEX idx_depreciation_asset ON depreciation_schedule(asset_id, period_date);
