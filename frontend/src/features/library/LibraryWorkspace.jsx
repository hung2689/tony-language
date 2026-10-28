import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { folderService } from '../../services/folderService';
import { deckService } from '../../services/deckService';
import { profileService } from '../profile/profileService';
import CreateFolderModal from '../folders/CreateFolderModal';
import DeleteFolderModal from '../folders/DeleteFolderModal';
import DeckFormModal from '../decks/DeckFormModal';
import MoveDeckModal from '../decks/MoveDeckModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import { useStudyPlan } from '../studyplan/StudyPlanContext';
import SpacedRepetitionForecastModal from '../studyplan/SpacedRepetitionForecastModal';
import { useAuth } from '../auth/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import {
  Folder,
  ArrowUpDown,
  Plus,
  LayoutGrid,
  List,
  Layers,
  CheckCircle2,
  Heart,
  MoreVertical,
  Edit2,
  FolderInput,
  Trash2,
  BookOpen,
  ChevronDown,
  ScrollText,
  Compass,
} from 'lucide-react';
import ExplorerSidebar from './components/ExplorerSidebar';
import { MAP_DESTINATIONS, LEXICON_ASSETS } from './lexiconMapData';
import './RpgLibraryWorkspace.css';

export default function LibraryWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const outletContext = useOutletContext() || {};
  const globalSearchQuery = outletContext.searchQuery ?? '';

  const [folders, setFolders] = useState([]);
  const [decks, setDecks] = useState([]);
  const [overview, setOverview] = useState(outletContext.overview || null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const ledgerSectionRef = useRef(null);

  const [isSrsForecastOpen, setIsSrsForecastOpen] = useState(false);
  const [srsDeckId, setSrsDeckId] = useState(null);
  const [srsDeckName, setSrsDeckName] = useState(null);
  const { activePlan, refreshPlan, openCreateModal, openAddDecksModal } = useStudyPlan();

  // Destination filter if navigated from Map page (e.g. /library?destination=mountains-of-discovery)
  const destinationParam = searchParams.get('destination');
  const activeDestination = useMemo(() => {
    if (destinationParam) {
      return MAP_DESTINATIONS.find((d) => d.id === destinationParam) || null;
    }
    return null;
  }, [destinationParam]);

  // Active Left Sidebar Item
  const [activeSidebarItem, setActiveSidebarItem] = useState('my_vocabulary');

  // Favorite deck IDs persisted in localStorage
  const [favoriteDeckIds, setFavoriteDeckIds] = useState(() => {
    try {
      const raw = localStorage.getItem('ll_favorite_decks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Active deck context menu id
  const [openDeckMenuId, setOpenDeckMenuId] = useState(null);
  const deckMenuRef = useRef(null);

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

  // Read folder / category filter state from URL search parameters
  const folderIdParam = searchParams.get('folderId');
  const filterParam = searchParams.get('filter'); // 'all' | 'uncategorized' | 'learned' | 'favorite'
  const isUncategorizedParam = searchParams.get('uncategorized') === 'true';

  const selectedFolderId = folderIdParam ? Number(folderIdParam) : null;
  const activeCategory = useMemo(() => {
    if (selectedFolderId !== null) return `folder_${selectedFolderId}`;
    if (isUncategorizedParam || filterParam === 'uncategorized') return 'uncategorized';
    if (filterParam === 'learned') return 'learned';
    if (filterParam === 'favorite') return 'favorite';
    if (filterParam === 'all') return 'all';
    return 'uncategorized_default';
  }, [selectedFolderId, isUncategorizedParam, filterParam]);

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

  // Toggle rpg-library-active on document.body for scoped parchment theme & header
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
    };
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Close deck dropdown on outside click
  useEffect(() => {
    if (!openDeckMenuId) return;
    const handleClickOutside = (e) => {
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target)) {
        setOpenDeckMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDeckMenuId]);

  // Fetch live user profile and tier/level info
  useEffect(() => {
    let ignore = false;
    profileService
      .getProfile()
      .then((data) => {
        if (!ignore && data) {
          setUserProfile(data);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
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
      if (activeCategory === 'uncategorized') {
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
  }, [selectedFolderId, activeCategory, showToast]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Sync overview from outlet context or fetch if missing
  useEffect(() => {
    if (outletContext.overview) {
      setOverview(outletContext.overview);
    } else {
      analyticsService
        .getOverview()
        .then((data) => setOverview(data))
        .catch(() => {});
    }
  }, [outletContext.overview]);

  // Category selection handlers
  const handleSelectUncategorized = () => {
    setSearchParams({ uncategorized: 'true' });
  };

  const handleSelectAll = () => {
    setSearchParams({ filter: 'all' });
  };

  const handleSelectLearned = () => {
    setSearchParams({ filter: 'learned' });
  };

  const handleSelectFavorite = () => {
    setSearchParams({ filter: 'favorite' });
  };

  const handleSelectFolder = (id) => {
    setSearchParams({ folderId: String(id) });
  };

  const scrollToLedger = () => {
    ledgerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Left Sidebar Navigation Handler
  const handleSidebarNavigation = (navId, path) => {
    setActiveSidebarItem(navId);
    if (navId === 'my_vocabulary') {
      handleSelectAll();
      return;
    }
    if (path) {
      navigate(path);
    }
  };

  const toggleFavoriteDeck = (e, deckId) => {
    e.stopPropagation();
    setFavoriteDeckIds((prev) => {
      const next = prev.includes(deckId) ? prev.filter((id) => id !== deckId) : [...prev, deckId];
      try {
        localStorage.setItem('ll_favorite_decks', JSON.stringify(next));
      } catch {}
      return next;
    });
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
        await deckService.createDeck(deckData);
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

    if (activeCategory === 'uncategorized') {
      result = result.filter((d) => d.folderId == null);
    } else if (activeCategory === 'learned') {
      result = result.filter((d) => (d.learnedCount || d.masteredCount || d.cardCount || 0) > 0);
    } else if (activeCategory === 'favorite') {
      result = result.filter((d) => favoriteDeckIds.includes(d.id));
    }

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
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '', 'vi');
        case 'count_desc':
          return (b.cardCount || 0) - (a.cardCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [decks, activeCategory, favoriteDeckIds, globalSearchQuery, sortBy]);

  // Compute Explorer Stats (using real data when available, with reference fallbacks)
  const playerLevel =
    userProfile?.levelInfo?.level ?? userProfile?.level ?? user?.level ?? 1;
  const rawStreak = overview?.currentStreak ?? userProfile?.streak ?? 0;
  const playerStreak = rawStreak > 0 ? rawStreak : 7;
  const xpIntoLevel = userProfile?.xpIntoLevel ?? 380;
  const xpForNext = userProfile?.xpForNext ?? 600;
  const expPercent = Math.min(
    100,
    Math.max(15, Math.round((xpIntoLevel / Math.max(1, xpForNext)) * 100))
  );

  const totalCardsInDecks = useMemo(
    () => decks.reduce((acc, d) => acc + (Number(d.cardCount) || 0), 0),
    [decks]
  );
  const wordsLearnedCount =
    (userProfile?.stats?.wordsStudied || 0) > 0
      ? userProfile.stats.wordsStudied
      : totalCardsInDecks > 0
      ? totalCardsInDecks
      : 248;

  // Daily Quests live values
  const wordsStudiedToday = userProfile?.stats?.wordsStudied ?? 0;
  const reviewsDoneToday = Math.min(10, Math.floor((userProfile?.stats?.totalAnswers || 0) / 10));

  return (
    <div className="lexicon-journal-shell rpg-library-container">
      {/* ====================================================================
          REGION B: LEFT PARCHMENT NAVIGATION SIDEBAR
          ==================================================================== */}
      <ExplorerSidebar
        activeNav={activeSidebarItem}
        onSelectNav={handleSidebarNavigation}
      />

      {/* ====================================================================
          MAIN EXPLORER WORKSPACE (Collections Ledger)
          ==================================================================== */}
      <div className="lexicon-journal-main library-page-main" ref={ledgerSectionRef}>
        {/* ====================================================================
            VOCABULARY COLLECTIONS LEDGER & DAILY EXPEDITION QUESTS
            ==================================================================== */}
        <section
          className="journal-ledger-section"
          aria-label="Mục lục bộ từ vựng và tiến trình học tập"
        >
          <div className="journal-ledger-header">
            <div className="journal-ledger-title-wrap">
              <img
                src={LEXICON_ASSETS.decor.vocabularyBook}
                alt=""
                className="journal-ledger-book-img"
              />
              <div>
                <h1 className="journal-section-title">
                  {activeDestination ? `${activeDestination.title} • Bộ từ vựng` : 'Từ vựng của tôi'}
                </h1>
                <span className="journal-section-subtitle">
                  {activeDestination
                    ? `${activeDestination.subtitle} — Quản lý thư mục, bộ thẻ ghi nhớ và tiến trình học tập`
                    : 'Quản lý các thư mục, bộ thẻ ghi nhớ và lộ trình ôn tập cá nhân'}
                </span>
              </div>
            </div>

            {/* Sort Dropdown, Grid/List View Toggle & New Collection Button */}
            <div className="rpg-cards-toolbar">
              <button
                type="button"
                className="journal-primary-cta-btn"
                onClick={handleOpenCreateDeck}
              >
                <Plus size={15} />
                <span>Tạo bộ thẻ mới</span>
              </button>

              <div className="rpg-sort-pill-wrap">
                <ArrowUpDown size={13} className="rpg-sort-icon-left" />
                <select
                  className="rpg-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sắp xếp bộ từ vựng"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="name_asc">Tên (A-Z)</option>
                  <option value="count_desc">Số lượng thẻ</option>
                </select>
                <ChevronDown size={13} className="rpg-sort-icon-right" />
              </div>

              <div className="rpg-view-toggle-group">
                <button
                  type="button"
                  className={`rpg-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => handleUpdateViewMode('grid')}
                  title="Chế độ lưới"
                  aria-label="Chế độ lưới"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  className={`rpg-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => handleUpdateViewMode('list')}
                  title="Chế độ danh sách"
                  aria-label="Chế độ danh sách"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="rpg-library-workspace-box">
            <div className="rpg-workspace-split">
              {/* Left Index / Category & Folder Sidebar */}
              <aside className="rpg-category-sidebar" aria-label="Danh mục bộ từ">
                <div className="journal-index-heading">MỤC LỤC BỘ TỪ</div>
                <nav className="rpg-category-nav">
                  <button
                    type="button"
                    className={`rpg-cat-item ${
                      activeCategory === 'uncategorized_default' ||
                      activeCategory === 'uncategorized'
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={handleSelectUncategorized}
                  >
                    <Folder size={15} className="rpg-cat-icon" />
                    <span className="rpg-cat-name">Chưa phân loại</span>
                  </button>

                  <button
                    type="button"
                    className={`rpg-cat-item ${activeCategory === 'all' ? 'is-active' : ''}`}
                    onClick={handleSelectAll}
                  >
                    <Layers size={15} className="rpg-cat-icon" />
                    <span className="rpg-cat-name">Tất cả bộ thẻ</span>
                  </button>

                  <button
                    type="button"
                    className={`rpg-cat-item ${activeCategory === 'learned' ? 'is-active' : ''}`}
                    onClick={handleSelectLearned}
                  >
                    <CheckCircle2 size={15} className="rpg-cat-icon" />
                    <span className="rpg-cat-name">Đã học gần đây</span>
                  </button>

                  <button
                    type="button"
                    className={`rpg-cat-item ${activeCategory === 'favorite' ? 'is-active' : ''}`}
                    onClick={handleSelectFavorite}
                  >
                    <Heart size={15} className="rpg-cat-icon" />
                    <span className="rpg-cat-name">Yêu thích</span>
                  </button>

                  {/* Custom User Folders */}
                  {folders.length > 0 && <div className="rpg-cat-divider" />}
                  {folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    return (
                      <div
                        key={folder.id}
                        className={`rpg-cat-item rpg-user-folder-item ${
                          isSelected ? 'is-active' : ''
                        }`}
                        onClick={() => handleSelectFolder(folder.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="rpg-cat-left">
                          <Folder size={15} className="rpg-cat-icon" />
                          <span className="rpg-cat-name" title={folder.name}>
                            {folder.name}
                          </span>
                        </div>
                        <div
                          className="rpg-folder-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="rpg-folder-mini-btn"
                            onClick={() => {
                              setFolderToEdit(folder);
                              setIsCreateFolderOpen(true);
                            }}
                            title="Đổi tên thư mục"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            className="rpg-folder-mini-btn is-danger"
                            onClick={() => setFolderToDelete(folder)}
                            title="Xóa thư mục"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="rpg-add-folder-subtle-btn"
                    onClick={() => {
                      setFolderToEdit(null);
                      setIsCreateFolderOpen(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>Thư mục mới</span>
                  </button>
                </nav>

                {/* Daily Quests Mini Panel inside Ledger Sidebar */}
                <div className="journal-mini-quests-box">
                  <div className="journal-index-heading">NHIỆM VỤ HẰNG NGÀY</div>
                  <button
                    type="button"
                    className="journal-mini-quest-item"
                    onClick={() => {
                      if (decks.length > 0) navigate(`/decks/${decks[0].id}`);
                      else handleOpenCreateDeck();
                    }}
                  >
                    <span>Học 10 từ mới ({Math.min(10, wordsStudiedToday)}/10)</span>
                    <strong>+10 XP</strong>
                  </button>
                  <button
                    type="button"
                    className="journal-mini-quest-item"
                    onClick={handleQuickSRSClick}
                  >
                    <span>Ôn tập SRS ({reviewsDoneToday}/10)</span>
                    <strong>+10 XP</strong>
                  </button>
                </div>
              </aside>

              {/* Right Vocabulary Cards Content Area */}
              <div className="rpg-cards-content-area">
                {loading ? (
                  <div className="rpg-empty-decks">
                    <p className="rpg-empty-desc">Đang tải danh sách bộ từ vựng...</p>
                  </div>
                ) : filteredAndSortedDecks.length === 0 ? (
                  <div className="rpg-empty-decks">
                    <BookOpen size={34} className="journal-empty-icon" />
                    <h3 className="rpg-empty-title">Chưa có bộ từ vựng nào</h3>
                    <p className="rpg-empty-desc">
                      {globalSearchQuery.trim()
                        ? 'Không tìm thấy bộ từ vựng nào khớp với từ khóa tìm kiếm.'
                        : 'Hãy tạo bộ từ vựng mới để bắt đầu cuộc hành trình khám phá!'}
                    </p>
                    <button
                      type="button"
                      className="rpg-empty-create-btn"
                      onClick={handleOpenCreateDeck}
                    >
                      <Plus size={15} />
                      <span>Tạo bộ thẻ mới</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'list' ? 'rpg-decks-list-mode' : 'rpg-decks-grid'
                    }
                  >
                    {filteredAndSortedDecks.map((deck) => {
                      const isMenuOpen = openDeckMenuId === deck.id;
                      const isFav = favoriteDeckIds.includes(deck.id);
                      return (
                        <div
                          key={deck.id}
                          className="rpg-deck-card"
                          onClick={() => navigate(`/decks/${deck.id}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') navigate(`/decks/${deck.id}`);
                          }}
                        >
                          {/* Top Row: Folder Pill + 3-Dot Action Menu */}
                          <div className="rpg-deck-card-header">
                            <span className="rpg-deck-folder-pill">
                              <Folder size={12} />
                              <span>{deck.folderName || 'Chưa phân loại'}</span>
                            </span>

                            <div
                              className="rpg-deck-menu-wrap"
                              ref={isMenuOpen ? deckMenuRef : null}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="rpg-deck-more-btn"
                                onClick={() =>
                                  setOpenDeckMenuId((prev) =>
                                    prev === deck.id ? null : deck.id
                                  )
                                }
                                title="Tùy chọn bộ thẻ"
                                aria-label="Tùy chọn bộ thẻ"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {isMenuOpen && (
                                <div className="rpg-deck-dropdown">
                                  <button
                                    type="button"
                                    className="rpg-deck-dropdown-item"
                                    onClick={() => {
                                      setOpenDeckMenuId(null);
                                      if (activePlan) {
                                        const isEnrolled = (activePlan.decks || []).some(
                                          (d) => d.id === deck.id
                                        );
                                        if (isEnrolled) navigate('/study-plan');
                                        else openAddDecksModal([deck.id]);
                                      } else {
                                        openCreateModal(deck.id);
                                      }
                                    }}
                                  >
                                    <BookOpen size={14} />
                                    <span>
                                      {activePlan ? 'Lộ trình ôn tập' : 'Tạo lộ trình ôn tập'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="rpg-deck-dropdown-item"
                                    onClick={(e) => {
                                      setOpenDeckMenuId(null);
                                      toggleFavoriteDeck(e, deck.id);
                                    }}
                                  >
                                    <Heart size={14} />
                                    <span>{isFav ? 'Bỏ yêu thích' : 'Yêu thích'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="rpg-deck-dropdown-item"
                                    onClick={() => {
                                      setOpenDeckMenuId(null);
                                      handleOpenEditDeck(deck);
                                    }}
                                  >
                                    <Edit2 size={14} />
                                    <span>Chỉnh sửa bộ thẻ</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="rpg-deck-dropdown-item"
                                    onClick={() => {
                                      setOpenDeckMenuId(null);
                                      setDeckToMove(deck);
                                    }}
                                  >
                                    <FolderInput size={14} />
                                    <span>Chuyển thư mục</span>
                                  </button>

                                  <div className="rpg-deck-dropdown-divider" />

                                  <button
                                    type="button"
                                    className="rpg-deck-dropdown-item is-danger"
                                    onClick={() => {
                                      setOpenDeckMenuId(null);
                                      setDeckToDelete(deck);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    <span>Xóa bộ thẻ</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Illustrated Book Icon + Deck Title & Description */}
                          <div className="rpg-deck-body-row">
                            <div className="journal-deck-icon-seal">
                              <img
                                src={LEXICON_ASSETS.decor.vocabularyBook}
                                alt=""
                                className="journal-deck-illust-img"
                              />
                            </div>
                            <div className="rpg-deck-text-col">
                              <h3 className="rpg-deck-title" title={deck.name}>
                                {deck.name}
                              </h3>
                              <p className="rpg-deck-description">
                                {deck.description ||
                                  'Khám phá và làm chủ các thẻ từ vựng trong bộ thẻ này.'}
                              </p>
                            </div>
                          </div>

                          {/* Footer: Card count & Explore link */}
                          <div className="journal-deck-footer">
                            <span className="journal-deck-card-count">
                              {deck.cardCount || 0} từ
                            </span>
                            <span className="journal-deck-open-link">
                              Học ngay &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          MODALS & DIALOGS
          ==================================================================== */}
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
        onStartReview={() => {
          setIsSrsForecastOpen(false);
          if (activePlan) {
            navigate('/study-plan/learn');
          } else {
            refreshPlan?.();
            navigate('/study-plan');
          }
        }}
      />

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
