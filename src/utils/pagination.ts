export const ELLIPSIS = 'ellipsis';
export type PageItem = number | typeof ELLIPSIS;
const SIBLINGS = 2; // pages shown on each side of the current one (tablet / desktop)

// Page list for tablet / desktop with a constant number of slots, never every page:
//   1 … 4 5 [6] 7 8 … 20      (current ± siblings, first and last always present)
//   1 2 3 4 5 6 7 … 20        (near the start)
//   1 … 14 15 16 17 18 19 20  (near the end)
export function getPageItems(page: number, totalPages: number, siblings = SIBLINGS): PageItem[] {
  const slots = siblings * 2 + 5;
  if (totalPages <= slots) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, totalPages);
  const showLeftDots = left > 3;
  const showRightDots = right < totalPages - 2;
  const edgeCount = 3 + siblings * 2;

  if (!showLeftDots && showRightDots) return [...range(1, edgeCount), ELLIPSIS, totalPages];
  if (showLeftDots && !showRightDots) return [1, ELLIPSIS, ...range(totalPages - edgeCount + 1, totalPages)];
  return [1, ELLIPSIS, ...range(left, right), ELLIPSIS, totalPages];
}
