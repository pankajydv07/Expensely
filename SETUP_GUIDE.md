# Expensely - Complete Setup and Implementation Guide

## 🎯 Project Overview

Expensely is a comprehensive expense management system with:
- Multi-role support (Admin, Manager, Employee)
- Configurable multi-level approval workflows
- OCR receipt scanning
- Multi-currency support with real-time conversion
- Real-time notifications
- Comprehensive audit trail

## 📁 What Has Been Created

### ✅ Complete Files

1. **Database Layer** (`/database/`)
   - `schema.sql` - Complete PostgreSQL schema with all tables, indexes, and constraints
   - `seed.sql` - Sample data for development and testing

2. **Backend Configuration** (`/backend/`)
   - `package.json` - All Node.js dependencies
   - `.env.example` - Environment variable template
   - `src/config/db.js` - Database connection and query helpers
   - `src/app.js` - Express application configuration
   - `src/server.js` - Server entry point
   - `README.md` - Backend documentation

3. **Middleware** (`/backend/src/middlewares/`)
   - `errorHandler.js` - Global error handling
   - `notFound.js` - 404 handler
   - `authMiddleware.js` - JWT authentication
   - `rbacMiddleware.js` - Role-based access control

4. **Documentation**
   - Root `README.md` - Project overview
   - `.gitignore` - Ignore patterns
   - `SETUP_GUIDE.md` - This file

## 🚀 Quick Start (Development Setup)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (for background jobs - optional for MVP)
- Git

### Step 1: Install Backend Dependencies

```bash
cd D:\Odoo25\Projects\Expensely\backend
npm install
```

### Step 2: Configure Environment Variables

```bash
cd D:\Odoo25\Projects\Expensely\backend
copy .env.example .env.local
```

Edit `.env.local` and set at minimum:
```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_very_long_random_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_for_ocr
```

### Step 3: Set Up Database

```powershell
# Create database
createdb -U postgres expensely_db

# Run schema
psql -U postgres -d expensely_db -f D:\Odoo25\Projects\Expensely\database\schema.sql

# Seed with sample data
psql -U postgres -d expensely_db -f D:\Odoo25\Projects\Expensely\database\seed.sql
```

### Step 4: Test Database Connection

```bash
cd D:\Odoo25\Projects\Expensely\backend
node -e "require('dotenv').config({path:'.env.local'}); const {pool} = require('./src/config/db'); pool.query('SELECT NOW()').then(r=>console.log('✅ DB Connected:',r.rows[0])).catch(e=>console.error('❌ Error:',e)).finally(()=>pool.end())"
```

## 📝 Remaining Implementation Tasks

### Phase 1: Core Backend API (Priority: HIGH)

#### 1.1 Authentication System
Create these files in `/backend/src/`:

**`controllers/authController.js`**
- signup() - Create company and admin user
- login() - Authenticate user and return JWT
- forgotPassword() - Send password reset email
- resetPassword() - Reset password with token

**`services/authService.js`**
- validateSignup()
- createCompanyWithAdmin()
- authenticateUser()
- hashPassword()

**`routes/authRoutes.js`**
- POST /signup
- POST /login
- POST /forgot-password
- POST /reset-password

#### 1.2 User Management
**`controllers/userController.js`**
- getUsers() - List users (admin)
- getUser() - Get user by ID
- createUser() - Create new user (admin)
- updateUser() - Update user
- deleteUser() - Delete user (admin)
- assignManager() - Assign manager to employee

**`services/userService.js`**
- Business logic for user operations

**`routes/userRoutes.js`**
- Full CRUD routes

#### 1.3 Expense Management
**`controllers/expenseController.js`**
- getExpenses() - List expenses (filtered by role)
- getExpense() - Get single expense
- createExpense() - Create draft expense
- updateExpense() - Update draft
- submitExpense() - Submit for approval
- cancelExpense() - Cancel expense

