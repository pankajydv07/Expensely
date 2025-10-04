-- Expensely Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS approval_actions CASCADE;
DROP TABLE IF EXISTS approval_step_approvers CASCADE;
DROP TABLE IF EXISTS approval_steps CASCADE;
DROP TABLE IF EXISTS approval_rule_items CASCADE;
DROP TABLE IF EXISTS approval_rules CASCADE;
DROP TABLE IF EXISTS expense_attachments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS manager_relationships CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Roles table (static)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE -- 'admin','manager','employee'
);

-- Companies
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  country_code TEXT,                 -- e.g., 'IN', 'US'
  default_currency CHAR(3) NOT NULL, -- ISO currency code e.g., 'USD'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, email)
);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- Manager relationships (simple mapping)
CREATE TABLE manager_relationships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

-- Categories
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, name)
);

-- Expenses (header)
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id),
  title TEXT,
  category_id INT REFERENCES expense_categories(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  original_amount NUMERIC(15,2) NOT NULL,
  original_currency CHAR(3) NOT NULL,
  company_amount NUMERIC(15,2) NOT NULL, -- converted using exchange rate at submit time
  company_currency CHAR(3) NOT NULL,      -- redundant but convenient (company default)
  exchange_rate_used NUMERIC(15,6),       -- rate used for conversion
  date_of_expense DATE NOT NULL,
  payment_method TEXT,
  vendor TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, waiting_approval, approved, rejected, canceled
  current_step INT,                      -- reference to approval_steps.step_index for tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_requester ON expenses(requester_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_submitted ON expenses(submitted_at);

-- Expense attachments (receipts)
CREATE TABLE expense_attachments (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  ocr_text TEXT,
  ocr_confidence NUMERIC(5,2),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_attachments_expense ON expense_attachments(expense_id);

-- Approval Rules
CREATE TABLE approval_rules (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  applies_to_category INT REFERENCES expense_categories(id), -- nullable = global
  min_amount NUMERIC(15,2) DEFAULT 0,
  max_amount NUMERIC(15,2),
  include_manager BOOLEAN DEFAULT TRUE,
  min_approval_percentage INT DEFAULT 0, -- 0-100
  specific_approver_id UUID REFERENCES users(id), -- if present => specific approver rule
  is_active BOOLEAN DEFAULT TRUE,
  rule_type TEXT NOT NULL DEFAULT 'sequential', -- sequential | parallel | conditional
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_rules_company ON approval_rules(company_id);
CREATE INDEX idx_approval_rules_active ON approval_rules(is_active);

-- Approval rule sequence items (ordered list of approvers for sequential rules)
CREATE TABLE approval_rule_items (
  id SERIAL PRIMARY KEY,
  rule_id INT NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
  step_index INT NOT NULL, -- 1,2,3...
  approver_user_id UUID REFERENCES users(id),
  approver_role_id INT REFERENCES roles(id), -- fallback to role-based approver
  allow_parallel BOOLEAN DEFAULT FALSE, -- if multiple items share step_index => parallel
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rule_items_ruleid ON approval_rule_items(rule_id);

-- Approval workflow instances per expense: steps
CREATE TABLE approval_steps (
  id SERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  step_type TEXT DEFAULT 'sequential', -- sequential or parallel
  required_percentage INT DEFAULT 100, -- for parallel steps (e.g., 60)
  status TEXT DEFAULT 'pending', -- pending | in_progress | approved | rejected
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX ux_approval_steps_expense_step ON approval_steps(expense_id, step_index);
CREATE INDEX idx_approval_steps_status ON approval_steps(status);

-- Approvers assigned to each step (for parallel or multiple approvers in a step)
CREATE TABLE approval_step_approvers (
  id SERIAL PRIMARY KEY,
  step_id INT NOT NULL REFERENCES approval_steps(id) ON DELETE CASCADE,
  approver_user_id UUID NOT NULL REFERENCES users(id),
  decision TEXT, -- 'approved' | 'rejected' | NULL
  comment TEXT,
  decided_at TIMESTAMPTZ
);
CREATE INDEX idx_approver_step ON approval_step_approvers(step_id);
CREATE INDEX idx_approver_user ON approval_step_approvers(approver_user_id);
CREATE INDEX idx_approver_pending ON approval_step_approvers(approver_user_id, decision) WHERE decision IS NULL;

-- Global approvals log / actions
CREATE TABLE approval_actions (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- approve | reject | override_approve | override_reject | delegate
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_actions_expense ON approval_actions(expense_id);

-- Exchange rates store (cached)
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency CHAR(3) NOT NULL,
  rates JSONB NOT NULL, -- { "USD":1.0, "EUR":0.9, ...}
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_exchange_base ON exchange_rates(base_currency);
CREATE INDEX idx_exchange_fetched ON exchange_rates(fetched_at);

-- Notifications (simple)
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INT,
  type TEXT,
  title TEXT,
  message TEXT,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INT,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Insert default roles
INSERT INTO roles (name) VALUES ('admin'), ('manager'), ('employee');

-- Comments
COMMENT ON TABLE companies IS 'Stores company/organization information';
COMMENT ON TABLE users IS 'User accounts with role-based access';
COMMENT ON TABLE expenses IS 'Main expense claims table';
COMMENT ON TABLE approval_rules IS 'Configurable approval workflow rules';
COMMENT ON TABLE approval_steps IS 'Instances of approval steps for each expense';
COMMENT ON TABLE exchange_rates IS 'Cached currency exchange rates';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all system actions';

