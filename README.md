# Expensely - Expense Management System

Team name : Zenith Zero
Team leader : Ujjawal pandey

A comprehensive expense management system with configurable multi-level approval workflows, OCR receipt scanning, and multi-currency support.

## Features

- **Multi-Role Support**: Admin, Manager, and Employee roles with distinct permissions
- **Intelligent Approval Workflows**: Sequential, parallel, and conditional approval rules
- **OCR Receipt Scanning**: Automatic data extraction from receipt images
- **Multi-Currency Support**: Automatic currency conversion with cached exchange rates
- **Real-time Notifications**: Status updates and approval notifications
- **Comprehensive Audit Trail**: Full logging of all system actions

## Tech Stack

### Backend
- Node.js with Express.js
- PostgreSQL database
- JWT authentication
- Bull (Redis) for background jobs

### Frontend
- React 18+
- Material-UI (MUI)
- Redux Toolkit for state management
- Axios for API calls

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (for background jobs)

### Installation

1. Clone the repository:
```bash
cd D:\Odoo25\Projects\Expensely
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env.local`
   - Copy `frontend/.env.example` to `frontend/.env.local`
   - Fill in the required API keys and configuration

5. Set up the database:
```bash
cd ../database
psql -U postgres -f schema.sql
psql -U postgres -f seed.sql
```

6. Start the development servers:

Backend:
```bash
cd ../backend
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
Expensely/
├── backend/          # Node.js Express API
├── frontend/         # React application
├── database/         # SQL schema and migrations
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## API Documentation

See `docs/API_DESIGN.md` for detailed API endpoint documentation.

## Contributing

This is a hackathon MVP. For production deployment, consider:
- Implementing comprehensive error handling
- Adding extensive test coverage
- Setting up CI/CD pipelines
- Implementing advanced security measures
- Scaling database and caching strategies

## License

MIT License

