import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { STUDY_MODES, getModeRoute } from '../../utils/studyModeRegistry';

const MODE_ICON_MAP = {
  flashcard: '/assets/flashcard/icon-layers.png',
  learn: '/assets/flashcard/icon-study.png',
  story: '/assets/flashcard/icon-context.png',
  sentence: '/assets/flashcard/icon-sentences.png',
  'test-game': '/assets/flashcard/icon-game.png',
  dictation: '/assets/flashcard/icon-dictation.png',
};

const MODE_DISPLAY_LABEL = {
  flashcard: 'Tất cả từ vựng',
  learn: 'Học',
  story: 'Đoạn văn ngữ cảnh',
  sentence: 'Đặt câu (AI)',
  'test-game': 'Test/Game',
  dictation: 'Nghe chép',
};

export default function StudyModeBar({ deckId, activeModeId = 'flashcard', cardCount = 0 }) {
  const navigate = useNavigate();

  return (
    <nav className="vintage-study-mode-bar" aria-label="Các chế độ học tập và thử thách">
      <div className="vintage-mode-grid" role="tablist">
        {STUDY_MODES.map((mode) => {
          const isActive = mode.id === activeModeId;
          const isAvailable = mode.status === 'available';
          const iconSrc = MODE_ICON_MAP[mode.id] || '/assets/flashcard/icon-layers.png';
          const displayLabel = MODE_DISPLAY_LABEL[mode.id] || mode.label;

          const handleClick = () => {
            if (!isAvailable) return;
            const targetRoute = getModeRoute(deckId, mode.id);
            navigate(targetRoute);
          };

          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              data-mode-id={mode.id}
              aria-selected={isActive}
              aria-disabled={!isAvailable}
              disabled={!isAvailable}
              className={`vintage-mode-card ${isActive ? 'is-active' : ''} ${!isAvailable ? 'is-disabled' : ''}`}
              onClick={handleClick}
              title={isAvailable ? `${displayLabel} (${cardCount} từ)` : `${displayLabel} (Sắp ra mắt)`}
            >
              {!isAvailable && (
                <img
                  src="/assets/flashcard/badge-soon.png"
                  alt="Sắp ra mắt"
                  className="vintage-mode-soon-floating"
                />
              )}

              <div className="vintage-mode-card-left">
                <img
                  src={iconSrc}
                  alt=""
                  className="vintage-mode-card-icon"
                  loading="eager"
                />
                <div className="vintage-mode-card-info">
                  <span className="vintage-mode-card-title">{displayLabel}</span>
                  <span className="vintage-mode-card-sub">{cardCount}</span>
                </div>
              </div>

              <ChevronRight size={18} className="vintage-mode-card-chevron" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
