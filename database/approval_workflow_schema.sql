-- Advanced Approval Workflow Schema
-- This adds multi-level approval workflows with conditional rules

-- Approval workflow templates (created by admin)
CREATE TABLE approval_workflows (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow steps (sequence of approvers)
CREATE TABLE workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    approver_type VARCHAR(50) NOT NULL CHECK (approver_type IN ('user', 'role', 'manager')),
    approver_id UUID, -- References users.id when approver_type = 'user'
    approver_role_id INTEGER, -- References roles.id when approver_type = 'role'
    is_manager_required BOOLEAN DEFAULT false, -- When true, requires manager approval
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow conditions (percentage, specific approver, hybrid rules)
CREATE TABLE workflow_conditions (
    id SERIAL PRIMARY KEY,
    workflow_id INT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('percentage', 'specific_approver', 'hybrid')),
    percentage_required DECIMAL(5,2), -- For percentage rule (e.g., 60.00)
    specific_approver_id UUID REFERENCES users(id), -- For specific approver rule
    auto_approve_on_specific BOOLEAN DEFAULT false, -- Auto-approve if specific approver approves
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Amount-based workflow assignment rules
CREATE TABLE workflow_rules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    workflow_id INT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    min_amount DECIMAL(15,2) DEFAULT 0,
    max_amount DECIMAL(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category_id INT REFERENCES expense_categories(id), -- Optional: specific to category
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense workflow instances (tracks workflow for each expense)
CREATE TABLE expense_workflows (
    id SERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    workflow_id INT NOT NULL REFERENCES approval_workflows(id),
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual step approvals within a workflow
CREATE TABLE workflow_approvals (
    id SERIAL PRIMARY KEY,
    expense_workflow_id INT NOT NULL REFERENCES expense_workflows(id) ON DELETE CASCADE,
    step_id INT NOT NULL REFERENCES workflow_steps(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comment TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced approval_actions table to support workflow steps
ALTER TABLE approval_actions ADD COLUMN IF NOT EXISTS workflow_step_id INT REFERENCES workflow_steps(id);
ALTER TABLE approval_actions ADD COLUMN IF NOT EXISTS step_number INTEGER;

-- Add workflow reference to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS workflow_id INT REFERENCES approval_workflows(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS current_workflow_step INTEGER DEFAULT 1;

-- Indexes for better performance
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_step_number ON workflow_steps(workflow_id, step_number);
CREATE INDEX idx_workflow_conditions_workflow_id ON workflow_conditions(workflow_id);
CREATE INDEX idx_workflow_rules_company_amount ON workflow_rules(company_id, min_amount, max_amount);
CREATE INDEX idx_expense_workflows_expense_id ON expense_workflows(expense_id);
CREATE INDEX idx_expense_workflows_status ON expense_workflows(status);
CREATE INDEX idx_workflow_approvals_expense_workflow ON workflow_approvals(expense_workflow_id);
CREATE INDEX idx_workflow_approvals_approver_status ON workflow_approvals(approver_id, status);

-- Sample approval workflows (to be inserted after the schema is created)
-- This will be in a separate seed file