import { useState } from 'react';
import { Star, Flag, Heart, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { StarRating, FlagColor } from '../types';

export interface ImageTag {
  imageId: string;
  stars: StarRating;
  flag: FlagColor;
  pick: boolean;       // ♥ hero pick
  reject: boolean;     // ✕ reject
  top9: boolean;       // AI candidate
  top9Score?: number;  // 0-100
}

interface ImageScoreTagProps {
  tag: ImageTag;
  onChange: (updated: ImageTag) => void;
  compact?: boolean;   // thumbnail mode
  visible?: boolean;   // hover-controlled from parent
  showAiAnalysis?: boolean;
}

const FLAG_COLORS: Record<FlagColor, string> = {
  none:   'text-white/30',
  red:    'text-red-400',
  yellow: 'text-yellow-400',
  green:  'text-green-400',
  blue:   'text-blue-400',
  purple: 'text-purple-400',
};

const FLAG_CYCLE: FlagColor[] = ['none','red','yellow','green','blue','purple'];

export function ImageScoreTag({ tag, onChange, compact = false, visible = true, showAiAnalysis = true }: ImageScoreTagProps) {
  const [expanded, setExpanded] = useState(false);

  const setStars = (n: StarRating) =>
    onChange({ ...tag, stars: tag.stars === n ? 0 : n });

  const cycleFlag = () => {
    const idx = FLAG_CYCLE.indexOf(tag.flag);
    onChange({ ...tag, flag: FLAG_CYCLE[(idx + 1) % FLAG_CYCLE.length] });
  };

  const togglePick   = () => onChange({ ...tag, pick: !tag.pick, reject: false });
  const toggleReject = () => onChange({ ...tag, reject: !tag.reject, pick: false });

  if (!visible && !tag.stars && !tag.pick && !tag.reject && tag.flag === 'none' && !tag.top9) {
    return null;
  }

  // ── COMPACT (thumbnail) ──────────────────────────────────────────
  if (compact) {
    return (
      <div className="
        absolute bottom-0 left-0 right-0
        flex items-center justify-center gap-1
        px-1 py-0.5
        bg-gradient-to-t from-black/70 to-transparent
        pointer-events-none
      ">
        {/* Stars — dots in compact */}
        {tag.stars > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: tag.stars }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-yellow-400" />
            ))}
          </div>
        )}

        {tag.top9 && showAiAnalysis && (
          <span className="text-[8px] font-bold text-blue-300 leading-none">T9</span>
        )}

        {tag.pick && (
          <Heart className="w-2.5 h-2.5 text-pink-400 fill-pink-400" />
        )}

        {tag.reject && (
          <X className="w-2.5 h-2.5 text-red-400" />
        )}

        {tag.flag !== 'none' && (
          <Flag className={`w-2.5 h-2.5 fill-current ${FLAG_COLORS[tag.flag]}`} />
        )}
      </div>
    );
  }

  // ── FULL VIEW ────────────────────────────────────────────────────
  return (
    <div className="
      absolute bottom-0 left-0 right-0
      flex flex-col items-center
      pb-safe
    ">
      {/* Expand/collapse handle — tablet/phone */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="
          md:hidden
          w-8 h-5 mb-1
          flex items-center justify-center
          rounded-full bg-black/40 backdrop-blur-sm
          text-white/50 hover:text-white transition-colors
        "
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Score bar */}
      <div className={`
        flex items-center justify-center gap-2 sm:gap-3
        px-3 sm:px-5 py-2 sm:py-2.5
        rounded-xl sm:rounded-2xl
        bg-black/50 backdrop-blur-md
        border border-white/10
        mx-3 mb-3 sm:mb-4
        shadow-xl
        transition-all duration-200
        w-auto max-w-[calc(100%-1.5rem)]
        ${!expanded ? 'md:flex hidden md:flex' : 'flex'}
      `}>

        {/* Stars */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {([1,2,3,4,5] as StarRating[]).map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              className={`
                transition-all duration-100 active:scale-90
                ${n <= tag.stars
                  ? 'text-yellow-400'
                  : 'text-white/20 hover:text-yellow-300'}
              `}
            >
              <Star className={`
                w-4 h-4 sm:w-5 sm:h-5
                ${n <= tag.stars ? 'fill-yellow-400' : ''}
              `} />
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/15" />

        {/* Pick / Reject */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={togglePick}
            className={`
              transition-all duration-100 active:scale-90
              ${tag.pick ? 'text-pink-400' : 'text-white/25 hover:text-pink-300'}
            `}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${tag.pick ? 'fill-pink-400' : ''}`} />
          </button>

          <button
            onClick={toggleReject}
            className={`
              transition-all duration-100 active:scale-90
              ${tag.reject ? 'text-red-400' : 'text-white/25 hover:text-red-300'}
            `}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="w-px h-4 bg-white/15" />

        {/* Flag */}
        <button
          onClick={cycleFlag}
          className={`transition-all duration-100 active:scale-90 ${FLAG_COLORS[tag.flag]}`}
        >
          <Flag className={`w-4 h-4 sm:w-5 sm:h-5 ${tag.flag !== 'none' ? 'fill-current' : ''}`} />
        </button>

        {/* Top 9 badge — shows AI score if present */}
        {tag.top9 && showAiAnalysis && (
          <>
            <div className="w-px h-4 bg-white/15" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs font-bold text-blue-400 leading-none">T9</span>
              {tag.top9Score !== undefined && (
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] sm:text-[10px] font-bold leading-none ${
                    tag.top9Score >= 80 ? 'text-emerald-400' :
                    tag.top9Score >= 60 ? 'text-yellow-400' :
                    tag.top9Score >= 40 ? 'text-orange-400' :
                    'text-emerald-400'
                  }`}>
                    {tag.top9Score}
                  </span>
                  <div className={`w-1 h-1 rounded-full ${
                    tag.top9Score >= 80 ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]' :
                    tag.top9Score >= 60 ? 'bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.6)]' :
                    tag.top9Score >= 40 ? 'bg-orange-400 shadow-[0_0_4px_rgba(251,146,60,0.6)]' :
                    'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]'
                  }`} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Always-visible pill when collapsed on mobile */}
      {!expanded && (
        <div className="
          md:hidden
          flex items-center gap-1.5
          px-2 py-1
          rounded-full bg-black/40 backdrop-blur-sm
          border border-white/10
          mb-2
        ">
          {tag.stars > 0 && (
            <div className="flex gap-0.5">
              {Array.from({ length: tag.stars }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          )}
          {tag.pick    && <Heart className="w-3 h-3 fill-pink-400 text-pink-400" />}
          {tag.reject  && <X className="w-3 h-3 text-red-400" />}
          {tag.flag !== 'none' && <Flag className={`w-3 h-3 fill-current ${FLAG_COLORS[tag.flag]}`} />}
          {tag.top9 && showAiAnalysis && <span className="text-[9px] font-bold text-blue-400">T9</span>}
        </div>
      )}
    </div>
  );
}
