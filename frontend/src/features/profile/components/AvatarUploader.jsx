import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Trash2, ZoomIn, ZoomOut, Check, X, Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import AvatarFrame from '../../../components/common/AvatarFrame';
import { profileService } from '../profileService';
import { useAuth } from '../../auth/AuthContext';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIEWPORT_SIZE = 320; // 320px viewport
const CROP_SIZE = 280; // 280px circular crop window

export default function AvatarUploader({
  avatarUrl,
  tierId,
  displayName,
  animated = true,
  headless = false,
  triggerRef,
  deleteRef,
  onAvatarUpdated,
  onError,
  onSuccess,
}) {
  const { updateUser, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const imageRef = useRef(null);

  // Computed scales
  const naturalW = naturalDimensions.width || 1;
  const naturalH = naturalDimensions.height || 1;
  const coverScale = Math.max(CROP_SIZE / naturalW, CROP_SIZE / naturalH);
  const fitScale = Math.min(CROP_SIZE / naturalW, CROP_SIZE / naturalH);
  const minZoomAllowed = Math.min(0.2, Number((fitScale / coverScale).toFixed(2)));

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      if (onError) onError('Chỉ chấp nhận định dạng ảnh JPEG, PNG hoặc WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      if (onError) onError('Kích thước ảnh vượt quá giới hạn 2 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageLoaded = (e) => {
    const img = e.target;
    setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Drag handlers for pan
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Quick Action Buttons
  const handleFitEntireImage = () => {
    const targetZoom = Number((fitScale / coverScale).toFixed(2));
    setZoom(Math.max(0.1, targetZoom));
    setOffset({ x: 0, y: 0 });
  };

  const handleFillCircle = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped square image as 256x256 PNG blob
  const handleApplyCrop = async () => {
    if (!imageRef.current || !naturalDimensions.width || !naturalDimensions.height) return;

    try {
      setIsUploading(true);

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Clear with transparent background
      ctx.clearRect(0, 0, 256, 256);

      // Mapping factor from the 280px preview circle to the 256px final canvas
      const ratio = 256 / CROP_SIZE;

      // 1. Center the origin at (128, 128)
      ctx.translate(128, 128);

      // 2. Apply user translation offset
      ctx.translate(offset.x * ratio, offset.y * ratio);

      // 3. Calculate final drawn size
      const finalW = naturalW * coverScale * zoom * ratio;
      const finalH = naturalH * coverScale * zoom * ratio;

      // 4. Draw image centered
      ctx.drawImage(
        imageRef.current,
        -finalW / 2,
        -finalH / 2,
        finalW,
        finalH
      );

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUploading(false);
          if (onError) onError('Không thể xử lý ảnh. Vui lòng thử lại.');
          return;
        }

        try {
          const res = await profileService.uploadAvatar(blob);
          const newUrl = res.avatarUrl;
          if (updateUser) {
            updateUser({ avatarUrl: newUrl });
          }
          if (refreshUser) {
            await refreshUser();
          }
          if (onAvatarUpdated) onAvatarUpdated(newUrl);
          if (onSuccess) onSuccess('Đã cập nhật ảnh đại diện thành công');
          setCropModalOpen(false);
          setImageSrc(null);
        } catch (err) {
          if (onError) onError(err.message || 'Lỗi khi tải lên ảnh đại diện');
        } finally {
          setIsUploading(false);
        }
      }, 'image/png');
    } catch (err) {
      setIsUploading(false);
      if (onError) onError('Lỗi khi cắt ảnh: ' + err.message);
    }
  };

  // Delete avatar handler
  const handleDeleteAvatar = async () => {
    if (!avatarUrl) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại?')) return;

    try {
      setIsDeleting(true);
      await profileService.deleteAvatar();
      if (updateUser) {
        updateUser({ avatarUrl: null });
      }
      if (refreshUser) {
        await refreshUser();
      }
      if (onAvatarUpdated) onAvatarUpdated(null);
      if (onSuccess) onSuccess('Đã xóa ảnh đại diện');
    } catch (err) {
      if (onError) onError(err.message || 'Lỗi khi xóa ảnh đại diện');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (triggerRef) {
      triggerRef.current = () => fileInputRef.current?.click();
    }
    if (deleteRef) {
      deleteRef.current = handleDeleteAvatar;
    }
  });

  return (
    <div className={headless ? 'avatar-uploader-headless' : 'avatar-uploader-section'}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {!headless && (
        <>
          <div className="avatar-uploader-preview">
            <AvatarFrame
              size="xl"
              tierId={tierId}
              src={avatarUrl}
              name={displayName}
              animated={animated}
            />
            <div className="avatar-uploader-actions">
              <button
                type="button"
                className="btn-profile-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                <Camera size={16} />
                <span>Đổi ảnh</span>
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  className="btn-profile-ghost"
                  onClick={handleDeleteAvatar}
                  disabled={isUploading || isDeleting}
                  title="Xóa ảnh đại diện"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>Xóa ảnh</span>
                </button>
              )}
            </div>
          </div>
          <p className="avatar-uploader-hint">
            Hỗ trợ định dạng JPEG, PNG hoặc WebP. Dung lượng tối đa 2 MB.
          </p>
        </>
      )}

      {/* Crop Modal */}
      {cropModalOpen && (
        <div className="avatar-crop-backdrop" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title">
          <div className="avatar-crop-modal">
            <div className="avatar-crop-header">
              <h3 id="crop-dialog-title">Chỉnh sửa ảnh đại diện</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setCropModalOpen(false)}
                disabled={isUploading}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="avatar-crop-body">
              {/* Crop Viewport with Centered Image and Crop Mask */}
              <div
                className="avatar-crop-viewport"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Xem trước để cắt ảnh"
                  onLoad={handleImageLoaded}
                  className="avatar-crop-img"
                  style={{
                    width: `${naturalW * coverScale}px`,
                    height: `${naturalH * coverScale}px`,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  }}
                  draggable={false}
                />
                <div className="avatar-crop-mask" aria-hidden="true" />
              </div>

              {/* Quick Fitting Toolbar */}
              <div className="avatar-crop-presets">
                <button
                  type="button"
                  className="btn-crop-preset"
                  onClick={handleFitEntireImage}
                  title="Thu nhỏ để vừa vặn toàn bộ bức ảnh trong khung"
                >
                  <Minimize2 size={14} />
                  <span>Vừa khung</span>
                </button>
                <button
                  type="button"
                  className="btn-crop-preset"
                  onClick={handleFillCircle}
                  title="Phóng to để lấp đầy khung tròn"
                >
                  <Maximize2 size={14} />
                  <span>Lấp đầy</span>
                </button>
                <button
                  type="button"
                  className="btn-crop-preset"
                  onClick={handleReset}
                  title="Đặt lại vị trí ban đầu"
                >
                  <RotateCcw size={14} />
                  <span>Đặt lại</span>
                </button>
              </div>

              {/* Zoom control slider */}
              <div className="avatar-crop-controls">
                <button
                  type="button"
                  className="btn-zoom"
                  onClick={() => setZoom((z) => Math.max(minZoomAllowed, Number((z - 0.15).toFixed(2))))}
                  title="Thu nhỏ"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min={minZoomAllowed}
                  max={3.5}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="zoom-slider"
                  aria-label="Thu phóng ảnh"
                />
                <button
                  type="button"
                  className="btn-zoom"
                  onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.15).toFixed(2))))}
                  title="Phóng to"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <p className="avatar-crop-instruction">
                Kéo ảnh để di chuyển vị trí, dùng thanh trượt hoặc các nút bên trên để tùy chỉnh vừa vặn.
              </p>
            </div>

            <div className="avatar-crop-footer">
              <button
                type="button"
                className="btn-profile-ghost"
                onClick={() => setCropModalOpen(false)}
                disabled={isUploading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-profile-primary"
                onClick={handleApplyCrop}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Cắt & Lưu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
