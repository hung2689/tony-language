/**
 * Utility helper to merge class names conditionally (compatible with shadcn / MagicUI).
 */
export function cn(...inputs) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim();
}

export default cn;
