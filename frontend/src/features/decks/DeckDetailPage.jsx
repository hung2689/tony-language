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
import Ripple from '../../components/common/Ripple';
import './DeckDetailPage.css';
import {
  ArrowLeft,
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

  // Scoped class on body for vintage pirate parchment theme
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    document.body.classList.add('deck-vintage-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
      document.body.classList.remove('deck-vintage-active');
    };
  }, []);

  // Enforce Study Mode route guard
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
  const [errorStatus, setErrorStatus] = useState(null);
  const { refreshPlan } = useStudyPlan();

  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Vocabulary inventory search and view mode
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [vocabFilter, setVocabFilter] = useState('all');
  const [vocabViewMode, setVocabViewMode] = useState('table');

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

  // Load folders
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

  // Loading State
  if (loading) {
    return (
      <div className="deck-detail-state-screen">
        <Ripple size={48} color="#8A7152" />
        <p style={{ marginTop: '14px', color: '#5C4F3E', fontSize: '14px', fontFamily: 'Georgia, serif' }}>
          Đang lật mở trang nhật ký từ vựng...
        </p>
      </div>
    );
  }

  // 404 Not Found State
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
        <Link to="/library" className="monochrome-btn-primary" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          <span>Quay lại thư viện</span>
        </Link>
      </div>
    );
  }

  // Other Error State
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
          <Link to="/library" className="monochrome-btn-secondary" style={{ textDecoration: 'none' }}>
            <span>Về thư viện</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!deck) return null;

  return (
    <div className="deck-page-shell lexicon-journal-shell">
      {/* Main Deck Journal Content */}
      <div className="deck-page-main lexicon-journal-main">
        {/* Top Header Row with Vintage Pirate Navigation */}
        <header className="vintage-deck-header-row">
          {/* Left: Vintage Back Button */}
          <button
            type="button"
            className="vintage-header-back-btn"
            onClick={() => navigate(backTargetUrl)}
            title="Quay lại thư viện"
            aria-label="Quay lại thư viện"
          >
            <img src="/assets/flashcard/button-back.png" alt="Quay lại" />
          </button>

          {/* Center: Classic Ornamental Book Title (───• 📖 Tên bộ từ •───) */}
          <div className="vintage-header-title-ribbon" title={deck.name}>
            <span className="vintage-title-flourish is-left" aria-hidden="true">
              <span className="flourish-line" />
              <span className="flourish-diamond">◆</span>
              <span className="flourish-dot">•</span>
            </span>
            <div className="vintage-ribbon-content">
              <img
                src="/assets/decor_icon/decor_vocabulary_book.png"
                alt=""
                className="vintage-title-book-icon"
              />
              <h1 className="vintage-ribbon-text">{deck.name || 'Từ vựng của tôi'}</h1>
            </div>
            <span className="vintage-title-flourish is-right" aria-hidden="true">
              <span className="flourish-dot">•</span>
              <span className="flourish-diamond">◆</span>
              <span className="flourish-line" />
            </span>
          </div>

          {/* Right: SRS Quick Button & Options Menu */}
          <div className="vintage-header-right-actions">
            <button
              type="button"
              className="vintage-header-srs-btn"
              onClick={() => setIsSrsModalOpen(true)}
              title="Dự báo và ôn tập lặp lại ngắt quãng (SM-2)"
              aria-label="Lặp lại ngắt quãng"
            >
              <img src="/assets/flashcard/button-srs.png" alt="Lặp lại ngắt quãng" />
            </button>

            <div className="vintage-more-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="vintage-header-more-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Tùy chọn bộ từ"
                aria-expanded={isMenuOpen}
              >
                <img src="/assets/flashcard/button-more.png" alt="Tùy chọn" />
              </button>

              {isMenuOpen && (
                <div className="vintage-dropdown-menu deck-dropdown-menu" role="menu">
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

        {/* 3. Study Mode Bar (3x2 Vintage Categories Grid) */}
        <StudyModeBar deckId={deck.id} activeModeId={activeModeId} cardCount={cards.length} />

        {/* 4. Active Study Mode or Empty State */}
        <main className="deck-detail-content" style={{ width: '100%' }}>
          {cards.length === 0 ? (
            <div className="deck-empty-cards-box" style={{ background: '#FAF1DE', border: '1.5px dashed #A68D6C', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
              <div className="empty-cards-icon-wrap" style={{ display: 'inline-flex', padding: '12px', background: '#EFE0C2', borderRadius: '50%', marginBottom: '14px' }}>
                <Plus size={32} color="#4C3C2A" />
              </div>
              <h2 className="empty-cards-title" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#2C1A0E', fontSize: '20px', marginBottom: '8px' }}>
                Bộ từ chưa có thẻ nào
              </h2>
              <p className="empty-cards-desc" style={{ color: '#5C4F3E', fontSize: '14px', maxWidth: '420px', margin: '0 auto 18px' }}>
                Hãy thêm từ vựng, phiên âm và ví dụ vào bộ từ này để bắt đầu hành trình thám hiểm ngôn ngữ.
              </p>
              <button
                type="button"
                className="monochrome-btn-primary"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Plus size={16} />
                <span>Thêm thẻ từ vựng</span>
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

        {/* 5. Vocabulary Inventory Section */}
        {cards.length > 0 && (
          <section className="vintage-vocab-section deck-vocab-inventory-section" aria-label="Từ vựng trong bộ này">
            <div className="vintage-vocab-header vocab-inventory-header">
              <div className="vintage-vocab-title-wrap vocab-inventory-title-group">
                <h2 className="vintage-vocab-title vocab-inventory-title">Từ vựng trong bộ này</h2>
                <span className="vintage-vocab-badge vocab-count-badge">
                  {filteredCards.length} / {cards.length} thẻ
                </span>
              </div>

              {/* View Switcher: Table vs Cards */}
              <div className="vocab-view-switcher" style={{ display: 'flex', gap: '6px' }}>
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
            <div className="vintage-vocab-search-row vocab-inventory-toolbar">
              <div className="vintage-vocab-search-box vocab-search-box">
                <Search size={16} color="#7A6245" className="vocab-search-icon" />
                <input
                  type="text"
                  className="vintage-vocab-search-input vocab-search-input"
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

              <div className="vocab-filter-chips" style={{ display: 'flex', gap: '8px' }}>
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

            {/* Table or Card View */}
            {filteredCards.length === 0 ? (
              <div className="vocab-inventory-empty" style={{ textAlign: 'center', padding: '24px', color: '#6B553B' }}>
                <p>Không tìm thấy từ vựng nào khớp với bộ lọc.</p>
              </div>
            ) : vocabViewMode === 'table' ? (
              <div className="vintage-vocab-table-wrap vocab-table-container">
                <table className="vintage-vocab-table vocab-inventory-table">
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
                          <strong style={{ color: '#26170A' }}>{card.term}</strong>
                        </td>
                        <td className="vocab-col-pos">
                          {card.partOfSpeech && (
                            <span className="vocab-pos-pill">{card.partOfSpeech}</span>
                          )}
                        </td>
                        <td className="vocab-col-ipa" style={{ fontStyle: 'italic', color: '#634C31' }}>
                          {card.pronunciation ? `/${String(card.pronunciation).replace(/^\/+|\/+$/g, '').trim()}/` : '—'}
                        </td>
                        <td className="vocab-col-def">{card.definition}</td>
                        <td className="vocab-col-example" style={{ fontStyle: 'italic', color: '#5C4F3E' }}>
                          {card.example ? `"${card.example}"` : '—'}
                        </td>
                        <td className="vocab-col-audio" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="vintage-vocab-audio-btn vocab-audio-btn"
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
                  <div key={card.id || idx} className="vocab-item-card" style={{ background: '#FAF2E3', border: '1px solid #A48D6C', borderRadius: '8px', padding: '14px' }}>
                    <div className="vocab-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div className="vocab-card-term-wrap">
                        <strong style={{ fontSize: '16px', color: '#26170A' }}>{card.term}</strong>
                        {card.partOfSpeech && (
                          <span className="vocab-pos-pill" style={{ marginLeft: '8px' }}>{card.partOfSpeech}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="vintage-vocab-audio-btn vocab-audio-btn"
                        onClick={() => speakEnglishTerm(card.term, (msg) => showToast(msg, 'warning'))}
                        title="Nghe phát âm"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                    {card.pronunciation && (
                      <div className="vocab-card-ipa" style={{ fontStyle: 'italic', color: '#634C31', marginBottom: '6px', fontSize: '13px' }}>
                        /{String(card.pronunciation).replace(/^\/+|\/+$/g, '').trim()}/
                      </div>
                    )}
                    <div className="vocab-card-def" style={{ color: '#2E2215', marginBottom: '6px', fontSize: '14px' }}>
                      {card.definition}
                    </div>
                    {card.example && (
                      <div className="vocab-card-example" style={{ fontStyle: 'italic', color: '#5C4F3E', fontSize: '12.5px' }}>
                        "{card.example}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modals & Dialogs (Rendered at root of shell so fixed overlays are never trapped inside main column) */}
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
