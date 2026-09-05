export type SearchMove = 'next' | 'previous';

export function moveSearchSelection(
  currentIndex: number,
  itemCount: number,
  move: SearchMove,
) {
  if (itemCount <= 0) return -1;
  if (move === 'next') {
    return currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
  }
  return currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
}
