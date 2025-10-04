---
applyTo: '**'
---

# 📌 Project Description: Expense Management System

## 1. Problem Statement

Organizations often face inefficiencies in manual expense reimbursement processes. These processes are **time-consuming, error-prone, and lack transparency**, leading to delayed settlements and difficulty in monitoring. Companies need a **streamlined digital solution** that provides:

* Configurable approval flows based on thresholds.
* Multi-level approvals with sequence management.
* Flexible and conditional approval rules.

---

## 2. Core Features

### 🔑 Authentication & User Management

* On **first signup/login**, a new **company** is automatically created with the selected country’s currency set as the **default company currency**.
* An **Admin user** is auto-created at signup.
* Admin capabilities:

  * Create **Employees** and **Managers**.
  * Assign and change **roles** (Employee / Manager).
  * Define **manager relationships** for employees.

---

### 🧑‍💼 Employee View

* Employees can:

  * Submit **expense claims** including:

    * Amount (can be in any currency).
    * Description, Category, Date.
    * Payment method (e.g., Cash, Card, UPI).
  * Upload receipts manually **or via OCR** (receipt scanned, fields auto-extracted: amount, date, description, vendor name, expense type).
  * Track expense request statuses (**Draft → Waiting Approval → Approved/Rejected**).
  * View **expense history** (approved, rejected, pending).

---

### 👨‍💼 Manager View

* Managers can:

  * View all **expenses awaiting approval**.
  * Approve or reject with **comments**.
  * View **team expenses** in company’s default currency.
  * Escalate or pass expense based on rules.
* Once approved/rejected, the **status updates** in employee’s expense dashboard.

---

### 🛠️ Admin View

* Define **approval rules**:

  * **Sequential rules** – e.g., Manager → Finance → Director.
  * **Conditional rules**:

    * **Percentage rule** (e.g., 60% approvers must approve).
    * **Specific approver rule** (e.g., CFO approval auto-approves request).
    * **Hybrid rule** (combination of both).
* Set **minimum approval percentage** required for request approval.
* Override approvals if needed.
* Manage users, roles, and company-wide settings.

---

## 3. Workflow Example

1. **Employee submits** an expense (e.g., $100 for travel, paid in EUR).
2. Expense is converted to **company’s default currency** (via exchange rate API).
3. Expense enters approval flow:

   * Step 1: Manager approval.
   * Step 2: Finance approval.
   * Step 3: Director approval.
4. Once approved/rejected, employee’s status updates accordingly.

---

## 4. System Integrations

* **Country & Currency API** → `https://restcountries.com/v3.1/all?fields=name,currencies`
* **Currency Conversion API** → `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
* **OCR for Receipts** → Auto-reads receipts to generate expense entries.

---

## 5. Roles & Permissions

* **Admin**

  * Create company (auto on signup).
  * Manage users, assign roles.
  * Configure approval rules.
  * View and override all expenses.

* **Manager**

  * Approve/reject expenses.
  * View team expenses.
  * Escalate approvals.

* **Employee**

  * Submit and track expenses.
  * Upload receipts (manual or OCR).
  * View status of requests.


---

# 1. Wireframes — page-by-page details + schema

Each page includes: purpose, components, data shown, interactions, validation, and transitions.

---

## 1.1 Auth: Signup / Login / Forgot password

**Purpose:** Create company + admin (on first signup), authenticate users.

**Signup page**

* Fields: Company name (text), Country (dropdown, `restcountries` list), Admin name, Admin email, Password, Confirm password.
* UX notes:

  * On submit: create `company` record with default currency from selected country, create admin user (role = `admin`), send verification email.
  * Validate password strength, email format, unique company name + admin email.
  * Show "Company currency: EUR (auto-set)" after country selection.
* States: loading, success (redirect to onboarding/admin dashboard), error.

**Login page**

* Fields: Email, Password, Remember me checkbox.
* Links: Forgot password, Sign up.
* States: invalid credentials, locked account.

**Forgot password**

* Field: Email -> send reset link.
* Reset page: New password + confirm.

---

## 1.2 Employee Dashboard (Main)

**Purpose:** Employees submit expenses, view status & history.

**Top region (header):**

* Company name, user avatar, currency badge (company default), quick actions: New Expense, Upload Receipt (OCR).

**Main sections (tabbed):**

1. **My Expenses (table)**

   * Columns: Date submitted, Category, Description, Amount (original currency), Company Amount, Status (Draft / Waiting Approval / Approved / Rejected), Current approver (if waiting), Actions (View, Edit if Draft, Cancel).
   * Sorting: date, amount, status.
   * Filters: date range, status, category, min/max amount.
   * Row actions open expense details modal.

2. **Create New Expense**

   * Button / FAB -> navigates to Expense Submission page/modal.

3. **Upload Receipt (OCR)**

   * Drag & drop / choose file, optional camera capture.
   * On upload: OCR attempt to pre-fill fields (amount, date, vendor, category suggestions). Allow user to edit before saving.
   * Show confidence score from OCR.

4. **Notifications / Activity feed**

   * Status changes, approval comments.

**Validations**

* If editing Draft: cannot change once submitted.
* Amount must be > 0; date <= today.
* If currency ≠ company currency, show exchange rate preview and company converted amount.

---

## 1.3 Expense Submission page / modal (employee)

**Purpose:** Add / submit single expense with attachments.

**Top:** Breadcrumb (Dashboard > New Expense) or modal header: Draft → Waiting Approval → Approved.

**Form fields:**

* Title / Short description (optional)
* Category (dropdown: Travel, Meals, Office, Misc, etc; admin configurable)
* Amount (number) + Currency (dropdown; default = user/company currency or detect via OCR)
* Date (date picker)
* Payment method (Cash / Card / Bank Transfer / Other)
* Vendor (text) — prefilled by OCR if present
* Detailed description / notes (textarea)
* Attachments: receipts (multiple). Show thumbnails, upload status, allow rotate/crop.
* Expense lines (optional): allow split among categories or projects.
* Submit button + Save Draft + Cancel.

**On Submit:**

* Validate required fields.
* Calculate converted amount using latest exchange rate; store both original and converted values.
* Create approval workflow instance (see Approval Flow below).
* Notify first approver(s).

**UX details**

* Preview of how approval flow will look (sequence + approver names).
* If category threshold triggers a separate flow (e.g., > $1000), show warning.

---

## 1.4 Expense Details (View) — employee or manager

**Purpose:** See full expense, attachments, approvals history, comments.

**Left panel:** expense metadata (ID, submitter, date, original amount + currency, company amount, category, payment method, vendor).

**Center:** attachments viewer with ability to open full-size, download.

**Right:** Approval timeline:

* Step 1: Manager → Approved/Rejected + timestamp + comment + approver name.
* Step 2 etc.
* If conditional rule used, show rule reason (e.g., “Approved by CFO — specific approver rule triggered”).
* Actions: if current user is approver, show Approve / Reject buttons (open modal to enter comment). If admin with override rights, show Override approve/reject toggle plus comment.

**Footer:** audit logs (who viewed, who acted, times).

---

## 1.5 Manager Dashboard (Approvals)

**Purpose:** Managers/approvers process pending approvals.

**Sections:**

* **Approvals to Review (table)**: columns: Requester, Category, Date, Orig Amount (currency), Company Amount, Current Step (Manager / Finance), Deadline (SLA), Action (Approve / Reject / View).
* Bulk actions: Approve selected / Reject selected (with comment).
* Filter: team members, status, category, amount range.
* Search: by requester, description, vendor.

**Approval modal**

* Show expense details + attachments + converted amount + prior comments.
* Approve / Reject with optional comment.
* For sequential flows: after action, if approved, create next approval task for next step user(s); if rejected, mark as Rejected and notify employee.

**Manager-specific features**

* View team expenses aggregated (month-to-date spend).
* Escalation option if not responded after SLA.

---

## 1.6 Admin Panel

**Purpose:** Company-wide setup: users, roles, approvals rules, categories, currency settings.

**Left nav:** Users, Teams, Approval Rules, Categories, Company Settings, Audit Logs.

**Users page**

* Table: Name, Email, Role (Admin/Manager/Employee), Manager (FK), Status, Actions (Edit, Reset password, Disable).
* Create user form: name, email, role, manager assignment, send invite checkbox.
* Manager mapping: ability to bulk import manager relationships (CSV).

**Approval Rules page**

* List of rules, create rule modal.
* Rule types:

  * **Sequential** — explicit ordered approvers (user IDs or roles).
  * **Conditional** — percentage / specific approver / hybrid.
* Rule builder UI:

  * Name, Applies to (category, amount range, department), Is manager approver checked (boolean — whether manager is included).
  * Approver sequence: drag-and-drop list of approvers (users or role placeholders eg `Finance` role).
  * Condition section:

    * Percentage: threshold value (e.g., 60%).
    * Specific approver: select user(s) with rule effect.
    * Hybrid: combine (UI shows OR/AND logic).
  * Minimum approval percentage field (0–100).
  * Save/Activate toggle.
* Preview: simulated approval result (test with 3 approvers show 2 approvals = 66% => approved if threshold 60%).
* Rule priority ordering if multiple rules apply.

**Company Settings**

* Base currency override, default country, currency API key config, OCR settings, SLA times.

---

## 1.7 Admin — Approvals View (for monitoring)

**Purpose:** Admin monitors approver queues across company.

**Components**

* Large table showing all pending approvals with columns: Req ID, Submitter, Category, Company Amount, Current approver(s), Time in queue, Rule name, Actions.
* Bulk reassign approvers, override request, view approval timeline.

---

## 1.8 Misc pages & components

* **Notifications center**
* **User profile / settings**: set preferred currency display (optional), change password, email preferences.
* **Reports**: monthly spend by category, by employee, pending reimbursements, export to CSV/PDF.
* **Audit log**: fine-grained record of actions.

---

# 2. Approval workflow (conceptual)

* Expense → evaluation of rules applicable (based on category, amount range, explicit rule)
* If rule says “Is manager approver” and employee has manager set, manager is the first approver.
* Sequential: approval tasks generated one at a time in order.
* Parallel conditional: if multiple approvers in same step and percentage rule used — evaluate after approvals/rejections.
* Specific approver: override — if that approver approves, expense is auto-approved regardless of others (if rule set as OR).
* Hybrid: combination e.g., (approved by CFO) OR (>= 60% of approvers approved).

Implementation detail: model both sequence steps and within-step approvers (to support parallel approvals with % rules). See schema below.

---

# 3. SQL Schema (Postgres) — full CREATE TABLEs

I designed for clarity and production-readiness (FKs, indexes). You can adapt types and add partitions later if dataset grows.

```sql
-- Roles table (static)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE -- 'admin','manager','employee'
);

