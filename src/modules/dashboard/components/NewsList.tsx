import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../../../fontawesome";
import { newsApi, type Blog } from "../../../services/newsApi";
import { queryKeys } from "../../../hooks/api/queryKeys";
import type { NotificationDTO } from "../../../services/notificationApi";
import { awardPoints } from "../../../services/gamificationApi";
import { getBehaviorIdByCode } from "../../../utils/behaviorSettings";
import { useAuthStore } from "../../../store/useAuthStore";

type Tab = "featured" | "latest" | "tech";

export default function NewsList() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const order: Tab[] = ["featured", "latest", "tech"];
  const [activeIndex, setActiveIndex] = useState(0);
  const tab = order[activeIndex] ?? "featured";
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const deltaXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [blogAlert, setBlogAlert] = useState<NotificationDTO | null>(null);
  const DRAG_THRESHOLD = 10;

  // React Query: Fetch featured news
  const {
    data: featuredData = [],
    isLoading: featuredLoading,
    error: featuredError,
  } = useQuery<Blog[]>({
    queryKey: queryKeys.news.featured(),
    queryFn: () => newsApi.getFeatured(),
    staleTime: 60_000, // News ít thay đổi nên cache lâu hơn
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch latest news
  const {
    data: latestData = [],
    isLoading: latestLoading,
    error: latestError,
    refetch: refetchLatest,
  } = useQuery<Blog[]>({
    queryKey: queryKeys.news.latest(),
    queryFn: () => newsApi.getLatest(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch tech news
  const {
    data: techData = [],
    isLoading: techLoading,
    error: techError,
  } = useQuery<Blog[]>({
    queryKey: queryKeys.news.tech(),
    queryFn: () => newsApi.getTech(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Combine data from all queries
  const data: Record<Tab, Blog[]> = useMemo(() => ({
    featured: (featuredData || []).slice(0, 5),
    latest: (latestData || []).slice(0, 5),
    tech: (techData || []).slice(0, 5),
  }), [featuredData, latestData, techData]);

  const loading = tab === "featured" ? featuredLoading : tab === "latest" ? latestLoading : techLoading;
  const error = tab === "featured" 
    ? (featuredError ? "Không thể tải tin tức" : null)
    : tab === "latest"
    ? (latestError ? "Không thể tải tin tức" : null)
    : (techError ? "Không thể tải tin tức" : null);

  const load = (t: Tab) => {
    if (t === "featured") {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.featured() });
    } else if (t === "latest") {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.latest() });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.tech() });
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<NotificationDTO>;
      const incoming = custom.detail;
      if (!incoming) return;
      setBlogAlert(incoming);
      queryClient.invalidateQueries({ queryKey: queryKeys.news.latest() });
      refetchLatest();
      if (tab !== "latest") {
        goTab("latest");
      }
    };

    window.addEventListener("blog-news-notification", handler as EventListener);
    return () => {
      window.removeEventListener("blog-news-notification", handler as EventListener);
    };
  }, [tab, queryClient, refetchLatest]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const RO = (window as any).ResizeObserver;
    let ro: any | null = null;
    if (typeof RO === 'function') {
      ro = new RO((entries: any[]) => {
        for (const entry of entries) {
          const w = (entry as any).contentRect?.width || el.clientWidth;
          setSlideWidth(w);
        }
      });
      ro.observe(el);
    }
    setSlideWidth(el.clientWidth);
    const onWinResize = () => setSlideWidth(el.clientWidth);
    window.addEventListener('resize', onWinResize);
    return () => {
      if (ro && typeof ro.disconnect === 'function') ro.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, []);

  const items = data[tab] || [];
  const hasMeasure = slideWidth > 0;

  const renderSlideContent = (t: Tab) => {
    const slideItems = (data[t] || []).slice(0, 5);
    if (loading && t === tab && slideItems.length === 0) {
      return Array.from({ length: 3 }).map((_, i) => (
        <li key={`skeleton-${t}-${i}`} className="py-2">
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mt-2 animate-pulse" />
        </li>
      ));
    }
    if (error && t === tab && slideItems.length === 0) {
      return (
        <li className="py-2 text-sm text-red-600">
          {error}
        </li>
      );
    }
    if (slideItems.length === 0) {
      return (
        <li className="py-2 text-sm text-gray-500">
          Không có tin tức nào
        </li>
      );
    }
    return slideItems.map((n, i) => (
      <li key={`${t}-${i}`} className="py-2">
        <a 
          href={n.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-medium leading-snug line-clamp-2 hover:text-indigo-600"
          onClick={async () => {
            if (user?.id) {
              try {
                const behaviorId = getBehaviorIdByCode("READ_BLOG");
                if (behaviorId) {
                  await awardPoints({ userId: Number(user.id), behaviorId });
                } else {
                  console.warn("READ_BLOG behaviorId not configured; skipping award");
                }
              } catch (error) {
                console.error("Error awarding points for reading blog:", error);
              }
            }
          }}
        >
          {n.title}
        </a>
        <p className="text-xs text-gray-500">{relativeTime(n.publishedDate)}</p>
      </li>
    ));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    deltaXRef.current = 0;
    draggingRef.current = false;
    setIsDragging(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startXRef.current == null) return;
    deltaXRef.current = e.clientX - startXRef.current;
    if (!draggingRef.current) {
      if (Math.abs(deltaXRef.current) < DRAG_THRESHOLD) return;
      draggingRef.current = true;
      setIsDragging(true);
      if (pointerIdRef.current != null) {
        containerRef.current?.setPointerCapture?.(pointerIdRef.current);
      }
    }
    const width = slideWidth || wrapperRef.current?.clientWidth || 1;
    if (containerRef.current && draggingRef.current) {
      const basePx = activeIndex * width;
      const offsetPx = -deltaXRef.current;
      let targetPx = basePx + offsetPx;
      const min = 0;
      const max = (order.length - 1) * width;
      if (targetPx < min) targetPx = min;
      if (targetPx > max) targetPx = max;
      containerRef.current.style.transition = 'none';
      containerRef.current.style.transform = `translateX(-${targetPx}px)`;
    }
  };
  const commitIndex = (newIdx: number) => {
    const bounded = Math.max(0, Math.min(order.length - 1, newIdx));
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 300ms ease-in-out';
      if (hasMeasure) {
        const width = slideWidth || wrapperRef.current?.clientWidth || 1;
        containerRef.current.style.transform = `translateX(-${bounded * width}px)`;
      } else {
        containerRef.current.style.transform = `translateX(-${bounded * 100}%)`;
      }
    }
    setActiveIndex(bounded);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      const dx = deltaXRef.current;
      const width = slideWidth || wrapperRef.current?.clientWidth || 1;
      const frac = -dx / width;
      const maxDelta = order.length - 1;
      const limitedFrac = Math.max(-maxDelta, Math.min(maxDelta, frac));
      const target = Math.round(activeIndex + limitedFrac);
      commitIndex(target);
    }
    if (pointerIdRef.current != null) {
      containerRef.current?.releasePointerCapture?.(pointerIdRef.current);
    }
    draggingRef.current = false;
    setIsDragging(false);
    startXRef.current = null;
    deltaXRef.current = 0;
    pointerIdRef.current = null;
  };
  const onPointerCancel = () => {
    if (pointerIdRef.current != null) {
      containerRef.current?.releasePointerCapture?.(pointerIdRef.current);
    }
    draggingRef.current = false;
    setIsDragging(false);
    startXRef.current = null;
    deltaXRef.current = 0;
    pointerIdRef.current = null;
    commitIndex(activeIndex);
  };

  const goTab = (t: Tab) => {
    const nextIdx = order.indexOf(t);
    if (nextIdx === -1) return;
    commitIndex(nextIdx);
  };

  const dismissBlogAlert = () => setBlogAlert(null);
  const openBlogNews = () => {
    if (!blogAlert) return;
    const url = blogAlert.actionUrl || "/news";
    window.open(url, "_blank");
    setBlogAlert(null);
  };

  const relativeTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const days = Math.floor(h / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {blogAlert && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-700">{blogAlert.title || "Tin tức mới"}</p>
            {blogAlert.content && (
              <p className="text-xs text-indigo-600 mt-1 line-clamp-2">{blogAlert.content}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                goTab("latest");
                load("latest");
                setBlogAlert(null);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Cập nhật
            </button>
            <button
              type="button"
              onClick={openBlogNews}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Xem chi tiết
            </button>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={dismissBlogAlert}
              className="text-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <FontAwesomeIcon icon={["fas", "xmark"]} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600">
            <FontAwesomeIcon icon={["fas", "newspaper"]} />
          </span>
          <h3 className="font-semibold">News</h3>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {order.map((t) => (
            <button
              key={t}
              onClick={() => goTab(t)}
              className={`px-2 py-1 rounded-full border transition-colors ${
                tab === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t === 'featured' ? 'Nổi bật' : t === 'latest' ? 'Mới nhất' : 'Tech'}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapperRef} className="relative overflow-hidden select-none">
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="flex transition-transform duration-300 ease-in-out"
          style={hasMeasure
            ? { width: `${order.length * (slideWidth || 0)}px`, transform: `translateX(-${activeIndex * (slideWidth || 0)}px)`, touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' }
            : { width: '300%', transform: `translateX(-${activeIndex * 100}%)`, touchAction: 'pan-y', cursor: isDragging ? 'grabbing' : 'grab' }
          }
        >
          {order.map((t) => (
            <div key={t} className="px-0" style={hasMeasure ? { flex: '0 0 auto', width: `${slideWidth}px` } : { flex: '0 0 33.3333%' }}>
              <ul className="divide-y">
                {renderSlideContent(t)}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          {order.map((t, i) => {
            const active = activeIndex === i;
            return (
              <button
                key={t}
                onClick={() => goTab(t)}
                aria-label={`Go to ${t}`}
                className={`rounded-full transition-all ${active ? 'bg-indigo-600' : 'bg-gray-300'} `}
                style={{ width: active ? 10 : 6, height: active ? 10 : 6 }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