**`services/expenseService.js`**
- convertCurrency() - Use exchange rate API
- initiateApprovalWorkflow()
- calculateCompanyAmount()

**`routes/expenseRoutes.js`**
- Full expense CRUD and submission routes

#### 1.4 Approval System
**`controllers/approvalController.js`**
- getPendingApprovals() - For managers
- approveExpense() - Approve with comment
- rejectExpense() - Reject with comment
- getApprovalHistory() - Get timeline

**`services/approvalService.js`**
- evaluateApprovalRules()
- createApprovalSteps()
- processApproverDecision()
- checkStepCompletion()
- advanceToNextStep()

**`routes/approvalRoutes.js`**
- Approval action routes

#### 1.5 File Upload & OCR
**`controllers/attachmentController.js`**
- uploadAttachment() - Handle file upload
- processOCR() - Extract data from receipt

**`services/ocrService.js`**
- callGeminiAPI()
- parseReceiptData()

**`utils/fileUpload.js`**
- Multer configuration
- File validation

#### 1.6 External API Integrations
**`integrations/countryApiClient.js`**
- fetchCountries()
- getCurrencyForCountry()

**`integrations/exchangeRateApiClient.js`**
- fetchExchangeRates()
- convertAmount()
- cacheRates()

**`integrations/ocrApiClient.js`**
- processReceipt()

### Phase 2: Admin Panel Backend

#### 2.1 Approval Rules Management
**`controllers/adminController.js`**
- getApprovalRules()
- createApprovalRule()
- updateApprovalRule()
- deleteApprovalRule()
- getDashboardStats()

**`services/approvalRuleService.js`**
- validateRule()
- simulateRule()

**`routes/adminRoutes.js`**
- Admin management routes

#### 2.2 Category Management
**`controllers/categoryController.js`**
- CRUD for expense categories

**`routes/categoryRoutes.js`**
- Category routes

### Phase 3: Notifications & Background Jobs

#### 3.1 Notifications
**`controllers/notificationController.js`**
- getNotifications()
- markAsRead()
- markAllAsRead()

**`services/notificationService.js`**
- createNotification()
- notifyApprovers()
- notifyEmployee()

**`routes/notificationRoutes.js`**
- Notification routes

#### 3.2 Background Jobs (Optional for MVP)
**`jobs/ocrJob.js`**
- Process OCR asynchronously

**`jobs/exchangeRateJob.js`**
- Fetch and cache rates periodically

### Phase 4: Frontend React Application

#### 4.1 Setup
```bash
cd D:\Odoo25\Projects\Expensely\frontend
npx create-react-app .
npm install @mui/material @emotion/react @emotion/styled
npm install @reduxjs/toolkit react-redux
npm install react-router-dom axios
npm install date-fns formik yup
```

#### 4.2 Create Structure
- `/src/components/` - Reusable components
- `/src/pages/` - Page components
- `/src/services/` - API calls
- `/src/store/` - Redux store
- `/src/utils/` - Utilities
- `/src/hooks/` - Custom hooks

#### 4.3 Key Pages to Implement
1. Auth Pages (Login, Signup, ForgotPassword)
2. Employee Dashboard
3. Expense Submission Form
4. Expense Details View
5. Manager Dashboard
6. Approval Actions
7. Admin Panel (Users, Rules, Settings)

#### 4.4 State Management
- Auth slice (user, token)
- Expense slice
- Approval slice
- Notification slice

### Phase 5: Testing & Polish

#### 5.1 Backend Tests
- Unit tests for services
- Integration tests for APIs
- Test approval logic thoroughly

#### 5.2 Frontend Tests
- Component tests
- E2E tests for critical flows

#### 5.3 Documentation
- API documentation (Postman collection or Swagger)
- User manual
- Deployment guide

## 🔧 Development Workflow

### Starting Development

1. **Start PostgreSQL** (if not running as service)
2. **Start Backend:**
   ```bash
   cd D:\Odoo25\Projects\Expensely\backend
   npm run dev
   ```
