import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../services/core/authStorage';

const PublicOnlyRoute = () => {
  if (isAuthenticated()) {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
