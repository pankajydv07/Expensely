-- Sample Approval Workflows
-- Run this after approval_workflow_schema.sql

-- Sample Workflow 1: Simple Manager → Admin Flow
INSERT INTO approval_workflows (company_id, name, description, is_active) VALUES
((SELECT id FROM companies WHERE name = 'Acme Corporation'), 'Manager-Admin Approval', 'Manager approval followed by Admin approval', true),
((SELECT id FROM companies WHERE name = 'TechStart India'), 'Standard Approval Flow', 'Standard approval process for TechStart', true);

-- Sample Workflow 2: Multi-step approval (Manager → Finance → Director)
INSERT INTO approval_workflows (company_id, name, description, is_active) VALUES
((SELECT id FROM companies WHERE name = 'Acme Corporation'), 'Multi-Level Approval', 'Manager → Finance → Director approval flow', true);

-- Get workflow IDs for reference
-- Workflow Steps for Manager-Admin Approval (Acme Corporation)
INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_role_id, is_manager_required) VALUES
((SELECT id FROM approval_workflows WHERE name = 'Manager-Admin Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 1, 'Manager Approval', 'role', 2, true),
((SELECT id FROM approval_workflows WHERE name = 'Manager-Admin Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 2, 'Admin Final Approval', 'role', 1, false);

-- Workflow Steps for Multi-Level Approval
INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_role_id, is_manager_required) VALUES
((SELECT id FROM approval_workflows WHERE name = 'Multi-Level Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 1, 'Manager Approval', 'role', 2, true),
((SELECT id FROM approval_workflows WHERE name = 'Multi-Level Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 2, 'Finance Approval', 'role', 2, false),
((SELECT id FROM approval_workflows WHERE name = 'Multi-Level Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 3, 'Director Approval', 'role', 1, false);

-- Workflow Conditions
-- Percentage rule: 60% approval required
INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required) VALUES
((SELECT id FROM approval_workflows WHERE name = 'Multi-Level Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 'percentage', 60.00);

-- Specific approver rule: Admin can auto-approve
INSERT INTO workflow_conditions (workflow_id, condition_type, specific_approver_id, auto_approve_on_specific) VALUES
((SELECT id FROM approval_workflows WHERE name = 'Manager-Admin Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')), 
 'specific_approver', (SELECT id FROM users WHERE email = 'admin@acme.com'), true);

-- Workflow Rules (Amount-based assignment)
-- Low amounts (< $500): Simple Manager-Admin flow
INSERT INTO workflow_rules (company_id, workflow_id, min_amount, max_amount, currency, is_active) VALUES
((SELECT id FROM companies WHERE name = 'Acme Corporation'),
 (SELECT id FROM approval_workflows WHERE name = 'Manager-Admin Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')),
 0, 500, 'USD', true);

-- High amounts (>= $500): Multi-level approval
INSERT INTO workflow_rules (company_id, workflow_id, min_amount, max_amount, currency, is_active) VALUES
((SELECT id FROM companies WHERE name = 'Acme Corporation'),
 (SELECT id FROM approval_workflows WHERE name = 'Multi-Level Approval' AND company_id = (SELECT id FROM companies WHERE name = 'Acme Corporation')),
 500, NULL, 'USD', true);

-- Similar rules for TechStart India (in INR)
INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_role_id, is_manager_required) VALUES
((SELECT id FROM approval_workflows WHERE name = 'Standard Approval Flow' AND company_id = (SELECT id FROM companies WHERE name = 'TechStart India')), 
 1, 'Manager Approval', 'role', 2, true),
((SELECT id FROM approval_workflows WHERE name = 'Standard Approval Flow' AND company_id = (SELECT id FROM companies WHERE name = 'TechStart India')), 
 2, 'Admin Approval', 'role', 1, false);

INSERT INTO workflow_rules (company_id, workflow_id, min_amount, max_amount, currency, is_active) VALUES
((SELECT id FROM companies WHERE name = 'TechStart India'),
 (SELECT id FROM approval_workflows WHERE name = 'Standard Approval Flow' AND company_id = (SELECT id FROM companies WHERE name = 'TechStart India')),
 0, NULL, 'INR', true);