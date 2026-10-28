import { useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Ripple from '../../components/common/Ripple';
import { useWallpaper } from './WallpaperContext';
import {
  Check,
  Sliders,
  Image as ImageIcon,
  Upload,
  Trash2,
  AlertCircle,
} from 'lucide-react';

const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 15;

export default function WallpaperModal() {
  const {
    isWallpaperModalOpen,
    closeWallpaperModal,
    currentId,
    allWallpapers,
    setWallpaper,
    uploadWallpaper,
    deleteWallpaper,
    overlayOpacity,
    updateOverlayOpacity,
    isLoading,
    uploadProgress,
    error,
    setError,
  } = useWallpaper();

  const fileInputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const displayError = error || localError;

  const clearErrors = () => {
    setLocalError(null);
    setError(null);
  };

  // ── Handle file input change ─────────────────────────────────────────────
  const handleFileChange = async (e) => {
    clearErrors();
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = ''; // reset so same file can be re-selected

    if (!file) return;

    // Client-side validation
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setLocalError('Định dạng không hỗ trợ. Vui lòng chọn JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`Dung lượng ảnh vượt quá ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const newWp = await uploadWallpaper(file, '');
      // Auto-select the newly uploaded wallpaper
      await setWallpaper(String(newWp.id));
    } catch {
      // error is set in context
    } finally {
      setIsUploading(false);
    }
  };

  // ── Delete flow ──────────────────────────────────────────────────────────
  const requestDelete = (id, e) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    clearErrors();
    try {
      await deleteWallpaper(confirmDeleteId);
    } catch (err) {
      setLocalError(err.message || 'Không thể xóa hình nền.');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isWallpaperModalOpen}
      onClose={closeWallpaperModal}
      title="Tùy chỉnh Hình nền & Không gian học tập"
      maxWidth="720px"
    >
      <div className="wallpaper-modal-content">
        <p className="wallpaper-modal-desc">
          Lựa chọn không gian tĩnh lặng, truyền cảm hứng giúp bạn tập trung và thư giãn hơn trong
          quá trình học từ vựng. Bạn cũng có thể tải lên hình nền tùy chỉnh của riêng mình.
        </p>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {displayError && (
          <div className="wallpaper-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{displayError}</span>
            <button className="wallpaper-error-dismiss" onClick={clearErrors} aria-label="Đóng">
              ×
            </button>
          </div>
        )}

        {/* ── Upload button ──────────────────────────────────────────────── */}
        <div className="wallpaper-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="wallpaper-upload-btn"
          >
            {isUploading ? (
              <>
                <Ripple size={16} color="currentColor" />
                {uploadProgress !== null ? `Đang tải lên… ${uploadProgress}%` : 'Đang xử lý…'}
              </>
            ) : (
              <>
                <Upload size={16} />
                Tải ảnh lên
              </>
            )}
          </Button>
          <span className="wallpaper-upload-hint">JPG, PNG, WebP — tối đa {MAX_SIZE_MB}MB</span>
        </div>

        {/* ── Upload progress bar ────────────────────────────────────────── */}
        {isUploading && uploadProgress !== null && (
          <div className="wallpaper-progress-bar-wrap">
            <div
              className="wallpaper-progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* ── Wallpaper grid ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="wallpaper-loading-state">
            <Ripple size={36} color="#3b82f6" />
            <span>Đang tải hình nền…</span>
          </div>
        ) : (
          <div className="wallpaper-grid">
            {allWallpapers.map((wp) => {
              const isSelected = String(wp.id) === String(currentId);
              const isBeingDeleted = deletingId === wp.id || deletingId === String(wp.id);

              return (
                <div
                  key={wp.id}
                  className={`wallpaper-card-item ${isSelected ? 'is-selected' : ''} ${isBeingDeleted ? 'is-deleting' : ''}`}
                  onClick={() => !isBeingDeleted && setWallpaper(wp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && !isBeingDeleted && setWallpaper(wp.id)}
                  aria-pressed={isSelected}
                  aria-label={`Chọn hình nền: ${wp.name}`}
                >
                  <div className="wallpaper-thumb-wrapper">
                    {wp.imageUrl ? (
                      <img
                        src={wp.thumbnailUrl || wp.imageUrl}
                        alt={wp.name}
                        className="wallpaper-thumb-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="wallpaper-thumb-blank">
                        <ImageIcon size={28} className="text-muted" />
                        <span>Không hình nền</span>
                      </div>
                    )}

                    {/* Selected check badge */}
                    {isSelected && (
                      <div className="wallpaper-check-badge">
                        <Check size={16} strokeWidth={2.5} />
                      </div>
                    )}

                    {/* Delete button (on hover) — shown for ALL wallpapers */}
                    {!isBeingDeleted ? (
                      <button
                        className="wallpaper-delete-btn"
                        onClick={(e) => requestDelete(wp.id, e)}
                        aria-label={`Xóa hình nền: ${wp.name}`}
                        title="Xóa hình nền này"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="wallpaper-deleting-overlay">
                        <Ripple size={20} color="#ffffff" />
                      </div>
                    )}
                  </div>

                  <div className="wallpaper-card-info">
                    <div className="wallpaper-card-title">{wp.name}</div>
                    {!wp.isPreset && (
                      <div className="wallpaper-card-caption wallpaper-card-badge">
                        Tùy chỉnh
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Delete confirmation dialog ─────────────────────────────────── */}
        {confirmDeleteId && (
          <div className="wallpaper-confirm-overlay" role="dialog" aria-modal="true">
            <div className="wallpaper-confirm-box">
              <h4 className="wallpaper-confirm-title">Xóa hình nền?</h4>
              <p className="wallpaper-confirm-text">
                Hành động này không thể hoàn tác. Hình nền sẽ bị xóa vĩnh viễn.
              </p>
              <div className="wallpaper-confirm-actions">
                <Button variant="outline" onClick={cancelDelete}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={confirmDelete}>
                  <Trash2 size={14} />
                  Xóa
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Overlay opacity slider ─────────────────────────────────────── */}
        {String(currentId) !== 'none' && (
          <div className="wallpaper-overlay-control">
            <div className="wallpaper-slider-header">
              <div className="wallpaper-slider-label">
                <Sliders size={16} />
                <span>Độ mờ lớp phủ màu trắng (Bảo đảm tương phản chữ):</span>
              </div>
              <span className="wallpaper-slider-value">{overlayOpacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={overlayOpacity}
              onChange={(e) => updateOverlayOpacity(Number(e.target.value))}
              className="wallpaper-range-slider"
              aria-label="Điều chỉnh độ mờ lớp phủ"
            />
            <div className="wallpaper-slider-hints">
              <span>Trong suốt 100% (0%)</span>
              <span>Khuyên dùng (20% - 30%)</span>
              <span>Mờ nhẹ (60% - 80%)</span>
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <Button variant="primary" onClick={closeWallpaperModal}>
            Hoàn tất
          </Button>
        </div>
      </div>
    </Modal>
  );
}
