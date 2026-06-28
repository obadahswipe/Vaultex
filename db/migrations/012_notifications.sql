-- ================================================
-- MIGRATION: 012_notifications
-- In-app notification engine
-- ================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(100) NOT NULL,
  -- DEPOSIT_PENDING / DEPOSIT_APPROVED / WITHDRAWAL_PENDING
  -- WITHDRAWAL_APPROVED / WORKFLOW_TASK / TICKET_ASSIGNED
  -- IB_COMMISSION / RECONCILIATION_BREAK / EOD_COMPLETE
  -- DOCUMENT_EXPIRED / LEAD_ASSIGNED / PAYROLL_DUE
  title           VARCHAR(500) NOT NULL,
  body            TEXT,
  link            VARCHAR(500),  -- frontend route to navigate to
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMP,
  entity_type     VARCHAR(50),
  entity_id       UUID,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  notification_type VARCHAR(100) NOT NULL,
  in_app          BOOLEAN DEFAULT true,
  email           BOOLEAN DEFAULT false,
  sms             BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, notification_type)
);

CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;
