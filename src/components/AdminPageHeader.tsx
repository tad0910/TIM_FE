import React from 'react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface HeaderChip {
  label: string;
  value: string | number | React.ReactNode;
  tone?: 'default' | 'indigo' | 'green' | 'red' | 'yellow';
}

export default function AdminPageHeader({
  breadcrumbs = [],
  title,
  description,
  chips = [],
  rightSlot,
}: {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  chips?: HeaderChip[];
  rightSlot?: React.ReactNode;
}) {
  const toneClass = (tone?: HeaderChip['tone']) => {
    switch (tone) {
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'green':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-gray-300">/</span>}
                {b.onClick ? (
                  <button onClick={b.onClick} className={`hover:text-gray-700 ${b.active ? 'font-semibold text-gray-900' : ''}`}>
                    {b.label}
                  </button>
                ) : (
                  <span className={`${b.active ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Title + chips */}
      <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1 max-w-2xl line-clamp-2">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c, i) => (
            <span key={i} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${toneClass(c.tone)}`}>
              <span className="font-medium">{c.label}:</span> {typeof c.value === 'string' || typeof c.value === 'number' ? c.value : c.value}
            </span>
          ))}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
