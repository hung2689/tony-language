import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Ripple from '../../components/common/Ripple';
import './Auth.css';

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <Ripple size={48} color="#3b82f6" style={{ margin: '0 auto 12px auto' }} />
        <p>Đang kiểm tra phiên làm việc...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children;
}
