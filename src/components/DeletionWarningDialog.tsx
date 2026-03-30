import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ShieldCheck, HardDrive, Smartphone, Cloud, X, Keyboard } from 'lucide-react';
import { BackupLocation } from '../types';
import { meetsThreeTwoOneRule, canPermanentlyDelete } from '../services/backupManager';
import { DELETE_CONFIRMATION } from '../constants';

interface DeletionWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageCount: number;
  backupStatus: BackupLocation[];
  mode: 'safe-folder' | 'trash-recoverable' | 'trash-permanent';
}

export const DeletionWarningDialog: React.FC<DeletionWarningProps> = ({
  isOpen,
  onClose,
  onConfirm,
  imageCount,
  backupStatus,
  mode
}) => {
  const [confirmText, setConfirmText] = React.useState('');
  
  React.useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const has3Sources = meetsThreeTwoOneRule(backupStatus);
  const isFresh = backupStatus.every(l => {
    if (!l.verified) return true; // Only check freshness of verified ones
    const ageHours = (Date.now() - new Date(l.lastVerifiedAt).getTime()) / 3600000;
    return ageHours <= 24;
  });
  
  const canDelete = canPermanentlyDelete(mode, has3Sources, isFresh);
  const requiredPattern = DELETE_CONFIRMATION.pattern(imageCount);
  const isPatternConfirmed = !DELETE_CONFIRMATION.typeToConfirm || confirmText === requiredPattern;
  const isActionEnabled = canDelete && isPatternConfirmed;
  
  const verifiedCount = backupStatus.filter(l => l.verified).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mode === 'trash-permanent' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-white">Confirm Deletion</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Image Management Action</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  You are about to process <span className="text-white font-black">{imageCount}</span> images.
                </p>
                
                {mode === 'trash-permanent' && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1">Permanent Deletion</p>
                    <p className="text-[10px] text-emerald-500/60 font-medium">These images will be permanently removed from disk and cannot be recovered.</p>
                  </div>
                )}
                
                {mode === 'safe-folder' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Safe Folder Move</p>
                    <p className="text-[10px] text-amber-500/60 font-medium">Images will be moved to "Tagged for Deletion" folder and can be recovered later.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">3-2-1 Backup Status</h3>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${has3Sources ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {verifiedCount} / 3 Sources
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {backupStatus.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={loc.verified ? 'text-emerald-500' : 'text-white/20'}>
                          {loc.tier === 'media-card' ? <Smartphone size={14} /> : (loc.tier === 'local-A' || loc.tier === 'local-B') ? <HardDrive size={14} /> : <Cloud size={14} />}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${loc.verified ? 'text-white' : 'text-white/20'}`}>{loc.tier}</span>
                      </div>
                      {loc.verified ? (
                        <ShieldCheck size={14} className="text-emerald-500" />
                      ) : (
                        <span className="text-[8px] font-black text-white/10 uppercase">Missing</span>
                      )}
                    </div>
                  ))}
                </div>

                {!has3Sources && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500">
                    <AlertCircle size={16} className="shrink-0" />
                    <p className="text-[10px] font-bold leading-tight">
                      3-2-1 rule recommends at least 3 sources. Proceeding without full backup is risky.
                    </p>
                  </div>
                )}
              </div>

              {DELETE_CONFIRMATION.typeToConfirm && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Security Confirmation</h3>
                    <div className="flex items-center gap-2 text-white/40">
                      <Keyboard size={12} />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Type to confirm</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/40 font-medium">
                      Please type <span className="text-white font-black">"{requiredPattern}"</span> to proceed.
                    </p>
                    <input 
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={requiredPattern}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/20 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={!isActionEnabled}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
                  mode === 'trash-permanent' ? 'bg-emerald-600 text-white shadow-emerald-900/40' : 'bg-white text-black'
                } ${!isActionEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              >
                {mode === 'trash-permanent' ? 'Permanently Delete' : 'Proceed'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
