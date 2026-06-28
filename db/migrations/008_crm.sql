-- ================================================
-- MIGRATION: 008_crm
-- CRM: leads, activities, tickets, communication history
-- ================================================

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  country         CHAR(2),
  source          VARCHAR(100),
  -- WEBSITE / REFERRAL / IB / COLD_CALL / SOCIAL / EVENT
  ib_id           UUID REFERENCES ibs(id),
  assigned_to     UUID REFERENCES users(id),
  status          VARCHAR(30) DEFAULT 'NEW',
  -- NEW / CONTACTED / QUALIFIED / PROPOSAL / NEGOTIATION
  -- CONVERTED / LOST / DORMANT
  lost_reason     TEXT,
  expected_deposit DECIMAL(18,6),
  notes           TEXT,
  converted_at    TIMESTAMP,
  converted_to    UUID REFERENCES clients(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  entity_type     VARCHAR(30) NOT NULL,  -- LEAD / CLIENT / IB
  entity_id       UUID NOT NULL,
  activity_type   VARCHAR(50) NOT NULL,
  -- CALL / EMAIL / MEETING / NOTE / TASK / FOLLOW_UP / DEMO
  subject         VARCHAR(500),
  description     TEXT,
  outcome         VARCHAR(100),
  scheduled_at    TIMESTAMP,
  completed_at    TIMESTAMP,
  duration_min    INTEGER,
  performed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  entity_type     VARCHAR(30) NOT NULL,  -- CLIENT / IB / LEAD
  entity_id       UUID NOT NULL,
  subject         VARCHAR(500) NOT NULL,
  description     TEXT,
  priority        VARCHAR(20) DEFAULT 'MEDIUM',
  -- LOW / MEDIUM / HIGH / URGENT
  status          VARCHAR(30) DEFAULT 'OPEN',
  -- OPEN / IN_PROGRESS / WAITING_CLIENT / RESOLVED / CLOSED
  category        VARCHAR(100),
  -- DEPOSIT / WITHDRAWAL / TECHNICAL / ACCOUNT / COMPLIANCE / OTHER
  assigned_to     UUID REFERENCES users(id),
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMP,
  sla_due_at      TIMESTAMP,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant       ON leads(tenant_id, status);
CREATE INDEX idx_leads_assigned     ON leads(assigned_to);
CREATE INDEX idx_activities_entity  ON activities(entity_type, entity_id);
CREATE INDEX idx_tickets_tenant     ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_assigned   ON tickets(assigned_to);
