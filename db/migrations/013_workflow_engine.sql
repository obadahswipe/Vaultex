-- ================================================
-- MIGRATION: 013_workflow_engine
-- Configurable workflow engine for all business processes
-- ================================================

CREATE TABLE workflow_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  process_type    VARCHAR(100) NOT NULL,
  -- DEPOSIT / WITHDRAWAL / ACCOUNT_OPENING / IB_PAYOUT
  -- KYC_APPROVAL / LEAD_CONVERSION / PAYROLL_APPROVAL
  -- ASSET_PURCHASE / CAPITAL_CONTRIBUTION / CUSTOM
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  is_default      BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, process_type, is_default) -- only one default per process type per tenant
);

CREATE TABLE workflow_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  name            VARCHAR(255) NOT NULL,
  step_type       VARCHAR(50) NOT NULL,
  -- APPROVAL / REVIEW / TASK / AUTO / NOTIFICATION
  assigned_role   UUID REFERENCES roles(id),
  assigned_user   UUID REFERENCES users(id),
  sla_hours       INTEGER,
  can_reject      BOOLEAN DEFAULT true,
  can_skip        BOOLEAN DEFAULT false,
  auto_approve_hours INTEGER,  -- auto-approve if no action within N hours
  instructions    TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, step_order)
);

CREATE TABLE workflow_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  template_id     UUID REFERENCES workflow_templates(id),
  process_type    VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(100) NOT NULL,
  entity_id       UUID NOT NULL,
  current_step    INTEGER DEFAULT 1,
  status          VARCHAR(30) DEFAULT 'IN_PROGRESS',
  -- IN_PROGRESS / COMPLETED / REJECTED / CANCELLED
  started_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP,
  created_by      UUID REFERENCES users(id)
);

CREATE TABLE workflow_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  instance_id     UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_id         UUID REFERENCES workflow_steps(id),
  step_order      INTEGER NOT NULL,
  step_name       VARCHAR(255) NOT NULL,
  assigned_to     UUID REFERENCES users(id),
  assigned_role   UUID REFERENCES roles(id),
  status          VARCHAR(30) DEFAULT 'PENDING',
  -- PENDING / IN_PROGRESS / APPROVED / REJECTED / SKIPPED
  due_at          TIMESTAMP,
  action_taken    VARCHAR(30),
  -- APPROVED / REJECTED / SKIPPED
  action_note     TEXT,
  acted_by        UUID REFERENCES users(id),
  acted_at        TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wf_instances_tenant   ON workflow_instances(tenant_id, status);
CREATE INDEX idx_wf_instances_entity   ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_wf_tasks_assigned     ON workflow_tasks(assigned_to, status);
CREATE INDEX idx_wf_tasks_instance     ON workflow_tasks(instance_id);
