import { Plus, BookOpen, Edit2, FolderInput, Trash2, Folder, Layers } from 'lucide-react';
import DeckCard from './DeckCard';

export default function DeckList({
  decks = [],
  viewMode = 'grid',
  onCreateDeck,
  onOpenDeck,
  onEditDeck,
  onMoveDeck,
  onDeleteDeck,
  loading = false,
  isFilteredBySearch = false,
}) {
  return (
    <div className="deck-panel-card">
      {loading ? (
        <div className="deck-empty-container">
          <p className="text-muted">Đang tải danh sách bộ từ vựng...</p>
        </div>
      ) : decks.length === 0 ? (
        <div className="deck-empty-container">
          {/* Centered monochrome illustration of a book with sparkles/plant details */}
          <div className="empty-book-illustration-box">
            <svg
              viewBox="0 0 200 160"
              className="empty-book-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Sparkles */}
              <path
                d="M152 24L155 32L163 35L155 38L152 46L149 38L141 35L149 32L152 24Z"
                fill="#9ca3af"
              />
              <path
                d="M45 42L47 48L53 50L47 52L45 58L43 52L37 50L43 48L45 42Z"
                fill="#d1d5db"
              />
              <circle cx="168" cy="62" r="2.5" fill="#d1d5db" />
              <circle cx="34" cy="32" r="2" fill="#9ca3af" />

              {/* Plant / sprout leaves growing from the center */}
              <path
                d="M100 68C100 53 115 48 120 46C120 56 112 68 100 68Z"
                fill="#9ca3af"
              />
              <path
                d="M100 68C100 56 88 50 82 48C82 58 90 68 100 68Z"
                fill="#d1d5db"
              />
              <path
                d="M100 74V66"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Book cover bottom base */}
              <path
                d="M28 116C64 111 95 117 100 121C105 117 136 111 172 116V130C136 125 105 131 100 135C95 131 64 125 28 130V116Z"
                fill="#e5e7eb"
                stroke="#d1d5db"
                strokeWidth="1.5"
              />
              {/* Book open pages */}
              <path
                d="M30 80C65 75 96 81 100 85C104 81 135 75 170 80V120C135 115 104 121 100 125C96 121 65 115 30 120V80Z"
                fill="#ffffff"
                stroke="#e5e7eb"
                strokeWidth="1.5"
              />
              <path
                d="M33 83C66 78 96 84 100 87C104 84 134 78 167 83V117C134 112 104 118 100 121C96 118 66 112 33 117V83Z"
                fill="#f9fafb"
              />

              {/* Book spine line */}
              <path
                d="M100 86V124"
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Text lines on pages */}
              <path
                d="M46 93H84M46 101H78M46 109H70"
                stroke="#e5e7eb"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M116 93H154M116 101H150M116 109H140"
                stroke="#e5e7eb"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h3 className="deck-empty-title">Chưa có bộ từ vựng nào</h3>
          <p className="deck-empty-desc">
            {isFilteredBySearch
              ? 'Không tìm thấy bộ từ vựng nào khớp với từ khóa tìm kiếm.'
              : 'Hãy bắt đầu hành trình học tập bằng cách tạo bộ từ vựng đầu tiên của bạn!'}
          </p>

          <button
            type="button"
            className="monochrome-btn-primary"
            onClick={onCreateDeck}
          >
            <Plus size={16} />
            <span>Tạo bộ từ vựng ngay</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* High-density List View */
        <div className="deck-list-table-container">
          <table className="deck-list-table">
            <thead>
              <tr>
                <th>Bộ từ vựng</th>
                <th style={{ width: '160px' }}>Thư mục</th>
                <th style={{ width: '110px' }}>Số thẻ</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr
                  key={deck.id}
                  className="deck-list-row"
                  onClick={() => onOpenDeck?.(deck)}
                >
                  <td className="deck-list-name-col">
                    <div className="deck-list-title-text">{deck.name}</div>
                    {deck.description && (
                      <div className="deck-list-desc-text">{deck.description}</div>
                    )}
                  </td>
                  <td>
                    <span className="deck-list-folder-chip">
                      <Folder size={12} />
                      <span>{deck.folderName || 'Chưa phân loại'}</span>
                    </span>
                  </td>
                  <td>
                    <span className="monochrome-count-pill">
                      <Layers size={12} style={{ marginRight: '4px' }} />
                      {deck.cardCount || 0} thẻ
                    </span>
                  </td>
                  <td className="deck-list-actions-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="deck-list-action-btn"
                      onClick={() => onOpenDeck?.(deck)}
                      title="Học bộ từ này"
                      aria-label="Học bộ từ này"
                    >
                      <BookOpen size={15} />
                    </button>
                    <button
                      type="button"
                      className="deck-list-action-btn"
                      onClick={() => onEditDeck?.(deck)}
                      title="Chỉnh sửa"
                      aria-label="Chỉnh sửa bộ từ"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="deck-list-action-btn"
                      onClick={() => onMoveDeck?.(deck)}
                      title="Chuyển thư mục"
                      aria-label="Chuyển thư mục bộ từ"
                    >
                      <FolderInput size={15} />
                    </button>
                    <button
                      type="button"
                      className="deck-list-action-btn is-danger"
                      onClick={() => onDeleteDeck?.(deck)}
                      title="Xóa bộ từ"
                      aria-label="Xóa bộ từ vựng"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="monochrome-deck-grid">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onOpenDeck={onOpenDeck}
              onEditDeck={onEditDeck}
              onMoveDeck={onMoveDeck}
              onDeleteDeck={onDeleteDeck}
            />
          ))}
        </div>
      )}
    </div>
  );
}
