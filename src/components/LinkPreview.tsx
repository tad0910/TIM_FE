import { useState, useEffect, useRef } from 'react';

interface LinkPreviewProps {
  url: string;
  className?: string;
  width?: string;
  lazy?: boolean;
  size?: 'default' | 'compact';
}

interface PreviewData {
  url?: string;
  title?: string;
  description?: string;
  images?: string[];
}

export default function LinkPreviewComponent({
  url,
  className = '',
  width,
  lazy = true,
  size = 'default',
}: LinkPreviewProps) {
  const [inView, setInView] = useState(!lazy);
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!lazy || !ref.current) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!inView) {
      console.log('[LinkPreview] Not in view yet, url:', url);
      return;
    }

    console.log('[LinkPreview] Fetching preview for url:', url);
    let cancelled = false;
    setLoading(true);

    const fetchUrl = `/api/extract?url=${encodeURIComponent(url)}`;
    console.log('[LinkPreview] Fetching from:', fetchUrl);

    fetch(fetchUrl)
      .then((res) => {
        console.log('[LinkPreview] Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json: PreviewData) => {
        if (!cancelled) {
          console.log('[LinkPreview] Preview data received:', json);
          setData(json);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[LinkPreview] Fetch failed:', err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inView, url]);

  const isCompact = size === 'compact';
  const imageMaxHeight = isCompact ? 'max-h-[120px]' : 'max-h-[400px]';
  const paddingClass = isCompact ? 'p-2' : 'p-3';
  const skeletonHeight = isCompact ? 'h-24' : 'h-48';
  const titleSize = isCompact ? 'text-xs' : 'text-sm';
  
  const containerClasses = isCompact 
    ? 'flex flex-row items-center' 
    : 'flex flex-col';
  
  const imageWrapperClasses = isCompact
    ? 'w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden'
    : 'w-full bg-gray-100 flex items-center justify-center overflow-hidden';
  
  const imageClasses = isCompact
    ? 'w-full h-full object-cover'
    : `w-full h-auto ${imageMaxHeight} object-contain`;
  
  const textWrapperClasses = isCompact
    ? `flex-1 ${paddingClass} min-w-0`
    : `w-full ${paddingClass}`;

  if (!inView) {
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className={`border border-gray-200 rounded-lg overflow-hidden ${className} ${containerClasses}`}>
        {isCompact ? (
          <>
            <div className="w-20 h-20 flex-shrink-0 animate-pulse bg-gray-100"></div>
            <div className={`flex-1 ${paddingClass} min-w-0`}>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </>
        ) : (
          <>
            <div className={`animate-pulse bg-gray-100 ${skeletonHeight}`}></div>
            <div className={paddingClass}>
              <div className={`h-4 bg-gray-200 rounded w-3/4 mb-2`}></div>
              <div className={`h-3 bg-gray-200 rounded w-1/2`}></div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className={`border border-gray-200 rounded-lg overflow-hidden ${className} ${containerClasses}`}>
        {isCompact ? (
          <>
            <div className="w-20 h-20 flex-shrink-0 animate-pulse bg-gray-100"></div>
            <div className={`flex-1 ${paddingClass} min-w-0`}>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </>
        ) : (
          <>
            <div className={`animate-pulse bg-gray-100 ${skeletonHeight}`}></div>
            <div className={paddingClass}>
              <div className={`h-4 bg-gray-200 rounded w-3/4 mb-2`}></div>
              <div className={`h-3 bg-gray-200 rounded w-1/2`}></div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className={`border border-gray-200 rounded-lg p-4 ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {url}
        </a>
      </div>
    );
  }

  const image = Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : '';
  const previewUrl = data.url || url;

  const getDomain = (urlString: string): string => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace('www.', '').toUpperCase();
    } catch {
      try {
        const url = new URL('https://' + urlString);
        return url.hostname.replace('www.', '').toUpperCase();
      } catch {
        return 'LINK';
      }
    }
  };

  const domain = getDomain(previewUrl);

  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={previewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors ${className} ${containerClasses}`}
      style={width ? { width } : undefined}
    >
      {image && (
        <div className={imageWrapperClasses}>
          <img
            src={image}
            alt={data.title || 'Preview'}
            className={imageClasses}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className={textWrapperClasses}>
        <p className={`text-gray-500 mb-0.5 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
          {domain}
        </p>
        <h3 className={`font-semibold text-gray-900 line-clamp-2 ${titleSize} ${!isCompact ? 'mb-1' : ''}`}>
          {data.title || 'Link'}
        </h3>
      </div>
    </a>
  );
}

