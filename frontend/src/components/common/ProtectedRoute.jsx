import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // User doesn't have the required role, redirect to their dashboard
    const userDashboard =
      user?.role === 'admin'
        ? '/admin'
        : user?.role === 'manager'
        ? '/manager'
        : '/employee';
    return <Navigate to={userDashboard} replace />;
  }

  return children;
};

export default ProtectedRoute;

