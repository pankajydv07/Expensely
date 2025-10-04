-- Enhanced approval workflow schema for percentage, specific approver, and hybrid rules
-- This migration adds support for advanced approval rules

-- Update workflow_conditions table to support all rule types
ALTER TABLE workflow_conditions 
DROP CONSTRAINT IF EXISTS workflow_conditions_condition_type_check;

ALTER TABLE workflow_conditions 
ADD CONSTRAINT workflow_conditions_condition_type_check 
CHECK (condition_type IN ('percentage', 'specific_approver', 'hybrid', 'sequential'));

-- Add new columns for hybrid and enhanced rules
ALTER TABLE workflow_conditions 
ADD COLUMN IF NOT EXISTS minimum_approvals INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS require_all_steps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_auto_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Update workflow_steps table to support percentage calculation
ALTER TABLE workflow_steps
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 1.0;

-- Create a new table for approval progress tracking
CREATE TABLE IF NOT EXISTS approval_progress (
    id SERIAL PRIMARY KEY,
    expense_workflow_id INT NOT NULL REFERENCES expense_workflows(id) ON DELETE CASCADE,
    total_approvers INTEGER NOT NULL DEFAULT 0,
    approved_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    approval_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT false,
    completion_type VARCHAR(50), -- 'percentage', 'specific_approver', 'all_approved', 'rejected'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approval_progress_expense_workflow ON approval_progress(expense_workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_progress_percentage ON approval_progress(approval_percentage);
CREATE INDEX IF NOT EXISTS idx_workflow_conditions_type ON workflow_conditions(condition_type);

-- Add function to calculate approval progress
CREATE OR REPLACE FUNCTION calculate_approval_progress(expense_workflow_id_param INT) 
RETURNS TABLE (
    total_approvers INTEGER,
    approved_count INTEGER,
    rejected_count INTEGER,
    pending_count INTEGER,
    approval_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_approvers,
        COUNT(CASE WHEN wa.status = 'approved' THEN 1 END)::INTEGER as approved_count,
        COUNT(CASE WHEN wa.status = 'rejected' THEN 1 END)::INTEGER as rejected_count,
        COUNT(CASE WHEN wa.status = 'pending' THEN 1 END)::INTEGER as pending_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(CASE WHEN wa.status = 'approved' THEN 1 END) * 100.0 / COUNT(*)), 2)
            ELSE 0.00 
        END as approval_percentage
    FROM workflow_approvals wa
    WHERE wa.expense_workflow_id = expense_workflow_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update approval progress automatically
CREATE OR REPLACE FUNCTION update_approval_progress() 
RETURNS TRIGGER AS $$
DECLARE
    progress_data RECORD;
    workflow_conditions_data RECORD;
    should_complete BOOLEAN := false;
    completion_type_val VARCHAR(50) := null;
BEGIN
    -- Calculate current progress
    SELECT * INTO progress_data 
    FROM calculate_approval_progress(NEW.expense_workflow_id);
    
    -- Get workflow conditions
    SELECT wc.* INTO workflow_conditions_data
    FROM workflow_conditions wc
    JOIN expense_workflows ew ON ew.workflow_id = wc.workflow_id
    WHERE ew.id = NEW.expense_workflow_id
    LIMIT 1;
    
    -- Check completion conditions
    IF workflow_conditions_data IS NOT NULL THEN
        CASE workflow_conditions_data.condition_type
            WHEN 'percentage' THEN
                IF progress_data.approval_percentage >= workflow_conditions_data.percentage_required THEN
                    should_complete := true;
                    completion_type_val := 'percentage';
                END IF;
            WHEN 'specific_approver' THEN
                IF NEW.status = 'approved' AND NEW.approver_id = workflow_conditions_data.specific_approver_id THEN
                    should_complete := true;
                    completion_type_val := 'specific_approver';
                END IF;
            WHEN 'hybrid' THEN
                -- Check if percentage OR specific approver condition is met
                IF progress_data.approval_percentage >= workflow_conditions_data.percentage_required 
                   OR (NEW.status = 'approved' AND NEW.approver_id = workflow_conditions_data.specific_approver_id) THEN
                    should_complete := true;
                    completion_type_val := 'hybrid';
                END IF;
            ELSE -- sequential or default
                IF progress_data.pending_count = 0 AND progress_data.approved_count > 0 THEN
                    should_complete := true;
                    completion_type_val := 'all_approved';
                END IF;
        END CASE;
    END IF;
    
    -- Check for rejection
    IF progress_data.rejected_count > 0 THEN
        should_complete := true;
        completion_type_val := 'rejected';
    END IF;
    
    -- Update or insert approval progress
    INSERT INTO approval_progress (
        expense_workflow_id,
        total_approvers,
        approved_count,
        rejected_count,
        pending_count,
        approval_percentage,
        is_completed,
        completion_type
    ) VALUES (
        NEW.expense_workflow_id,
        progress_data.total_approvers,
        progress_data.approved_count,
        progress_data.rejected_count,
        progress_data.pending_count,
        progress_data.approval_percentage,
        should_complete,
        completion_type_val
    )
    ON CONFLICT (expense_workflow_id) DO UPDATE SET
        total_approvers = EXCLUDED.total_approvers,
        approved_count = EXCLUDED.approved_count,
        rejected_count = EXCLUDED.rejected_count,
        pending_count = EXCLUDED.pending_count,
        approval_percentage = EXCLUDED.approval_percentage,
        is_completed = EXCLUDED.is_completed,
        completion_type = EXCLUDED.completion_type,
        updated_at = NOW();
    
    -- Update expense status if workflow is completed
    IF should_complete THEN
        IF completion_type_val = 'rejected' THEN
            UPDATE expenses SET status = 'rejected' WHERE id = (
                SELECT expense_id FROM expense_workflows WHERE id = NEW.expense_workflow_id
            );
            UPDATE expense_workflows SET status = 'rejected', completed_at = NOW() 
            WHERE id = NEW.expense_workflow_id;
        ELSE
            UPDATE expenses SET status = 'approved' WHERE id = (
                SELECT expense_id FROM expense_workflows WHERE id = NEW.expense_workflow_id
            );
            UPDATE expense_workflows SET status = 'approved', completed_at = NOW() 
            WHERE id = NEW.expense_workflow_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic progress updates
DROP TRIGGER IF EXISTS trigger_update_approval_progress ON workflow_approvals;
CREATE TRIGGER trigger_update_approval_progress
    AFTER INSERT OR UPDATE OF status ON workflow_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_progress();

-- Add unique constraint to approval_progress
ALTER TABLE approval_progress DROP CONSTRAINT IF EXISTS unique_expense_workflow_progress;
ALTER TABLE approval_progress ADD CONSTRAINT unique_expense_workflow_progress 
UNIQUE (expense_workflow_id);

-- Insert sample workflow conditions for testing
-- Percentage rule: 60% approval required
INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required, minimum_approvals)
SELECT w.id, 'percentage', 60.00, 2
FROM approval_workflows w 
WHERE w.name = 'Multi-Level Approval' 
AND NOT EXISTS (
    SELECT 1 FROM workflow_conditions wc WHERE wc.workflow_id = w.id
);

