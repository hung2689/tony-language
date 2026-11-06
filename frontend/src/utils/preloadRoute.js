/**
 * Unified route preloading and code-splitting loader registry.
 * Each route loader returns a dynamic import promise.
 * `preloadRoute` tracks already requested modules to ensure every route is only fetched once.
 */

export const routeLoaders = {
  map: () => import('../features/library/MapPage'),
  library: () => import('../features/library/LibraryWorkspace'),
  deckDetail: () => import('../features/decks/DeckDetailPage'),
  learn: () => import('../features/learn/LearnPage'),
  synonym: () => import('../features/synonym/SynonymPage'),
  studyPlan: () => import('../features/studyplan/StudyPlanPage'),
  todayLearn: () => import('../features/studyplan/TodayLearnPage'),
  srs: () => import('../features/studyplan/SrsSessionPage'),
  analytics: () => import('../features/analytics/AnalyticsPage'),
  weakWordsPractice: () => import('../features/analytics/WeakWordsPracticePage'),
  profile: () => import('../features/profile/ProfilePage'),
  createStudyPlanModal: () => import('../features/studyplan/CreateStudyPlanModal'),
  addDecksPreviewModal: () => import('../features/studyplan/AddDecksPreviewModal'),
};

const preloadedRoutes = new Set();

/**
 * Preload a route's code bundle ahead of user interaction (e.g. on hover or focus).
 * Ensures the loader is called at most once per route key.
 *
 * @param {keyof typeof routeLoaders} routeKey
 */
export function preloadRoute(routeKey) {
  if (!routeKey || preloadedRoutes.has(routeKey)) {
    return;
  }
  const loader = routeLoaders[routeKey];
  if (typeof loader === 'function') {
    preloadedRoutes.add(routeKey);
    try {
      loader().catch((err) => {
        // Allow retry on failure (e.g. temporary network offline)
        preloadedRoutes.delete(routeKey);
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[preloadRoute] Failed to preload route "${routeKey}":`, err);
        }
      });
    } catch {
      preloadedRoutes.delete(routeKey);
    }
  }
}

/**
 * Check if a route has been preloaded (useful for testing and monitoring).
 */
export function isRoutePreloaded(routeKey) {
  return preloadedRoutes.has(routeKey);
}

/**
 * Reset preloaded routes cache (primarily used in tests).
 */
export function resetPreloadedRoutes() {
  preloadedRoutes.clear();
}
