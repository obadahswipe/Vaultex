-- ================================================
-- MIGRATION: 003_branches_departments
-- Org structure: branches and departments
-- ================================================

CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  country     CHAR(2),
  city        VARCHAR(100),
  address     TEXT,
  phone       VARCHAR(50),
  manager_id  UUID,  -- references users(id), added after users table exists
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  head_id     UUID,  -- references users(id)
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Add branch/department to users
ALTER TABLE users ADD COLUMN branch_id     UUID REFERENCES branches(id);
ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);

-- Add branch to clients
ALTER TABLE clients ADD COLUMN branch_id UUID REFERENCES branches(id);

CREATE INDEX idx_branches_tenant   ON branches(tenant_id);
CREATE INDEX idx_departments_branch ON departments(branch_id);