3. **Start Frontend:** (once created)
   ```bash
   cd D:\Odoo25\Projects\Expensely\frontend
   npm start
   ```

### Testing Sample Data

After seeding the database, you can log in with:
- **Admin:** admin@acme.com / Password123!
- **Manager:** john.manager@acme.com / Password123!
- **Employee:** alice@acme.com / Password123!

## 🎨 Frontend Component Structure (To Be Created)

```
frontend/src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Table.jsx
│   ├── auth/
│   │   └── AuthForm.jsx
│   ├── expense/
│   │   ├── ExpenseTable.jsx
│   │   ├── ExpenseForm.jsx
│   │   └── ExpenseDetails.jsx
│   └── approval/
│       ├── ApprovalCard.jsx
│       └── ApprovalTimeline.jsx
├── pages/
│   ├── Auth/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   └── ForgotPasswordPage.jsx
│   ├── Employee/
│   │   ├── EmployeeDashboard.jsx
│   │   ├── CreateExpense.jsx
│   │   └── UploadReceipt.jsx
│   ├── Manager/
│   │   ├── ManagerDashboard.jsx
│   │   └── ApprovalsView.jsx
│   └── Admin/
│       ├── AdminDashboard.jsx
│       ├── UserManagement.jsx
│       ├── ApprovalRules.jsx
│       └── CompanySettings.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── expenseService.js
│   └── userService.js
├── store/
│   ├── index.js
│   ├── authSlice.js
│   ├── expenseSlice.js
│   └── userSlice.js
└── App.jsx
```

## 🚨 Important Notes

### API Keys Required
1. **Google Gemini API** - For OCR functionality
   - Get from: https://makersuite.google.com/app/apikey
   - Free tier available
   - Add to `.env.local` as `GEMINI_API_KEY`

2. **Exchange Rate API** - For currency conversion
   - Free tier: https://exchangerate-api.com
   - Or use the mock endpoint provided

### Security Considerations
- Change all default passwords in production
- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Implement rate limiting
- Sanitize all user inputs
- Implement CSRF protection

### Performance Tips
- Use database indexes (already created in schema)
- Implement pagination for list endpoints
- Cache exchange rates
- Use Redis for Bull queue in production
- Optimize SQL queries

## 📊 Database Schema Highlights

The schema includes:
- 15 tables with proper relationships
- UUID for user IDs for security
- JSONB for flexible data storage
- Comprehensive indexes for performance
- Audit logging built-in
- Multi-currency support

## 🎯 MVP vs Full Feature Set

### MVP (Hackathon Scope)
✅ User authentication
✅ Basic expense submission
✅ Sequential approval workflow
✅ Manager approvals
✅ Admin user management
✅ Basic expense categories

### Post-MVP
- OCR receipt scanning
- Complex conditional approval rules
- Parallel approval workflows
- Email notifications
- Advanced reporting
- Bulk operations
- Mobile responsiveness
- SSO integration

## 📞 Next Steps

1. **Immediate:** Create auth routes and test login/signup
2. **Core:** Implement expense CRUD operations
3. **Critical:** Build approval workflow engine
4. **UI:** Create React frontend with Material-UI
5. **Integration:** Connect frontend to backend
6. **Testing:** Test all workflows end-to-end
7. **Polish:** Add error handling and user feedback

## 🐛 Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env.local`
- Check database exists: `psql -l`

### Port Already in Use
- Change PORT in `.env.local`
- Or kill process: `netstat -ano | findstr :5000`

### Module Not Found
- Run `npm install` in backend directory
- Clear node_modules and reinstall if needed

## 📚 Resources

- PostgreSQL Docs: https://www.postgresql.org/docs/
- Express.js: https://expressjs.com/
- React: https://react.dev/
- Material-UI: https://mui.com/
- JWT: https://jwt.io/

---

**This is a comprehensive foundation. The core infrastructure is in place. You now need to implement the controllers, services, and routes following the patterns established in the middleware files.**

