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
} from 'lucide-react';
import { useState } from 'react';
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
  const navigate = useNavigate();
  const { activePlan, openCreateModal, openAddDecksModal } = useStudyPlan();

  return (
    <div className="monochrome-deck-card" onClick={() => onOpenDeck?.(deck)}>
      {/* Decorative Card Top Art Banner */}
      <div className="deck-card-cover-art">
        <span className="deck-cover-watermark">✦</span>
        <div className="deck-cover-content">
          <span className="monochrome-folder-tag">
            <Folder size={11} className="monochrome-folder-icon" />
            <span>{deck.folderName || 'Chưa phân loại'}</span>
          </span>

          <div className="monochrome-menu-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="monochrome-more-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Tùy chọn bộ từ vựng"
              aria-label="Tùy chọn bộ từ vựng"
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu monochrome-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    if (activePlan) {
                      const isEnrolled = (activePlan.decks || []).some((d) => d.id === deck.id);
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
                  <BookOpen size={14} /> {activePlan ? 'Lộ trình ôn tập' : 'Tạo lộ trình'}
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditDeck(deck);
                  }}
                >
                  <Edit2 size={14} /> Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveDeck(deck);
                  }}
                >
                  <FolderInput size={14} /> Chuyển thư mục
                </button>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteDeck(deck);
                  }}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="deck-card-body">
        <h3 className="monochrome-deck-title" title={deck.name}>
          {deck.name}
        </h3>

        <p className="monochrome-deck-desc">
          {deck.description || 'Chưa có mô tả cho bộ từ này. Nhấn để bắt đầu luyện tập ngay.'}
        </p>

        <div className="monochrome-deck-footer">
          <span className="monochrome-count-pill">
            <Layers size={12} style={{ marginRight: '4px' }} />
            {deck.cardCount || 0} thẻ
          </span>

          <span className="deck-card-hover-action">
            <span>Học ngay</span>
            <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}
