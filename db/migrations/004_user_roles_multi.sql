-- ================================================
-- MIGRATION: 004_user_roles_multi
-- Replace single role_id FK with multi-role junction table
-- A single person can be Trader + IB + Employee + Manager
-- ================================================

-- Create junction table
CREATE TABLE user_roles (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Migrate existing single role into junction table
INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id FROM users WHERE role_id IS NOT NULL;

-- Drop the old column (keep nullable for zero-downtime, remove after migration confirmed)
ALTER TABLE users DROP COLUMN IF EXISTS role_id;

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