-- Companies
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  country_code TEXT,                 -- e.g., 'IN'
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
  date_of_expense DATE NOT NULL,
  payment_method TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, waiting_approval, approved, rejected, canceled
  current_step INT,                      -- reference to approval_steps.step_index for tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_requester ON expenses(requester_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Expense attachments (receipts)
CREATE TABLE expense_attachments (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  ocr_text TEXT,
  ocr_confidence NUMERIC(5,2),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_rules_company ON approval_rules(company_id);

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

-- Global approvals log / actions
CREATE TABLE approval_actions (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- approve | reject | override_approve | override_reject | delegate
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange rates store (cached)
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency CHAR(3) NOT NULL,
  rates JSONB NOT NULL, -- { "USD":1.0, "EUR":0.9, ...}
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_exchange_base ON exchange_rates(base_currency);

-- Notifications (simple)
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  company_id INT,
  type TEXT,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INT,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

# 4. Schema notes, constraints & indexes

* `expenses.company_amount` stores the converted amount at submission time (freeze rate for audit).
* Approval engine reads `approval_rules` in priority order (implement priority column if multiple rules).
* `approval_rule_items` supports role-based approvers (e.g., `Finance` role) — at runtime resolve current user(s) with that role.
* `approval_steps` + `approval_step_approvers` model supports:

  * Sequential steps: step_index increments 1..N. When a step is `approved`, engine creates next step (or pre-populate all steps at creation).
  * Parallel steps: multiple approvers in same `step_index` -> use `required_percentage` to determine acceptance.
* Use partial indexes on `approval_step_approvers` for fast lookups of pending approvals.

---

# 5. Example flows & key queries

### 5.1 Create approval steps for an expense (pseudocode)

1. Evaluate applicable `approval_rules` (category, amount range, active).
2. If rule.include_manager = true and requester has manager → include manager as approver in step 1.
3. For each `approval_rule_items` in ordered sequence:

   * Add `approval_steps` record with step_index.
   * For each approver item in that step (role or user), populate `approval_step_approvers`.

### 5.2 Check whether a parallel step is approved (percentage rule)

SQL to compute % approvals for a step:

```sql
SELECT
  step.id,
  COUNT(*) FILTER (WHERE asa.decision IS NOT NULL) AS decisions_count,
  COUNT(*) FILTER (WHERE asa.decision = 'approved') AS approvals_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE asa.decision = 'approved') / NULLIF(COUNT(*),0),2) AS approval_pct
FROM approval_steps step
JOIN approval_step_approvers asa ON asa.step_id = step.id
WHERE step.id = :step_id
GROUP BY step.id;
```

Then compare `approval_pct >= step.required_percentage` to mark step as `approved`.

### 5.3 Specific approver override

If `approval_rules.specific_approver_id` exists, and that user approves:

* Immediately mark the whole expense as `approved` (insert approval_action with `action = 'approve'` and set expense.status = 'approved'), regardless of other pending approvals.

Implementation: when processing an approver decision, check:

* if approver_user_id == rule.specific_approver_id AND decision='approved' -> finalize.

### 5.4 Example: Move to next step after current step approved

* On step change to `approved`: find next `approval_steps` record for expense (step_index > current). If none, mark expense `approved`.

---

# 6. Seed / sample data (quick)

```sql
-- roles
INSERT INTO roles (name) VALUES ('admin'),('manager'),('employee');

-- a company
INSERT INTO companies (name,country_code,default_currency) VALUES ('Acme Corp','US','USD');

-- users (sample)
-- consider using gen_random_uuid() or UUIDs from your app
```

---

# 7. Implementation / engineering recommendations

* Use background workers (e.g., Sidekiq, Celery) for:

  * OCR processing,
  * fetching exchange rates,
  * sending notifications,
  * progressing approval steps (e.g., when specific approver action triggers auto-approval).
* Rate-limit exchange rate calls; cache in `exchange_rates`.
* Store file attachments in S3 or object store and store path in `expense_attachments.file_path`.
* Record exchange rate used for each expense for auditing (could add `exchange_rate_used` NUMERIC column).
* Add DB constraints/triggers for immutability of `company_amount` once submitted.
* Add retention/archival policies for audit logs & attachments.

---

# 8. Extra developer helpers (pseudo APIs)

* `POST /api/expenses` -> create expense, returns approval flow preview (show approvers & sequence).
* `POST /api/expenses/{id}/attachments` -> upload and OCR (async).
* `GET /api/approvals/pending` -> returns approver's pending tasks.
* `POST /api/approvals/{stepApproverId}` -> approve/reject with comment.

---

# 9. UX microcopy & helpful tooltips (small but important)

* On submit: “This will start the approval flow — your manager will be notified.”
* On OCR: “Detected amount: ₹1,234.56 (confidence 92%). Edit if incorrect.”
* On rule setup: preview and test button: “Simulate rule on X sample expense”.

---

# 10. Quick checklist for next steps

* Decide: pre-generate `approval_steps` at expense creation vs generate on-the-fly — I recommend pre-generating for simpler audit trail.
* Add webhooks for email/slack notifications to approvers.
* Implement RBAC checks server-side for all approve/reject endpoints.
* Add unit tests for approval logic (edge cases: simultaneous approvals, delegation, specific approver override).




## Product Requirements Document
Expensely - Product Requirements Document

1. Introduction

1.1. Project Overview
Expensely is an Expense Management System designed to streamline the traditionally manual and inefficient process of expense reimbursement within organizations. The system aims to provide a digital solution that automates multi-level approvals, enhances transparency, and reduces errors associated with manual data entry and currency conversions.

1.2. Problem Statement
Organizations frequently encounter inefficiencies with manual expense reimbursement processes, which are time-consuming, error-prone, and lack transparency. This often results in delayed settlements and challenges in monitoring financial outflows. There is a critical need for a streamlined digital solution that offers configurable, multi-level approval flows with flexible and conditional rules to address these pain points.

1.3. Project Goals
*   Automate and digitize the entire expense submission and approval process.
*   Implement configurable approval workflows based on thresholds, sequences, and conditions.
*   Enhance transparency for employees, managers, and administrators regarding expense statuses.
*   Reduce manual errors through features like OCR-based receipt scanning and automated currency conversion.
*   Provide a centralized platform for managing expenses, users, and company settings.

2. User Roles & Personas

The system defines three primary user roles, each with specific permissions and functionalities:

2.1. Admin
The Admin user is automatically created upon the first company signup.
*   Account Creation: Manages users and roles within the company.
*   User Management: Can create Employee and Manager accounts, assign and change user roles, and define manager relationships for employees.
*   Approval Rules Configuration: Defines and manages company-wide approval rules, including sequential, conditional (percentage-based, specific approver, or hybrid) rules. Sets minimum approval percentages.
*   Override Approvals: Has the authority to override any approval decision.
*   Company Settings: Configures company-wide settings such as base currency, default country, currency API keys, OCR settings, and Service Level Agreement (SLA) times.
*   Monitoring: Views all expenses across the company, monitors approval queues, and accesses audit logs.

2.2. Manager
Managers are responsible for reviewing and acting on expense claims submitted by their assigned employees.
*   Expense Approval: Views expenses awaiting approval from their direct reports, with the ability to approve or reject claims, providing comments.
*   Team Overview: Accesses aggregated team expenses, typically displayed in the company's default currency.
*   Escalation: (Post-MVP) Option to escalate or pass an expense based on predefined rules or lack of response.
*   Status Updates: Receives real-time updates on expense statuses.

2.3. Employee
Employees are the primary submitters of expense claims.
*   Expense Submission: Submits expense claims, including details such as amount (in any currency), description, category, date, and payment method (e.g., Cash, Card, UPI).
*   Receipt Upload: Attaches receipts manually or utilizes OCR functionality to scan receipts and auto-extract fields (amount, date, description, vendor name, expense type).
*   Tracking: Monitors the status of their submitted expense requests (Draft → Waiting Approval → Approved/Rejected).
*   History: Views a comprehensive history of all their expenses, categorized by status (approved, rejected, pending).

3. Features & Functionality

3.1. Authentication & User Management
3.1.1. Signup Page
*   Purpose: Allows new companies and their initial Admin user to register.
*   Fields: Company name (text), Country (dropdown, populated from `restcountries` API), Admin name, Admin email, Password, Confirm password.
*   UX Notes:
    *   Upon successful submission: A new `company` record is created with the default currency from the selected country. An Admin user (role='admin') is auto-created. A verification email is sent.
    *   Validation: Enforces password strength, correct email format, and uniqueness of company name and admin email.
    *   Dynamic Display: Shows "Company currency: [CURRENCY_CODE] (auto-set)" after country selection.
*   States: Loading, success (redirect to admin dashboard), error messages for invalid input.

3.1.2. Login Page
*   Purpose: Authenticates existing users.
*   Fields: Email, Password, "Remember me" checkbox.
*   Links: "Forgot password", "Sign up" (for new companies/admins).
*   States: Displays error for invalid credentials, locked accounts.

3.1.3. Forgot Password
*   Purpose: Allows users to reset their password.
*   Flow: User enters email address to receive a password reset link. The reset link directs to a page where the user can set a new password and confirm it.

3.1.4. Admin Panel - User Management
*   Purpose: Admin manages all users within the company.
*   Table: Displays Name, Email, Role (Admin/Manager/Employee), Assigned Manager (Foreign Key), Account Status, and Actions (Edit, Reset password, Disable).
*   Create User Form: Fields for name, email, role assignment. Option to assign a manager. Checkbox to send an invitation email.
*   Manager Mapping: Ability to bulk import manager-employee relationships via CSV.

3.1.5. User Profile / Settings
*   Purpose: Allows individual users to manage their personal settings.
*   Fields: Set preferred currency display (optional), change password, manage email notification preferences.

3.2. Employee Dashboard
3.2.1. Top Region (Header)
*   Displays: Company name, user avatar, company default currency badge.
*   Quick Actions: "New Expense" button, "Upload Receipt" (triggers OCR functionality).

3.2.2. Main Sections (Tabbed)
*   My Expenses (Table View):
    *   Columns: Date submitted, Category, Description, Amount (original currency), Company Amount (converted to company default), Status (Draft / Waiting Approval / Approved / Rejected), Current approver (if applicable), Actions (View, Edit if Draft, Cancel).
    *   Interaction: Columns are sortable (date, amount, status).
    *   Filters: Allows filtering by date range, status, category, and min/max amount.
    *   Row Actions: Clicking on a row opens a detailed expense view modal.
*   Create New Expense:
    *   Action: Button/FAB that navigates to the "Expense Submission" page or opens it as a modal.
*   Upload Receipt (OCR):
    *   Functionality: Supports drag & drop or file selection, with an option for camera capture.
    *   Process: Upon upload, OCR attempts to pre-fill expense fields (amount, date, vendor, category suggestions). User can edit pre-filled data before saving.
    *   Feedback: Displays an OCR confidence score.
*   Notifications / Activity Feed:
    *   Content: Real-time updates on status changes, approval comments, etc.
*   Validations:
    *   "Edit if Draft": Ensures expense details cannot be altered once submitted for approval.
    *   Amount: Must be greater than zero.
    *   Date: Expense date cannot be in the future.
    *   Currency: If original currency differs from company currency, displays an exchange rate preview and the converted company amount.

3.3. Expense Submission Page / Modal (Employee)
3.3.1. Form Fields
*   Title / Short Description (optional).
*   Category: Dropdown list (e.g., Travel, Meals, Office, Misc), configurable by Admin.
*   Amount: Numeric input.
*   Currency: Dropdown, defaults to user/company currency or auto-detected by OCR.
*   Date: Date picker.
*   Payment Method: Dropdown (Cash, Card, Bank Transfer, Other).
*   Vendor: Text field, pre-filled by OCR if available.
*   Detailed Description / Notes: Textarea for additional information.
*   Attachments: Multiple receipt uploads supported. Displays thumbnails, upload status, and allows rotation/cropping.
*   Expense Lines (optional): Allows splitting an expense across different categories or projects.
*   Actions: "Submit" button, "Save Draft" button, "Cancel" button.

3.3.2. On Submit
*   Validation: All required fields must be validated.
*   Currency Conversion: Calculates the converted amount using the latest exchange rate (from Currency Conversion API) and stores both original and converted values.
*   Approval Workflow: Initiates an approval workflow instance based on applicable rules.
*   Notifications: Notifies the first approver(s) in the workflow.

3.3.3. UX Details
*   Approval Flow Preview: Shows a preview of the impending approval flow, including sequence and approver names.
*   Threshold Warnings: Displays warnings if the category or amount threshold triggers a specific, more complex approval flow (e.g., expenses > $1000).

3.4. Expense Details (View) - Employee or Manager
3.4.1. Layout
*   Left Panel: Displays expense metadata (ID, submitter, submission date, original amount + currency, company amount, category, payment method, vendor).
*   Center Panel: Attachments viewer, with options to open full-size image and download.
*   Right Panel: Approval Timeline.

3.4.2. Approval Timeline
*   Details: Each step in the approval flow is listed with approver name, action (Approved/Rejected), timestamp, and any comments.
*   Conditional Rule Display: If a conditional rule was triggered (e.g., "Approved by CFO – specific approver rule triggered"), the reason is shown.
*   Actions:
    *   For Current Approver: "Approve" / "Reject" buttons (opens a modal to enter comments).
    *   For Admin: "Override approve/reject" toggle with a comment field.
*   Footer: Includes audit logs detailing who viewed and who acted on the expense, with timestamps.

3.5. Manager Dashboard (Approvals)
3.5.1. Sections
*   Approvals to Review (Table):
    *   Columns: Requester, Category, Date, Original Amount (with currency), Company Amount, Current Step (e.g., Manager, Finance), Deadline (SLA - post-MVP), Action (Approve / Reject / View).
*   Bulk Actions: Allows managers to "Approve selected" or "Reject selected" expenses simultaneously, with a single comment.
*   Filters: Filters by team members, status, category, and amount range.
*   Search: By requester, description, or vendor.

3.5.2. Approval Modal
*   Content: Displays full expense details, attachments, converted amount, and previous comments.
*   Actions: "Approve" / "Reject" with an optional comment field.
*   Workflow Progression: If approved (and sequential flow), creates the next approval task for the subsequent approver(s). If rejected, marks the expense as "Rejected" and notifies the employee.

3.5.3. Manager-Specific Features
*   Team Expense Aggregation: View aggregated monthly-to-date (MTD) spending for their team.
*   Escalation: (Post-MVP) Option to escalate an approval if it has not been acted upon within SLA.

3.6. Admin Panel
3.6.1. Left Navigation
*   Links to: Users, Teams, Approval Rules, Categories, Company Settings, Audit Logs.

3.6.2. Approval Rules Page
*   Purpose: Admin defines and manages all company approval rules.
*   Display: Lists existing rules. "Create Rule" modal for new rules.
*   Rule Types:
    *   Sequential: Explicitly ordered list of approvers or roles.
    *   Conditional: Percentage-based approval, specific approver approval, or a hybrid combination.
*   Rule Builder UI:
    *   Fields: Name, "Applies to" (category, amount range, department - post-MVP). Boolean toggle for "Is manager approver checked" (to include direct manager).
    *   Approver Sequence: Drag-and-drop interface for ordering approvers (specific user IDs or role placeholders like 'Finance').
    *   Condition Section:
        *   Percentage Rule: Threshold value (e.g., "60% of approvers must approve").
        *   Specific Approver Rule: Select user(s) whose approval auto-approves the request (e.g., "CFO approval auto-approves request").
        *   Hybrid Rule: Combines percentage and specific approver logic (UI for OR/AND).
    *   Minimum Approval Percentage: Field (0-100) for conditional parallel steps.
    *   Actions: "Save" button, "Activate" toggle.
*   Preview: "Simulate rule" button to test rule logic with sample data.
*   Rule Priority: (Post-MVP) Mechanism to order rules if multiple apply to an expense.

3.6.3. Company Settings
*   Purpose: Central configuration for company-wide parameters.
*   Fields: Base currency override, default country, currency API key configuration, OCR settings, SLA times.

3.6.4. Admin - Approvals View (Monitoring)
*   Purpose: Admin monitors all pending approval queues across the entire company.
*   Components: Large table displaying: Request ID, Submitter, Category, Company Amount, Current Approver(s), Time in queue, Rule name, Actions.
*   Actions: Bulk reassign approvers, override a request, view full approval timeline for any expense.

3.6.5. Categories Page
*   Purpose: Admin manages the list of available expense categories that employees can select.
*   Functionality: Create, edit, and delete expense categories.

3.7. Misc Pages & Components
*   Notifications Center: A central location for all user notifications.
*   User Profile / Settings: Allows users to set preferred currency display (optional), change password, and manage email preferences.
*   Reports: (Post-MVP) Advanced reporting capabilities like monthly spend by category/employee, pending reimbursements, and export options (CSV/PDF).
*   Audit Log: (Post-MVP, basic logging for MVP) A fine-grained record of all actions taken within the system for compliance and troubleshooting.

4. Workflow

4.1. Workflow Example (as per Project Description)
1.  **Employee submits** an expense (e.g., $100 for travel, paid in EUR).
2.  Expense is **converted to company’s default currency** (via exchange rate API).
3.  Expense enters **approval flow**:
    *   Step 1: Manager approval.
    *   Step 2: Finance approval.
    *   Step 3: Director approval.
4.  Once approved/rejected, **employee’s status updates** accordingly.

4.2. Approval Workflow (Conceptual & Implementation Detail)
The approval engine dynamically constructs a workflow instance for each expense based on defined rules.

4.2.1. Expense Submission to Workflow Instantiation
*   Upon expense submission, the system evaluates all applicable `approval_rules` based on the expense's category, amount range, and other criteria.
*   If a rule specifies `include_manager = true` and the submitting employee has an assigned manager, the manager is automatically designated as an approver in the first step.
*   For each defined `approval_rule_items` in the determined sequence:
    *   An `approval_steps` record is created with a `step_index`.
    *   For each approver (individual user or role-based placeholder) within that step, `approval_step_approvers` records are populated. This pre-generates the entire approval path for the expense.

4.2.2. Sequential Approval Flow
*   `approval_steps` records are generated with incrementing `step_index` (1, 2, 3...).
*   When all required `approval_step_approvers` within a specific `step_index` have made their decision (and the step's criteria are met, e.g., 100% approval for simple sequential steps), the `approval_steps.status` for that step is updated to 'approved'.
*   The system then automatically creates or activates the tasks for the next `step_index`. If no further steps exist, the overall `expenses.status` is marked 'approved'.

4.2.3. Parallel Conditional Approval Flow
*   If multiple approvers are part of the same `step_index` and a percentage rule is defined (`approval_steps.required_percentage` < 100):
    *   All approvers in that step are notified concurrently.
    *   The step is marked 'approved' once the count of 'approved' decisions reaches or exceeds the `required_percentage` of total approvers for that step.
    *   SQL Query for Percentage Approval Check:
        ```sql
        SELECT
          step.id,
          COUNT(*) FILTER (WHERE asa.decision IS NOT NULL) AS decisions_count,
          COUNT(*) FILTER (WHERE asa.decision = 'approved') AS approvals_count,
          ROUND(100.0 * COUNT(*) FILTER (WHERE asa.decision = 'approved') / NULLIF(COUNT(*),0),2) AS approval_pct
        FROM approval_steps step
        JOIN approval_step_approvers asa ON asa.step_id = step.id
        WHERE step.id = :step_id
        GROUP BY step.id;
        ```
        The computed `approval_pct` is compared against `step.required_percentage`.

4.2.4. Specific Approver Override
*   If an `approval_rules.specific_approver_id` is defined and that designated user approves the expense:
    *   The entire expense is immediately marked 'approved' (by inserting an `approval_actions` record with `action = 'override_approve'` and updating `expenses.status = 'approved'`). This bypasses any remaining pending approvals.
*   This check is performed during the processing of any approver's decision.

4.2.5. Rejection
*   If any approver in the flow rejects an expense, the overall `expenses.status` is immediately set to 'rejected', and the employee is notified. No further approval steps are processed.

5. System Integrations

5.1. Required Integrations (MVP)
*   **Country & Currency API**: `https://restcountries.com/v3.1/all?fields=name,currencies`
    *   Purpose: To populate the country dropdown during company signup and extract the default currency code for the selected country.
*   **Currency Conversion API**: `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
    *   Purpose: To fetch real-time exchange rates for converting original expense amounts to the company's default currency at the time of expense submission.
*   **OCR for Receipts**:
    *   Purpose: To automatically extract key data (amount, date, description, vendor name, expense type) from uploaded receipt images, reducing manual data entry for employees.
    *   Implementation Note: A service like Google Gemini or a similar OCR provider can be used. The API key for this service should be configurable (e.g., via environment variables or company settings).

5.2. Optional / Future Integrations (Post-MVP)
*   **HRIS (Human Resource Information Systems)**: For seamless synchronization of employee data, manager relationships, and roles, reducing manual HR administration.
*   **Accounting Software (QuickBooks, SAP, Xero, etc.)**: To export approved expense data for automated payroll processing, general ledger entries, and financial reconciliation.
*   **Single Sign-On (SSO) Providers / OAuth**: For enterprise-grade authentication via services like Google Workspace, Azure AD, Okta, enhancing security and user convenience.
*   **ERP Systems**: For larger organizations, to integrate expense workflows directly with broader procurement, finance, or project management modules.

6. Data Model / Schema

The system utilizes a PostgreSQL database structure, designed for clarity, data integrity, and production-readiness, including Foreign Keys (FKs) and indexes.

6.1. Key Tables & Relationships
*   `roles`: Static table for 'admin', 'manager', 'employee'.
*   `companies`: Stores company details, including `default_currency`.
*   `users`: Stores user information, linked to `companies` and `roles`. Uses UUID for `id`.
*   `manager_relationships`: Defines direct reporting lines between `users`.
*   `expense_categories`: Admin-configurable expense types, linked to `companies`.
*   `expenses`: Main expense header, linked to `companies`, `users` (requester), `expense_categories`. Stores both `original_amount`/`original_currency` and `company_amount`/`company_currency` at submission time.
*   `expense_attachments`: Stores metadata for uploaded receipts, linked to `expenses`. Includes `file_path` (for object storage), `ocr_text`, and `ocr_confidence`.
*   `approval_rules`: Defines rules for approval flows, linked to `companies` and optionally `expense_categories`. Includes `min_amount`, `max_amount`, `include_manager`, `min_approval_percentage`, `specific_approver_id`, and `rule_type`.
*   `approval_rule_items`: Stores the sequential steps or parallel approvers within an `approval_rule`. Can reference `approver_user_id` or `approver_role_id`.
*   `approval_steps`: Represents an instance of a step in an expense's approval workflow, linked to `expenses`. Tracks `step_index`, `step_type`, `required_percentage`, and `status`.
*   `approval_step_approvers`: Assigns specific `users` as approvers to an `approval_steps` instance. Records `decision`, `comment`, and `decided_at`.
*   `approval_actions`: A global audit log of all approval-related actions (approve, reject, override, delegate), linked to `expenses` and `users`.
*   `exchange_rates`: Caches fetched currency exchange rates.
*   `notifications`: Stores user notifications.
*   `audit_logs`: Comprehensive log of system activities.

6.2. Schema Notes, Constraints & Indexes
*   `expenses.company_amount`: Crucially stores the converted amount using the exchange rate *at the time of submission*. This ensures auditability and immutability for financial reconciliation.
*   Approval Engine Logic: The system evaluates `approval_rules` in a defined priority order (a `priority` column could be added to `approval_rules` for explicit ordering).
*   Role-Based Approvers: `approval_rule_items` supports role-based approvers (e.g., 'Finance' role). At runtime, the system resolves this to the current user(s) holding that role.
*   `approval_steps` & `approval_step_approvers`: This dual-table structure models both sequential steps (incrementing `step_index`) and parallel approvals within a single step (multiple approvers sharing a `step_index`, with `required_percentage` determining step completion).
*   Indexes: Strategic use of indexes (e.g., `idx_users_company`, `idx_expenses_requester`, `idx_expenses_status`, `idx_approval_rules_company`, `idx_rule_items_ruleid`, `ux_approval_steps_expense_step`, `idx_approver_step`) ensures efficient data retrieval, especially for pending approvals and user-specific queries.
*   Exchange Rates: The `exchange_rates` table acts as a cache to minimize external API calls and manage rate limits.

7. Technical Requirements

7.1. Performance & Scalability
*   Anticipated Usage (MVP): The hackathon MVP is designed for small concurrent loads (e.g., 5-10 simultaneous users) and limited daily transaction volumes (20-50 expense submissions).
*   MVP Focus: No specific performance optimization is required for the hackathon. The priority is functional workflow demonstration.
*   Production Scalability: For future phases, the architecture should be designed for scalability, considering potential increases in user base and transaction volumes.
*   Data Retention: MVP requires data for demonstration (~7-14 days). Production environments will require longer retention (1-3 years for audit).

7.2. Security Requirements
*   **Data Encryption**:
    *   At Rest: All sensitive data (user credentials, expense details, attachments) must be encrypted in the database. Passwords must use strong hashing algorithms (e.g., bcrypt, Argon2).
    *   In Transit: All communications between client and server must use HTTPS/TLS to prevent interception and ensure data confidentiality and integrity.
*   **Access Control (RBAC)**:
    *   Strict Role-Based Access Control (RBAC) must be implemented for Admin, Manager, and Employee roles.
    *   Authorization checks must be performed on every API endpoint to ensure users only access and modify data they are permitted to.
*   **Vulnerability Management**:
    *   Input Validation: Implement robust input validation across all user inputs to prevent common vulnerabilities such as SQL injection, Cross-Site Scripting (XSS), and Cross-Site Request Forgery (CSRF).
    *   File Uploads: Limit file attachments to safe formats and sizes. Implement measures to scan uploaded files for malware if possible (post-MVP).
    *   Secure Coding: Follow secure coding practices and perform regular dependency updates to mitigate known vulnerabilities.
*   **Certifications / Audits**:
    *   MVP: No specific security certifications are required for the hackathon.
    *   Production: Compliance with relevant data protection regulations (e.g., GDPR if applicable) and maintenance of detailed internal audit logs are recommended for production.

7.3. Technical Constraints & Compliance
*   **MVP Environment**: For the hackathon MVP, the system should run on a local setup (laptop/desktop) using a local database (e.g., SQLite, MySQL, or PostgreSQL). The backend (e.g., Flask, Django, Node.js) and frontend should also run locally.
*   **API Usage**: External APIs (Currency exchange, OCR) can be mocked or use free/test endpoints to avoid subscription costs during the hackathon.
*   **Cloud Deployment**: Cloud deployment is not required for the MVP but can be mentioned as a future enhancement.
*   **Compliance**: Basic audit logging will be part of the MVP; detailed compliance logging is a post-MVP consideration.

7.4. Implementation / Engineering Recommendations
*   **Background Workers**: Utilize background job processors (e.g., Sidekiq, Celery, or similar) for computationally intensive or asynchronous tasks such as:
    *   OCR processing of uploaded receipts.
    *   Fetching and caching exchange rates.
    *   Sending email/Slack notifications to users and approvers.
    *   Progressing approval steps (especially for specific approver actions that trigger auto-approval).
*   **API Rate Limiting & Caching**: Implement rate limiting for external API calls (e.g., `exchangerate-api.com`). Cache exchange rates in the `exchange_rates` table to minimize external calls and ensure consistent rates for auditing.
*   **File Storage**: Store file attachments (receipts) in an object storage service (e.g., AWS S3, Google Cloud Storage, or a local equivalent for MVP) and store only the `file_path` in `expense_attachments.file_path`.
*   **Auditability**: Add an `exchange_rate_used` NUMERIC column to the `expenses` table to explicitly record the rate applied at submission time for auditing purposes.
*   **Database Integrity**: Implement database constraints and triggers to ensure the immutability of `expenses.company_amount` once an expense is submitted, crucial for financial accuracy.
*   **Retention Policies**: (Post-MVP) Define and implement data retention and archival policies for audit logs and attachments to manage storage and compliance.
*   **RBAC**: Server-side RBAC checks must be implemented on all endpoints modifying or accessing sensitive data.
*   **Testing**: Add unit tests for the complex approval logic, covering edge cases like simultaneous approvals, delegation, and specific approver overrides.

7.5. Extra Developer Helpers (Pseudo APIs)
*   `POST /api/expenses`: Endpoint to create a new expense. Should return a preview of the determined approval flow (approvers, sequence) for user confirmation.
*   `POST /api/expenses/{id}/attachments`: Endpoint for uploading receipts. Triggers asynchronous OCR processing.
*   `GET /api/approvals/pending`: Endpoint for approvers to retrieve a list of expenses awaiting their approval.
*   `POST /api/approvals/{stepApproverId}`: Endpoint for an approver to approve or reject an expense, optionally including a comment.

8. UI/UX Considerations

8.1. Branding & Design Guidelines
*   **Branding**: No specific branding guidelines or logos are provided for the MVP.
*   **Color Palette**: Default color palette should be neutral, professional, and clean, suitable for enterprise software (e.g., various shades of blue, gray, white).
*   **Design System / UI Framework**: Not explicitly specified. For hackathon speed, use frameworks like Bootstrap, Tailwind CSS, or Material Design.
*   **Focus**: Prioritize functional layouts (forms, tables, dashboards) over extensive custom styling or complex animations.

8.2. UX/UI Preferences
*   **Interface Style**: Wireframes suggest an enterprise-friendly, minimalist interface.
    *   Clear tables for displaying expenses and approvals.
    *   Simple, intuitive forms for expense submission.
    *   Dashboard-like views with tabbed sections for easy navigation.
*   **Usability**: Prioritize usability and clarity, ensuring the interface is straightforward to navigate and understand for all user roles.
*   **Mobile Responsiveness**: Mobile responsiveness is optional for the hackathon MVP. A desktop-first approach is acceptable.

8.3. UX Microcopy & Helpful Tooltips
*   **On Expense Submit**: "This will start the approval flow - your manager will be notified."
*   **On OCR Upload**: "Detected amount: [CURRENCY_CODE] [AMOUNT] (confidence XX%). Edit if incorrect."
*   **On Rule Setup (Admin)**: A "Simulate rule on X sample expense" button to test rule logic.
*   **General**: Use concise, helpful tooltips and instructional text throughout the application to guide users and explain functionality.

9. Advanced Reporting & Analytics (Post-MVP)

Beyond the basic expense tracking, the system should evolve to provide robust reporting and analytics capabilities for administrators and financial stakeholders.

*   **Customizable Dashboards (Admin/Finance View)**:
    *   Visual summaries of total expenses, categorized by category, department, or individual employee.
    *   Breakdowns of pending vs. approved/rejected expenses.
    *   Flexible filtering by date range, status, category, payment method.
*   **Financial Analytics**:
    *   Trend analysis to track monthly or quarterly spending patterns.
    *   Identification of top spenders and high-value expenses to highlight potential cost-saving opportunities.
    *   Consolidated reporting of multi-currency expenses, converted to the company’s default currency.
*   **Stakeholder-Specific Reports**:
    *   For Finance Teams: Exportable reports (CSV/PDF) tailored for accounting reconciliation and integration with accounting software. SLA tracking for expenses in the approval workflow.
    *   For Management: Visual insights into overall company spending, departmental budget adherence, and category-wise breakdowns to support strategic decision-making.
*   **Alerts & Notifications**:
    *   Automated alerts for expenses exceeding predefined thresholds or exhibiting unusual spending patterns.
    *   Notifications for managers/admins regarding overdue pending approvals or system anomalies.

10. Data Migration Requirements

*   **Legacy Data**: There is no requirement to migrate existing expense data or user accounts from a legacy system. Expensely is being developed as a new, standalone implementation.
*   **Initial Data**: All users and expense data will originate within this new system.
*   **MVP Implications**: No migration scripts or complex legacy data handling are required for the hackathon MVP.
*   **Demo Data**: For demonstration purposes, a small dataset (e.g., 10-20 users, 30-50 expense records) can be pre-populated to showcase workflows effectively.

11. Future Enhancements / Roadmap (Deferred Features)

Features not critical for the MVP but planned for future phases include:
*   **Employee View**: Advanced OCR features (e.g., learning from corrections), advanced filters, and richer expense history analytics.
*   **Manager View**: Comprehensive team expense summaries, SLA tracking for approval processes, bulk approval actions, and escalation workflows.
*   **Admin View**: Implementation of more complex approval rules (hybrid combinations, intricate conditional logic), a dedicated category management interface, company-wide settings for advanced configurations, and comprehensive dashboards with analytics.
*   **Integrations**: Full integration with HRIS, accounting software (QuickBooks, SAP, Xero), Single Sign-On (SSO) providers, and ERP systems.
*   **Reporting**: Full implementation of the advanced reporting and analytics requirements described in Section 9.
*   **Audit Logs**: Detailed, searchable, and exportable audit logs for all system actions.

12. Assumptions & Constraints

*   **Timeline**: The system is targeted for a hackathon MVP, implying a very short development timeframe (e.g., 7 hours for a demonstrable working product). Focus will be on core, end-to-end functionality.
*   **Budget & Resources**: Development is subject to hackathon-level constraints: minimal resources, local development environment, reliance on free/trial versions or mocked external APIs. Limited team size mandates strict prioritization of must-have features.
*   **Development Focus**: Emphasis is on demonstrating functional workflows and core features, rather than achieving production-ready scalability, robust error handling for all edge cases, or extensive UI polishing.
*   **External APIs**: It is assumed that API keys for services like OCR can be stored locally (e.g., in environment variables) and configured easily. Mocking APIs for demo is acceptable.

13. Success Metrics (MVP Focus)

The success of the MVP will be measured by the ability to:
*   Successfully submit and track expense claims by employees.
*   Enable managers to efficiently approve or reject expenses for their assigned team members.
*   Allow administrators to create users, assign roles, and define basic approval rules.
*   Demonstrate the core end-to-end expense submission and approval workflow without critical failures.

14. Glossary

*   **OCR**: Optical Character Recognition – Technology to extract text from images (e.g., receipts).
*   **RBAC**: Role-Based Access Control – A method of restricting system access based on user roles.
*   **SLA**: Service Level Agreement – A defined expectation for how quickly a task (e.g., approval) should be completed.
*   **MVP**: Minimum Viable Product – A product with just enough features to satisfy early customers and provide feedback for future product development.
*   **HRIS**: Human Resource Information System – Software for managing human resources processes.
*   **ERP**: Enterprise Resource Planning – Integrated management of core business processes.
*   **SSO**: Single Sign-On – An authentication scheme that allows a user to log in with a single ID and password to any of several related, yet independent, software systems.
*   **MTD**: Month-to-Date – A period starting from the beginning of the current month up to the present day.

## Technology Stack
TECHSTACK

This document outlines the recommended technology stack for the "Expensely" Expense Management System, chosen to balance rapid development for the hackathon MVP with a robust foundation for future scalability and features.

## 1. Backend

**Framework:** Python 3.10+ with **Django 4.x**
*   **Justification:**
    *   **Rapid Development:** Django is "batteries-included" with an excellent Object-Relational Mapper (ORM), authentication system, and a powerful administrative interface that can significantly accelerate development of the Admin View and core user management functionalities within a hackathon timeframe.
    *   **Robustness:** Provides a solid, well-tested foundation for handling complex business logic, such as the multi-level and conditional approval rules.
    *   **Ecosystem:** A vast ecosystem of libraries and community support (e.g., for integrating with Celery for background tasks) ensures efficient problem-solving and feature implementation.
    *   **Security:** Django includes built-in protections against common web vulnerabilities (CSRF, XSS, SQL injection) and handles password hashing (e.g., PBKDF2) securely.

**API Framework:** **Django REST Framework (DRF)**
*   **Justification:**
    *   **RESTful API Development:** Industry-standard for building robust and scalable RESTful APIs with Django, simplifying serialization, authentication, permission management (for RBAC), and viewset creation.
    *   **Integration with Frontend:** Provides clean API endpoints for the React frontend, facilitating seamless data exchange.

**Asynchronous Task Queue:** **Celery** with **Redis** as a Message Broker
*   **Justification:**
    *   **Performance & Responsiveness:** Essential for offloading time-consuming tasks like OCR processing, fetching and caching exchange rates from external APIs, and sending notifications. This ensures the main application remains responsive for users.
    *   **Reliability:** Celery provides robust task management, retry mechanisms, and scheduling capabilities, critical for ensuring these background processes are executed reliably.

## 2. Frontend

**JavaScript Library:** **React 18.x**
*   **Justification:**
    *   **Component-Based Architecture:** Facilitates modular and reusable UI components, ideal for building complex dashboards, forms, and tables as described in the wireframes.
    *   **Developer Productivity:** A large community, extensive tooling, and a declarative approach allow for efficient UI development and maintainability.
    *   **Modern UI:** Provides a responsive and dynamic user experience, crucial for an enterprise-grade expense management system.

**UI Component Library:** **Material-UI (MUI)**
*   **Justification:**
    *   **Enterprise Aesthetics:** Offers a comprehensive suite of pre-built, high-quality Material Design components that align with the "clean, professional, minimalist" design preference, accelerating UI implementation.
    *   **Accessibility:** Components are designed with accessibility in mind, reducing the effort required to meet basic accessibility standards.
    *   **Consistency:** Ensures a consistent look and feel across the application, which is vital for a user-friendly enterprise tool.

## 3. Database

**Relational Database:** **PostgreSQL 14+**
*   **Justification:**
    *   **Explicitly Specified:** The detailed SQL schema provided is designed for PostgreSQL, making it the natural and required choice.
    *   **Robustness & Reliability:** Known for its strong ACID compliance, data integrity, and reliability, essential for financial transaction data.
    *   **Scalability:** Highly scalable for handling increasing data volumes and concurrent users, supporting future growth beyond the MVP.
    *   **Advanced Features:** Supports JSONB for flexible data storage (e.g., exchange rates, audit log details, notification payloads), complex indexing, and powerful query capabilities, which are beneficial for reporting and audit logs.

## 4. Storage

**File Storage:**
*   **MVP:** **Local Filesystem**
    *   **Justification:** Simplifies setup for a hackathon environment, avoiding external dependencies.
*   **Production:** **AWS S3** or compatible Object Storage (e.g., MinIO for hybrid/on-prem)
    *   **Justification:** Provides scalable, secure, and highly available storage for expense receipts and other attachments, decoupled from the application servers.

## 5. Development & Operations (DevOps)

**Version Control:** **Git** with **GitHub/GitLab/Bitbucket**
*   **Justification:** Standard for collaborative software development, enabling code tracking, branching, merging, and collaboration among team members.

**Containerization:** **Docker** and **Docker Compose**
*   **Justification:**
    *   **Consistent Environments:** Ensures that the application, database, and other services run consistently across different development machines and eventually in production.
    *   **Simplified Setup:** Accelerates onboarding for new developers and streamlines dependency management, crucial for a hackathon's tight timeline.
    *   **Portability:** Makes the application easily deployable to various environments.

## 6. External Integrations

**Country & Currency Data:** `https://restcountries.com/v3.1/all?fields=name,currencies`
*   **Justification:** Provides the necessary data for company signup (country selection, default currency) and supports the multi-currency aspect.

**Currency Conversion:** `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
*   **Justification:** Facilitates real-time currency conversion for expense amounts, ensuring accuracy and consistency across different currencies and the company's default currency. Cached locally using Celery.

**OCR for Receipts:** **Google Gemini API** (or Google Cloud Vision API)
*   **Justification:**
    *   **Automated Data Extraction:** Essential for the "Upload Receipt (OCR)" core feature, automatically extracting amount, date, vendor, and expense type from receipts, significantly reducing manual data entry and errors.
    *   **Robustness:** Google's AI capabilities provide high accuracy in text recognition from diverse receipt formats.

## 7. Security & Authentication

**Authentication:** Django's built-in authentication system
*   **Justification:** Provides a secure and robust foundation for user registration, login, password management (with strong hashing like PBKDF2), and session management.

**Authorization:** Role-Based Access Control (RBAC) implemented within Django/DRF
*   **Justification:** Enforces the strict role-based permissions (Admin, Manager, Employee) as specified, ensuring users only access functionalities relevant to their assigned roles.

**Data in Transit:** **HTTPS/TLS**
*   **Justification:** All communication between client and server will be encrypted using HTTPS to prevent eavesdropping and data tampering, a critical security requirement.

## 8. Development Environment & Tooling

**IDE/Editor:** **VS Code** (with Python, JavaScript/React extensions)
*   **Justification:** Popular, feature-rich, and highly customizable editor that supports efficient development across both backend and frontend.

**Package Managers:**
*   **Backend:** `pip` / `pip-tools` (for Python dependency management)
*   **Frontend:** `npm` or `yarn` (for JavaScript dependency management)
*   **Justification:** Standard tools for managing project dependencies effectively.

## 9. Deployment Strategy (MVP & Future)

**MVP (Hackathon):**
*   **Local Docker Compose:** The entire application stack (Django, PostgreSQL, Redis, Celery) will run locally using Docker Compose, allowing for a fully functional demonstration environment without requiring external cloud resources.

**Future Production Deployment:**
*   **Cloud Provider:** AWS, Google Cloud Platform (GCP), or Azure.
*   **Deployment Model:** Container orchestration services like **AWS ECS/EKS** or **Google Cloud Run/GKE** are recommended for scalability, reliability, and ease of management.
*   **CI/CD:** Implement Continuous Integration/Continuous Deployment pipelines (e.g., GitHub Actions, GitLab CI/CD, Jenkins) to automate testing, building, and deployment processes.

This comprehensive tech stack provides a solid foundation for delivering the "Expensely" Expense Management System, focusing on rapid development, security, and scalability.

## Project Structure
PROJECT STRUCTURE DOCUMENT: Expensely

1.  INTRODUCTION
    This document outlines the file and folder organization for the "Expensely" Expense Management System. The structure is designed to promote modularity, maintainability, and scalability, while facilitating rapid development, especially suitable for a hackathon MVP and future expansion. It separates concerns between the frontend user interface, the backend API, and shared resources.

2.  HIGH-LEVEL STRUCTURE
    The project adopts a common architecture separating frontend and backend components. This allows independent development and deployment of each part.

    ```
    Expensely/
    ├── backend/
    ├── frontend/
    ├── database/
    ├── docs/
    ├── config/
    ├── scripts/
    ├── .gitignore
    ├── README.md
    └── package.json / requirements.txt (or similar project-level dependencies)
    ```

3.  DETAILED DIRECTORY STRUCTURE AND EXPLANATION

    *   `Expensely/` (Project Root)
        *   `.gitignore`: Specifies intentionally untracked files to ignore.
        *   `README.md`: Overall project description, setup instructions, and quick start guide.
        *   `package.json` / `requirements.txt`: (Optional) If managing dependencies for both frontend and backend from the root (e.g., for a monorepo setup), otherwise found in `backend/` and `frontend/`.

    *   `backend/`
        This directory contains all the server-side code, including API endpoints, business logic, and database interactions.
        *   `src/`: Main source code for the backend application.
            *   `config/`: Configuration files for the application (e.g., database connection settings, API keys, environment-specific settings).
                *   `db.js`: Database connection and ORM setup.
                *   `app.js`: Application-wide settings, middleware, and route setup.
                *   `integrations.js`: Configuration for external APIs (e.g., `restcountries.com`, `exchangerate-api.com`, OCR API keys).
            *   `controllers/`: Handles incoming HTTP requests, processes input, calls services, and sends back responses.
                *   `authController.js`: User signup, login, password reset.
                *   `userController.js`: Admin user management (create, update, assign roles/managers).
                *   `expenseController.js`: Employee expense submission, tracking, manager/admin view.
                *   `approvalController.js`: Manager approval/rejection, admin override.
                *   `adminController.js`: Admin-specific actions like rule management, company settings.
            *   `services/`: Contains the core business logic. Controllers delegate tasks to services.
                *   `authService.js`: User authentication, token generation.
                *   `userService.js`: User creation, role assignment, manager relationships.
                *   `expenseService.js`: Expense creation, validation, status updates, OCR integration logic.
                *   `approvalService.js`: Approval rule evaluation, workflow progression, approval/rejection logic.
                *   `integrationService.js`: Orchestrates calls to external APIs (currency conversion, OCR, countries).
                *   `notificationService.js`: Handles sending email/in-app notifications.
            *   `models/`: Defines the data structures and interacts directly with the database (e.g., using an ORM).
                *   `User.js`: Maps to the `users` table.
                *   `Company.js`: Maps to the `companies` table.
                *   `Role.js`: Maps to the `roles` table.
                *   `Expense.js`: Maps to the `expenses`, `expense_attachments` tables.
                *   `Category.js`: Maps to the `expense_categories` table.
                *   `ApprovalRule.js`: Maps to `approval_rules`, `approval_rule_items` tables.
                *   `ApprovalFlow.js`: Maps to `approval_steps`, `approval_step_approvers` tables.
                *   `ExchangeRate.js`: Maps to `exchange_rates` table.
                *   `Notification.js`: Maps to `notifications` table.
                *   `AuditLog.js`: Maps to `audit_logs` table.
            *   `middlewares/`: Functions that execute before or after controller actions (e.g., authentication, authorization, validation).
                *   `authMiddleware.js`: JWT token verification, user authentication.
                *   `rbacMiddleware.js`: Role-based access control checks.
                *   `validationMiddleware.js`: Input validation for requests.
            *   `utils/`: General utility functions and helpers.
                *   `errorHandler.js`: Centralized error handling.
                *   `currencyConverter.js`: Helper for currency calculations and formatting.
                *   `passwordHasher.js`: Password hashing utility.
            *   `integrations/`: Dedicated client modules for external APIs.
                *   `countryApiClient.js`: Client for `restcountries.com`.
                *   `exchangeRateApiClient.js`: Client for `exchangerate-api.com`.
                *   `ocrApiClient.js`: Client for the OCR API.
            *   `routes/`: Defines API endpoints and maps them to controllers.
                *   `index.js`: Aggregates all specific routes.
                *   `authRoutes.js`: `/api/auth/*`
                *   `userRoutes.js`: `/api/users/*`
                *   `expenseRoutes.js`: `/api/expenses/*`
                *   `approvalRoutes.js`: `/api/approvals/*`
                *   `adminRoutes.js`: `/api/admin/*`
            *   `app.js`: The main application entry point (e.g., Express app, Flask app).
            *   `server.js`: Starts the HTTP server and listens for requests.
        *   `tests/`: Unit and integration tests for backend components.
            *   `unit/`: Tests for individual functions and services.
            *   `integration/`: Tests for API endpoints and interactions between components.
        *   `database/`: (Often a sub-folder within `backend/` or its own root folder)
            *   `migrations/`: SQL or ORM migration files to manage schema changes.
            *   `seeders/`: Scripts to populate the database with initial/sample data.
        *   `node_modules/` / `venv/`: Backend dependencies.
        *   `.env.example`: Template for environment variables.
        *   `package.json` / `requirements.txt`: Backend-specific dependencies.
        *   `README.md`: Backend-specific documentation.

    *   `frontend/`
        This directory contains all the client-side code for the user interface.
        *   `public/`: Static assets served directly (e.g., `index.html`, `favicon.ico`).
        *   `src/`: Main source code for the frontend application.
            *   `assets/`: Static files like images, fonts, and global CSS.
                *   `styles/`: Global CSS, theme definitions, utility classes.
                *   `images/`: Logos, icons, illustrations.
            *   `components/`: Reusable UI components that are application-agnostic or used across multiple pages.
                *   `AuthForm.js/vue`: Reusable login/signup form fields.
                *   `ExpenseTable.js/vue`: Table component for displaying expenses.
                *   `ApprovalCard.js/vue`: UI component for a single approval task.
                *   `Modal.js/vue`, `Button.js/vue`, `Input.js/vue`: Generic UI elements.
            *   `pages/`: Top-level components representing distinct views or pages of the application.
                *   `Auth/`: Contains `LoginPage.js/vue`, `SignupPage.js/vue`, `ForgotPasswordPage.js/vue`.
                *   `EmployeeDashboard/`: Main view for employees (`MyExpenses.js/vue`, `CreateExpense.js/vue`, `UploadReceipt.js/vue`).
                *   `ManagerDashboard/`: Main view for managers (`ApprovalsToReview.js/vue`, `TeamExpenses.js/vue`).
                *   `AdminPanel/`: Views for admin users (`UserManagement.js/vue`, `ApprovalRules.js/vue`, `CompanySettings.js/vue`).
                *   `ExpenseDetails/`: Page/modal for viewing detailed expense information (`ExpenseDetailsPage.js/vue`).
            *   `services/`: Functions for interacting with the backend API from the frontend.
                *   `authService.js/ts`: Login, logout, token management.
                *   `expenseService.js/ts`: API calls related to expenses (fetch, create, update).
                *   `userService.js/ts`: API calls for user and manager management.
                *   `adminService.js/ts`: API calls for admin panel.
            *   `store/`: (e.g., Redux, Vuex, Zustand, React Context) Manages application-wide state.
                *   `authSlice.js/ts`: Authentication state.
                *   `expenseSlice.js/ts`: Expense data and loading states.
                *   `userSlice.js/ts`: User and role data.
            *   `utils/`: Frontend-specific utility functions (e.g., date formatting, currency display, form helpers).
            *   `hooks/`: (React-specific) Custom hooks for reusable logic.
            *   `App.js/ts`: The root component of the frontend application, handling routing and global layout.
            *   `index.js/ts`: The entry point for the frontend application (e.g., ReactDOM.render).
        *   `tests/`: Unit and E2E tests for frontend components and pages.
            *   `unit/`: Component-level tests.
            *   `e2e/`: End-to-end tests (e.g., using Cypress, Playwright).
        *   `node_modules/`: Frontend dependencies.
        *   `.env.example`: Template for frontend environment variables.
        *   `package.json`: Frontend-specific dependencies.
        *   `README.md`: Frontend-specific documentation.

    *   `database/` (If not embedded within `backend/`)
        This directory holds database-related files, especially for managing the schema.
        *   `schema.sql`: The complete SQL schema for the PostgreSQL database, as defined in the project description.
        *   `migrations/`: Individual SQL scripts for incremental database schema changes.
            *   `V1__initial_schema.sql`: Script for initial table creation.
            *   `V2__add_approval_rules.sql`: Script to add approval rule tables.
            *   ...
        *   `seed.sql`: SQL script to populate the database with initial sample data for development or demonstration.

    *   `docs/`
        This directory contains various project documentation files.
        *   `README.md`: High-level project documentation.
        *   `PROJECTSTRUCTURE.md`: This document.
        *   `API_DESIGN.md`: Detailed API endpoint documentation.
        *   `WIREFRAMES.md`: Descriptions or links to wireframes.
        *   `SECURITY.md`: Security considerations and measures.
        *   `DEPLOYMENT.md`: Deployment instructions.

    *   `config/` (Root-level configuration for the entire project, if necessary)
        *   `config.js/json`: General project-wide configuration that might not be environment-specific.

    *   `scripts/`
        Utility scripts for development, deployment, or database management.
        *   `start-dev.sh`: Script to start both frontend and backend in development mode.
        *   `seed-db.sh`: Script to run database seeding.
        *   `deploy.sh`: (Optional for MVP) Script for deployment.

4.  EXPLANATION OF KEY DIRECTORIES (CONT.)

    *   **Backend `services/`**: This is where the core logic resides. For example, `expenseService.js` would contain methods like `createExpense`, `getExpenseById`, `updateExpenseStatus`, `processOcrReceipt`, handling currency conversion and initiating approval flows.
    *   **Backend `integrations/`**: This folder makes it easy to swap out external APIs if needed. Each file acts as a wrapper for a specific external service, abstracting away the HTTP calls and API keys.
    *   **Frontend `pages/`**: These map directly to the wireframes (e.g., `Auth`, `EmployeeDashboard`, `ManagerDashboard`, `AdminPanel`). They orchestrate multiple `components/` to form a complete view.
    *   **Frontend `services/`**: These abstract the actual API calls, providing clean methods for components/pages to interact with the backend without knowing the specific endpoint URLs or HTTP methods.

5.  MONOREPO-LIKE SETUP
    For a hackathon, this structure implies a monorepo-like setup where frontend and backend code coexist in the same repository. This simplifies dependency management and project setup for a smaller team and faster iteration.

6.  RECOMMENDATIONS
    *   **Consistent Naming**: Adhere to consistent naming conventions (e.g., camelCase for JavaScript, snake_case for Python and SQL).
    *   **Clear Boundaries**: Maintain strict separation of concerns between layers (controllers handle requests, services handle business logic, models handle data).
    *   **Environment Variables**: Utilize `.env` files for sensitive information and configuration that varies between environments (development, production).
    *   **Testing**: Implement unit tests for critical business logic and integration tests for API endpoints to ensure functionality and prevent regressions.

## Database Schema Design
# SCHEMADESIGN

## 1. Schema Diagram (Conceptual Overview)

The Expensely Expense Management System is designed around several core entities, establishing a clear hierarchy and relationships to manage companies, users, expenses, and approval workflows.

-   **Company**: The root entity, representing an organization using the system. Each company has its own set of users, expense categories, and approval rules.
-   **User**: Employees, Managers, and Admins belong to a specific company and have defined roles and permissions. Users can have a manager assigned, forming a reporting hierarchy.
-   **Role**: Static roles (Admin, Manager, Employee) define granular access control.
-   **Expense**: The central transaction unit, submitted by an employee, categorised, and includes financial details (original and company-converted amounts), payment method, and attachments.
-   **Expense Category**: Company-specific classifications for expenses (e.g., Travel, Meals).
-   **Expense Attachment**: Receipts or other supporting documents linked to an expense.
-   **Approval Rule**: Defines the logic for expense approvals, which can be sequential, parallel, or conditional based on criteria like category, amount, or specific approvers.
-   **Approval Rule Item**: Individual steps or approvers within an approval rule sequence.
-   **Approval Step**: An instance of an approval stage for a particular expense, tracking its status and required actions.
-   **Approval Step Approver**: Specific users assigned to approve a given approval step, capturing their decision and comments.
-   **Approval Action**: A log of all approval-related actions taken on an expense (approve, reject, override, etc.).
-   **Manager Relationship**: Explicitly links an employee to their manager.
-   **Exchange Rate**: Caches currency conversion rates for financial accuracy.
-   **Notification**: Stores system notifications for users (e.g., expense status changes, pending approvals).
-   **Audit Log**: Records all significant actions within the system for compliance and monitoring.

These entities are interconnected through foreign keys, ensuring data integrity and enabling complex business logic for expense tracking and multi-level approval processing.

## 2. Database Schema (SQL DDL)

Below are the `CREATE TABLE` statements for the Expensely PostgreSQL database schema, including primary keys, foreign keys, and indexes for optimal performance and data integrity.

```sql
-- Roles table (static)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE -- 'admin','manager','employee'
);

-- Companies
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  country_code TEXT,                 -- e.g., 'IN'
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
  date_of_expense DATE NOT NULL,
  payment_method TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, waiting_approval, approved, rejected, canceled
  current_step INT,                      -- reference to approval_steps.step_index for tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_requester ON expenses(requester_id);
CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Expense attachments (receipts)
CREATE TABLE expense_attachments (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  ocr_text TEXT,
  ocr_confidence NUMERIC(5,2),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_rules_company ON approval_rules(company_id);

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

-- Global approvals log / actions
CREATE TABLE approval_actions (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- approve | reject | override_approve | override_reject | delegate
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange rates store (cached)
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency CHAR(3) NOT NULL,
  rates JSONB NOT NULL, -- { "USD":1.0, "EUR":0.9, ...}
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_exchange_base ON exchange_rates(base_currency);

-- Notifications (simple)
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  company_id INT,
  type TEXT,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id INT,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 3. Schema notes, constraints & indexes

-   `expenses.company_amount` stores the converted amount at submission time (freeze rate for audit).
-   Approval engine reads `approval_rules` in priority order (implement priority column if multiple rules).
-   `approval_rule_items` supports role-based approvers (e.g., `Finance` role) -- at runtime resolve current user(s) with that role.
-   `approval_steps` + `approval_step_approvers` model supports:
    -   Sequential steps: step_index increments 1..N. When a step is `approved`, engine creates next step (or pre-populate all steps at creation).
    -   Parallel steps: multiple approvers in same `step_index` -> use `required_percentage` to determine acceptance.
-   Use partial indexes on `approval_step_approvers` for fast lookups of pending approvals.

## 4. Example flows & key queries

### 4.1 Create approval steps for an expense (pseudocode)

1.  Evaluate applicable `approval_rules` (category, amount range, active).
2.  If rule.include_manager = true and requester has manager -> include manager as approver in step 1.
3.  For each `approval_rule_items` in ordered sequence:
    -   Add `approval_steps` record with step_index.
    -   For each approver item in that step (role or user), populate `approval_step_approvers`.

### 4.2 Check whether a parallel step is approved (percentage rule)

SQL to compute % approvals for a step:

```sql
SELECT
  step.id,
  COUNT(*) FILTER (WHERE asa.decision IS NOT NULL) AS decisions_count,
  COUNT(*) FILTER (WHERE asa.decision = 'approved') AS approvals_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE asa.decision = 'approved') / NULLIF(COUNT(*),0),2) AS approval_pct
FROM approval_steps step
JOIN approval_step_approvers asa ON asa.step_id = step.id
WHERE step.id = :step_id
GROUP BY step.id;
```

Then compare `approval_pct >= step.required_percentage` to mark step as `approved`.

### 4.3 Specific approver override

If `approval_rules.specific_approver_id` exists, and that user approves:

-   Immediately mark the whole expense as `approved` (insert approval_action with `action = 'approve'` and set expense.status = 'approved'), regardless of other pending approvals.

Implementation: when processing an approver decision, check:

-   if approver_user_id == rule.specific_approver_id AND decision='approved' -> finalize.

### 4.4 Example: Move to next step after current step approved

-   On step change to `approved`: find next `approval_steps` record for expense (step_index > current). If none, mark expense `approved`.

## 5. Seed / sample data (quick)

```sql
-- roles
INSERT INTO roles (name) VALUES ('admin'),('manager'),('employee');

-- a company
INSERT INTO companies (name,country_code,default_currency) VALUES ('Acme Corp','US','USD');

-- users (sample)
-- consider using gen_random_uuid() or UUIDs from your app
```

## 6. Implementation / engineering recommendations

-   Use background workers (e.g., Sidekiq, Celery) for:
    -   OCR processing,
    -   fetching exchange rates,
    -   sending notifications,
    -   progressing approval steps (e.g., when specific approver action triggers auto-approval).
-   Rate-limit exchange rate calls; cache in `exchange_rates`.
-   Store file attachments in S3 or object store and store path in `expense_attachments.file_path`.
-   Record exchange rate used for each expense for auditing (could add `exchange_rate_used` NUMERIC column).
-   Add DB constraints/triggers for immutability of `company_amount` once submitted.
-   Add retention/archival policies for audit logs & attachments.

## 7. Extra developer helpers (pseudo APIs)

-   `POST /api/expenses` -> create expense, returns approval flow preview (show approvers & sequence).
-   `POST /api/expenses/{id}/attachments` -> upload and OCR (async).
-   `GET /api/approvals/pending` -> returns approver's pending tasks.
-   `POST /api/approvals/{stepApproverId}` -> approve/reject with comment.

## 8. UX microcopy & helpful tooltips (small but important)

-   On submit: "This will start the approval flow -- your manager will be notified."
-   On OCR: "Detected amount: ₹1,234.56 (confidence 92%). Edit if incorrect."
-   On rule setup: preview and test button: "Simulate rule on X sample expense".

## 9. Quick checklist for next steps

-   Decide: pre-generate `approval_steps` at expense creation vs generate on-the-fly -- I recommend pre-generating for simpler audit trail.
-   Add webhooks for email/slack notifications to approvers.
-   Implement RBAC checks server-side for all approve/reject endpoints.
-   Add unit tests for approval logic (edge cases: simultaneous approvals, delegation, specific approver override).

## User Flow
USERFLOW

This section outlines the detailed user journeys and interaction patterns within the Expensely Expense Management System, focusing on key tasks performed by each user role. It leverages the wireframe descriptions and conceptual workflow provided in the project documentation to illustrate how users navigate the system and achieve their objectives.

1.  User Roles
    The Expensely system supports three primary user roles, each with distinct permissions and workflows:
    *   **Admin:** Responsible for initial setup, user management, defining approval rules, and overall system configuration. Has override capabilities.
    *   **Manager:** Responsible for reviewing, approving, or rejecting expense claims submitted by their assigned employees. Can view team expenses.
    *   **Employee:** Responsible for submitting expense claims, uploading receipts, and tracking the status of their submitted expenses.

2.  Admin User Flows

    2.1. Initial System Setup (Company & Admin Creation)
        Purpose: To establish a new company account and create the first Admin user upon initial signup.
        Entry Point: Auth: Signup page
        Steps:
        1.  **User accesses Auth: Signup page.**
        2.  **User fills out Signup form:** Enters Company name, selects Country (dropdown populated via `restcountries` API), provides Admin name, Admin email, Password, and Confirm password.
        3.  **System displays "Company currency" preview:** After country selection, shows the default currency (e.g., "Company currency: EUR (auto-set)").
        4.  **User clicks "Submit".**
        5.  **Validation:** System validates password strength, email format, unique company name, and admin email.
        6.  **On Success:**
            *   A new `company` record is created with the selected country's default currency.
            *   An Admin user (role = `admin`) is auto-created.
            *   A verification email is sent to the Admin email.
            *   User is redirected to the Admin Dashboard (or an onboarding sequence).
        7.  **On Error:** Displays relevant error messages (e.g., "Email already in use", "Passwords do not match").

    2.2. Managing Users (Create/Edit Employee/Manager & Assign Manager)
        Purpose: Admin creates new user accounts, assigns roles, and defines manager relationships.
        Entry Point: Admin Panel - Users page
        Steps:
        1.  **Admin logs in** and navigates to the `Admin Panel`.
        2.  **Admin selects "Users"** from the left navigation. The `Users page` (table of existing users) is displayed.
        3.  **To create a new user:**
            *   Admin clicks on "Create user" (or similar action button).
            *   A "Create user form" modal/page appears.
            *   Admin fills in: Name, Email, selects Role (Employee / Manager) from a dropdown.
            *   If the role is 'Employee', Admin can select a `Manager` from a dropdown (populated with users marked as 'Manager').
            *   Admin checks "Send invite" (optional) to send password setup instructions.
            *   Admin clicks "Save".
            *   **Validation:** Email format, unique email within the company.
            *   **On Success:** New user is added to the table, and an invite email is sent if selected.
        4.  **To edit an existing user:**
            *   Admin locates the user in the `Users` table and clicks "Edit" in the `Actions` column.
            *   A form pre-filled with user details appears.
            *   Admin can change Name, Email, Role, Manager assignment, or toggle `is_active` status.
            *   Admin clicks "Save".
            *   **On Success:** User details are updated.
        5.  **To assign/change manager relationships in bulk:** Admin can utilize a "bulk import manager relationships (CSV)" option if available (post-MVP).

    2.3. Defining a New Approval Rule
        Purpose: Admin configures company-wide expense approval workflows.
        Entry Point: Admin Panel - Approval Rules page
        Steps:
        1.  **Admin logs in** and navigates to the `Admin Panel`.
        2.  **Admin selects "Approval Rules"** from the left navigation. The `Approval Rules page` (list of existing rules) is displayed.
        3.  **Admin clicks "Create Rule"** (or similar action button).
        4.  **Rule Builder UI appears:**
            *   Admin enters a `Name` for the rule.
            *   Admin defines `Applies to`: selects `Category` (dropdown, optional for global rules) and/or `Amount range` (min/max).
            *   Admin checks `Is manager approver` checkbox if the employee's direct manager should be included in the flow.
            *   **Admin defines Approver sequence/conditions:**
                *   **For Sequential rules:** Admin drags and drops "Approvers" (individual users or role placeholders like `Finance` role) into an ordered list.
                *   **For Conditional rules:** Admin selects `rule_type` (e.g., 'parallel', 'conditional') and configures:
                    *   `Percentage rule`: Enters a `Minimum approval percentage` (e.g., 60%).
                    *   `Specific approver rule`: Selects a `Specific approver ID` (user) with an associated effect (e.g., "CFO approval auto-approves request").
                    *   `Hybrid rule`: Combines conditions (UI allows OR/AND logic configuration).
            *   Admin can use a "Preview" or "Simulate rule" button to test how the rule would apply to a sample expense.
            *   Admin sets an `Is active` toggle to enable/disable the rule.
            *   Admin clicks "Save".
            *   **Validation:** Ensures all required fields are filled and logic is valid.
            *   **On Success:** The new rule is added to the `Approval Rules` list and becomes active if enabled.

3.  Employee User Flows

    3.1. Submitting a New Expense (Manual Entry)
        Purpose: Employee submits a new expense claim by manually entering details.
        Entry Point: Employee Dashboard - "Create New Expense" button or FAB
        Steps:
        1.  **Employee logs in** and lands on the `Employee Dashboard`.
        2.  **Employee clicks "New Expense"** (or similar button/FAB).
        3.  **Expense Submission page / modal appears:**
            *   **Employee fills form fields:**
                *   `Title / Short description` (optional).
                *   `Category` (dropdown: Travel, Meals, Office, Misc, etc.).
                *   `Amount` (number) and `Currency` (dropdown; default = user/company currency).
                *   `Date` (date picker).
                *   `Payment method` (dropdown: Cash, Card, Bank Transfer, Other).
                *   `Vendor` (text).
                *   `Detailed description / notes` (textarea).
            *   **Employee attaches receipts:** Clicks "Upload attachments," selects files. Thumbnails and upload status are shown.
            *   **Currency Conversion Preview:** If `Original Currency` differs from the `Company Currency`, the system shows an exchange rate preview and the estimated `Company Converted Amount`.
        4.  **Employee clicks "Submit"** (or "Save Draft" for later).
        5.  **Validation:**
            *   Required fields (Amount, Date, Category) must be filled.
            *   Amount must be > 0; Date <= today.
            *   Attachments (receipts) must be uploaded.
        6.  **On Submit:**
            *   The system calculates the final `Company Amount` using the latest exchange rate (`Currency Conversion API`).
            *   An approval workflow instance is created based on applicable `Approval Rules`.
            *   The expense `Status` changes to "Waiting Approval".
            *   The first approver(s) are notified.
            *   Employee is redirected to `Employee Dashboard - My Expenses` tab, with the new expense listed.
        7.  **On Save Draft:** Expense is saved with "Draft" status. Employee can `Edit` the draft from the `My Expenses` table.

    3.2. Submitting a New Expense (OCR-assisted)
        Purpose: Employee leverages OCR to pre-fill expense details from a receipt image.
        Entry Point: Employee Dashboard - "Upload Receipt (OCR)" button
        Steps:
        1.  **Employee logs in** and lands on the `Employee Dashboard`.
        2.  **Employee clicks "Upload Receipt (OCR)"**.
        3.  **Upload Receipt (OCR) modal appears:**
            *   Employee drags & drops a receipt image, chooses a file, or captures an image via camera.
        4.  **OCR Processing:**
            *   System uploads the receipt to the `OCR API`.
            *   OCR processes the image and attempts to extract fields: `Amount`, `Date`, `Vendor`, `Description`, and `Category suggestions`.
        5.  **Expense Submission page / modal (pre-filled):**
            *   The `Expense Submission` form is displayed with fields pre-filled by OCR data.
            *   System shows `OCR confidence` score for detected fields.
            *   **Employee reviews and edits:** Employee verifies the OCR-extracted data and corrects any inaccuracies.
            *   Employee can still manually attach additional receipts or edit `Payment method`, `Detailed description`, etc.
        6.  **Employee clicks "Submit"**.
        7.  **Validation & On Submit:** Same as Manual Entry Flow (3.1), transitioning to "Waiting Approval" status and notifying approvers.

    3.3. Tracking Expense Status and History
        Purpose: Employee monitors the progress of their submitted expense claims and views past expenses.
        Entry Point: Employee Dashboard - My Expenses (table)
        Steps:
        1.  **Employee logs in** and lands on the `Employee Dashboard`.
        2.  **"My Expenses" tab is active by default**, displaying a table of all their expenses.
        3.  **Employee views expense list:**
            *   The table includes columns: `Date submitted`, `Category`, `Description`, `Amount (original currency)`, `Company Amount`, `Status` (Draft / Waiting Approval / Approved / Rejected), `Current approver` (if waiting), and `Actions`.
            *   **Status Update:** `Notifications / Activity feed` will show status changes and approval comments.
        4.  **Employee filters and sorts:** Uses `filters` (date range, status, category, min/max amount) and `sorting` (date, amount, status) to find specific expenses.
        5.  **To view full details of an expense:**
            *   Employee clicks "View" in the `Actions` column for a specific expense.
            *   The `Expense Details (View)` modal/page appears, showing:
                *   Left panel: expense metadata (ID, submitter, original/company amounts, category, vendor, etc.).
                *   Center: `Attachments viewer` (receipts) with ability to open full-size/download.
                *   Right: `Approval timeline` (sequential steps, approver names, decisions, timestamps, comments, rule reasons).
                *   Footer: Audit logs (who viewed, acted, times).
        6.  **If expense is in "Draft" status:** Employee can click "Edit" from the `My Expenses` table to modify and submit the expense. Once submitted, `Edit` option is removed.
        7.  **To cancel a "Draft" or "Waiting Approval" expense:** Employee can click "Cancel" (if available) to withdraw the request.

4.  Manager User Flows

    4.1. Reviewing and Approving a Pending Expense
        Purpose: Manager evaluates an expense claim and grants approval.
        Entry Point: Manager Dashboard - Approvals to Review (table)
        Steps:
        1.  **Manager logs in** and lands on the `Manager Dashboard`.
        2.  **"Approvals to Review" table is active by default**, displaying expenses awaiting their approval.
            *   Columns include: `Requester`, `Category`, `Date`, `Orig Amount (currency)`, `Company Amount`, `Current Step`, `Deadline (SLA)`, `Action` (Approve / Reject / View).
        3.  **Manager filters and searches:** Uses filters (team members, status, category, amount range) and search (by requester, description, vendor) to prioritize.
        4.  **To review an expense:**
            *   Manager clicks "View" for a specific expense, or clicks "Approve" directly.
            *   The `Approval modal` (or `Expense Details (View)`) appears, showing:
                *   Full expense details, attachments, converted amount.
                *   Prior comments and approval history (if any).
        5.  **Manager makes a decision:**
            *   After reviewing, Manager clicks "Approve".
            *   A prompt for an optional `comment` appears.
            *   Manager enters a comment (e.g., "Approved as per policy") and clicks "Confirm Approve".
        6.  **On Approval:**
            *   The Manager's decision (`approved` + comment + timestamp) is recorded for the current approval step.
            *   The system checks `approval_steps` and `approval_step_approvers` to determine if the current step is fully approved (e.g., if percentage rule met).
            *   If the step is fully approved, the system progresses the expense to the `next approval step` (if any), or marks the `expense status` as "Approved" if it's the final step.
            *   The requesting Employee is notified.
            *   The expense is removed from the Manager's "Approvals to Review" table.

    4.2. Rejecting a Pending Expense
        Purpose: Manager evaluates an expense claim and denies approval.
        Entry Point: Manager Dashboard - Approvals to Review (table)
        Steps:
        1.  **Manager follows steps 1-4 from Flow 4.1.**
        2.  **Manager clicks "Reject".**
        3.  A prompt for a **mandatory `comment`** appears.
        4.  Manager enters a comment (e.g., "Missing receipt for item X, please resubmit") and clicks "Confirm Reject".
        5.  **On Rejection:**
            *   The Manager's decision (`rejected` + comment + timestamp) is recorded.
            *   The `expense status` is immediately updated to "Rejected".
            *   The requesting Employee is notified with the rejection reason.
            *   The expense is removed from the Manager's "Approvals to Review" table.

    4.3. Viewing Team Expenses
        Purpose: Manager monitors the total spending of their direct reports.
        Entry Point: Manager Dashboard
        Steps:
        1.  **Manager logs in** and lands on the `Manager Dashboard`.
        2.  Manager navigates to the "Team Expenses" section (could be a separate tab, card, or report).
        3.  **System displays aggregated team expenses:**
            *   This section shows a summary of expenses from employees reporting to this manager.
            *   Displays `month-to-date spend` by the team, potentially broken down by category or employee.
            *   All amounts are shown in the `Company's default currency`.
            *   Options for filters (e.g., date range, category, employee) and possibly export.

5.  Common Interactions & Patterns
    *   **Modals:** Used extensively for expense submission, detail viewing, approval/rejection actions, and user creation, providing a focused interaction.
    *   **Tables:** Primary interface for listing expenses, approvals, and users. Includes standard interactions like sorting, filtering, and searching.
    *   **Notifications:** System-wide notifications (e.g., status changes, pending approvals) keep users informed.
    *   **Breadcrumbs:** For multi-step flows (e.g., Expense Submission), breadcrumbs (Dashboard > New Expense) indicate current location.

6.  Integration Points in User Flows
    *   **Authentication Flow (Auth: Signup page):** Integrates with `Country & Currency API` (`https://restcountries.com`) to populate country dropdown and determine default company currency.
    *   **Expense Submission Flow (Expense Submission page):** Integrates with `Currency Conversion API` (`https://api.exchangerate-api.com`) to show real-time exchange rate previews and calculate `company_amount` on submission.
    *   **OCR-assisted Expense Submission Flow (Upload Receipt (OCR) feature):** Integrates with an `OCR API` (e.g., Gemini) to auto-extract data from receipt images.

## Styling Guidelines
STYLING GUIDELINES DOCUMENT: Expensely

1. Introduction
This document outlines the styling and user experience (UX) guidelines for the "Expensely" Expense Management System. The primary goal is to establish a consistent, professional, and highly functional interface that supports efficient expense submission and approval workflows for all user roles (Employee, Manager, Admin). Given the hackathon MVP context, the focus is on clarity, usability, and speed of implementation, prioritizing core functionalities over extensive custom branding or advanced animations.

2. Design Principles

2.1. Clarity & Simplicity
The interface must be minimalist, clean, and uncluttered. Information should be presented clearly and concisely, reducing cognitive load for users. Avoid unnecessary visual elements or complex designs.

2.2. Functionality-First
Design decisions prioritize usability and efficiency of workflows. Each UI element should serve a clear purpose in helping users complete their tasks effectively (e.g., submitting expenses, approving requests).

2.3. Consistency
Maintain a consistent look and feel across all pages and components. This includes consistent use of colors, typography, spacing, iconography, and interaction patterns. Consistency fosters familiarity and reduces the learning curve.

2.4. Efficiency
The design should enable users to complete common tasks quickly. This means streamlined forms, clear action buttons, and intuitive navigation. Features like OCR pre-fill contribute to this principle.

2.5. Professionalism
As an enterprise-oriented system, the visual design should convey trustworthiness, reliability, and professionalism. This is achieved through a clean aesthetic, appropriate color choices, and clear, non-distracting layouts.

3. Design System / UI Framework
To ensure rapid development and consistency for the MVP, an established UI framework will be leveraged.
-   **Recommendation:** Utilize a popular framework such as Bootstrap, Tailwind CSS, or Material Design. The choice should prioritize ease of use, component availability, and quick styling capabilities.
-   **Approach:** Focus on using the framework's default components and styling as much as possible, with minimal overrides, to achieve functional layouts for forms, tables, and dashboards.

4. Color Palette
The color palette emphasizes neutral, professional, and clean tones suitable for enterprise software, as no specific branding is provided.

4.1. Primary Colors
-   **Primary Blue:** A professional, trustworthy blue to represent core interactive elements, primary buttons, and branding accents.
    -   Example: `#007bff` (Bootstrap's primary blue) or similar corporate blue.
-   **Neutral Gray:** Used for backgrounds, text, borders, and disabled states.
    -   Example: `#F8F9FA` (lightest gray for backgrounds), `#6c757d` (medium gray for secondary text/borders), `#343a40` (dark gray for primary text).

4.2. Accent Color
-   **Subtle Highlight:** A soft, secondary accent color can be introduced for subtle highlights, active states, or less critical interactive elements. This should complement the primary blue.
    -   Example: A light teal or a soft orange, used sparingly.

4.3. Status Colors
These colors provide immediate visual feedback on the status of expenses and approvals.
-   **Approved:** Green (e.g., `#28a745`)
-   **Rejected:** Red (e.g., `#dc3545`)
-   **Waiting Approval / Pending:** Orange/Yellow (e.g., `#ffc107` / `#fd7e14`)
-   **Draft / Canceled:** Light Gray (e.g., `#6c757d`)

4.4. Text Colors
-   **Primary Text:** Dark gray for main content and headings (e.g., `#343a40`).
-   **Secondary Text:** Lighter gray for less prominent information, descriptions, or helper text (e.g., `#6c757d`).
-   **Link Text:** Primary blue, or a slightly darker shade for hover states.

5. Typography
A highly readable and clean sans-serif font family should be used consistently throughout the application.
-   **Font Family:** A widely available and readable sans-serif font such as `Roboto`, `Open Sans`, `Inter`, or a system font stack (e.g., `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`).
-   **Headings (H1-H6):** Used for structural organization.
    -   `H1`: Largest, for main page titles (e.g., "Employee Dashboard").
    -   `H2`: Section titles (e.g., "My Expenses", "Approvals to Review").
    -   `H3`-`H6`: Sub-sections and component titles.
-   **Body Text:** Default font size (e.g., 16px or 14px) for readability.
-   **Small Text:** Used for metadata, helper text, or secondary information (e.g., 12px or 13px).
-   **Font Weights:** Utilize `Regular` (400), `Semi-bold` (600), and `Bold` (700) weights to establish hierarchy and emphasis.

6. Iconography
Icons enhance clarity and visual communication, especially for actions and status indicators.
-   **Source:** Use a reputable icon library like Font Awesome, Material Icons, or Bootstrap Icons for consistency and broad coverage.
-   **Style:** Maintain a consistent icon style (e.g., line icons, solid icons) across the application.
-   **Usage:**
    -   Action buttons (e.g., "New Expense", "Upload Receipt", "Approve", "Reject", "Edit", "View", "Cancel").
    -   Navigation elements (e.g., Users, Approval Rules, Categories).
    -   Status indicators (e.g., checkmark for Approved, cross for Rejected).
    -   Informational cues (e.g., currency badge, notifications bell).

7. Layout and Spacing
-   **Grid System:** The chosen UI framework's grid system (e.g., Bootstrap's 12-column grid) should be used for consistent page layouts and component positioning.
-   **Whitespace:** Adequate whitespace is crucial for readability and to prevent the interface from feeling cramped. Use consistent padding and margins around elements and sections.
-   **Component Spacing:** Define standard spacing units (e.g., 8px increments) for margins and padding between UI elements to ensure visual harmony.
-   **Layout Structure:**
    -   **Header:** Fixed at the top, containing company name, user avatar, currency badge, and quick actions.
    -   **Side Navigation:** For Admin panel.
    -   **Main Content Area:** For dashboards, tables, forms, and detail views.
    -   **Modals:** For specific actions or detailed views (e.g., Expense Submission, Expense Details, Approval modal).

8. UI Components

8.1. Forms
-   **Labels:** Clear, concise, and typically placed above the input field.
-   **Input Fields:** Clean, well-defined borders, consistent height. Provide visual feedback for focus, error, and success states.
-   **Dropdowns:** Standard styling for category selection, currency, country, etc.
-   **Date Pickers:** Intuitive and easy to use.
-   **Textareas:** For descriptions or comments.
-   **File Upload:** Clearly designated drag & drop areas or "Choose File" buttons, with visual indicators for upload progress and attached files (thumbnails for receipts).

8.2. Tables
-   **Readability:** Clear column headers, ample row padding, and alternating row backgrounds if it enhances readability.
-   **Actionable Rows:** Rows should support actions (e.g., "View", "Edit", "Cancel" buttons/icons, or clicking a row to open a detail modal).
-   **Sorting & Filtering:** Visual cues for sortable columns and filter options.
-   **Status Indicators:** Use status colors and text badges (e.g., `Approved`, `Waiting Approval`).

8.3. Buttons
-   **Primary Buttons:** Distinctive styling (e.g., solid blue background, white text) for main actions like "Submit", "Approve", "Save".
-   **Secondary Buttons:** Outline style or lighter background for less critical actions like "Cancel", "Save Draft", "Reject".
-   **Destructive Actions:** Red background for actions like "Delete" or "Override Reject" (used sparingly and with confirmation).
-   **Icon Buttons:** For quick actions or where space is limited.

8.4. Navigation
-   **Top Header:** For global elements.
-   **Side Navigation (Admin):** Clear links to main sections (Users, Approval Rules, Categories). Active state should be clearly indicated.
-   **Tabbed Navigation:** For main dashboard sections (e.g., "My Expenses", "Create New Expense", "Upload Receipt").

8.5. Modals
-   **Structure:** Clear header (title), main content area, and a footer with action buttons (e.g., "Approve", "Reject", "Cancel").
-   **Consistency:** Consistent width and positioning.

8.6. Notifications & Badges
-   **System Notifications:** Non-intrusive banners or toast messages for success, error, or informational alerts.
-   **Activity Feed:** Clear listing of status changes or comments.
-   **Badges:** Small, colored indicators for unread notifications, item counts, or status labels.

8.7. Attachments Viewer
-   Support for viewing uploaded receipts (thumbnails, ability to open full-size, download, rotate/crop functionality where applicable).

9. Responsiveness
-   **Desktop-First:** For the hackathon MVP, the primary focus is on a desktop-first experience. The UI should be fully functional and well-laid out on common desktop screen sizes.
-   **Future Consideration:** Mobile responsiveness is considered an enhancement for later phases. While not a hard requirement for the MVP, a basic adaptive layout that doesn't completely break on smaller screens would be a bonus.

10. Accessibility
Basic accessibility considerations should be integrated from the start:
-   **Color Contrast:** Ensure sufficient contrast ratios between text and background colors (WCAG 2.1 AA standard).
-   **Keyboard Navigation:** All interactive elements should be reachable and operable using keyboard-only navigation.
-   **Descriptive Labels:** Use meaningful labels for form fields and `alt` text for images.
-   **Semantic HTML:** Utilize appropriate HTML elements (e.g., `button`, `input`, `nav`) for better screen reader interpretation.

11. Microcopy and Tone
-   **Tone:** The system's language should be clear, concise, professional, and helpful. Avoid jargon where possible.
-   **Helpful Tooltips:** Provide context-sensitive tooltips or inline help for complex fields or features (e.g., "Detected amount: \\u20B91,234.56 (confidence 92%). Edit if incorrect.", "This will start the approval flow \\u2014 your manager will be notified.").
-   **Error Messages:** Clear, actionable error messages that guide the user on how to resolve the issue.
-   **Confirmation Messages:** Confirm successful actions (e.g., "Expense submitted successfully," "Approval rule updated").
