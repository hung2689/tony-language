import { useState, useRef, useEffect } from 'react';
import {
  Folder,
  MoreVertical,
  Edit2,
  FolderInput,
  Trash2,
  Layers,
  BookOpen,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from '../studyplan/StudyPlanContext';

export default function DeckCard({
  deck,
  onOpenDeck,
  onEditDeck,
  onMoveDeck,
  onDeleteDeck,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { activePlan, openCreateModal, openAddDecksModal } = useStudyPlan();

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const cardCount = deck.cardCount || 0;

  return (
    <div
      className="monochrome-deck-card"
      onClick={() => onOpenDeck?.(deck)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenDeck?.(deck);
      }}
    >
      {/* Top Gradient Accent Line */}
      <div className="deck-card-top-accent" />

      {/* Card Header: Folder Badge & 3-dots Menu */}
      <div className="deck-card-header">
        <span className="deck-folder-tag" title={deck.folderName || 'Chưa phân loại'}>
          <Folder size={12} className="deck-folder-icon" />
          <span className="deck-folder-name">{deck.folderName || 'Chưa phân loại'}</span>
        </span>

        <div
          className="deck-menu-container"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={`deck-more-btn ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            title="Tùy chọn bộ từ vựng"
            aria-label="Tùy chọn bộ từ vựng"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="deck-dropdown-menu">
              <button
                type="button"
                className="deck-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  if (activePlan) {
                    const isEnrolled = (activePlan.decks || []).some(
                      (d) => d.id === deck.id
                    );
                    if (isEnrolled) {
                      navigate('/study-plan');
                    } else {
                      openAddDecksModal([deck.id]);
                    }
                  } else {
                    openCreateModal(deck.id);
                  }
                }}
              >
                <BookOpen size={14} />
                <span>{activePlan ? 'Lộ trình ôn tập' : 'Tạo lộ trình'}</span>
              </button>

              <button
                type="button"
                className="deck-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEditDeck?.(deck);
                }}
              >
                <Edit2 size={14} />
                <span>Chỉnh sửa</span>
              </button>

              <button
                type="button"
                className="deck-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  onMoveDeck?.(deck);
                }}
              >
                <FolderInput size={14} />
                <span>Chuyển thư mục</span>
              </button>

              <div className="deck-dropdown-divider" />

              <button
                type="button"
                className="deck-dropdown-item is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteDeck?.(deck);
                }}
              >
                <Trash2 size={14} />
                <span>Xóa bộ từ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body: Title with Icon & Description */}
      <div className="deck-card-body">
        <div className="deck-title-row">
          <div className="deck-icon-badge">
            <BookOpen size={16} />
          </div>
          <h3 className="monochrome-deck-title" title={deck.name}>
            {deck.name}
          </h3>
        </div>

        <p className="monochrome-deck-desc">
          {deck.description || 'Chưa có mô tả cho bộ từ này. Nhấn để bắt đầu luyện tập ngay.'}
        </p>
      </div>

      {/* Card Footer: Card Count & Action Button */}
      <div className="deck-card-footer">
        <span
          className={`deck-cards-pill ${
            cardCount > 0 ? 'has-cards' : 'empty-cards'
          }`}
        >
          <Layers size={12} />
          <span>{cardCount} thẻ</span>
        </span>

        <span className="deck-study-cta">
          <span>Học ngay</span>
          <ArrowRight size={13} className="deck-cta-arrow" />
        </span>
      </div>
    </div>
  );
}
