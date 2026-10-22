import { describe, it, expect, vi } from 'vitest';
import {
  handleFlashcardKeyDown,
  isInteractiveButton,
  isInputField,
} from '../flashcardKeyboard';

describe('flashcardKeyboard helper', () => {
  it('detects input fields correctly', () => {
    expect(isInputField({ tagName: 'INPUT' })).toBe(true);
    expect(isInputField({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isInputField({ tagName: 'SELECT' })).toBe(true);
    expect(isInputField({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isInputField({ tagName: 'DIV' })).toBe(false);
    expect(isInputField(null)).toBe(false);
  });

  it('detects interactive buttons correctly', () => {
    expect(isInteractiveButton({ tagName: 'BUTTON' })).toBe(true);
    expect(isInteractiveButton({ tagName: 'A' })).toBe(true);
    expect(
      isInteractiveButton({
        tagName: 'SPAN',
        closest: (sel) => (sel === 'button' ? { tagName: 'BUTTON' } : null),
      })
    ).toBe(true);
    expect(isInteractiveButton({ tagName: 'DIV', closest: () => null })).toBe(false);
  });

  it('flips card and prevents default on Space', () => {
    const onFlip = vi.fn();
    const preventDefault = vi.fn();

    const res = handleFlashcardKeyDown(
      { key: ' ', preventDefault, target: { tagName: 'DIV' } },
      { onFlip }
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe('flip');
    expect(preventDefault).toHaveBeenCalled();
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('navigates previous on ArrowLeft and next on ArrowRight', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const prevEvent = { key: 'ArrowLeft', preventDefault: vi.fn(), target: { tagName: 'DIV' } };
    const nextEvent = { key: 'ArrowRight', preventDefault: vi.fn(), target: { tagName: 'DIV' } };

    handleFlashcardKeyDown(prevEvent, { onPrev, onNext });
    expect(prevEvent.preventDefault).toHaveBeenCalled();
    expect(onPrev).toHaveBeenCalledTimes(1);

    handleFlashcardKeyDown(nextEvent, { onPrev, onNext });
    expect(nextEvent.preventDefault).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does NOT flip card when Enter is pressed while a button is focused', () => {
    const onFlip = vi.fn();
    const preventDefault = vi.fn();

    const buttonTarget = { tagName: 'BUTTON' };
    const res = handleFlashcardKeyDown(
      { key: 'Enter', preventDefault, target: buttonTarget },
      { onFlip }
    );

    expect(res.handled).toBe(false);
    expect(res.action).toBe('native_button_click');
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('flips card when Enter is pressed on a non-button element', () => {
    const onFlip = vi.fn();
    const preventDefault = vi.fn();

    const divTarget = { tagName: 'DIV', closest: () => null };
    const res = handleFlashcardKeyDown(
      { key: 'Enter', preventDefault, target: divTarget },
      { onFlip }
    );

    expect(res.handled).toBe(true);
    expect(res.action).toBe('flip');
    expect(preventDefault).toHaveBeenCalled();
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it('ignores keys when typing inside input or textarea', () => {
    const onFlip = vi.fn();
    const onPrev = vi.fn();
    const preventDefault = vi.fn();

    const inputTarget = { tagName: 'INPUT' };
    const res = handleFlashcardKeyDown(
      { key: ' ', preventDefault, target: inputTarget },
      { onFlip, onPrev }
    );

    expect(res.handled).toBe(false);
    expect(res.action).toBe('ignored_input');
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onFlip).not.toHaveBeenCalled();
  });

  it('ignores keys when a modal or popover is open', () => {
    const onFlip = vi.fn();
    const preventDefault = vi.fn();

    const res = handleFlashcardKeyDown(
      { key: 'ArrowRight', preventDefault, target: { tagName: 'DIV' } },
      { isModalOrPopoverOpen: true, onFlip }
    );

    expect(res.handled).toBe(false);
    expect(res.action).toBe('ignored_modal');
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
