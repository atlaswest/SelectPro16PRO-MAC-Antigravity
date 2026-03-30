import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ChevronRight, FileText, AlertCircle, Info, Settings } from 'lucide-react';
import { PhotoItem, RenamingSettings } from '../types';
import RenamingStructure from './RenamingStructure';

interface PostIngestNamingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newPhotos: PhotoItem[];
  settings: RenamingSettings;
  onUpdateSettings: (settings: Partial<RenamingSettings>) => void;
  onApply: (renamedPhotos: PhotoItem[]) => void;
}

const PostIngestNamingDialog: React.FC<PostIngestNamingDialogProps> = ({
  isOpen,
  onClose,
  newPhotos,
  settings,
  onUpdateSettings,
  onApply
}) => {
  const [showConfig, setShowConfig] = useState(false);

  const generateNewFilename = (photo: PhotoItem, index: number) => {
    const seq = (settings.sequenceStart + index).toString().padStart(4, '0');
    
    if (settings.pattern === 'simple') {
      return `Seqn_${seq}`;
    }

    const person = settings.personPlace ? `${settings.personPlace}_` : '';
    const event = settings.event ? `${settings.event}_` : '';
    const location = settings.location ? `${settings.location}` : '';
    
    let base = `${person}${event}${location}`;
    if (base.endsWith('_')) base = base.slice(0, -1);
    
    return `${base}-${seq}`.toLowerCase();
  };

  const renamedPreview = useMemo(() => {
    return newPhotos.map((photo, index) => ({
      ...photo,
      proposedName: generateNewFilename(photo, index)
    }));
  }, [newPhotos, settings]);

  const handleApply = () => {
    const finalPhotos = renamedPreview.map(p => ({
      ...p,
      renamedFilename: p.proposedName
    }));
    onApply(finalPhotos);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-white/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white border border-black/10 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-black/10 flex items-center justify-between bg-black/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-lg">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase text-black">Batch Rename</h2>
                  <p className="text-xs text-black/30 font-bold uppercase tracking-widest mt-1">
                    {newPhotos.length} Items Ingested • Post-Ingest Workflow
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all text-black/20 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Left Side: Preview List */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-4 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Current Filename</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Proposed Filename</span>
                  </div>
                  {renamedPreview.map((photo, i) => (
                    <div key={photo.id} className="flex items-center gap-4 p-4 bg-black/5 rounded-3xl group hover:bg-black/10 transition-all">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/10 flex-shrink-0 flex items-center justify-center">
                        <img src={photo.preview} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-black/20 uppercase tracking-widest mb-1">Original</div>
                          <div className="text-xs font-mono text-black/40 truncate">{photo.file?.name || photo.id}</div>
                        </div>
                        <ChevronRight size={16} className="text-black/10" />
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-[10px] font-black text-black/20 uppercase tracking-widest mb-1">Proposed</div>
                          <div className="text-xs font-mono font-bold text-black truncate">
                            {photo.proposedName}.JPG
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Configuration (Optional/Collapsible) */}
              <div className={`w-80 border-l border-black/10 bg-black/[0.02] overflow-y-auto custom-scrollbar transition-all ${showConfig ? 'mr-0' : '-mr-80'}`}>
                <div className="p-8">
                  <RenamingStructure 
                    settings={settings}
                    onUpdate={onUpdateSettings}
                    photos={newPhotos}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-black/10 bg-white flex items-center justify-between">
              <button 
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                <Settings size={14} />
                {showConfig ? 'Hide Settings' : 'Adjust Pattern'}
              </button>

              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="px-8 py-4 text-xs font-black uppercase tracking-widest text-black/40 hover:text-black transition-all"
                >
                  Skip Renaming
                </button>
                <button 
                  onClick={handleApply}
                  className="px-10 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <CheckCircle2 size={16} />
                  Apply Batch Rename
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PostIngestNamingDialog;
