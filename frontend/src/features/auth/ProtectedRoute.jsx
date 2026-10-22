import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';
import './Auth.css';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <Loader2 size={32} className="auth-spinner" />
        <p>Đang kiểm tra phiên làm việc...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
