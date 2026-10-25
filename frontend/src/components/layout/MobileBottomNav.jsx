import { Home, Calendar, BarChart3, Image as ImageIcon, Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { useStudyPlan } from '../../features/studyplan/StudyPlanContext';
import { useTheme } from '../../features/theme/ThemeContext';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openWallpaperModal } = useWallpaper();
  const { activePlan, openCreateModal } = useStudyPlan();
  const { isDark, toggleTheme } = useTheme();

  const handleStudyPlanClick = () => {
    if (activePlan) {
      navigate('/study-plan');
    } else {
      openCreateModal();
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Thanh điều hướng dưới đáy">
      <button
        type="button"
        className={`mobile-nav-item ${location.pathname === '/' ? 'is-active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Thư viện"
      >
        <Home size={19} />
        <span>Thư viện</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${location.pathname.startsWith('/study-plan') ? 'is-active' : ''}`}
        onClick={handleStudyPlanClick}
        aria-label="Kế hoạch"
      >
        <Calendar size={19} />
        <span>Kế hoạch</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${location.pathname.startsWith('/analytics') ? 'is-active' : ''}`}
        onClick={() => navigate('/analytics')}
        aria-label="Thống kê"
      >
        <BarChart3 size={19} />
        <span>Thống kê</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={openWallpaperModal}
        aria-label="Hình nền"
      >
        <ImageIcon size={19} />
        <span>Hình nền</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={toggleTheme}
        aria-label={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      >
        {isDark ? <Sun size={19} /> : <Moon size={19} />}
        <span>{isDark ? 'Sáng' : 'Tối'}</span>
      </button>
    </nav>
  );
}
