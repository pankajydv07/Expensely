import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Redirect to appropriate dashboard based on role
  const getDashboardRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'manager':
        return '/manager';
      case 'employee':
        return '/employee';
      default:
        return '/login';
    }
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <SignupPage />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

