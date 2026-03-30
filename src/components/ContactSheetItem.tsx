import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, Loader2 } from 'lucide-react';
import { PhotoItem, StarRating, FlagColor } from '../types';
import Histogram from './Histogram';
import { ImageScoreTag, ImageTag } from './ImageScoreTag';
import { AspectImage } from './AspectImage';
import { ScoreBadges } from './ScoreBadges';

const COLOR_TAGS = [
  { id: 'red', color: 'bg-emerald-500' },
  { id: 'yellow', color: 'bg-amber-400' },
  { id: 'green', color: 'bg-emerald-500' },
  { id: 'blue', color: 'bg-blue-500' },
  { id: 'purple', color: 'bg-purple-500' },
];

interface ContactSheetItemProps {
  photo: PhotoItem;
  selected: boolean;
  selectionColor: 'cyan' | 'canary';
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onTagChange?: (updated: ImageTag) => void;
  showAiAnalysis?: boolean;
  isLowPowerMode?: boolean;
  isMobile?: boolean;
  layout?: 'overlay' | 'below';
  isRelief?: boolean;
  visibleBadges?: string[];
  onToggleBurst?: (burstId: string) => void;
  isCollapsed?: boolean;
}

const ContactSheetItem: React.FC<ContactSheetItemProps> = React.memo(({ 
  photo, 
  selected, 
  selectionColor, 
  onClick, 
  onDoubleClick,
  onTagChange,
  showAiAnalysis = true,
  isLowPowerMode = false,
  isMobile = false,
  layout = 'overlay',
  isRelief = false,
  visibleBadges = ['grade', 'score', 'eyes', 'smile', 'blur'],
  onToggleBurst,
  isCollapsed = false
}) => {
  const frameColor = selectionColor === 'cyan' ? 'border-system-accent ring-system-accent/20' : 'border-amber-500 ring-amber-500/20';
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = useRef<any>(null);

  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsHovered(true);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setIsHovered(false);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };
  
  return (
    <div 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex flex-col gap-2 group/item ${layout === 'below' ? 'p-1' : ''}`}
    >
      <div 
        className={`relative rounded-sm overflow-hidden border-2 cursor-pointer transition-all bg-black/40 flex items-center justify-center 
          ${selected ? `${frameColor} ring-4 z-10` : 'border-black/5 hover:border-black/20'}
          ${isRelief ? 'shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] bg-black/60' : ''}
        `}
        style={{ 
          aspectRatio: photo.metadata.width && photo.metadata.height 
            ? `${photo.metadata.width} / ${photo.metadata.height}` 
            : '3 / 2',
          width: '100%'
        }}
      >
        <AspectImage 
          src={photo.preview} 
          mode="thumbnail" 
          alt="Thumbnail" 
          className={isRelief ? 'opacity-60 group-hover/item:opacity-100 transition-opacity' : ''}
        />
        
        {/* Badges */}
        {photo.aiScoreData && showAiAnalysis && (
          <ScoreBadges score={photo.aiScoreData} visible={visibleBadges} />
        )}

        <div className="absolute top-1 left-1 flex flex-col gap-1">
          {photo.result?.isHeroPotential && showAiAnalysis && <div className="bg-amber-400 text-black text-[8px] font-black px-1 rounded-sm uppercase">Hero</div>}
          {photo.burstId && photo.isBurstLead && !isMobile && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleBurst?.(photo.burstId!);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black px-1 rounded-sm uppercase flex items-center gap-1 transition-colors"
            >
              Burst {isCollapsed ? '▼' : '▲'}
            </button>
          )}
          {(photo.result?.isRejected || photo.isRejected || photo.manualRejected) && (
            <div className="bg-emerald-600 text-white text-[8px] font-black px-1 rounded-sm uppercase flex items-center gap-1">
              {isMobile ? 'REJ' : 'Not Selected'} {photo.rejectType && showAiAnalysis && !isMobile ? `[${photo.rejectType}]` : ''}
            </div>
          )}
          {photo.renamedFilename && !isMobile && <div className="bg-system-accent text-white text-[7px] font-black px-1 rounded-sm uppercase truncate max-w-[80px]" title={photo.renamedFilename}>Renamed</div>}
          {photo.rawFile && <div className="bg-blue-600 text-white text-[7px] font-black px-1 rounded-sm uppercase">RAW</div>}
        </div>

        {/* Manual Rejected Overlay */}
        {photo.manualRejected && (
          <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-[1px] flex items-center justify-center">
            <XCircle size={isMobile ? 24 : 32} className="text-white/60" />
          </div>
        )}

        {/* Histogram (Bottom Right) - Hidden on mobile unless explicitly requested */}
        {layout === 'overlay' && !isLowPowerMode && !isMobile && (
          <div className="absolute bottom-1 right-1 w-10 h-6 bg-black/40 backdrop-blur-sm rounded-sm p-0.5 border border-white/5">
            <Histogram photo={photo} />
          </div>
        )}

        {/* Image Score Tag Overlay (when in overlay mode) */}
        {layout === 'overlay' && (
          <div className="absolute bottom-0 inset-x-0 z-20">
            <ImageScoreTag 
              compact
              visible={(!isLowPowerMode && isHovered) || photo.rating > 0 || !!photo.colorTag || !!photo.manualRejected || (!!photo.top9Score && showAiAnalysis) || isMobile}
              tag={{
                imageId: photo.id,
                stars: (photo.rating || 0) as StarRating,
                flag: (photo.colorTag || 'none') as FlagColor,
                pick: photo.metadata.aiFlag === 'primary',
                reject: !!(photo.manualRejected || photo.isRejected),
                top9: !!photo.top9Score?.isTopCandidate,
                top9Score: photo.top9Score?.totalScore
              }}
              showAiAnalysis={showAiAnalysis}
              onChange={(updated) => onTagChange?.(updated)}
            />
          </div>
        )}

        {/* Rollover Info - Hidden on mobile */}
        {!isLowPowerMode && !isMobile && (
          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-1 right-1 z-50 pointer-events-none"
              >
                <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[9px] font-mono text-white/80">
                  {photo.metadata.width}x{photo.metadata.height}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Bounding Box Below (when in below mode) */}
      {layout === 'below' && (
        <div className="bg-system-card/80 backdrop-blur-sm p-2 rounded-lg border border-system-border shadow-sm">
          <ImageScoreTag 
            compact
            visible={true}
            tag={{
              imageId: photo.id,
              stars: (photo.rating || 0) as StarRating,
              flag: (photo.colorTag || 'none') as FlagColor,
              pick: photo.metadata.aiFlag === 'primary',
              reject: !!(photo.manualRejected || photo.isRejected),
              top9: !!photo.top9Score?.isTopCandidate,
              top9Score: photo.top9Score?.totalScore
            }}
            showAiAnalysis={showAiAnalysis}
            onChange={(updated) => onTagChange?.(updated)}
          />
          <div className="mt-2 flex items-center justify-between text-[8px] font-bold text-system-secondary uppercase tracking-widest">
            <span className="truncate max-w-[100px]">{photo.file?.name || photo.id}</span>
            <span>{photo.metadata.iso ? `ISO ${photo.metadata.iso}` : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default ContactSheetItem;
