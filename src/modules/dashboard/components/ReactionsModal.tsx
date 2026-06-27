import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import reactionsApi, { type EmotionType } from "../../../services/reactionsApi";
import type { Reaction } from "../../../types/post";
import likeIcon from "../../../assets/like.svg";
import { parseBackendDate } from "../../../utils/timeFormat";
import loveIcon from "../../../assets/love.svg";
import hahaIcon from "../../../assets/haha.svg";
import wowIcon from "../../../assets/wow.svg";
import sadIcon from "../../../assets/sad.svg";
import angryIcon from "../../../assets/angry.svg";

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { type: "post" | "comment" | "reply"; id: string };
}

const reactionIcons: Record<EmotionType, string> = {
  like: likeIcon,
  love: loveIcon,
  haha: hahaIcon,
  wow: wowIcon,
  sad: sadIcon,
  angry: angryIcon,
};

export default function ReactionsModal({ isOpen, onClose, target }: ReactionsModalProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<EmotionType, number>>({
    like: 0,
    love: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  });

  const tabs: { key: EmotionType | "all"; label: string }[] = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "like", label: "Like" },
      { key: "love", label: "Love" },
      { key: "haha", label: "Haha" },
      { key: "wow", label: "Wow" },
      { key: "sad", label: "Sad" },
      { key: "angry", label: "Angry" },
    ],
    []
  );
  const [active, setActive] = useState<EmotionType | "all">("all");

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: Reaction[] = [];
        if (target.type === "post") data = await reactionsApi.getReactionsByPostId(target.id);
        if (target.type === "comment") data = await reactionsApi.getReactionsByCommentId(target.id);
        if (target.type === "reply") data = await reactionsApi.getReactionsByReplyId(target.id);
        setReactions(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, target.type, target.id]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCounts = async () => {
      try {
        if (target.type === "post") {
          const allCounts = await reactionsApi.getAllPostReactionCounts(target.id);
          setCounts(allCounts);
        } else {
          let data: Reaction[] = [];
          if (target.type === "comment") data = await reactionsApi.getReactionsByCommentId(target.id);
          if (target.type === "reply") data = await reactionsApi.getReactionsByReplyId(target.id);

          const newCounts: Record<EmotionType, number> = {
            like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0,
          };
          data.forEach(reaction => {
            if (reaction.emotionType in newCounts)
              newCounts[reaction.emotionType as EmotionType]++;
          });
          setCounts(newCounts);
        }
      } catch (error) {
        console.warn("Failed to fetch reaction counts:", error);
        setCounts({ like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
      }
    };
    fetchCounts();
  }, [isOpen, target.type, target.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetType: "post" | "comment" | "reply"; targetId: string };
      if (!detail || !isOpen) return;
      if (detail.targetType !== target.type || detail.targetId !== target.id) return;

      (async () => {
        try {
          let data: Reaction[] = [];
          if (target.type === "post") data = await reactionsApi.getReactionsByPostId(target.id);
          if (target.type === "comment") data = await reactionsApi.getReactionsByCommentId(target.id);
          if (target.type === "reply") data = await reactionsApi.getReactionsByReplyId(target.id);
          setReactions(data);
        } catch {}
      })();
    };
    window.addEventListener("reaction-updated", handler as EventListener);
    return () => window.removeEventListener("reaction-updated", handler as EventListener);
  }, [isOpen, target]);

  const filtered = useMemo(() => {
    if (active === "all") return reactions;
    return reactions.filter((r) => r.emotionType === active);
  }, [active, reactions]);

  const totalCount = useMemo(() => {
    return counts.like + counts.love + counts.haha + counts.wow + counts.sad + counts.angry;
  }, [counts]);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-gray-900">Reactions</Dialog.Title>

                {/* Tabs */}
                <div className="mt-4 border-b border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActive(t.key as EmotionType | "all")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          active === t.key
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {t.label}
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                          {t.key === "all" ? totalCount : counts[t.key as EmotionType] ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-6 max-h-96 overflow-y-auto">
                  {loading && <div className="text-center py-8 text-sm text-gray-500">Loading reactions...</div>}
                  {error && <div className="text-center py-8 text-sm text-red-600">{error}</div>}
                  {!loading && !error && filtered.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-500">No reactions found</div>
                  )}

                  <ul className="space-y-3">
                    {filtered.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* User Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {r.userAvatar ? (
                              <img 
                                src={r.userAvatar.startsWith('http') ? r.userAvatar : 
                                     r.userAvatar.startsWith('/uploads') ? 
                                     `${import.meta.env.VITE_BASE_URL || "http://localhost:8081"}${r.userAvatar}` : 
                                     r.userAvatar} 
                                alt={r.username} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                                {r.username ? r.username.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>

                          {/* User info */}
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {r.username || `User ${r.userId}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {parseBackendDate(r.createdAt)?.toLocaleString() || '—'}
                            </div>
                          </div>

                          {/* Reaction icon */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm">
                            <img src={reactionIcons[r.emotionType]} alt={r.emotionType} className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Reaction name */}
                        <div className="flex items-center gap-2">
                          <img src={reactionIcons[r.emotionType]} alt={r.emotionType} className="w-5 h-5" />
                          <span className="text-xs font-medium capitalize text-gray-700">{r.emotionType}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Close */}
                <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
