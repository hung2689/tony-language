/**
 * Pure keyboard navigation and action handler for Flashcard view
 * Meets strict pair programming rules:
 * - Space flips card, prevents page scroll.
 * - Enter while a button is focused activates the button and does NOT flip card.
 * - Keys ignored while typing in inputs or when modal/popover is open.
 * - ArrowLeft/ArrowRight navigate cards.
 */

export function isInteractiveButton(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'BUTTON' || tag === 'A') return true;
  if (typeof target.closest === 'function') {
    return Boolean(target.closest('button') || target.closest('a') || target.closest('[role="button"]'));
  }
  return false;
}

export function isInputField(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function handleFlashcardKeyDown(event, {
  isModalOrPopoverOpen = false,
  onPrev,
  onNext,
  onFlip,
} = {}) {
  if (!event || !event.key) return { handled: false, action: null };

  // 1. Ignore if typing in an input/textarea/select
  if (isInputField(event.target)) {
    return { handled: false, action: 'ignored_input' };
  }

  // 2. Ignore if a modal or popover dialog is open
  if (isModalOrPopoverOpen) {
    return { handled: false, action: 'ignored_modal' };
  }

  // 3. ArrowLeft -> Previous
  if (event.key === 'ArrowLeft') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    onPrev?.();
    return { handled: true, action: 'prev' };
  }

  // 4. ArrowRight -> Next
  if (event.key === 'ArrowRight') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    onNext?.();
    return { handled: true, action: 'next' };
  }

  // 5. Space -> Flip (prevent scroll)
  if (event.key === ' ' || event.key === 'Spacebar') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    onFlip?.();
    return { handled: true, action: 'flip' };
  }

  // 6. Enter -> Flip ONLY if a button is NOT focused
  if (event.key === 'Enter') {
    if (isInteractiveButton(event.target)) {
      // Let the button's native click action execute; DO NOT flip card!
      return { handled: false, action: 'native_button_click' };
    }
    if (typeof event.preventDefault === 'function') event.preventDefault();
    onFlip?.();
    return { handled: true, action: 'flip' };
  }

  return { handled: false, action: null };
}
