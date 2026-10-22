import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { deckService } from '../../services/deckService';
import { folderService } from '../../services/folderService';
import { computeLibraryBackUrl } from '../../utils/backNavigation';
import { getModeById, resolveStudyModeRoute } from '../../utils/studyModeRegistry';
import StudyModeBar from './StudyModeBar';
import FlashcardView from './FlashcardView';
import DeckFormModal from './DeckFormModal';
import MoveDeckModal from './MoveDeckModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import {
  ArrowLeft,
  Folder as FolderIcon,
  Calendar,
  MoreVertical,
  Edit2,
  FolderInput,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  FolderX,
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
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Actions menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

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

  // Handle Delete Deck
  const handleDeleteDeckConfirm = async () => {
    try {
      await deckService.deleteDeck(deck.id);
      showToast('Đã xóa bộ từ vựng');
      setIsDeleteConfirmOpen(false);
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

  const cards = deck.cards || [];
  const backTargetUrl = computeLibraryBackUrl(deck);

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

        {/* Right: Spaced Repetition (disabled) + More actions menu */}
        <div className="deck-header-right">
          <button
            type="button"
            className="deck-srs-btn is-disabled"
            disabled
            aria-disabled="true"
            title="Tính năng Lặp lại ngắt quãng sắp ra mắt"
          >
            <Calendar size={16} />
            <span>Lặp lại ngắt quãng</span>
            <span className="deck-soon-tag">Sắp ra mắt</span>
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
      <StudyModeBar deckId={deck.id} activeModeId="flashcard" />

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
            const ActiveComponent = getModeById('flashcard')?.component || FlashcardView;
            return <ActiveComponent cards={cards} onToast={showToast} />;
          })()
        )}
      </main>

      {/* Modals & Dialogs */}
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
