import { describe, it, expect } from 'vitest';
import {
  normalizeWallpaperId,
  normalizeWallpaperUrl,
  PRESET_WALLPAPERS,
} from '../WallpaperContext';

describe('Wallpaper Migration & Fallback', () => {
  describe('normalizeWallpaperId', () => {
    it('migrates legacy full paths to preset ids', () => {
      expect(normalizeWallpaperId('/wallpapers/wallpaper-valley.jpg')).toBe('valley');
      expect(normalizeWallpaperId('/wallpapers/wallpaper-meadow.jpg')).toBe('meadow');
      expect(normalizeWallpaperId('/wallpapers/wallpaper-forest.jpg')).toBe('forest');
    });

    it('migrates legacy filenames to preset ids', () => {
      expect(normalizeWallpaperId('wallpaper-valley.jpg')).toBe('valley');
      expect(normalizeWallpaperId('wallpaper-meadow.jpg')).toBe('meadow');
      expect(normalizeWallpaperId('wallpaper-forest.jpg')).toBe('forest');
    });

    it('handles standard preset keys correctly', () => {
      expect(normalizeWallpaperId('valley')).toBe('valley');
      expect(normalizeWallpaperId('meadow')).toBe('meadow');
      expect(normalizeWallpaperId('forest')).toBe('forest');
      expect(normalizeWallpaperId('none')).toBe('none');
    });

    it('falls back to default "valley" on empty/null/undefined', () => {
      expect(normalizeWallpaperId(null)).toBe('valley');
      expect(normalizeWallpaperId(undefined)).toBe('valley');
      expect(normalizeWallpaperId('')).toBe('valley');
    });

    it('preserves user uploaded numeric database IDs', () => {
      expect(normalizeWallpaperId('105')).toBe('105');
      expect(normalizeWallpaperId('custom-user-wp')).toBe('custom-user-wp');
    });
  });

  describe('normalizeWallpaperUrl', () => {
    it('converts legacy .jpg preset URLs to .webp', () => {
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-valley.jpg')).toBe('/wallpapers/wallpaper-valley.webp');
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-meadow.jpg')).toBe('/wallpapers/wallpaper-meadow.webp');
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-forest.jpg')).toBe('/wallpapers/wallpaper-forest.webp');
    });

    it('preserves existing .webp preset URLs', () => {
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-valley.webp')).toBe('/wallpapers/wallpaper-valley.webp');
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-meadow.webp')).toBe('/wallpapers/wallpaper-meadow.webp');
      expect(normalizeWallpaperUrl('/wallpapers/wallpaper-forest.webp')).toBe('/wallpapers/wallpaper-forest.webp');
    });

    it('preserves user uploaded URLs intact', () => {
      expect(normalizeWallpaperUrl('/api/wallpapers/files/custom_123.jpg')).toBe('/api/wallpapers/files/custom_123.jpg');
      expect(normalizeWallpaperUrl('/api/wallpapers/files/custom_456.png')).toBe('/api/wallpapers/files/custom_456.png');
    });
  });

  describe('PRESET_WALLPAPERS configuration', () => {
    it('all preset wallpapers have .webp image URLs or null', () => {
      for (const preset of PRESET_WALLPAPERS) {
        if (preset.imageUrl) {
          expect(preset.imageUrl).toMatch(/\.webp$/);
          expect(preset.thumbnailUrl).toMatch(/\.webp$/);
        } else {
          expect(preset.imageUrl).toBeNull();
        }
      }
    });
  });
});
