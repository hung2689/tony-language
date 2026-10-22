import { Folder, MoreVertical, Edit2, FolderInput, Trash2, Layers } from 'lucide-react';
import { useState } from 'react';

export default function DeckCard({
  deck,
  onOpenDeck,
  onEditDeck,
  onMoveDeck,
  onDeleteDeck,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="monochrome-deck-card" onClick={() => onOpenDeck?.(deck)}>
      <div className="monochrome-deck-header">
        <span className="monochrome-folder-tag">
          <Folder size={12} className="monochrome-folder-icon" />
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
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="dropdown-menu monochrome-dropdown-menu">
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

      <h3 className="monochrome-deck-title" title={deck.name}>
        {deck.name}
      </h3>

      <p className="monochrome-deck-desc">
        {deck.description || 'Không có mô tả chi tiết cho bộ từ vựng này.'}
      </p>

      <div className="monochrome-deck-footer">
        <span className="monochrome-count-pill">
          <Layers size={13} style={{ marginRight: '4px' }} />
          {deck.cardCount || 0} thẻ
        </span>
      </div>
    </div>
  );
}
