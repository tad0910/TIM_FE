
const toImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    return `${BASE_URL}${url}`;
  }
  return url;
};

export default function ProfileCover({ cover }: { cover?: string | null }) {
  const src = toImageUrl(cover || undefined);
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-sm">
      <div className="w-full h-48 md:h-56 lg:h-64 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
        {src ? (
          <img
            src={src}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            onLoad={() => {
              console.log("[profile] cover image loaded:", src);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}


