# Expensely Backend API

Node.js/Express backend for the Expensely Expense Management System.

## Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (database, integrations)
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── models/          # Database models/queries
│   ├── middlewares/     # Custom middlewares
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── integrations/    # External API clients
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── uploads/             # File uploads directory
├── logs/                # Application logs
├── .env.example         # Environment variables template
└── package.json         # Dependencies
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Important variables to configure:**
- `DB_PASSWORD` - Your PostgreSQL password
- `JWT_SECRET` - A strong secret key for JWT tokens
- `GEMINI_API_KEY` - Your Google Gemini API key for OCR

### 3. Set up Database

Make sure PostgreSQL is running, then create the database and run migrations:

```bash
# Create database (from project root)
createdb expensely_db

# Run schema
psql -U postgres -d expensely_db -f ../database/schema.sql

# Run seed data (optional, for demo)
psql -U postgres -d expensely_db -f ../database/seed.sql
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new company and admin user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user (Admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Expenses
- `GET /api/expenses` - Get all expenses (filtered by role)
- `GET /api/expenses/:id` - Get expense by ID
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense (draft only)
- `POST /api/expenses/:id/submit` - Submit expense for approval
- `POST /api/expenses/:id/attachments` - Upload attachments with OCR

### Approvals
- `GET /api/approvals/pending` - Get pending approvals for current user
- `POST /api/approvals/:id/approve` - Approve an expense
- `POST /api/approvals/:id/reject` - Reject an expense
- `GET /api/approvals/history/:expenseId` - Get approval history

### Admin
- `GET /api/admin/approval-rules` - Get all approval rules
- `POST /api/admin/approval-rules` - Create approval rule
- `PUT /api/admin/approval-rules/:id` - Update approval rule
- `DELETE /api/admin/approval-rules/:id` - Delete approval rule
- `GET /api/admin/dashboard` - Admin dashboard stats

### Categories
- `GET /api/categories` - Get all categories for company
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

## Testing

```bash
npm test
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

## Environment Variables

See `.env.example` for all available environment variables.

## Authentication

API uses JWT (JSON Web Tokens) for authentication. Include token in requests:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Development

### Adding New Routes

1. Create controller in `src/controllers/`
2. Create service in `src/services/`
3. Create route file in `src/routes/`
4. Register route in `src/app.js`

### Database Queries

Use the query helper from `src/config/db.js`:

```javascript
const { query } = require('../config/db');
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use proper PostgreSQL credentials
3. Set strong `JWT_SECRET`
4. Enable HTTPS
5. Configure proper CORS origins
6. Set up Redis for Bull queue
7. Configure file storage (S3 or similar)

## License

MIT

