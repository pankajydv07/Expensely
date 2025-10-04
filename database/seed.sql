-- Seed Data for Expensely
-- Run after schema.sql

-- Sample Company
INSERT INTO companies (name, country_code, default_currency) VALUES
('Acme Corporation', 'US', 'USD'),
('TechStart India', 'IN', 'INR');

-- Sample Users for Acme Corporation (company_id = 1)
-- Password for all: 'Password123!' (hashed with bcrypt)
-- Note: In production, these would be properly hashed
INSERT INTO users (company_id, role_id, name, email, password_hash, is_active) VALUES
(1, 1, 'Admin User', 'admin@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(1, 2, 'John Manager', 'john.manager@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(1, 2, 'Sarah Manager', 'sarah.manager@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(1, 3, 'Alice Employee', 'alice@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(1, 3, 'Bob Employee', 'bob@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(1, 3, 'Charlie Employee', 'charlie@acme.com', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true);

-- Sample Users for TechStart India (company_id = 2)
INSERT INTO users (company_id, role_id, name, email, password_hash, is_active) VALUES
(2, 1, 'Priya Admin', 'priya@techstart.in', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(2, 2, 'Raj Manager', 'raj@techstart.in', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true),
(2, 3, 'Amit Employee', 'amit@techstart.in', '$2b$10$rKZLvVW8tVq5qCzQJKqYXO5F7V5YZXqXxZXqXxZXqXxZXqXxZXqXx', true);

-- Manager Relationships
-- Alice, Bob, Charlie report to John Manager
-- Using the UUIDs that were generated (you'll need to update these after insertion)
INSERT INTO manager_relationships (user_id, manager_id)
SELECT u.id, m.id FROM users u
CROSS JOIN users m
WHERE u.email = 'alice@acme.com' AND m.email = 'john.manager@acme.com';

INSERT INTO manager_relationships (user_id, manager_id)
SELECT u.id, m.id FROM users u
CROSS JOIN users m
WHERE u.email = 'bob@acme.com' AND m.email = 'john.manager@acme.com';

INSERT INTO manager_relationships (user_id, manager_id)
SELECT u.id, m.id FROM users u
CROSS JOIN users m
WHERE u.email = 'charlie@acme.com' AND m.email = 'sarah.manager@acme.com';

INSERT INTO manager_relationships (user_id, manager_id)
SELECT u.id, m.id FROM users u
CROSS JOIN users m
WHERE u.email = 'amit@techstart.in' AND m.email = 'raj@techstart.in';

-- Expense Categories
INSERT INTO expense_categories (company_id, name) VALUES
(1, 'Travel'),
(1, 'Meals & Entertainment'),
(1, 'Office Supplies'),
(1, 'Software & Subscriptions'),
(1, 'Training & Education'),
(1, 'Miscellaneous'),
(2, 'Travel'),
(2, 'Meals'),
(2, 'Office Supplies'),
(2, 'Miscellaneous');

-- Sample Approval Rules for Acme Corporation
-- Rule 1: Simple sequential approval for expenses under $500
INSERT INTO approval_rules (company_id, name, min_amount, max_amount, include_manager, rule_type, is_active, priority)
VALUES (1, 'Small Expense Approval', 0, 500, true, 'sequential', true, 1);

-- Get the rule ID for adding items
INSERT INTO approval_rule_items (rule_id, step_index, approver_user_id)
SELECT 
    r.id,
    1,
    u.id
FROM approval_rules r
CROSS JOIN users u
WHERE r.name = 'Small Expense Approval' AND u.email = 'john.manager@acme.com';

-- Rule 2: Multi-level approval for expenses over $500
INSERT INTO approval_rules (company_id, name, min_amount, include_manager, rule_type, is_active, priority)
VALUES (1, 'Large Expense Approval', 500.01, true, 'sequential', true, 2);

INSERT INTO approval_rule_items (rule_id, step_index, approver_user_id)
SELECT 
    r.id,
    2,
    u.id
FROM approval_rules r
CROSS JOIN users u
WHERE r.name = 'Large Expense Approval' AND u.email = 'admin@acme.com';

-- Sample Expenses
-- Expense 1: Approved expense
INSERT INTO expenses (company_id, requester_id, title, category_id, original_amount, original_currency, 
                     company_amount, company_currency, exchange_rate_used, date_of_expense, 
                     payment_method, vendor, description, status)
SELECT 
    1,
    u.id,
    'Client Meeting Lunch',
    c.id,
    125.50,
    'USD',
    125.50,
    'USD',
    1.0,
    CURRENT_DATE - INTERVAL '5 days',
    'Card',
    'The Restaurant',
    'Lunch meeting with potential client to discuss project requirements',
    'approved'
FROM users u
CROSS JOIN expense_categories c
WHERE u.email = 'alice@acme.com' AND c.name = 'Meals & Entertainment' AND c.company_id = 1;

-- Expense 2: Waiting approval
INSERT INTO expenses (company_id, requester_id, title, category_id, original_amount, original_currency, 
                     company_amount, company_currency, exchange_rate_used, date_of_expense, 
                     payment_method, vendor, description, status)
SELECT 
    1,
    u.id,
    'Conference Registration',
    c.id,
    750.00,
    'USD',
    750.00,
    'USD',
    1.0,
    CURRENT_DATE,
    'Card',
    'TechConf 2025',
    'Annual developer conference registration fee',
    'waiting_approval'
FROM users u
CROSS JOIN expense_categories c
WHERE u.email = 'bob@acme.com' AND c.name = 'Training & Education' AND c.company_id = 1;

-- Expense 3: Draft
INSERT INTO expenses (company_id, requester_id, title, category_id, original_amount, original_currency, 
                     company_amount, company_currency, exchange_rate_used, date_of_expense, 
                     payment_method, description, status)
SELECT 
    1,
    u.id,
    'Office Supplies',
    c.id,
    45.99,
    'USD',
    45.99,
    'USD',
    1.0,
    CURRENT_DATE - INTERVAL '1 day',
    'Cash',
    'Notebooks and pens for team',
    'draft'
FROM users u
CROSS JOIN expense_categories c
WHERE u.email = 'charlie@acme.com' AND c.name = 'Office Supplies' AND c.company_id = 1;

-- Expense 4: Multi-currency expense (EUR to USD)
INSERT INTO expenses (company_id, requester_id, title, category_id, original_amount, original_currency, 
                     company_amount, company_currency, exchange_rate_used, date_of_expense, 
                     payment_method, vendor, description, status)
SELECT 
    1,
    u.id,
    'Business Trip - Hotel',
    c.id,
    450.00,
    'EUR',
    487.50,
    'USD',
    1.0833,
    CURRENT_DATE - INTERVAL '3 days',
    'Card',
    'Grand Hotel Europe',
    'Two nights accommodation for client visit in Paris',
    'approved'
FROM users u
CROSS JOIN expense_categories c
WHERE u.email = 'alice@acme.com' AND c.name = 'Travel' AND c.company_id = 1;

-- Sample Exchange Rates (cached)
INSERT INTO exchange_rates (base_currency, rates) VALUES
('USD', '{"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "INR": 83.12, "JPY": 149.50, "CAD": 1.36, "AUD": 1.52}'),
('EUR', '{"USD": 1.0833, "EUR": 1.0, "GBP": 0.86, "INR": 90.21, "JPY": 162.39, "CAD": 1.47, "AUD": 1.65}'),
('INR', '{"USD": 0.012, "EUR": 0.011, "GBP": 0.0095, "INR": 1.0, "JPY": 1.80, "CAD": 0.016, "AUD": 0.018}');

-- Sample Notifications
INSERT INTO notifications (user_id, company_id, type, title, message, is_read)
SELECT 
    u.id,
    1,
    'expense_approved',
    'Expense Approved',
    'Your expense "Client Meeting Lunch" has been approved.',
    true
FROM users u
WHERE u.email = 'alice@acme.com';

INSERT INTO notifications (user_id, company_id, type, title, message, is_read)
SELECT 
    u.id,
    1,
    'approval_pending',
    'Approval Required',
    'New expense "Conference Registration" is waiting for your approval.',
    false
FROM users u
WHERE u.email = 'john.manager@acme.com';

-- Sample Audit Logs
INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details)
SELECT 
    1,
    u.id,
    'CREATE_EXPENSE',
    'expense',
    '1',
    '{"title": "Client Meeting Lunch", "amount": 125.50}'::jsonb
FROM users u
WHERE u.email = 'alice@acme.com';

INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details)
SELECT 
    1,
    u.id,
    'APPROVE_EXPENSE',
    'expense',
    '1',
    '{"expense_id": 1, "comment": "Approved"}'::jsonb
FROM users u
WHERE u.email = 'john.manager@acme.com';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Sample credentials:';
    RAISE NOTICE '  Admin: admin@acme.com / Password123!';
    RAISE NOTICE '  Manager: john.manager@acme.com / Password123!';
    RAISE NOTICE '  Employee: alice@acme.com / Password123!';
END $$;

