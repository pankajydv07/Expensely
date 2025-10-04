# Expensely Frontend

React + Material-UI frontend for the Expensely Expense Management System.

## Technology Stack

- **React 18** - UI library
- **Material-UI (MUI)** - Component library
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vite** - Build tool and dev server
- **Formik** - Form handling
- **Yup** - Form validation

## Project Structure

```
frontend/src/
├── components/        # Reusable UI components
│   └── common/       # Common components (ProtectedRoute, etc.)
├── pages/            # Page components
│   ├── Auth/         # Login, Signup pages
│   ├── Employee/     # Employee dashboard
│   ├── Manager/      # Manager dashboard
│   └── Admin/        # Admin dashboard
├── services/         # API service functions
│   ├── api.js        # Axios configuration
│   └── authService.js # Authentication API calls
├── store/            # Redux store
│   ├── index.js      # Store configuration
│   └── authSlice.js  # Auth state management
├── theme.js          # MUI theme configuration
├── App.jsx           # Main app component with routing
└── main.jsx          # Application entry point
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd D:\Odoo25\Projects\Expensely\frontend
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
copy .env.example .env.local
```

The `.env.local` file should contain:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Expensely
VITE_APP_VERSION=1.0.0
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

Built files will be in the `build/` directory.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm test` - Run tests

## Features Implemented

### ✅ Complete

1. **Authentication System**
   - Login page with form validation
   - Signup page with company creation
   - JWT token management
   - Automatic token refresh handling
   - Protected routes with role-based access

2. **State Management**
   - Redux store setup
   - Auth slice with async actions
   - Persistent authentication state

3. **Routing**
   - Role-based route protection
   - Automatic redirection based on user role
   - 404 handling

4. **UI Theme**
   - Professional Material-UI theme
   - Consistent color palette
   - Responsive design system

### 🚧 To Be Implemented

#### Employee Dashboard
- **Expense List Table**
  - Display all expenses with status
  - Filtering by date, category, status
  - Sorting capabilities
  - Pagination
  
- **Expense Submission Form**
  - Multi-step form with validation
  - Category selection
  - Amount and currency
  - Receipt upload
  - Draft saving
  
- **OCR Receipt Upload**
  - File upload component
  - Camera capture
  - OCR processing feedback
  - Auto-fill expense fields
  
- **Expense Details Modal**
  - Full expense information
  - Approval timeline
  - Attachments viewer
  - Edit capability for drafts

#### Manager Dashboard
- **Pending Approvals Table**
  - List of expenses awaiting approval
  - Requester information
  - Amount and category
  - Quick approve/reject actions
  
- **Approval Actions**
  - Approve with comment
  - Reject with reason
  - Bulk actions
  
- **Team Expenses View**
  - Aggregated spending
  - Monthly trends
  - Category breakdowns

#### Admin Dashboard
- **User Management**
  - User list table
  - Create user form
  - Edit user details
  - Role assignment
  - Manager relationship mapping
  
- **Approval Rules**
  - Rules list
  - Rule builder UI
  - Sequential/parallel/conditional rules
  - Rule simulation
  
- **Categories Management**
  - Category CRUD
  - Company-specific categories
  
- **Company Settings**
  - Currency settings
  - General configuration
  
- **Dashboard Statistics**
  - Total expenses
  - Pending approvals
  - User counts
  - Charts and graphs

## API Integration

The frontend communicates with the backend API at `http://localhost:5000/api`.

### Axios Configuration

The API client (`src/services/api.js`) includes:
- Automatic JWT token injection
- 401 error handling (auto-logout)
- Request/response interceptors

### Authentication Flow

1. User enters credentials
2. Redux action dispatched
3. API call made via authService
4. Token stored in localStorage
5. User redirected to role-appropriate dashboard

## Component Guidelines

### Creating New Components

Follow this structure for new components:

```jsx
import { Component } from '@mui/material';

const MyComponent = ({ prop1, prop2 }) => {
  // Component logic

  return (
    <Component>
      {/* JSX */}
    </Component>
  );
};

export default MyComponent;
```

### Using Redux

```jsx
import { useSelector, useDispatch } from 'react-redux';
import { actionName } from '../store/sliceName';

const Component = () => {
  const dispatch = useDispatch();
  const { data } = useSelector((state) => state.sliceName);

  const handleAction = () => {
    dispatch(actionName(payload));
  };

  return <div>...</div>;
};
```

## Styling Guidelines

### MUI Theme

Use the theme for consistent styling:

```jsx
import { Box } from '@mui/material';

<Box
  sx={{
    bgcolor: 'primary.main',
    color: 'white',
    p: 2,
    borderRadius: 1,
  }}
>
  Content
</Box>
```

### Color Palette

- **Primary**: Blue (#1976d2) - Main actions, links
- **Secondary**: Pink (#dc004e) - Accents
- **Success**: Green (#2e7d32) - Approved, success states
- **Warning**: Orange (#ed6c02) - Pending, warnings
- **Error**: Red (#d32f2f) - Rejected, errors
- **Info**: Light Blue (#0288d1) - Information

## Forms with Formik

```jsx
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  email: Yup.string().email().required('Required'),
  password: Yup.string().min(8).required('Required'),
});

<Formik
  initialValues={{ email: '', password: '' }}
  validationSchema={validationSchema}
  onSubmit={(values) => {
    // Handle submission
  }}
>
  {({ errors, touched }) => (
    <Form>
      <Field name="email" />
      {errors.email && touched.email && <div>{errors.email}</div>}
    </Form>
  )}
</Formik>
```

## Testing

To be implemented:
- Unit tests for components
- Integration tests for Redux actions
- E2E tests for critical user flows

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Environment Variables

For production, set:
- `VITE_API_URL` - Backend API URL
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Version number

## Troubleshooting

### Port Already in Use
Change the port in `vite.config.js`:
```js
server: {
  port: 3001, // or any other port
}
```

### API Connection Issues
Check:
1. Backend server is running on port 5000
2. CORS is configured correctly on backend
3. `VITE_API_URL` in `.env.local` is correct

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

## Next Steps

1. **Implement Employee Dashboard**
   - Expense table component
   - Expense form with validation
   - Upload component

2. **Implement Manager Dashboard**
   - Approvals table
   - Approval actions modal

3. **Implement Admin Dashboard**
   - User management CRUD
   - Approval rules builder

4. **Add Notifications**
   - Toast notifications
   - Real-time updates

5. **Enhance UX**
   - Loading states
   - Error boundaries
   - Skeleton screens

## Resources

- [React Documentation](https://react.dev/)
- [Material-UI](https://mui.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Router](https://reactrouter.com/)
- [Vite](https://vitejs.dev/)

## License

MIT

