import { STUDY_MODES, getModeRoute } from '../../utils/studyModeRegistry';
import { Layers, GraduationCap, Gamepad2, Headphones, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MODE_ICON_MAP = {
  Layers,
  GraduationCap,
  Gamepad2,
  Headphones,
};

export default function StudyModeBar({ deckId, activeModeId = 'flashcard' }) {
  const navigate = useNavigate();

  return (
    <div className="study-mode-bar-wrapper">
      <div className="study-mode-grid" role="tablist" aria-label="Chế độ học tập">
        {STUDY_MODES.map((mode) => {
          const Icon = MODE_ICON_MAP[mode.iconName] || Layers;
          const isActive = mode.id === activeModeId;
          const isAvailable = mode.status === 'available';

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
              aria-selected={isActive}
              aria-disabled={!isAvailable}
              disabled={!isAvailable}
              className={`study-mode-btn ${isActive ? 'is-active' : ''} ${!isAvailable ? 'is-disabled' : ''}`}
              onClick={handleClick}
              title={isAvailable ? mode.label : `${mode.label} (Sắp ra mắt)`}
            >
              <div className="study-mode-btn-content">
                <div className="study-mode-icon-box">
                  <Icon size={18} />
                </div>
                <span className="study-mode-label">{mode.label}</span>
              </div>

              {!isAvailable && (
                <span className="study-mode-soon-pill">
                  <Sparkles size={10} />
                  <span>Sắp ra mắt</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
