import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Repeat,
  GraduationCap,
  BarChart3,
  Plus,
  Image as ImageIcon,
  Sun,
  Moon,
} from 'lucide-react';
import { Dock, DockIcon, DockSeparator } from '../magicui/Dock';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { useStudyPlan } from '../../features/studyplan/StudyPlanContext';
import { useTheme } from '../../features/theme/ThemeContext';

export default function AppDock({ onOpenCreateDeck }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openWallpaperModal } = useWallpaper();
  const { todayQueue, activePlan, openCreateModal } = useStudyPlan();
  const { isDark, toggleTheme } = useTheme();

  const dueCount = useMemo(() => {
    return todayQueue?.totalWords ?? todayQueue?.dueWords ?? 0;
  }, [todayQueue]);

  const isLibraryActive = location.pathname === '/';
  const isSrsActive = location.pathname.startsWith('/study-plan/srs') || location.pathname.includes('/srs');
  const isPlanActive = location.pathname.startsWith('/study-plan') && !isSrsActive;
  const isAnalyticsActive = location.pathname.startsWith('/analytics');

  return (
    <div className="app-floating-dock-wrapper" role="region" aria-label="Thanh dock điều hướng">
      <Dock magnification={64} distance={130} baseSize={44} direction="bottom">
        {/* 1. Thư viện */}
        <DockIcon
          label="Thư viện bộ thẻ"
          isActive={isLibraryActive}
          onClick={() => navigate('/')}
        >
          <BookOpen size={20} />
        </DockIcon>

        {/* 2. Lặp lại ngắt quãng (SM-2) */}
        <DockIcon
          label="Lặp lại ngắt quãng"
          isActive={isSrsActive}
          badge={dueCount > 0 ? dueCount : null}
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

        {/* 3. Lộ trình ôn tập */}
        <DockIcon
          label="Lộ trình ôn tập"
          isActive={isPlanActive}
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

        {/* 4. Thống kê */}
        <DockIcon
          label="Thống kê & Tiến độ"
          isActive={isAnalyticsActive}
          onClick={() => navigate('/analytics')}
        >
          <BarChart3 size={20} />
        </DockIcon>

        {/* Separator */}
        <DockSeparator />

        {/* 5. Tạo bộ từ vựng mới */}
        <DockIcon
          label="Tạo bộ thẻ mới"
          onClick={onOpenCreateDeck}
        >
          <Plus size={20} />
        </DockIcon>

        {/* 6. Đổi hình nền */}
        <DockIcon
          label="Đổi hình nền"
          onClick={openWallpaperModal}
        >
          <ImageIcon size={20} />
        </DockIcon>

        {/* 7. Chuyển Dark / Light mode */}
        <DockIcon
          label={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </DockIcon>
      </Dock>
    </div>
  );
}
