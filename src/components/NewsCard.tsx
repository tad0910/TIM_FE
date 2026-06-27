import React from 'react';
import type { Blog } from '../services/newsApi';
import { parseBackendDate } from '../utils/timeFormat';

export default function NewsCard({ item, source }: { item: Blog; source: 'blog' | 'external' }) {
  const date = item.publishedDate ? parseBackendDate(item.publishedDate)?.toLocaleDateString('vi-VN') || '' : '';
  const desc = (item.description || '').trim();
  const short = desc.length > 160 ? desc.slice(0, 160) + '…' : desc;
  const badgeColor = source === 'blog' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
  const badgeLabel = source === 'blog' ? 'Blog' : 'External';

  return (
    <div className="h-full rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>{badgeLabel}</span>
        {date && <span className="text-xs text-gray-500">{date}</span>}
      </div>
      <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 line-clamp-2 hover:text-indigo-600">
        {item.title}
      </a>
      {short && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{short}</p>}
    </div>
  );
}
