import { Layers, GraduationCap, Gamepad2, Headphones, BookOpen } from 'lucide-react';
import FlashcardView from '../features/decks/FlashcardView';
import ContextStoryCloze from '../features/decks/ContextStoryCloze';

/**
 * Study Mode Registry Configuration
 * Modes come from this registry config (id, label, icon, route, status, component)
 * so a new mode can be added without editing the deck page.
 */
export const STUDY_MODES = [
  {
    id: 'flashcard',
    label: 'Flashcard',
    icon: Layers,
    iconName: 'Layers',
    subpath: '',
    route: (deckId) => `/decks/${deckId}`,
    status: 'available',
    component: FlashcardView,
    description: 'Lật thẻ ghi nhớ từ vựng với 2 mặt tương tác',
  },
  {
    id: 'learn',
    label: 'Học',
    icon: GraduationCap,
    iconName: 'GraduationCap',
    subpath: 'learn',
    route: (deckId) => `/decks/${deckId}/learn`,
    status: 'available',
    component: null,
    description: 'Luyện gõ từ vựng tập trung và ôn lại các từ chưa thuộc',
  },
  {
    id: 'story',
    label: 'Đoạn văn ngữ cảnh',
    icon: BookOpen,
    iconName: 'BookOpen',
    subpath: 'story',
    route: (deckId) => `/decks/${deckId}/story`,
    status: 'available',
    component: ContextStoryCloze,
    description: 'Tạo đoạn văn ngữ cảnh và điền từ vựng vào ô trống',
  },
  {
    id: 'test-game',
    label: 'Test/Game',
    icon: Gamepad2,
    iconName: 'Gamepad2',
    subpath: 'test',
    route: (deckId) => `/decks/${deckId}/test`,
    status: 'coming-soon',
    component: null,
    description: 'Kiểm tra trắc nghiệm và trò chơi ghép từ tính điểm',
  },
  {
    id: 'dictation',
    label: 'Nghe chép',
    icon: Headphones,
    iconName: 'Headphones',
    subpath: 'dictation',
    route: (deckId) => `/decks/${deckId}/dictation`,
    status: 'coming-soon',
    component: null,
    description: 'Nghe phát âm bản xứ và gõ lại chính xác',
  },
];

export function getAvailableModes() {
  return STUDY_MODES.filter((m) => m.status === 'available');
}

export function isModeRoutable(modeId) {
  const mode = STUDY_MODES.find((m) => m.id === modeId);
  return Boolean(mode && mode.status === 'available');
}

export function getModeById(modeId) {
  return STUDY_MODES.find((m) => m.id === modeId) || null;
}

export function getDefaultMode() {
  return STUDY_MODES[0];
}

export function getModeRoute(deckId, modeId) {
  const mode = getModeById(modeId);
  if (!mode) return `/decks/${deckId}`;
  if (typeof mode.route === 'function') {
    return mode.route(deckId);
  }
  if (typeof mode.route === 'string') {
    return mode.route.replace(':deckId', String(deckId));
  }
  if (!mode.subpath) {
    return `/decks/${deckId}`;
  }
  return `/decks/${deckId}/${mode.subpath}`;
}

/**
 * Validates requested mode route and enforces coming-soon guard:
 * Typing /decks/:deckId/learn or any coming-soon/unknown mode redirects to /decks/:deckId.
 */
export function resolveStudyModeRoute(deckId, pathname) {
  const baseRoute = `/decks/${deckId}`;
  if (!pathname || pathname === baseRoute || pathname === `${baseRoute}/`) {
    return { modeId: 'flashcard', valid: true, redirectTo: null };
  }

  // Extract subpath after /decks/:deckId/
  if (pathname.startsWith(`${baseRoute}/`)) {
    const rawSub = pathname.slice(`${baseRoute}/`.length).split('/')[0];
    const matchingMode = STUDY_MODES.find(
      (m) => m.subpath === rawSub || m.id === rawSub
    );

    if (matchingMode && matchingMode.status === 'available') {
      return { modeId: matchingMode.id, valid: true, redirectTo: null };
    }

    // Unavailable mode (coming-soon) or unknown route -> redirect to flashcard base
    return {
      modeId: matchingMode ? matchingMode.id : rawSub,
      valid: false,
      redirectTo: baseRoute,
    };
  }

  return { modeId: 'flashcard', valid: true, redirectTo: null };
}