-- Specific approver rule: Admin auto-approval
INSERT INTO workflow_conditions (workflow_id, condition_type, specific_approver_id, auto_approve_on_specific, allow_auto_approval)
SELECT w.id, 'specific_approver', u.id, true, true
FROM approval_workflows w 
CROSS JOIN users u
WHERE w.name = 'Manager-Admin Approval' 
AND u.email = 'admin@acme.com'
AND NOT EXISTS (
    SELECT 1 FROM workflow_conditions wc WHERE wc.workflow_id = w.id
);

-- Hybrid rule: 60% OR CFO approval (using admin as CFO for demo)
INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required, specific_approver_id, auto_approve_on_specific, allow_auto_approval)
SELECT w.id, 'hybrid', 60.00, u.id, true, true
FROM approval_workflows w 
CROSS JOIN users u
WHERE w.name LIKE '%approval%' 
AND u.email = 'admin@acme.com'
AND w.company_id = 1
AND NOT EXISTS (
    SELECT 1 FROM workflow_conditions wc WHERE wc.workflow_id = w.id AND wc.condition_type = 'hybrid'
)
LIMIT 1;

COMMENT ON TABLE approval_progress IS 'Tracks approval progress and percentages for each expense workflow';
COMMENT ON FUNCTION calculate_approval_progress IS 'Calculates real-time approval progress statistics';
COMMENT ON FUNCTION update_approval_progress IS 'Automatically updates approval progress and completes workflows based on rules';