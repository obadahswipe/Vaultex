-- ================================================
-- MIGRATION: 014_risk
-- Risk management: exposure snapshots, position monitoring
-- ================================================

CREATE TABLE risk_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  snapshot_at       TIMESTAMP NOT NULL,
  symbol            VARCHAR(20) NOT NULL,
  book_type         CHAR(1) NOT NULL,  -- A / B
  open_positions    INTEGER DEFAULT 0,
  total_lots_buy    DECIMAL(18,4) DEFAULT 0,
  total_lots_sell   DECIMAL(18,4) DEFAULT 0,
  net_lots          DECIMAL(18,4) DEFAULT 0,
  floating_pnl_usd  DECIMAL(18,6) DEFAULT 0,
  exposure_usd      DECIMAL(18,6) DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE risk_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  limit_type      VARCHAR(50) NOT NULL,
  -- MAX_EXPOSURE_PER_SYMBOL / MAX_BBOOK_EXPOSURE
  -- MAX_CLIENT_DRAWDOWN / MAX_DAILY_WITHDRAWAL
  symbol          VARCHAR(20),  -- NULL = applies to all
  limit_value     DECIMAL(18,6) NOT NULL,
  currency        CHAR(3) DEFAULT 'USD',
  alert_at_percent DECIMAL(5,2) DEFAULT 80,
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE risk_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  limit_id        UUID REFERENCES risk_limits(id),
  alert_type      VARCHAR(50) NOT NULL,
  -- WARNING / BREACH
  symbol          VARCHAR(20),
  current_value   DECIMAL(18,6) NOT NULL,
  limit_value     DECIMAL(18,6) NOT NULL,
  percent_used    DECIMAL(8,4) NOT NULL,
  is_resolved     BOOLEAN DEFAULT false,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_snapshots_tenant  ON risk_snapshots(tenant_id, snapshot_at DESC);
CREATE INDEX idx_risk_snapshots_symbol  ON risk_snapshots(tenant_id, symbol, snapshot_at DESC);
CREATE INDEX idx_risk_alerts_unresolved ON risk_alerts(tenant_id) WHERE is_resolved = false;
