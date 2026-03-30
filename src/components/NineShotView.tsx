import React from 'react';
import { LayoutGrid, Loader2, Sparkles, Plus } from 'lucide-react';
import { PhotoItem, ViewMode, StarRating, FlagColor } from '../types';
import { AnalysisSettings } from '../services/geminiService';
import { AspectImage } from './AspectImage';
import { ImageScoreTag, ImageTag } from './ImageScoreTag';
import { ScoreBadges } from './ScoreBadges';

interface NineShotViewProps {
  photos: PhotoItem[];
  selectedIds: string[];
  onPhotoClick: (id: string) => void;
  onMagicSelect: () => void;
  isAnalyzing: boolean;
  isModelLoaded: boolean;
  loadingMsg: string;
  onTagChange: (updated: ImageTag) => void;
  aiAnalysisSettings: AnalysisSettings;
  showAiAnalysis?: boolean;
  visibleBadges?: string[];
}

const NineShotView: React.FC<NineShotViewProps> = ({ 
  photos, 
  selectedIds, 
  onPhotoClick,
  onMagicSelect,
  isAnalyzing,
  isModelLoaded,
  loadingMsg,
  onTagChange,
  aiAnalysisSettings,
  showAiAnalysis = true,
  visibleBadges = ['grade', 'score', 'eyes', 'smile', 'blur']
}) => {
  const selectedPhotos = photos.filter(p => selectedIds.includes(p.id)).slice(0, 9);
  
  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-system-accent/20 flex items-center justify-center text-system-accent border border-system-accent/20">
            <LayoutGrid size={16} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-system-accent">9 Shot View</h2>
            <p className="text-[10px] text-white/40">Compare up to 9 selected images in a 3x3 grid</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onMagicSelect}
            disabled={isAnalyzing || !isModelLoaded || photos.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              isAnalyzing 
                ? 'bg-system-accent/20 text-system-accent cursor-not-allowed' 
                : 'bg-system-accent text-white hover:scale-105 shadow-lg shadow-system-accent/20'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                {aiAnalysisSettings.shotCount === 1 ? 'Hero Shot' : `Top ${aiAnalysisSettings.shotCount || 9}`}
              </>
            )}
          </button>
          {!isModelLoaded && (
            <span className="text-[9px] text-system-highlight font-bold uppercase animate-pulse">
              {loadingMsg || 'Loading AI Models...'}
            </span>
          )}
          <div className="hidden sm:flex px-3 py-1 bg-black/20 rounded-full border border-white/5 items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${selectedIds.length >= (aiAnalysisSettings.shotCount || 9) ? 'bg-emerald-500' : 'bg-system-highlight'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
              {selectedIds.length} / {aiAnalysisSettings.shotCount || 9} Selected
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 grid-rows-none sm:grid-rows-3 gap-2 p-2 bg-black/20 rounded-xl overflow-y-auto custom-scrollbar border border-white/5">
        {Array.from({ length: 9 }).map((_, i) => {
          const photo = selectedPhotos[i];
          return (
            <div 
              key={i} 
              className={`relative rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center aspect-square ${photo ? 'border-transparent hover:border-system-accent/50 cursor-pointer shadow-lg bg-black/20' : 'border-dashed border-white/5 bg-white/5'}`}
              onClick={() => photo && onPhotoClick(photo.id)}
            >
              {photo ? (
                <>
                  <AspectImage src={photo.preview} mode="thumbnail" alt={`Shot ${i + 1}`} />
                  {photo.aiScoreData && showAiAnalysis && (
                    <ScoreBadges score={photo.aiScoreData} visible={visibleBadges} />
                  )}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white/80 border border-white/10 tracking-widest uppercase z-10">
                    Shot {i + 1}
                  </div>
                  {photo.top9Score && showAiAnalysis && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-system-accent/80 backdrop-blur-md rounded text-[8px] font-black text-white border border-white/10 tracking-widest uppercase z-10">
                      Score: {photo.top9Score.totalScore}
                    </div>
                  )}
                  
                  {/* Image Score Tag Overlay */}
                  <div className="absolute bottom-0 inset-x-0 z-20">
                    <ImageScoreTag 
                      compact
                      visible
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
                      onChange={onTagChange}
                    />
                  </div>

                  <div className="absolute bottom-8 left-2 flex flex-wrap gap-1 max-w-[80%] z-10">
                    {photo.top9Score?.detectedSubjects.slice(0, 2).map((s, idx) => (
                      showAiAnalysis && (
                        <span key={idx} className="px-1 py-0.5 bg-black/40 rounded text-[6px] text-white/60 uppercase font-bold">
                          {s}
                        </span>
                      )
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                  <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center">
                    <Plus size={12} className="text-white/10" />
                  </div>
                  <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Empty Slot</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NineShotView;
