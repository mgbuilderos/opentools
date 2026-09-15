/* oxlint-disable */
'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from './ui/button';

export function ReviewModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const submit = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('user_reviews') || '[]');
      existing.push({ rating, text });
      localStorage.setItem('user_reviews', JSON.stringify(existing));
    } catch (e) {}
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setRating(0);
      setText('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">
            How was your local experience?
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>

        {submitted ? (
          <div className="mt-6 text-center text-success dark:text-success font-medium pb-4">
            Thank you for your feedback!
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setRating(val)}
                  className={`focus-ring rounded p-1 ${rating >= val ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Star
                    className="size-8"
                    fill={rating >= val ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>

            <textarea
              placeholder="Tell us what you loved..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="focus-ring w-full rounded-xl border bg-background px-3 py-2 text-sm min-h-24 mb-4"
            />

            <Button
              onClick={submit}
              disabled={!rating || !text.trim()}
              className="w-full h-11"
            >
              Submit Review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
