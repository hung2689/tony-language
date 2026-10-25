import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import FolderPanel from '../folders/FolderPanel';
import DeckList from '../decks/DeckList';
import CreateFolderModal from '../folders/CreateFolderModal';
import DeleteFolderModal from '../folders/DeleteFolderModal';
import DeckFormModal from '../decks/DeckFormModal';
import MoveDeckModal from '../decks/MoveDeckModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import DailyGateReminder from '../studyplan/DailyGateReminder';
import { useStudyPlan } from '../studyplan/StudyPlanContext';
import SpacedRepetitionForecastModal from '../studyplan/SpacedRepetitionForecastModal';
import { useAuth } from '../auth/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import {
  Folder,
  Search,
  ArrowUpDown,
  Plus,
  Sparkles,
  Calendar,
  LayoutGrid,
  List,
  Flame,
  Target,
  ArrowRight,
  BookOpen,
  Layers,
} from 'lucide-react';

// Configurable background video for dashboard hero (cinematic mountain landscape)
// Local asset path: backend/video/13772604_3840_2160_60fps.mp4 -> served by Vite from /video/...
const HERO_BACKGROUND_VIDEO_SRC = '/video/13772604_3840_2160_60fps.mp4';

export default function LibraryWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletContext = useOutletContext() || {};
  const globalSearchQuery = outletContext.searchQuery ?? '';
  const setGlobalSearchQuery = outletContext.setSearchQuery ?? (() => {});

  const [folders, setFolders] = useState([]);
  const [decks, setDecks] = useState([]);
  const [overview, setOverview] = useState(outletContext.overview || null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [isSrsForecastOpen, setIsSrsForecastOpen] = useState(false);
  const [srsDeckId, setSrsDeckId] = useState(null);
  const [srsDeckName, setSrsDeckName] = useState(null);
  const { activePlan, todayQueue, refreshPlan, openCreateModal } = useStudyPlan();

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('ll_library_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleUpdateViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ll_library_view_mode', mode);
    } catch {}
  };

  const handleQuickSRSClick = () => {
    setSrsDeckId(null);
    setSrsDeckName(activePlan?.name || 'Lộ trình ôn tập');
    setIsSrsForecastOpen(true);
  };

  // Sorting state
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | name_asc | count_desc

  // Read folder filter state from URL search parameters
  const folderIdParam = searchParams.get('folderId');
  const isUncategorizedParam = searchParams.get('uncategorized') === 'true';

  const selectedFolderId = folderIdParam ? Number(folderIdParam) : null;
  const isUncategorizedSelected = !folderIdParam && isUncategorizedParam;

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const [isDeckFormOpen, setIsDeckFormOpen] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState(null);
  const [deckToMove, setDeckToMove] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);

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

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách thư mục', 'error');
    }
  }, [showToast]);

  // Load decks according to folder filter
  const loadDecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isUncategorizedSelected) {
        params.uncategorized = true;
      } else if (selectedFolderId !== null) {
        params.folderId = selectedFolderId;
      }
      const data = await deckService.getDecks(params);
      setDecks(data || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách bộ từ', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, isUncategorizedSelected, showToast]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Sync overview from outlet context or fetch if missing (BUG-08)
  useEffect(() => {
    if (outletContext.overview) {
      setOverview(outletContext.overview);
    } else {
      analyticsService.getOverview()
        .then((data) => setOverview(data))
        .catch(() => {});
    }
  }, [outletContext.overview]);

  const uncategorizedDeckCount = decks.filter((d) => d.folderId == null).length;

  // Folder actions
  const handleSelectAll = () => {
    setSearchParams({});
  };

  const handleSelectUncategorized = () => {
    setSearchParams({ uncategorized: 'true' });
  };

  const handleSelectFolder = (id) => {
    setSearchParams({ folderId: String(id) });
  };

  const handleCreateOrEditFolder = async (name) => {
    try {
      if (folderToEdit) {
        await folderService.renameFolder(folderToEdit.id, name);
        showToast('Đổi tên thư mục thành công');
      } else {
        await folderService.createFolder(name);
        showToast('Tạo thư mục thành công');
      }
      setIsCreateFolderOpen(false);
      setFolderToEdit(null);
      await loadFolders();
      outletContext.refreshFolders?.();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý thư mục', 'error');
    }
  };

  const handleQuickCreateFolder = async (name) => {
    try {
      const newFolder = await folderService.createFolder(name);
      showToast('Đã tạo thư mục mới');
      await loadFolders();
      outletContext.refreshFolders?.();
      return newFolder;
    } catch (err) {
      showToast(err.message || 'Lỗi tạo thư mục', 'error');
      throw err;
    }
  };

  const handleDeleteFolderConfirm = async (folderId, mode) => {
    try {
      await folderService.deleteFolder(folderId, mode);
      showToast('Xóa thư mục thành công');
      setFolderToDelete(null);
      if (selectedFolderId === folderId) {
        setSearchParams({});
      }
      await loadFolders();
      outletContext.refreshFolders?.();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa thư mục', 'error');
    }
  };

  // Deck actions
  const handleOpenCreateDeck = () => {
    setDeckToEdit(null);
    setIsDeckFormOpen(true);
  };

  const handleOpenEditDeck = async (deck) => {
    try {
      const fullDeck = await deckService.getDeck(deck.id);
      setDeckToEdit(fullDeck);
      setIsDeckFormOpen(true);
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết bộ từ vựng', 'error');
    }
  };

  const handleSaveDeck = async (deckData) => {
    try {
      if (deckToEdit) {
        await deckService.updateDeck(deckToEdit.id, deckData);
        showToast('Cập nhật bộ từ vựng thành công');
      } else {
        const created = await deckService.createDeck(deckData);
        if (deckData.addToStudyPlan && created?.id) {
          try {
            await studyPlanService.addDecksToActivePlan({ deckIds: [created.id] });
            await refreshPlan();
          } catch {
            // Silently ignore if adding to plan fails
          }
        }
        showToast('Tạo bộ từ vựng thành công');
      }
      setIsDeckFormOpen(false);
      setDeckToEdit(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu bộ từ vựng', 'error');
    }
  };

  const handleMoveDeckConfirm = async (deckId, targetFolderId) => {
    try {
      await deckService.moveDeck(deckId, targetFolderId);
      showToast('Chuyển thư mục thành công');
      setDeckToMove(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi chuyển thư mục', 'error');
    }
  };

  const handleDeleteDeckConfirm = async () => {
    if (!deckToDelete) return;
    try {
      await deckService.deleteDeck(deckToDelete.id);
      showToast('Đã xóa bộ từ vựng');
      setDeckToDelete(null);
      await loadFolders();
      await loadDecks();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa bộ từ vựng', 'error');
    }
  };

  // Filter and sort decks
  const filteredAndSortedDecks = useMemo(() => {
    let result = [...decks];

    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc':
          return a.name.localeCompare(b.name, 'vi');
        case 'count_desc':
          return (b.cardCount || 0) - (a.cardCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [decks, globalSearchQuery, sortBy]);

  // Selected folder title
  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const currentFolderName = isUncategorizedSelected
    ? 'Chưa phân loại'
    : currentFolder
    ? currentFolder.name
    : 'Tất cả bộ từ vựng';

  return (
    <div className="library-workspace-page">
      {/* 1. Welcoming Hero Momentum Section (when browsing all decks) */}
      {!selectedFolderId && !isUncategorizedSelected && (
        <div className="library-momentum-hero">
          {/* Full-bleed background video covering the entire hero container */}
          <video
            className="momentum-hero-video"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            preload="metadata"
          >
            <source src={HERO_BACKGROUND_VIDEO_SRC} type="video/mp4" />
          </video>

          {/* Dark gradient overlay for optimal readability & contrast */}
          <div className="momentum-hero-overlay" aria-hidden="true" />

          {/* Hero Foreground Content */}
          <div className="momentum-hero-content">
            <div className="momentum-hero-left">
              <div className="momentum-greeting-pill">
                <Sparkles size={13} className="greeting-sparkle" />
                <span>Chào mừng trở lại, {user?.displayName || user?.username || 'Học viên'}</span>
              </div>

              <h1 className="momentum-hero-title">
                Chinh phục vốn từ vựng<br className="hero-title-break" />
                với phương pháp thông minh.
              </h1>

              <div className="momentum-stats-row">
                <button
                  type="button"
                  className="momentum-stat-chip"
                  onClick={() => navigate('/analytics')}
                  title="Xem thống kê chuỗi ngày"
                >
                  <Flame size={15} className="chip-flame-icon" />
                  <span><strong>{overview?.currentStreak || 0}</strong> ngày streak</span>
                </button>

                <button
                  type="button"
                  className="momentum-stat-chip"
                  onClick={() => navigate('/study-plan')}
                  title="Xem kế hoạch học hôm nay"
                >
                  <Target size={15} className="chip-target-icon" />
                  <span><strong>{todayQueue?.totalWords || 0}</strong> từ cần ôn</span>
                </button>

                <div className="momentum-stat-chip">
                  <BookOpen size={15} className="chip-deck-icon" />
                  <span><strong>{decks.length}</strong> bộ từ vựng</span>
                </div>
              </div>
            </div>

            <div className="momentum-hero-cta">
              <button
                type="button"
                className="momentum-cta-btn"
                onClick={handleOpenCreateDeck}
              >
                <Plus size={16} />
                <span>Tạo bộ thẻ mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header Row (Folder Title & Actions) */}
      <div className="main-page-header-row">
        <div className="main-title-group">
          <div className="main-title-flex">
            <Folder size={22} className="main-folder-title-icon" />
            <h2 className="main-page-title">{currentFolderName}</h2>
          </div>
          <p className="main-page-subtitle">
            {filteredAndSortedDecks.length} bộ từ vựng sẵn sàng
          </p>
        </div>

        <div className="main-header-actions">
          <button
            type="button"
            className="srs-quick-header-btn"
            onClick={handleQuickSRSClick}
            title="Lặp lại ngắt quãng (SM-2)"
          >
            <Sparkles size={15} />
            <span>Lặp lại ngắt quãng</span>
            {todayQueue && todayQueue.totalWords > 0 && (
              <span className="srs-quick-count-badge">{todayQueue.totalWords}</span>
            )}
          </button>

          <button
            type="button"
            className="monochrome-btn-primary"
            onClick={handleOpenCreateDeck}
          >
            <Plus size={15} />
            <span>Tạo bộ từ vựng</span>
          </button>
        </div>
      </div>

      {/* Toolbar Row */}
      <div className="main-toolbar-row">
        <div className="toolbar-search-wrapper">
          <Search size={16} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Tìm kiếm bộ từ vựng..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-sort-wrapper">
          <ArrowUpDown size={15} className="toolbar-sort-icon" />
          <select
            className="toolbar-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sắp xếp bộ từ vựng"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name_asc">A-Z</option>
            <option value="count_desc">Số lượng thẻ</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid vs List */}
        <div className="toolbar-view-toggle">
          <button
            type="button"
            className={`toolbar-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => handleUpdateViewMode('grid')}
            title="Dạng lưới thẻ (Grid View)"
            aria-label="Dạng lưới thẻ"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`toolbar-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => handleUpdateViewMode('list')}
            title="Dạng danh sách (List View)"
            aria-label="Dạng danh sách"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Two-Column Area */}
      <div className="workspace-columns">
        {/* Column A: Left Folder Panel */}
        <FolderPanel
          folders={folders}
          selectedFolderId={selectedFolderId}
          isUncategorizedSelected={isUncategorizedSelected}
          onSelectAll={handleSelectAll}
          onSelectUncategorized={handleSelectUncategorized}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={() => {
            setFolderToEdit(null);
            setIsCreateFolderOpen(true);
          }}
          onEditFolder={(folder) => {
            setFolderToEdit(folder);
            setIsCreateFolderOpen(true);
          }}
          onDeleteFolder={(folder) => setFolderToDelete(folder)}
          totalDeckCount={decks.length}
          uncategorizedDeckCount={uncategorizedDeckCount}
        />

        {/* Column B: Right Deck Area */}
        <DeckList
          decks={filteredAndSortedDecks}
          viewMode={viewMode}
          onCreateDeck={handleOpenCreateDeck}
          onOpenDeck={(deck) => navigate(`/decks/${deck.id}`)}
          onEditDeck={(deck) => handleOpenEditDeck(deck)}
          onMoveDeck={(deck) => setDeckToMove(deck)}
          onDeleteDeck={(deck) => setDeckToDelete(deck)}
          loading={loading}
          isFilteredBySearch={Boolean(globalSearchQuery.trim())}
        />
      </div>

      {/* Modals & Dialogs */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => {
          setIsCreateFolderOpen(false);
          setFolderToEdit(null);
        }}
        onSubmit={handleCreateOrEditFolder}
        folderToEdit={folderToEdit}
      />

      <DeleteFolderModal
        isOpen={Boolean(folderToDelete)}
        onClose={() => setFolderToDelete(null)}
        folder={folderToDelete}
        onConfirm={handleDeleteFolderConfirm}
      />

      <DeckFormModal
        isOpen={isDeckFormOpen}
        onClose={() => {
          setIsDeckFormOpen(false);
          setDeckToEdit(null);
        }}
        onSubmit={handleSaveDeck}
        folders={folders}
        onCreateFolderQuick={handleQuickCreateFolder}
        currentFolderId={selectedFolderId}
        deckToEdit={deckToEdit}
      />

      <MoveDeckModal
        isOpen={Boolean(deckToMove)}
        onClose={() => setDeckToMove(null)}
        deck={deckToMove}
        folders={folders}
        onConfirm={handleMoveDeckConfirm}
      />

      <ConfirmDialog
        isOpen={Boolean(deckToDelete)}
        onClose={() => setDeckToDelete(null)}
        onConfirm={handleDeleteDeckConfirm}
        title="Xóa bộ từ vựng"
        message={`Bạn có chắc chắn muốn xóa bộ từ vựng "${deckToDelete?.name}"? Các thẻ từ và tiến độ học tập gắn liền với bộ từ này sẽ bị xóa vĩnh viễn.`}
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
      />

      {/* SRS Forecast Modal */}
      <SpacedRepetitionForecastModal
        isOpen={isSrsForecastOpen}
        onClose={() => setIsSrsForecastOpen(false)}
        deckId={srsDeckId}
        deckName={srsDeckName}
        onStart={(id) => navigate(id ? `/decks/${id}/srs` : '/study-plan/srs')}
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
