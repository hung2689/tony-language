import { useState, useCallback, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import { analyticsService } from '../../services/analyticsService';
import AppHeader from './AppHeader';
import AppDock from './AppDock';
import MobileBottomNav from './MobileBottomNav';
import DeckFormModal from '../../features/decks/DeckFormModal';
import WallpaperModal from '../../features/wallpapers/WallpaperModal';
import Toast from '../common/Toast';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { activeWallpaper, overlayOpacity } = useWallpaper();
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
    if (query && location.pathname !== '/') {
      navigate('/');
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

  // Cleanup toast timer on unmount (BUG-04)
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Shared overview for header streak & library workspace (BUG-08)
  const [overview, setOverview] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await analyticsService.getOverview();
      setOverview(data);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Load folders for global modal
  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleGlobalCreateDeck = async (deckData) => {
    try {
      const created = await deckService.createDeck(deckData);
      showToast('Tạo bộ từ vựng thành công');
      setIsGlobalCreateDeckOpen(false);
      // Navigate to the created deck so user can immediately study or view
      if (created?.id) {
        navigate(`/decks/${created.id}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo bộ từ vựng', 'error');
    }
  };

  const handleQuickCreateFolder = async (name) => {
    try {
      const newFolder = await folderService.createFolder(name);
      showToast('Đã tạo thư mục mới');
      await loadFolders();
      return newFolder;
    } catch (err) {
      showToast(err.message || 'Lỗi tạo thư mục', 'error');
      throw err;
    }
  };

  const hasWallpaper = Boolean(activeWallpaper && (activeWallpaper.imageUrl || activeWallpaper.url));

  return (
    <div className={`app-shell-layout ${hasWallpaper ? 'has-custom-wallpaper' : ''}`}>
      {/* 0. Ambient Background Layer if Wallpaper selected */}
      {hasWallpaper && (
        <div
          className="app-wallpaper-layer"
          style={{
            backgroundImage: `url(${activeWallpaper.imageUrl || activeWallpaper.url})`,
          }}
          aria-hidden="true"
        >
          {/* Subtle light/white overlay to preserve crisp monochrome contrast */}
          <div
            className="app-wallpaper-overlay"
            style={{
              backgroundColor: `rgba(248, 250, 252, ${overlayOpacity / 100})`,
            }}
          />
        </div>
      )}

      {/* Main Column Container (Full width - No Sidebar) */}
      <div className="app-main-column">
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
      <DeckFormModal
        isOpen={isGlobalCreateDeckOpen}
        onClose={() => setIsGlobalCreateDeckOpen(false)}
        onSubmit={handleGlobalCreateDeck}
        folders={folders}
        onCreateFolderQuick={handleQuickCreateFolder}
        currentFolderId={null}
        deckToEdit={null}
      />

      {/* Wallpaper Switcher Modal */}
      <WallpaperModal />

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
