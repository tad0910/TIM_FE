import React, { useMemo, useRef, useState } from 'react';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  visible?: number;
}

export default function Carousel<T>({ items, renderItem, visible = 5 }: CarouselProps<T>) {
  const [index, setIndex] = useState(0);
  const maxIndex = Math.max(0, (items?.length || 0) - visible);
  const canPrev = index > 0;
  const canNext = index < maxIndex;

  const handlePrev = () => setIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const translateX = useMemo(() => `translateX(-${(index * 100) / visible}%)`, [index, visible]);

  return (
    <div className="relative">
      <div className={`overflow-hidden`}>
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: translateX, width: `${(items.length / visible) * 100}%` }}
        >
          {items.map((item, i) => (
            <div key={i} className="px-2" style={{ flex: `0 0 ${100 / visible}%` }}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      </div>

      {items.length > visible && (
        <>
          <button
            aria-label="Prev"
            onClick={handlePrev}
            disabled={!canPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 bg-white border rounded-full w-8 h-8 flex items-center justify-center shadow ${
              canPrev ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={handleNext}
            disabled={!canNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 bg-white border rounded-full w-8 h-8 flex items-center justify-center shadow ${
              canNext ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
