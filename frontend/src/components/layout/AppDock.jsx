import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  BookOpen,
  BarChart3,
  GraduationCap,
  Repeat,
  Plus,
  Image as ImageIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { Dock, DockIcon, DockSeparator } from '../magicui/Dock';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { useStudyPlan } from '../../features/studyplan/StudyPlanContext';
import { useTheme } from '../../features/theme/ThemeContext';
import { preloadRoute } from '../../utils/preloadRoute';

export default function AppDock({ onOpenCreateDeck }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openWallpaperModal } = useWallpaper();
  const { todayQueue, activePlan, openCreateModal } = useStudyPlan();
  const { isDark, toggleTheme } = useTheme();

  const dueCount = useMemo(() => {
    return todayQueue?.totalWords ?? todayQueue?.dueWords ?? 0;
  }, [todayQueue]);

  const isMapActive = location.pathname === '/' || location.pathname === '/map';
  const isLibraryActive = location.pathname === '/library' || location.pathname === '/decks';
  const isAnalyticsActive = location.pathname.startsWith('/analytics');
  const isSrsActive = location.pathname.startsWith('/study-plan/srs') || location.pathname.includes('/srs');
  const isPlanActive = location.pathname.startsWith('/study-plan') && !isSrsActive;

  return (
    <div className="app-floating-dock-wrapper" role="region" aria-label="Thanh dock điều hướng">
      <Dock magnification={64} distance={130} baseSize={44} direction="bottom">
        {/* 1. Bản đồ */}
        <DockIcon
          label="Bản đồ"
          isActive={isMapActive}
          onClick={() => navigate('/')}
          onMouseEnter={() => preloadRoute('map')}
          onFocus={() => preloadRoute('map')}
        >
          <Compass size={20} />
        </DockIcon>

        {/* 2. Từ vựng của tôi */}
        <DockIcon
          label="Từ vựng của tôi"
          isActive={isLibraryActive}
          onClick={() => navigate('/library')}
          onMouseEnter={() => preloadRoute('library')}
          onFocus={() => preloadRoute('library')}
        >
          <BookOpen size={20} />
        </DockIcon>

        {/* 3. Lịch sử học tập */}
        <DockIcon
          label="Lịch sử học tập"
          isActive={isAnalyticsActive}
          onClick={() => navigate('/analytics')}
          onMouseEnter={() => preloadRoute('analytics')}
          onFocus={() => preloadRoute('analytics')}
        >
          <BarChart3 size={20} />
        </DockIcon>

        {/* 4. Lộ trình ôn tập */}
        <DockIcon
          label="Lộ trình ôn tập"
          isActive={isPlanActive}
          onMouseEnter={() => preloadRoute('studyPlan')}
          onFocus={() => preloadRoute('studyPlan')}
          onClick={() => {
            if (activePlan) {
              navigate('/study-plan');
            } else {
              openCreateModal();
            }
          }}
        >
          <GraduationCap size={20} />
        </DockIcon>

        {/* 5. Lặp lại ngắt quãng */}
        <DockIcon
          label="Lặp lại ngắt quãng"
          isActive={isSrsActive}
          badge={dueCount > 0 ? dueCount : null}
          onMouseEnter={() => preloadRoute('srs')}
          onFocus={() => preloadRoute('srs')}
          onClick={() => {
            if (activePlan) {
              navigate('/study-plan/srs');
            } else {
              openCreateModal();
            }
          }}
        >
          <Repeat size={20} />
        </DockIcon>

        {/* Separator */}
        <DockSeparator />

        {/* 6. Tạo bộ từ vựng mới */}
        <DockIcon
          label="Tạo bộ thẻ mới"
          onClick={onOpenCreateDeck}
          ariaLabel="Tạo bộ thẻ mới"
        >
          <Plus size={20} />
        </DockIcon>

        {/* 7. Đổi hình nền */}
        <DockIcon
          label="Hình nền học tập"
          onClick={openWallpaperModal}
          ariaLabel="Hình nền học tập"
        >
          <ImageIcon size={20} />
        </DockIcon>

        {/* 8. Chuyển đổi giao diện Sáng / Tối */}
        <DockIcon
          label={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
          onClick={toggleTheme}
          ariaLabel={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </DockIcon>
      </Dock>
    </div>
  );
}
