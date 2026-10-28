import { Compass, BookOpen, BarChart3, GraduationCap, Repeat } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudyPlan } from '../../features/studyplan/StudyPlanContext';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activePlan, openCreateModal } = useStudyPlan();

  const handleStudyPlanClick = () => {
    if (activePlan) {
      navigate('/study-plan');
    } else {
      openCreateModal();
    }
  };

  const handleSrsClick = () => {
    if (activePlan) {
      navigate('/study-plan/srs');
    } else {
      openCreateModal();
    }
  };

  const isMapActive = location.pathname === '/' || location.pathname === '/map';
  const isVocabActive = location.pathname === '/library' || location.pathname === '/decks';
  const isAnalyticsActive = location.pathname.startsWith('/analytics');
  const isPlanActive = location.pathname.startsWith('/study-plan') && !location.pathname.includes('/srs');
  const isSrsActive = location.pathname.startsWith('/study-plan/srs') || location.pathname.includes('/srs');

  return (
    <nav className="mobile-bottom-nav" aria-label="Thanh điều hướng dưới đáy">
      <button
        type="button"
        className={`mobile-nav-item ${isMapActive ? 'is-active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Bản đồ"
      >
        <Compass size={19} />
        <span>Bản đồ</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isVocabActive ? 'is-active' : ''}`}
        onClick={() => navigate('/library')}
        aria-label="Từ vựng"
      >
        <BookOpen size={19} />
        <span>Từ vựng</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isAnalyticsActive ? 'is-active' : ''}`}
        onClick={() => navigate('/analytics')}
        aria-label="Lịch sử"
      >
        <BarChart3 size={19} />
        <span>Lịch sử</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isPlanActive ? 'is-active' : ''}`}
        onClick={handleStudyPlanClick}
        aria-label="Lộ trình"
      >
        <GraduationCap size={19} />
        <span>Lộ trình</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isSrsActive ? 'is-active' : ''}`}
        onClick={handleSrsClick}
        aria-label="Ôn tập SRS"
      >
        <Repeat size={19} />
        <span>Ôn tập SRS</span>
      </button>
    </nav>
  );
}
