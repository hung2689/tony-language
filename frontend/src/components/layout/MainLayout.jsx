import { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import DeckFormModal from '../../features/decks/DeckFormModal';
import Toast from '../common/Toast';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // When searching from Deck page (Ctrl+K or input), navigate to library with filter active
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (query && location.pathname !== '/') {
      navigate('/');
    }
  };

  // Global "+ Tạo Bộ thẻ" modal state accessible from sidebar
  const [isGlobalCreateDeckOpen, setIsGlobalCreateDeckOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

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

  return (
    <div className="app-shell-layout">
      {/* 1. Left Sidebar */}
      <AppSidebar
        user={user}
        onLogout={logout}
        onCreateDeck={() => setIsGlobalCreateDeckOpen(true)}
        isOpenOnMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Right Main Layout Container */}
      <div className="app-main-column">
        {/* Top Header Bar */}
        <AppHeader
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Content Outlet (Library or Deck Page) */}
        <div className="app-content-body">
          <Outlet
            context={{
              searchQuery,
              setSearchQuery,
              openGlobalCreateDeck: () => setIsGlobalCreateDeckOpen(true),
              refreshFolders: loadFolders,
            }}
          />
        </div>
      </div>

      {/* Global Create Deck Modal from Sidebar */}
      <DeckFormModal
        isOpen={isGlobalCreateDeckOpen}
        onClose={() => setIsGlobalCreateDeckOpen(false)}
        onSubmit={handleGlobalCreateDeck}
        folders={folders}
        onCreateFolderQuick={handleQuickCreateFolder}
        currentFolderId={null}
        deckToEdit={null}
      />

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
