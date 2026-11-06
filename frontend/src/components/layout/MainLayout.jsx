import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import { analyticsService } from '../../services/analyticsService';
import AppHeader from './AppHeader';
import AppDock from './AppDock';
import MobileBottomNav from './MobileBottomNav';
import Toast from '../common/Toast';

const DeckFormModal = lazy(() => import('../../features/decks/DeckFormModal'));
const WallpaperModal = lazy(() => import('../../features/wallpapers/WallpaperModal'));

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { activeWallpaper, overlayOpacity, isWallpaperModalOpen } = useWallpaper();
  const navigate = useNavigate();
  const location = useLocation();
  const contentBodyRef = useRef(null);

  // Scroll content body to top when navigating across pages
  useEffect(() => {
    if (contentBodyRef.current) {
      contentBodyRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  const [searchQuery, setSearchQuery] = useState('');

  // When searching from Deck page (Ctrl+K or input), navigate to library with filter active
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (query && location.pathname !== '/library') {
      navigate('/library');
    }
  };

  // Global "+ Tạo Bộ thẻ" modal state accessible from dock & header
  const [isGlobalCreateDeckOpen, setIsGlobalCreateDeckOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Fetch folders for moving & creating decks
  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Fetch overall gamification stats (level, streak, mastered words)
  const [overview, setOverview] = useState(null);
  const fetchOverview = useCallback(async () => {
    try {
      const data = await analyticsService.getOverview();
      setOverview(data);
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Handle global deck creation from modal
  const handleGlobalCreateDeck = async (deckData) => {
    try {
      const newDeck = await deckService.createDeck(deckData);
      setIsGlobalCreateDeckOpen(false);
      showToast('Tạo bộ từ vựng thành công!', 'success');
      loadFolders();
      navigate(`/decks/${newDeck.id}`);
    } catch (err) {
      showToast(err.message || 'Không thể tạo bộ từ vựng.', 'error');
    }
  };

  // Quick create folder from inside DeckFormModal
  const handleQuickCreateFolder = async (folderName) => {
    try {
      const created = await folderService.createFolder(folderName);
      await loadFolders();
      showToast(`Đã tạo thư mục "${created.name}"`, 'success');
      return created;
    } catch (err) {
      showToast(err.message || 'Không thể tạo thư mục.', 'error');
      throw err;
    }
  };

  return (
    <div
      className={`app-shell-layout ${activeWallpaper ? 'has-custom-wallpaper' : ''}`}
      style={{
        '--bg-wallpaper-image': activeWallpaper?.url ? `url("${activeWallpaper.url}")` : 'none',
        '--bg-wallpaper-blur': activeWallpaper?.blur ? `${activeWallpaper.blur}px` : '0px',
        '--bg-overlay-opacity': overlayOpacity ?? 0.85,
      }}
    >
      {/* Background Wallpaper Container */}
      {activeWallpaper?.url && (
        <div
          className="app-shell-wallpaper-bg"
          style={{
            backgroundImage: `url("${activeWallpaper.url}")`,
            filter: activeWallpaper.blur ? `blur(${activeWallpaper.blur}px)` : 'none',
            transform: 'scale(1.05)', // Prevent blurry edge artifacts
          }}
          aria-hidden="true"
        />
      )}

      {/* Dark tint overlay for reading contrast */}
      {activeWallpaper?.url && (
        <div
          className="app-shell-wallpaper-overlay"
          style={{ opacity: overlayOpacity ?? 0.85 }}
          aria-hidden="true"
        />
      )}

      {/* Main Layout Area: Header + Scrollable Content Body */}
      <div className="app-main-area">
        {/* Top Header Bar */}
        <AppHeader
          user={user}
          onLogout={logout}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          overview={overview}
        />

        {/* Content Outlet (Library, Deck, Study Plan, Analytics) */}
        <div className="app-content-body" ref={contentBodyRef}>
          <Outlet
            context={{
              searchQuery,
              setSearchQuery,
              openGlobalCreateDeck: () => setIsGlobalCreateDeckOpen(true),
              refreshFolders: loadFolders,
              overview,
              refreshOverview: fetchOverview,
            }}
          />
        </div>
      </div>

      {/* Global Create Deck Modal */}
      {isGlobalCreateDeckOpen && (
        <Suspense fallback={null}>
          <DeckFormModal
            isOpen={isGlobalCreateDeckOpen}
            onClose={() => setIsGlobalCreateDeckOpen(false)}
            onSubmit={handleGlobalCreateDeck}
            folders={folders}
            onCreateFolderQuick={handleQuickCreateFolder}
            currentFolderId={null}
            deckToEdit={null}
          />
        </Suspense>
      )}

      {/* Wallpaper Switcher Modal */}
      {isWallpaperModalOpen && (
        <Suspense fallback={null}>
          <WallpaperModal />
        </Suspense>
      )}

      {/* MagicUI macOS Dock for Navigation & Quick Actions */}
      <AppDock onOpenCreateDeck={() => setIsGlobalCreateDeckOpen(true)} />

      {/* Mobile Bottom Navigation Bar (Thumb-zone for Mobile Screens) */}
      <MobileBottomNav />

      {/* Global Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
