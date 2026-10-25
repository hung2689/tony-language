import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { deckService } from '../../services/deckService';
import { folderService } from '../../services/folderService';
import { computeLibraryBackUrl } from '../../utils/backNavigation';
import { getModeById, resolveStudyModeRoute } from '../../utils/studyModeRegistry';
import { speakEnglishTerm } from '../../utils/speechUtils';
import StudyModeBar from './StudyModeBar';
import FlashcardView from './FlashcardView';
import DeckFormModal from './DeckFormModal';
import MoveDeckModal from './MoveDeckModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import { useStudyPlan } from '../studyplan/StudyPlanContext';
import SpacedRepetitionForecastModal from '../studyplan/SpacedRepetitionForecastModal';
import {
  ArrowLeft,
  Folder as FolderIcon,
  Repeat,
  MoreVertical,
  Edit2,
  FolderInput,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  FolderX,
  Search,
  LayoutGrid,
  List,
  Volume2,
} from 'lucide-react';

export default function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Enforce Study Mode route guard: coming-soon modes cannot be accessed by typing URL
  useEffect(() => {
    if (deckId) {
      const guard = resolveStudyModeRoute(deckId, location.pathname);
      if (guard.redirectTo) {
        navigate(guard.redirectTo, { replace: true });
      }
    }
  }, [deckId, location.pathname, navigate]);

  const [deck, setDeck] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // null | 404 | 500
  const { refreshPlan } = useStudyPlan();

  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Vocabulary inventory search and view mode
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [vocabFilter, setVocabFilter] = useState('all'); // all | has_example | has_ipa
  const [vocabViewMode, setVocabViewMode] = useState('table'); // table | cards

  // Actions menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSrsModalOpen, setIsSrsModalOpen] = useState(false);
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

  // Close actions menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Load folders for move/edit modal
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

  // Load deck details
  const loadDeck = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage('');
    try {
      const data = await deckService.getDeck(deckId);
      setDeck(data);
    } catch (err) {
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Không tìm thấy')) {
        setErrorStatus(404);
      } else {
        setErrorStatus(err.status || 500);
      }
      setErrorMessage(err.message || 'Không thể tải bộ từ vựng.');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Folder name for chip
  const currentFolder = folders.find((f) => f.id === deck?.folderId);
  const folderChipName = deck?.folderId ? currentFolder?.name || 'Thư mục' : 'Chưa phân loại';

  // Handle Edit Deck
  const handleSaveDeck = async (deckData) => {
    try {
      await deckService.updateDeck(deck.id, deckData);
      showToast('Cập nhật bộ từ vựng thành công');
      setIsEditModalOpen(false);
      await loadDeck();
      await loadFolders();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật bộ từ vựng', 'error');
    }
  };

  // Handle Move Deck
  const handleMoveDeckConfirm = async (targetDeckId, targetFolderId) => {
    try {
      await deckService.moveDeck(targetDeckId, targetFolderId);
      showToast('Chuyển thư mục thành công');
      setIsMoveModalOpen(false);
      await loadDeck();
      await loadFolders();
    } catch (err) {
      showToast(err.message || 'Lỗi khi chuyển thư mục', 'error');
    }
  };

  // Handle Delete Deck (BUG-11: refreshPlan after delete)
  const handleDeleteDeckConfirm = async () => {
    try {
      await deckService.deleteDeck(deck.id);
      showToast('Đã xóa bộ từ vựng');
      setIsDeleteConfirmOpen(false);
      try {
        await refreshPlan?.();
      } catch {
        // Safe fallback
      }
      const backUrl = computeLibraryBackUrl(deck);
      navigate(backUrl, { replace: true });
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa bộ từ vựng', 'error');
    }
  };

  // Quick folder create inside modal
  const handleQuickCreateFolder = async (name) => {
    try {
      const newFolder = await folderService.createFolder(name);
      await loadFolders();
      return newFolder;
    } catch (err) {
      showToast(err.message || 'Lỗi tạo thư mục', 'error');
      throw err;
    }
  };

  const cards = useMemo(() => deck?.cards || [], [deck?.cards]);

  const filteredCards = useMemo(() => {
    let result = [...cards];
    if (vocabSearchQuery.trim()) {
      const q = vocabSearchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.term?.toLowerCase().includes(q) ||
          c.definition?.toLowerCase().includes(q) ||
          c.example?.toLowerCase().includes(q) ||
          c.pronunciation?.toLowerCase().includes(q)
      );
    }
    if (vocabFilter === 'has_example') {
      result = result.filter((c) => Boolean(c.example?.trim()));
    } else if (vocabFilter === 'has_ipa') {
      result = result.filter((c) => Boolean(c.pronunciation?.trim()));
    }
    return result;
  }, [cards, vocabSearchQuery, vocabFilter]);

  const backTargetUrl = computeLibraryBackUrl(deck);
  const currentModeInfo = resolveStudyModeRoute(deckId, location.pathname);
  const activeModeId = currentModeInfo.modeId || 'flashcard';

  // Render State 1: Loading
  if (loading) {
    return (
      <div className="deck-detail-state-screen">
        <RefreshCw size={28} className="deck-loading-spinner" />
        <p>Đang tải bộ từ vựng...</p>
      </div>
    );
  }

  // Render State 2: 404 / Not Found or Belongs to another user
  if (errorStatus === 404) {
    return (
      <div className="deck-detail-state-screen">
        <div className="deck-state-icon-box error">
          <FolderX size={36} />
        </div>
        <h2 className="deck-state-title">Không tìm thấy bộ từ</h2>
        <p className="deck-state-desc">
          Bộ từ vựng này không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link to="/" className="monochrome-btn-primary" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          <span>Quay lại thư viện</span>
        </Link>
      </div>
    );
  }

  // Render State 3: Other Error with Retry
  if (errorStatus) {
    return (
      <div className="deck-detail-state-screen">
        <div className="deck-state-icon-box warning">
          <AlertTriangle size={36} />
        </div>
        <h2 className="deck-state-title">Đã xảy ra lỗi</h2>
        <p className="deck-state-desc">{errorMessage || 'Không thể kết nối đến máy chủ.'}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="monochrome-btn-primary" onClick={loadDeck}>
            <RefreshCw size={16} />
            <span>Thử lại</span>
          </button>
          <Link to="/" className="monochrome-btn-secondary" style={{ textDecoration: 'none' }}>
            <span>Về thư viện</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="deck-detail-page">
      {/* 1. Header Row */}
      <header className="deck-detail-header-row">
        {/* Left: Back button + Title & Folder chip */}
        <div className="deck-header-left">
          <button
            type="button"
            className="deck-back-btn"
            onClick={() => navigate(backTargetUrl)}
            title="Quay lại thư viện"
          >
            <ArrowLeft size={18} />
            <span>Quay lại</span>
          </button>

          <div className="deck-title-group">
            <h1 className="deck-detail-title">{deck.name}</h1>
            <span className="deck-folder-chip" title={`Thư mục: ${folderChipName}`}>
              <FolderIcon size={13} />
              <span>{folderChipName}</span>
            </span>
          </div>
        </div>

        {/* Right: SRS Quick button + More actions menu */}
        <div className="deck-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="srs-quick-header-btn"
            onClick={() => setIsSrsModalOpen(true)}
            title="Dự báo và ôn tập lặp lại ngắt quãng (SM-2)"
          >
            <Repeat size={16} />
            <span>Lặp lại ngắt quãng</span>
          </button>

          <div className="deck-more-menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="deck-more-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Tùy chọn bộ từ"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical size={18} />
            </button>

            {isMenuOpen && (
              <div className="deck-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="deck-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  role="menuitem"
                >
                  <Edit2 size={15} />
                  <span>Chỉnh sửa bộ từ</span>
                </button>

                <button
                  type="button"
                  className="deck-dropdown-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsMoveModalOpen(true);
                  }}
                  role="menuitem"
                >
                  <FolderInput size={15} />
                  <span>Chuyển thư mục</span>
                </button>

                <div className="deck-dropdown-divider" />

                <button
                  type="button"
                  className="deck-dropdown-item is-danger"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  role="menuitem"
                >
                  <Trash2 size={15} />
                  <span>Xóa bộ từ</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Study Mode Bar directly above the Flashcard */}
      <StudyModeBar deckId={deck.id} activeModeId={activeModeId} />

      {/* 3. Main Body: Flashcard or Empty State */}
      <main className="deck-detail-content">
        {cards.length === 0 ? (
          /* Empty Deck State */
          <div className="deck-empty-cards-box">
            <div className="empty-cards-icon-wrap">
              <Plus size={32} />
            </div>
            <h2 className="empty-cards-title">Bộ từ chưa có thẻ nào</h2>
            <p className="empty-cards-desc">
              Hãy thêm từ vựng, phiên âm và ví dụ vào bộ từ này để bắt đầu học flashcard.
            </p>
            <button
              type="button"
              className="monochrome-btn-primary"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Plus size={16} />
              <span>Thêm thẻ</span>
            </button>
          </div>
        ) : (
          (() => {
            const ActiveComponent = getModeById(activeModeId)?.component || FlashcardView;
            return (
              <ActiveComponent
                cards={cards}
                deck={deck}
                onToast={showToast}
                onBackToCard={() => navigate(`/decks/${deck.id}`)}
              />
            );
          })()
        )}
      </main>

      {/* 4. Vocabulary Inventory Section (Search, Filter, Table/Grid View) */}
      {cards.length > 0 && (
        <section className="deck-vocab-inventory-section">
          <div className="vocab-inventory-header">
            <div className="vocab-inventory-title-group">
              <h2 className="vocab-inventory-title">Từ vựng trong bộ này</h2>
              <span className="vocab-count-badge">
                {filteredCards.length} / {cards.length} thẻ
              </span>
            </div>

            {/* View Switcher: Table vs Cards */}
            <div className="vocab-view-switcher">
              <button
                type="button"
                className={`vocab-view-btn ${vocabViewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => setVocabViewMode('table')}
                title="Dạng bảng chi tiết"
                aria-label="Dạng bảng chi tiết"
              >
                <List size={16} />
                <span>Bảng</span>
              </button>
              <button
                type="button"
                className={`vocab-view-btn ${vocabViewMode === 'cards' ? 'is-active' : ''}`}
                onClick={() => setVocabViewMode('cards')}
                title="Dạng thẻ lưới"
                aria-label="Dạng thẻ lưới"
              >
                <LayoutGrid size={16} />
                <span>Thẻ</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="vocab-inventory-toolbar">
            <div className="vocab-search-box">
              <Search size={16} className="vocab-search-icon" />
              <input
                type="text"
                className="vocab-search-input"
                placeholder="Tìm từ vựng, nghĩa, ví dụ..."
                value={vocabSearchQuery}
                onChange={(e) => setVocabSearchQuery(e.target.value)}
              />
              {vocabSearchQuery && (
                <button
                  type="button"
                  className="vocab-search-clear-btn"
                  onClick={() => setVocabSearchQuery('')}
                  title="Xóa tìm kiếm"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="vocab-filter-chips">
              <button
                type="button"
                className={`vocab-filter-chip ${vocabFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setVocabFilter('all')}
              >
                Tất cả ({cards.length})
              </button>
              <button
                type="button"
                className={`vocab-filter-chip ${vocabFilter === 'has_example' ? 'is-active' : ''}`}
                onClick={() => setVocabFilter('has_example')}
              >
                Có ví dụ ({cards.filter((c) => Boolean(c.example?.trim())).length})
              </button>
              <button
                type="button"
                className={`vocab-filter-chip ${vocabFilter === 'has_ipa' ? 'is-active' : ''}`}
                onClick={() => setVocabFilter('has_ipa')}
              >
                Có phiên âm ({cards.filter((c) => Boolean(c.pronunciation?.trim())).length})
              </button>
            </div>
          </div>

          {/* Vocabulary Content: Table or Grid */}
          {filteredCards.length === 0 ? (
            <div className="vocab-inventory-empty">
              <p>Không tìm thấy từ vựng nào khớp với bộ lọc.</p>
            </div>
          ) : vocabViewMode === 'table' ? (
            <div className="vocab-table-container">
              <table className="vocab-inventory-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px' }}>#</th>
                    <th style={{ width: '22%' }}>Thuật ngữ (Tiếng Anh)</th>
                    <th style={{ width: '12%' }}>Loại từ</th>
                    <th style={{ width: '18%' }}>Phiên âm</th>
                    <th style={{ width: '24%' }}>Định nghĩa</th>
                    <th>Ví dụ câu</th>
                    <th style={{ width: '56px', textAlign: 'center' }}>Nghe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card, idx) => (
                    <tr key={card.id || idx}>
                      <td className="vocab-col-index">{idx + 1}</td>
                      <td className="vocab-col-term">
                        <span className="vocab-term-text">{card.term}</span>
                      </td>
                      <td className="vocab-col-pos">
                        {card.partOfSpeech && (
                          <span className="vocab-pos-pill">{card.partOfSpeech}</span>
                        )}
                      </td>
                      <td className="vocab-col-ipa">
                        {card.pronunciation ? `/${card.pronunciation}/` : '—'}
                      </td>
                      <td className="vocab-col-def">{card.definition}</td>
                      <td className="vocab-col-example">
                        {card.example ? <span className="vocab-example-italic">"{card.example}"</span> : '—'}
                      </td>
                      <td className="vocab-col-audio">
                        <button
                          type="button"
                          className="vocab-audio-btn"
                          onClick={() => speakEnglishTerm(card.term, (msg) => showToast(msg, 'warning'))}
                          title={`Nghe phát âm "${card.term}"`}
                          aria-label={`Nghe phát âm ${card.term}`}
                        >
                          <Volume2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="vocab-cards-grid">
              {filteredCards.map((card, idx) => (
                <div key={card.id || idx} className="vocab-item-card">
                  <div className="vocab-card-header">
                    <div className="vocab-card-term-wrap">
                      <span className="vocab-card-term">{card.term}</span>
                      {card.partOfSpeech && (
                        <span className="vocab-pos-pill">{card.partOfSpeech}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="vocab-audio-btn"
                      onClick={() => speakEnglishTerm(card.term, (msg) => showToast(msg, 'warning'))}
                      title="Nghe phát âm"
                      aria-label="Nghe phát âm"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  {card.pronunciation && (
                    <div className="vocab-card-ipa">/{card.pronunciation}/</div>
                  )}
                  <div className="vocab-card-def">{card.definition}</div>
                  {card.example && (
                    <div className="vocab-card-example">"{card.example}"</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modals & Dialogs */}
      {/* SRS Forecast Modal */}
      <SpacedRepetitionForecastModal
        isOpen={isSrsModalOpen}
        onClose={() => setIsSrsModalOpen(false)}
        deckId={deck.id}
        deckName={deck.name}
        onStart={(id) => navigate(`/decks/${id}/srs`)}
      />

      <DeckFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveDeck}
        folders={folders}
        onCreateFolderQuick={handleQuickCreateFolder}
        currentFolderId={deck.folderId}
        deckToEdit={deck}
      />

      <MoveDeckModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        deck={deck}
        folders={folders}
        onConfirm={handleMoveDeckConfirm}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteDeckConfirm}
        title="Xóa bộ từ vựng"
        message={`Bạn có chắc chắn muốn xóa bộ từ vựng "${deck.name}"? Các thẻ từ vựng và tiến độ học tập gắn liền với bộ từ này sẽ bị xóa vĩnh viễn.`}
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
      />

      {/* Toast */}
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
