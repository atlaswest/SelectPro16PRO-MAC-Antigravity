import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Star } from 'lucide-react';
import { PhotoItem } from '../types';
import { COLOR_TAGS } from '../constants';
import { AspectImage } from './AspectImage';
import { ScoreBadges } from './ScoreBadges';

interface CompareViewProps {
  photos: PhotoItem[];
  selectedIds: string[];
  onPickWinner: (id: string) => void;
  onReject: (id: string) => void;
  onUpdateRating: (id: string, rating: number) => void;
  onUpdateColor: (id: string, color: string | null) => void;
  showAiAnalysis?: boolean;
  visibleBadges?: string[];
}

export default function CompareView({ 
  photos, 
  selectedIds, 
  onPickWinner, 
  onReject, 
  onUpdateRating, 
  onUpdateColor,
  showAiAnalysis = true,
  visibleBadges = ['grade', 'score', 'eyes', 'smile', 'blur']
}: CompareViewProps) {
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const selectedPhotos = photos.filter((p) => selectedIds.includes(p.id));
  
  if (selectedPhotos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-system-secondary gap-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <CheckCircle2 size={32} className="opacity-20" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-black uppercase tracking-widest">No Photos Selected</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Select multiple photos to compare</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Compare Selection ({selectedPhotos.length})</h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pick the winner to select your best shots</p>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Progressive Mode Active</span>
          </div>
        </div>
      </div>
      
      <div className={`flex-1 grid gap-4 overflow-y-auto custom-scrollbar pb-10 ${
        selectedPhotos.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 
        selectedPhotos.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 grid-rows-none sm:grid-rows-2' : 
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {selectedPhotos.map((photo) => (
          <div key={photo.id} className="relative group bg-black rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl h-full min-h-[300px]">
              <div 
                className={`flex-1 relative overflow-hidden bg-black/40 flex items-center justify-center transition-all duration-500 ${zoomedId === photo.id ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={() => setZoomedId(zoomedId === photo.id ? null : photo.id)}
              >
                <motion.div
                  animate={{ 
                    scale: zoomedId === photo.id ? 1.4 : 1,
                    y: zoomedId === photo.id ? -10 : 0
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <AspectImage 
                    src={photo.preview} 
                    className="max-w-full max-h-full object-contain"
                    alt="Compare"
                    mode="full"
                  />
                </motion.div>

              {photo.aiScoreData && showAiAnalysis && (
                <ScoreBadges score={photo.aiScoreData} visible={visibleBadges} />
              )}
              
              {/* Overlay Controls */}
              <div className={`absolute inset-0 bg-black/60 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm z-10 ${zoomedId === photo.id ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); onPickWinner(photo.id); }}
                  className="px-6 md:px-8 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 shadow-2xl shadow-emerald-900/40"
                >
                  <CheckCircle2 size={18} />
                  Pick Winner
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); onReject(photo.id); }}
                  className="px-6 md:px-8 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-3 shadow-2xl shadow-emerald-900/40"
                >
                  <XCircle size={18} />
                  Reject Shot
                </motion.button>
              </div>

              {/* Score Badge */}
              {showAiAnalysis && (
                <div className="absolute top-4 left-4 z-20">
                  <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border flex items-center gap-2 ${photo.result?.scores?.overall > 80 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/10 border-white/20 text-white/60'}`}>
                    <span className="text-xs font-black">{photo.result?.scores?.overall || '--'}</span>
                    <span className="text-[8px] font-bold uppercase tracking-tighter opacity-60">AI Score</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Info Bar */}
            <div className="h-16 md:h-20 bg-system-card border-t border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                  <p className="text-[9px] md:text-[10px] font-bold text-white/80 uppercase tracking-widest truncate max-w-[120px] md:max-w-[160px] mb-1">{photo.file?.name || photo.id}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button 
                        key={r}
                        onClick={() => onUpdateRating(photo.id, r)}
                        className="transition-all hover:scale-125"
                      >
                        <Star 
                          size={10} 
                          className={photo.rating >= r ? 'text-amber-400 fill-amber-400' : 'text-white/10'} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-2.5">
                {COLOR_TAGS.map(tag => (
                  <button 
                    key={tag.id}
                    onClick={() => onUpdateColor(photo.id, photo.colorTag === tag.id ? null : tag.id)}
                    className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 transition-all ${tag.color} ${photo.colorTag === tag.id ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
