import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorBoundary, { isChunkLoadError } from '../../components/common/ErrorBoundary';
import PageSkeleton from '../../components/common/PageSkeleton';
import {
  preloadRoute,
  routeLoaders,
  isRoutePreloaded,
  resetPreloadedRoutes,
} from '../preloadRoute';

// Mock storage for Node test environment
function createMockStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createMockStorage();
}

describe('Phase 2 - Code Splitting & Preload Verification Tests', () => {
  beforeEach(() => {
    resetPreloadedRoutes();
    globalThis.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.sessionStorage.clear();
  });

  describe('(a) Lazy route rendering with PageSkeleton & Suspense', () => {
    it('renders PageSkeleton structure correctly with role and shimmer effects', () => {
      const html = renderToStaticMarkup(<PageSkeleton />);
      expect(html).toContain('page-skeleton-container');
      expect(html).toContain('aria-label="Đang tải trang..."');
      expect(html).toContain('role="status"');
      expect(html).toContain('page-skeleton-shimmer');
    });

    it('renders resolved component content through Suspense boundary', async () => {
      // Simulate resolved component inside Suspense boundary
      const MockTargetPage = () => (
        <div className="test-target-page">Trang đích đã tải thành công</div>
      );

      const html = renderToStaticMarkup(
        <Suspense fallback={<PageSkeleton />}>
          <MockTargetPage />
        </Suspense>
      );

      expect(html).toContain('Trang đích đã tải thành công');
      expect(html).not.toContain('page-skeleton-container');
    });

    it('all routeLoaders in registry are functions returning dynamic import promises', () => {
      const keys = Object.keys(routeLoaders);
      expect(keys.length).toBeGreaterThanOrEqual(10);
      expect(keys).toContain('map');
      expect(keys).toContain('library');
      expect(keys).toContain('deckDetail');
      expect(keys).toContain('learn');
      expect(keys).toContain('studyPlan');
      expect(keys).toContain('analytics');

      for (const key of keys) {
        expect(typeof routeLoaders[key]).toBe('function');
      }
    });
  });

  describe('(b) ErrorBoundary with chunk load errors and reload handling', () => {
    it('correctly identifies various chunk load error messages', () => {
      expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /static/abc.js'))).toBe(true);
      expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
      expect(isChunkLoadError(new Error('Normal runtime TypeError: undefined is not a function'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
    });

    it('displays "Tải lại trang" button and friendly update notice when chunk import fails', () => {
      const boundary = new ErrorBoundary({});
      boundary.state = {
        hasError: true,
        error: new Error('Failed to fetch dynamically imported module: /static/index-old.js'),
      };

      const html = renderToStaticMarkup(boundary.render());
      expect(html).toContain('Đã có bản cập nhật mới');
      expect(html).toContain('Một số tập tin tài nguyên đã được cập nhật hoặc kết nối mạng bị gián đoạn');
      expect(html).toContain('Tải lại trang');
      expect(html).toContain('Trang chủ');
    });

    it('displays standard error UI when non-chunk error occurs', () => {
      const boundary = new ErrorBoundary({});
      boundary.state = {
        hasError: true,
        error: new Error('Something went wrong in application logic'),
      };

      const html = renderToStaticMarkup(boundary.render());
      expect(html).toContain('Đã xảy ra sự cố hiển thị');
      expect(html).toContain('Tải lại trang');
      expect(html).not.toContain('Đã có bản cập nhật mới');
    });

    it('sets sessionStorage reload flag and reloads on first chunk error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const reloadMock = vi.fn();
      const originalWindow = globalThis.window;
      globalThis.window = {
        location: { reload: reloadMock, href: '/' },
      };

      try {
        const boundary = new ErrorBoundary({});
        const chunkError = new Error('Failed to fetch dynamically imported module: /static/MapPage.js');

        boundary.componentDidCatch(chunkError, { componentStack: '' });

        expect(globalThis.sessionStorage.getItem('chunk_reload_attempted')).toBe('true');
        expect(reloadMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.window = originalWindow;
        consoleSpy.mockRestore();
      }
    });

    it('does not loop reload infinitely if chunk error repeats after reload attempted', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const reloadMock = vi.fn();
      const originalWindow = globalThis.window;
      globalThis.window = {
        location: { reload: reloadMock, href: '/' },
      };

      try {
        globalThis.sessionStorage.setItem('chunk_reload_attempted', 'true');

        const boundary = new ErrorBoundary({});
        const chunkError = new Error('Failed to fetch dynamically imported module: /static/MapPage.js');

        boundary.componentDidCatch(chunkError, { componentStack: '' });

        // Should NOT trigger reload again because chunk_reload_attempted is already 'true'
        expect(reloadMock).not.toHaveBeenCalled();
      } finally {
        globalThis.window = originalWindow;
        consoleSpy.mockRestore();
      }
    });

    it('clears sessionStorage reload flag when user triggers handleReset', () => {
      const reloadMock = vi.fn();
      const originalWindow = globalThis.window;
      globalThis.window = {
        location: { reload: reloadMock, href: '/' },
      };

      try {
        globalThis.sessionStorage.setItem('chunk_reload_attempted', 'true');

        const boundary = new ErrorBoundary({});
        boundary.setState = vi.fn();
        boundary.handleReset();

        expect(globalThis.sessionStorage.getItem('chunk_reload_attempted')).toBeNull();
        expect(reloadMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });

  describe('(c) preloadRoute helper deduplication', () => {
    it('only invokes the route loader dynamic import ONCE per routeKey', () => {
      const mockLoader = vi.fn().mockReturnValue(Promise.resolve({ default: () => null }));
      const originalLoader = routeLoaders.map;
      routeLoaders.map = mockLoader;

      try {
        expect(isRoutePreloaded('map')).toBe(false);

        // First call
        preloadRoute('map');
        expect(mockLoader).toHaveBeenCalledTimes(1);
        expect(isRoutePreloaded('map')).toBe(true);

        // Second and third calls should be deduplicated
        preloadRoute('map');
        preloadRoute('map');
        expect(mockLoader).toHaveBeenCalledTimes(1);

        // Reset allows re-prefetching
        resetPreloadedRoutes();
        expect(isRoutePreloaded('map')).toBe(false);
        preloadRoute('map');
        expect(mockLoader).toHaveBeenCalledTimes(2);
      } finally {
        routeLoaders.map = originalLoader;
      }
    });

    it('handles non-existent or null route keys gracefully without throwing', () => {
      expect(() => preloadRoute('nonExistentKey')).not.toThrow();
      expect(() => preloadRoute(null)).not.toThrow();
      expect(() => preloadRoute(undefined)).not.toThrow();
    });
  });
});
