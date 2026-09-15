/* oxlint-disable */
'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type LocalReview = { rating: number; text: string };

/**
 * Rotates reviews this visitor saved in their own browser via ReviewModal.
 * Nothing is fabricated and nothing leaves the device; with no saved reviews,
 * nothing renders.
 */
export function SupporterPulse() {
  const [index, setIndex] = useState(0);
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem('user_reviews') || '[]',
      );
      if (Array.isArray(saved)) {
        setItems(
          saved
            .filter(
              (review): review is LocalReview =>
                typeof review?.text === 'string' &&
                review.text.trim() !== '' &&
                Number.isInteger(review?.rating) &&
                review.rating >= 1 &&
                review.rating <= 5,
            )
            .map(
              (review) =>
                `${'⭐'.repeat(review.rating)} "${review.text.trim()}" - You`,
            ),
        );
      }
    } catch {
      // Storage unavailable or corrupt: show nothing.
    }
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-0 w-full px-2 overflow-hidden category-label">
      <div className="flex items-center gap-2 rounded-lg bg-success/10 p-2 text-[10px] font-medium text-success dark:text-success transition-opacity duration-500">
        <Star className="size-3 shrink-0" />
        <span className="truncate">{items[index % items.length]}</span>
      </div>
    </div>
  );
}
