import { RotateCcw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useStudyPlan } from './StudyPlanContext';
import './StudyPlan.css';

export default function StudyPlanUndoToast() {
  const { toastState, undoLastRemove, dismissToast, isUndoing } = useStudyPlan();

  if (!toastState) return null;

  const isUndo = toastState.type === 'undo';
  const isError = toastState.type === 'error';

  return (
    <div
      className={`study-plan-app-toast study-plan-app-toast--${toastState.type}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="study-plan-app-toast__content">
        <span className="study-plan-app-toast__icon" aria-hidden="true">
          {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        </span>
        <span className="study-plan-app-toast__text">{toastState.message}</span>
      </div>

      <div className="study-plan-app-toast__actions">
        {isUndo && (
          <button
            type="button"
            className="study-plan-app-toast__undo-btn"
            onClick={undoLastRemove}
            disabled={isUndoing}
          >
            <RotateCcw size={14} />
            <span>
              {toastState.removedItems?.length > 1 ? 'Hoàn tác tất cả' : 'Hoàn tác'}
            </span>
          </button>
        )}
        <button
          type="button"
          className="study-plan-app-toast__close-btn"
          onClick={dismissToast}
          aria-label="Đóng thông báo"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
