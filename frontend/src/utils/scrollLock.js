let openModalCount = 0;

export function lockScroll() {
  if (openModalCount === 0) {
    document.body.style.overflow = 'hidden';
  }
  openModalCount++;
}

export function unlockScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
  }
}
