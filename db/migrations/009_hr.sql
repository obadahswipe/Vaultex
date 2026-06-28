-- ================================================
-- MIGRATION: 009_hr
-- Human Resources: employees, contracts, payroll, leave
-- ================================================

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  branch_id       UUID REFERENCES branches(id),
  department_id   UUID REFERENCES departments(id),
  employee_code   VARCHAR(50) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(50),
  position        VARCHAR(255),
  employment_type VARCHAR(30) DEFAULT 'FULL_TIME',
  -- FULL_TIME / PART_TIME / CONTRACT / INTERN
  hire_date       DATE NOT NULL,
  termination_date DATE,
  status          VARCHAR(20) DEFAULT 'ACTIVE',
  -- ACTIVE / ON_LEAVE / TERMINATED
  manager_id      UUID REFERENCES employees(id),
  base_salary     DECIMAL(18,6),
  salary_currency CHAR(3) DEFAULT 'USD',
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, employee_code)
);

CREATE TABLE employee_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  contract_type   VARCHAR(50) NOT NULL,
  -- EMPLOYMENT / AMENDMENT / PROBATION / NDA
  start_date      DATE NOT NULL,
  end_date        DATE,
  salary          DECIMAL(18,6) NOT NULL,
  currency        CHAR(3) DEFAULT 'USD',
  signed_at       DATE,
  document_id     UUID REFERENCES documents(id),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  name        VARCHAR(100) NOT NULL,
  days_annual INTEGER DEFAULT 0,
  is_paid     BOOLEAN DEFAULT true,
  is_active   BOOLEAN DEFAULT true
);

CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  employee_id     UUID REFERENCES employees(id),
  leave_type_id   UUID REFERENCES leave_types(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days_requested  DECIMAL(5,1) NOT NULL,
  reason          TEXT,
  status          VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING / APPROVED / REJECTED / CANCELLED
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMP,
  rejection_note  TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  currency        CHAR(3) DEFAULT 'USD',
  total_gross     DECIMAL(18,6) DEFAULT 0,
  total_deductions DECIMAL(18,6) DEFAULT 0,
  total_net       DECIMAL(18,6) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'DRAFT',
  -- DRAFT / APPROVED / PAID
  approved_by     UUID REFERENCES users(id),
  payment_date    DATE,
  journal_id      UUID REFERENCES journal_entries(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, period_start, period_end)
);

CREATE TABLE payroll_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  payroll_run_id  UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id),
  base_salary     DECIMAL(18,6) NOT NULL,
  allowances      DECIMAL(18,6) DEFAULT 0,
  deductions      DECIMAL(18,6) DEFAULT 0,
  bonus           DECIMAL(18,6) DEFAULT 0,
  net_pay         DECIMAL(18,6) NOT NULL,
  currency        CHAR(3) DEFAULT 'USD',
  bank_account_no VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employees_tenant    ON employees(tenant_id, status);
CREATE INDEX idx_leave_employee      ON leave_requests(employee_id, status);
CREATE INDEX idx_payroll_runs_tenant ON payroll_runs(tenant_id, period_start);
