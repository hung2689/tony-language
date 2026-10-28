import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getWallpapers,
  uploadWallpaper as apiUploadWallpaper,
  deleteWallpaper as apiDeleteWallpaper,
  setActiveWallpaper as apiSetActiveWallpaper,
} from '../../services/wallpaperService';

// ─── Preset IDs (static, not stored in DB) ───────────────────────────────────
const PRESET_IDS = new Set(['valley', 'meadow', 'forest', 'none']);

function loadDeletedPresets() {
  try {
    return new Set(JSON.parse(localStorage.getItem('deleted_presets') || '[]'));
  } catch {
    return new Set();
  }
}

function saveDeletedPresets(set) {
  try {
    localStorage.setItem('deleted_presets', JSON.stringify([...set]));
  } catch {}
}

// ─── Default/Preset wallpapers ──────────────────────────────────────────────
export const PRESET_WALLPAPERS = [
  {
    id: 'valley',
    name: 'Thung lũng Lauterbrunnen',
    imageUrl: '/wallpapers/wallpaper-valley.jpg',
    thumbnailUrl: '/wallpapers/wallpaper-valley.jpg',
    isPreset: true,
    isActive: false,
  },
  {
    id: 'meadow',
    name: 'Đồng cỏ hoa dại & Núi tuyết',
    imageUrl: '/wallpapers/wallpaper-meadow.jpg',
    thumbnailUrl: '/wallpapers/wallpaper-meadow.jpg',
    isPreset: true,
    isActive: false,
  },
  {
    id: 'forest',
    name: 'Rừng thông ban mai',
    imageUrl: '/wallpapers/wallpaper-forest.jpg',
    thumbnailUrl: '/wallpapers/wallpaper-forest.jpg',
    isPreset: true,
    isActive: false,
  },
  {
    id: 'none',
    name: 'Đơn sắc tối giản (Mặc định)',
    imageUrl: null,
    thumbnailUrl: null,
    isPreset: true,
    isActive: false,
  },
];

const WallpaperContext = createContext(null);

// ─── Helper: persist wallpaper selection locally ─────────────────────────────
function loadLocalSelection() {
  try {
    return localStorage.getItem('study_wallpaper_id') || 'valley';
  } catch {
    return 'valley';
  }
}

function saveLocalSelection(id) {
  try {
    localStorage.setItem('study_wallpaper_id', String(id));
  } catch {}
}

function loadLocalOpacity() {
  try {
    const saved = localStorage.getItem('study_wallpaper_opacity');
    return saved !== null ? Number(saved) : 25;
  } catch {
    return 25;
  }
}

function saveLocalOpacity(val) {
  try {
    localStorage.setItem('study_wallpaper_opacity', String(val));
  } catch {}
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function WallpaperProvider({ children }) {
  // "currentId" can be either a preset string id ('valley','meadow','forest','none')
  // or a numeric DB id (as string) for uploaded wallpapers.
  const [currentId, setCurrentId] = useState(loadLocalSelection);
  const [overlayOpacity, setOverlayOpacity] = useState(loadLocalOpacity);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  // Track which preset IDs the user has hidden/deleted locally
  const [deletedPresets, setDeletedPresets] = useState(loadDeletedPresets);

  // Uploaded wallpapers from the backend
  const [userWallpapers, setUserWallpapers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0–100
  const [error, setError] = useState(null);

  // ── Load user wallpapers from API when modal opens ──────────────────────
  const fetchWallpapers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWallpapers();
      setUserWallpapers(Array.isArray(data) ? data : []);
      // Sync active state from server
      const active = data?.find((w) => w.active);
      if (active) {
        const serverId = String(active.id);
        setCurrentId(serverId);
        saveLocalSelection(serverId);
      }
    } catch {
      // Not critical — fall back silently to local selection
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isWallpaperModalOpen) {
      fetchWallpapers();
    }
  }, [isWallpaperModalOpen, fetchWallpapers]);

  // ── All wallpapers: presets (minus deleted) + uploaded ──────────────────
  const allWallpapers = [
    ...PRESET_WALLPAPERS.filter((p) => !deletedPresets.has(p.id)),
    ...userWallpapers.map((w) => ({
      id: String(w.id),
      name: w.name,
      imageUrl: w.imageUrl,
      thumbnailUrl: w.thumbnailUrl || w.imageUrl,
      isPreset: false,
      isActive: w.active,
    })),
  ];

  // ── activeWallpaper object ───────────────────────────────────────────────
  const activeWallpaper =
    allWallpapers.find((w) => String(w.id) === String(currentId)) ||
    PRESET_WALLPAPERS[0];

  // ── Select / apply a wallpaper ───────────────────────────────────────────
  const setWallpaper = useCallback(
    async (id) => {
      const strId = String(id);
      setCurrentId(strId);
      saveLocalSelection(strId);

      // If it's an uploaded DB wallpaper, persist active state on server
      const isUploadedId = userWallpapers.some((w) => String(w.id) === strId);
      if (isUploadedId) {
        try {
          await apiSetActiveWallpaper(strId);
          setUserWallpapers((prev) =>
            prev.map((w) => ({ ...w, active: String(w.id) === strId }))
          );
        } catch {
          // non-fatal
        }
      }
    },
    [userWallpapers]
  );

  // ── Upload a new wallpaper ───────────────────────────────────────────────
  const uploadWallpaper = useCallback(async (file, name = '') => {
    setError(null);
    setUploadProgress(0);
    try {
      const newWp = await apiUploadWallpaper(file, name, (pct) =>
        setUploadProgress(pct)
      );
      setUserWallpapers((prev) => [newWp, ...prev]);
      setUploadProgress(null);
      return newWp;
    } catch (err) {
      setError(err.message);
      setUploadProgress(null);
      throw err;
    }
  }, []);

  // ── Delete a wallpaper ───────────────────────────────────────────────────
  const deleteWallpaper = useCallback(
    async (id) => {
      const strId = String(id);
      const isPreset = PRESET_IDS.has(strId);

      if (isPreset) {
        // Presets are static files — just hide them locally (persist in localStorage)
        setDeletedPresets((prev) => {
          const next = new Set(prev);
          next.add(strId);
          saveDeletedPresets(next);
          return next;
        });
      } else {
        // Uploaded wallpaper — delete from server and DB
        await apiDeleteWallpaper(strId);
        setUserWallpapers((prev) => prev.filter((w) => String(w.id) !== strId));
      }

      // If this was the active wallpaper, fall back to first available preset
      if (String(currentId) === strId) {
        const fallback = isPreset ? 'none' : 'valley';
        setCurrentId(fallback);
        saveLocalSelection(fallback);
      }
    },
    [currentId]
  );

  // ── Overlay opacity ──────────────────────────────────────────────────────
  const updateOverlayOpacity = useCallback((val) => {
    setOverlayOpacity(val);
    saveLocalOpacity(val);
  }, []);

  return (
    <WallpaperContext.Provider
      value={{
        // State
        currentId,
        currentWallpaperId: currentId, // alias for backwards compat
        activeWallpaper,
        allWallpapers,
        userWallpapers,
        overlayOpacity,
        isLoading,
        uploadProgress,
        error,
        setError,
        // Modal
        isWallpaperModalOpen,
        openWallpaperModal: () => setIsWallpaperModalOpen(true),
        closeWallpaperModal: () => setIsWallpaperModalOpen(false),
        // Actions
        setWallpaper,
        uploadWallpaper,
        deleteWallpaper,
        updateOverlayOpacity,
        refreshWallpapers: fetchWallpapers,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error('useWallpaper must be used within a WallpaperProvider');
  }
  return context;
}
