import { useMemo } from "react";
import { type EmotionType } from "../../../services/reactionsApi";

import likeIcon from "../../../assets/like.svg";
import loveIcon from "../../../assets/love.svg";
import hahaIcon from "../../../assets/haha.svg";
import wowIcon from "../../../assets/wow.svg";
import sadIcon from "../../../assets/sad.svg";
import angryIcon from "../../../assets/angry.svg";

export interface ReactionBarProps {
  onSelect: (emotion: EmotionType) => void;
  className?: string;
}

const EMOTES: { key: EmotionType; label: string; icon: string }[] = [
  { key: "like", label: "Like", icon: likeIcon },
  { key: "love", label: "Love", icon: loveIcon },
  { key: "haha", label: "Haha", icon: hahaIcon },
  { key: "wow", label: "Wow", icon: wowIcon },
  { key: "sad", label: "Sad", icon: sadIcon },
  { key: "angry", label: "Angry", icon: angryIcon },
];

export default function ReactionBar({ onSelect, className }: ReactionBarProps) {
  const items = useMemo(() => EMOTES, []);

  return (
    <div
      className={`bg-white shadow-lg rounded-full px-3 py-2 flex items-center gap-2 border border-gray-200 ${
        className || ""
      }`}
    >
      {items.map((e) => (
        <button
          key={e.key}
          onClick={() => onSelect(e.key)}
          className="flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          title={e.label}
        >
          <img
            src={e.icon}
            alt={e.label}
            className="w-5 h-5 select-none"
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
}
