import { useEffect, useState } from "react";
import { getPersonalImages, type UserImageItem } from "../../../services/profileApi";

import { resolveMediaUrl } from '../../../utils/mediaUrl';

const toUrl = (url?: string | null) => {
  if (!url) return "";
  return resolveMediaUrl(url) || url;
};

export default function PersonalImagesModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [images, setImages] = useState<UserImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPersonalImages(userId);
        setImages(data || []);
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(errorMsg || "Không thể tải danh sách ảnh");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Ảnh cá nhân</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center text-gray-500">Đang tải...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : images.length === 0 ? (
            <div className="text-center text-gray-500">Chưa có ảnh nào</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map(img => (
                <div key={img.id} className="rounded-md overflow-hidden border">
                  <img src={toUrl(img.imageUrl)} alt={img.description || "image"} className="w-full h-32 object-cover" />
                  <div className="p-2 text-xs text-gray-600 truncate">{img.description || img.imageUrl}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Đóng</button>
        </div>
      </div>
    </div>
  );
}


