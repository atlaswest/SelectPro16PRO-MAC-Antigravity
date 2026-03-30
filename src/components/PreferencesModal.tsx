import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, X, Keyboard, Brain, Palette, Zap, Filter, Target,
  Copy, Info, Trash2, Database, ShieldCheck, HardDrive, Cloud, AlertCircle, Clock, Smartphone,
  Share2, Link as LinkIcon, CheckCircle2, ExternalLink, Loader2, Wand2, Monitor, Download
} from 'lucide-react';
import { BackupLocation, DeletionPreferences, ShootingGoals } from '../types';
import { WEB_READY_PROMPT } from '../services/imageService';

interface PreferencesModalProps {
  showPreferences: boolean;
  setShowPreferences: (show: boolean) => void;
  activePreferenceTab: 'shortcuts' | 'ai' | 'appearance' | 'performance' | 'selection' | 'backup' | 'workflow' | 'goals';
  setActivePreferenceTab: (tab: 'shortcuts' | 'ai' | 'appearance' | 'performance' | 'selection' | 'backup' | 'workflow' | 'goals') => void;
  connections: any;
  setConnections: React.Dispatch<React.SetStateAction<any>>;
  isPublishing: string | null;
  handlePublish: (platform: string) => void;
  connectProvider: (provider: string) => void;
  keyboardSettings: any;
  setKeyboardSettings: React.Dispatch<React.SetStateAction<any>>;
  aiAnalysisSettings: any;
  setAiAnalysisSettings: React.Dispatch<React.SetStateAction<any>>;
  cameraStyle: 'canon' | 'sony' | 'nikon' | 'leica';
  setCameraStyle: (style: 'canon' | 'sony' | 'nikon' | 'leica') => void;
  interfaceColor: string;
  setInterfaceColor: (color: string) => void;
  cacheSettings: any;
  setCacheSettings: React.Dispatch<React.SetStateAction<any>>;
  handleClearImageCache: () => void;
  selectionRules: any;
  setSelectionRules: React.Dispatch<React.SetStateAction<any>>;
  autoAdvance: boolean;
  setAutoAdvance: (auto: boolean) => void;
  deferredAiMode: boolean;
  setDeferredAiMode: (deferred: boolean) => void;
  autoEnhance: boolean;
  setAutoEnhance: (enhance: boolean) => void;
  filmStripPosition: 'left' | 'bottom' | 'right';
  setFilmStripPosition: (pos: 'left' | 'bottom' | 'right') => void;
  isAutoFilmstrip: boolean;
  setIsAutoFilmstrip: (auto: boolean) => void;
  neutralGrey: string;
  setNeutralGrey: (val: string) => void;
  showCameraDataPanel: boolean;
  setShowCameraDataPanel: (show: boolean) => void;
  showPinline: boolean;
  setShowPinline: (show: boolean) => void;
  shootingGoals: ShootingGoals;
  setShootingGoals: React.Dispatch<React.SetStateAction<ShootingGoals>>;
  backupLocations: BackupLocation[];
  setBackupLocations: React.Dispatch<React.SetStateAction<BackupLocation[]>>;
  deletionPreferences: DeletionPreferences;
  setDeletionPreferences: React.Dispatch<React.SetStateAction<DeletionPreferences>>;
  thumbnailMinSize: number;
  setThumbnailMinSize: (size: number) => void;
  thumbnailMaxSize: number;
  setThumbnailMaxSize: (size: number) => void;
  rowPadding: number;
  setRowPadding: (padding: number) => void;
  inverseThumbnailSlider: boolean;
  setInverseThumbnailSlider: (inverse: boolean) => void;
  ingestSettings: any;
  setIngestSettings: React.Dispatch<React.SetStateAction<any>>;
  projectSettings: any;
  setProjectSettings: React.Dispatch<React.SetStateAction<any>>;
  plugins: any;
  setPlugins: React.Dispatch<React.SetStateAction<any>>;
  gangRawJpeg: boolean;
  setGangRawJpeg: (val: boolean) => void;
  sidecarEnabled: boolean;
  setSidecarEnabled: (val: boolean) => void;
  autoWriteSidecar: boolean;
  setAutoWriteSidecar: (val: boolean) => void;
  offlineMode: boolean;
  setOfflineMode: (val: boolean) => void;
  saveSidecarNow: () => void;
  generateNewFilename: (photo: any, index: number) => string;
  photos: any[];
  aiProvider: 'gemini' | 'openai' | 'auto' | 'local' | 'hybrid';
  setAiProvider: (provider: 'gemini' | 'openai' | 'auto' | 'local' | 'hybrid') => void;
}

function ConnectionButton({ label, connected, onClick, loading }: { label: string, connected: boolean, onClick: () => void, loading?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all shadow-sm gap-3 ${connected ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-black/5 border-black/5 text-black/40 hover:bg-black/10 hover:text-black/80'}`}
    >
      <div className="flex items-center gap-3">
        {loading ? <Loader2 size={16} className="animate-spin" /> : (connected ? <CheckCircle2 size={16} /> : <LinkIcon size={16} />)}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        {loading ? (
          <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span>
        ) : connected ? (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
            <Share2 size={12} className="opacity-60" />
          </>
        ) : (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">Connect</span>
            <ExternalLink size={12} className="opacity-40" />
          </>
        )}
      </div>
    </button>
  );
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({
  showPreferences,
  setShowPreferences,
  activePreferenceTab,
  setActivePreferenceTab,
  keyboardSettings,
  setKeyboardSettings,
  aiAnalysisSettings,
  setAiAnalysisSettings,
  cameraStyle,
  setCameraStyle,
  interfaceColor,
  setInterfaceColor,
  cacheSettings,
  setCacheSettings,
  handleClearImageCache,
  selectionRules,
  setSelectionRules,
  autoAdvance,
  setAutoAdvance,
  deferredAiMode,
  setDeferredAiMode,
  autoEnhance,
  setAutoEnhance,
  filmStripPosition,
  setFilmStripPosition,
  isAutoFilmstrip,
  setIsAutoFilmstrip,
  neutralGrey,
  setNeutralGrey,
  showCameraDataPanel,
  setShowCameraDataPanel,
  showPinline,
  setShowPinline,
  shootingGoals,
  setShootingGoals,
  backupLocations,
  setBackupLocations,
  deletionPreferences,
  setDeletionPreferences,
  thumbnailMinSize,
  setThumbnailMinSize,
  thumbnailMaxSize,
  setThumbnailMaxSize,
  rowPadding,
  setRowPadding,
  inverseThumbnailSlider,
  setInverseThumbnailSlider,
  ingestSettings,
  setIngestSettings,
  projectSettings,
  setProjectSettings,
  plugins,
  setPlugins,
  gangRawJpeg,
  setGangRawJpeg,
  sidecarEnabled,
  setSidecarEnabled,
  autoWriteSidecar,
  setAutoWriteSidecar,
  offlineMode,
  setOfflineMode,
  saveSidecarNow,
  generateNewFilename,
  photos,
  connections,
  setConnections,
  isPublishing,
  handlePublish,
  connectProvider,
  aiProvider,
  setAiProvider,
}) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-white/80 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="bg-white border border-black/10 rounded-[24px] sm:rounded-[32px] md:rounded-[48px] w-full max-w-5xl h-full sm:h-[90vh] md:h-[85vh] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 md:p-10 border-b border-black/5 flex items-center justify-between bg-gradient-to-b from-black/5 to-transparent">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-[12px] sm:rounded-[16px] md:rounded-[24px] bg-black/5 border border-black/10 flex items-center justify-center shadow-inner">
              <Settings size={20} className="text-black/80 sm:hidden" />
              <Settings size={24} className="text-black/80 hidden sm:block md:hidden" />
              <Settings size={32} className="text-black/80 hidden md:block" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-3xl font-black tracking-tighter uppercase italic text-black">Preferences</h2>
              <p className="text-[7px] sm:text-[8px] md:text-[10px] text-black/30 font-bold uppercase tracking-[0.3em] mt-1">System Configuration & Workflow</p>
            </div>
          </div>
          <button 
            onClick={() => setShowPreferences(false)} 
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center hover:bg-black/5 rounded-full transition-all text-black/20 hover:text-black"
          >
            <X size={24} className="sm:hidden" />
            <X size={28} className="hidden sm:block" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-black/5 p-4 md:p-6 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar bg-gray-50/50">
            {[
              { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
              { id: 'ai', label: 'AI Analysis', icon: Brain },
              { id: 'appearance', label: 'Appearance', icon: Palette },
              { id: 'performance', label: 'Performance', icon: Zap },
              { id: 'selection', label: 'Selection Rules', icon: Filter },
              { id: 'workflow', label: 'Workflow', icon: Share2 },
              { id: 'goals', label: 'Shooting Goals', icon: Target },
              { id: 'backup', label: 'Backup & Deletion', icon: Database }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePreferenceTab(tab.id as any)}
                className={`flex-shrink-0 md:flex-shrink-1 flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold transition-all group ${
                  activePreferenceTab === tab.id 
                    ? 'bg-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)]' 
                    : 'text-black/40 hover:text-black/80 hover:bg-black/5'
                }`}
              >
                <tab.icon size={16} className={activePreferenceTab === tab.id ? 'text-white' : 'text-black/20 group-hover:text-black/60'} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-12 custom-scrollbar bg-white">
            {activePreferenceTab === 'shortcuts' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Command Mapping</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {[
                      { id: 'lightroom', name: 'Classic', desc: '1-5 Stars, 6-9 Color Tags' },
                      { id: 'photomechanic', name: 'Optimised', desc: 'Optimized for 1-9 Ingest' },
                      { id: 'custom', name: 'Custom Mapping', desc: 'User-defined shortcuts' }
                    ].map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => setKeyboardSettings((prev: any) => ({ ...prev, preset: p.id as any, maxRating: p.id === 'photomechanic' ? 9 : 5 }))}
                        className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border text-left transition-all ${
                          keyboardSettings.preset === p.id 
                            ? 'bg-black/5 border-black/20 ring-1 ring-black/20' 
                            : 'bg-black/5 border-black/5 hover:bg-black/10'
                        }`}
                      >
                        <div className="text-xs md:text-sm font-bold mb-1 text-black">{p.name}</div>
                        <p className="text-[9px] md:text-[10px] text-black/30 font-medium uppercase tracking-wider">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Advanced Configuration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Rating Range</label>
                      <div className="flex bg-black/5 p-1.5 rounded-2xl border border-black/5">
                        {[5, 9].map(num => (
                          <button 
                            key={num}
                            onClick={() => setKeyboardSettings((prev: any) => ({ ...prev, maxRating: num as any }))}
                            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${keyboardSettings.maxRating === num ? 'bg-black text-white shadow-xl' : 'text-black/40 hover:text-black/60'}`}
                          >
                            1-{num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Global Modifier</label>
                      <select 
                        value={keyboardSettings.requireModifier}
                        onChange={(e) => setKeyboardSettings((prev: any) => ({ ...prev, requireModifier: e.target.value as any }))}
                        className="w-full bg-black/5 text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/5 appearance-none text-black"
                      >
                        <option value="none">None (Direct Keys)</option>
                        <option value="alt">Alt / Option</option>
                        <option value="cmd">Cmd / Ctrl</option>
                        <option value="shift">Shift</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreferenceTab === 'ai' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Workflow Control</h3>
                  
                  <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Curation Depth</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Select the number of top shots to identify</div>
                      </div>
                      <div className="flex bg-black/10 p-1 rounded-xl overflow-x-auto no-scrollbar">
                        {[1, 3, 4, 5, 9].map((count) => (
                          <button 
                            key={count}
                            onClick={() => setAiAnalysisSettings((prev: any) => ({ ...prev, shotCount: count }))}
                            className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${aiAnalysisSettings.shotCount === count ? 'bg-black text-white shadow-lg' : 'text-black/40 hover:text-black/60'}`}
                          >
                            {count === 1 ? 'Hero' : count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">AI Model Provider</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Select the engine for vision analysis</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex bg-black/10 p-1 rounded-xl">
                          <button 
                            onClick={() => setAiProvider('auto')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${aiProvider === 'auto' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                          >
                            Auto
                          </button>
                          <button 
                            onClick={() => setAiProvider('gemini')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${aiProvider === 'gemini' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                          >
                            Gemini
                          </button>
                          <button 
                            onClick={() => setAiProvider('openai')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${aiProvider === 'openai' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                          >
                            OpenAI
                          </button>
                          <button 
                            onClick={() => setAiProvider('hybrid')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${aiProvider === 'hybrid' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                          >
                            Hybrid
                          </button>
                          <button 
                            onClick={() => setAiProvider('local')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${aiProvider === 'local' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                          >
                            Local
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-black/5" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Manual Model Override</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Force specific model selection regardless of auto-detection</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setAiAnalysisSettings((prev: any) => ({ ...prev, manualOverride: !prev.manualOverride }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${aiAnalysisSettings.manualOverride ? 'bg-black' : 'bg-black/10'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${aiAnalysisSettings.manualOverride ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                        </button>
                        
                        <select 
                          disabled={!aiAnalysisSettings.manualOverride}
                          value={aiAnalysisSettings.model || 'gemini-2.0-flash'}
                          onChange={(e) => setAiAnalysisSettings((prev: any) => ({ ...prev, model: e.target.value }))}
                          className={`bg-black/10 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none text-xs font-bold focus:outline-none text-black ${!aiAnalysisSettings.manualOverride ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          <option value="gpt-4o">GPT-4o</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-black">Deferred AI Ingest</div>
                      <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Wait for manual trigger after import</div>
                    </div>
                    <div className="flex bg-black/10 p-1 rounded-xl">
                      <button 
                        onClick={() => setDeferredAiMode(false)}
                        className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!deferredAiMode ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                      >
                        Auto
                      </button>
                      <button 
                        onClick={() => setDeferredAiMode(true)}
                        className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${deferredAiMode ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                      >
                        Deferred
                      </button>
                    </div>
                  </div>
                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-black">Preferred Default Selection Mode</div>
                          <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Select the default mode for new sessions</div>
                        </div>
                        <div className="flex bg-black/10 p-1 rounded-xl">
                          {['P', 'A', 'S', 'M'].map((mode) => (
                            <button 
                              key={mode}
                              onClick={() => setAiAnalysisSettings((prev: any) => ({ ...prev, defaultMode: mode as any }))}
                              className={`w-8 h-8 flex items-center justify-center text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${aiAnalysisSettings.defaultMode === mode ? 'bg-black text-white shadow-lg' : 'text-black/40 hover:text-black/60'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white/50 rounded-2xl p-4 border border-black/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded bg-black text-white flex items-center justify-center text-[10px] font-black">
                            {aiAnalysisSettings.defaultMode}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                            {aiAnalysisSettings.defaultMode === 'M' ? 'Manual' : 
                             aiAnalysisSettings.defaultMode === 'S' ? 'Shutter Priority' : 
                             aiAnalysisSettings.defaultMode === 'A' ? 'Aperture Priority' : 'Program Auto'}
                          </span>
                        </div>
                        <p className="text-[11px] text-black/60 leading-relaxed italic">
                          {aiAnalysisSettings.defaultMode === 'M' && "Full manual selection"}
                          {aiAnalysisSettings.defaultMode === 'S' && "Priorities highest shutter speed selection, add computational enhancement for ie highest priority, for 1/8000th, lowest 30 seconds"}
                          {aiAnalysisSettings.defaultMode === 'A' && "Emphasis on largest aperture f1.0/f1.2 Lowest f45"}
                          {aiAnalysisSettings.defaultMode === 'P' && "Automatic thinking emphasis on 1/250th flash considerations social photography"}
                        </p>
                      </div>
                    </div>
                </div>
                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Vision Analysis Parameters</h3>
                  <div className="grid grid-cols-1 gap-10">
                    {[
                      { label: 'Blur Sensitivity', key: 'blurSensitivity', desc: 'How aggressive the AI flags out-of-focus shots' },
                      { label: 'Composition Emphasis', key: 'compositionEmphasis', desc: 'Weight given to framing and rule of thirds' },
                      { label: 'Focus Precision', key: 'focusSensitivity', desc: 'Threshold for eye-tracking and sharpness' }
                    ].map((slider) => (
                      <div key={slider.key} className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-xs font-bold text-black/80">{slider.label}</div>
                            <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">{slider.desc}</div>
                          </div>
                          <div className="text-xs font-mono text-black/60">{(aiAnalysisSettings as any)[slider.key]}%</div>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={(aiAnalysisSettings as any)[slider.key]}
                          onChange={(e) => setAiAnalysisSettings((prev: any) => ({ ...prev, [slider.key]: parseInt(e.target.value) }))}
                          className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Privacy & Security</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-5 sm:p-6 bg-black/5 rounded-2xl md:rounded-3xl border border-black/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-black">Anonymize Faces</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Blur faces during analysis</div>
                      </div>
                      <button 
                        onClick={() => setAiAnalysisSettings((prev: any) => ({ ...prev, anonymizeFaces: !prev.anonymizeFaces }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${aiAnalysisSettings.anonymizeFaces ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${aiAnalysisSettings.anonymizeFaces ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>
                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-black">Privacy Mode</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Data retention policy</div>
                      </div>
                      <select 
                        value={aiAnalysisSettings.privacyMode}
                        onChange={(e) => setAiAnalysisSettings((prev: any) => ({ ...prev, privacyMode: e.target.value as any }))}
                        className="bg-transparent text-xs font-bold focus:outline-none text-black"
                      >
                        <option value="standard">Standard</option>
                        <option value="strict">Strict</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-black/40" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-black">Local AI Only</div>
                          <div className="text-[9px] font-bold text-black/40">Run all analysis on-device (No cloud)</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAiAnalysisSettings((prev: any) => ({ ...prev, localAiOnly: !prev.localAiOnly }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${aiAnalysisSettings.localAiOnly ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${aiAnalysisSettings.localAiOnly ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreferenceTab === 'appearance' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Camera Info Style</h3>
                  <div className="p-6 bg-black/5 rounded-3xl border border-black/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-black">Automatic Style Selection</div>
                      <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">
                        Style is determined by camera model (Nikon F, Canon EOS, etc.)
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-black/40">
                      Active
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Interface Color</h3>
                  <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
                    <div 
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-black/10 shadow-2xl transition-all"
                      style={{ backgroundColor: interfaceColor }}
                    />
                    <div className="space-y-4 flex-1 w-full">
                      <div className="flex flex-wrap gap-2 md:gap-3 justify-center sm:justify-start">
                        {['#111111', '#1a1a1a', '#262626', '#333333', '#404040', '#4d4d4d'].map(color => (
                          <button
                            key={color}
                            onClick={() => setInterfaceColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${interfaceColor === color ? 'border-black scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={interfaceColor}
                          onChange={(e) => setInterfaceColor(e.target.value)}
                          className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={interfaceColor}
                          onChange={(e) => setInterfaceColor(e.target.value)}
                          className="bg-black/5 border border-black/10 rounded-xl px-4 py-2 text-xs font-mono text-black focus:outline-none focus:border-black/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Library View</h3>
                  
                  {/* Library View Controls */}
                  <div className="space-y-6">
                    {/* Thumbnail Size Range */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-black uppercase tracking-widest">Thumbnail Size Range</label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Inverse UI</span>
                          <button 
                            onClick={() => setInverseThumbnailSlider(!inverseThumbnailSlider)}
                            className={`w-8 h-4 rounded-full relative transition-all ${inverseThumbnailSlider ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${inverseThumbnailSlider ? 'left-4.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                      
                      <div className={`flex gap-3 items-center ${inverseThumbnailSlider ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="range"
                          min={80}
                          max={400}
                          value={thumbnailMinSize}
                          onChange={(e) => setThumbnailMinSize(Number(e.target.value))}
                          className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />

                        <input
                          type="range"
                          min={120}
                          max={600}
                          value={thumbnailMaxSize}
                          onChange={(e) => setThumbnailMaxSize(Number(e.target.value))}
                          className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="text-[10px] font-mono text-black/40 mt-1 uppercase tracking-wider">
                        {thumbnailMinSize}px — {thumbnailMaxSize}px
                      </div>
                    </div>

                    {/* Row Padding */}
                    <div>
                      <label className="block text-xs font-bold text-black mb-2 uppercase tracking-widest">Row Spacing</label>

                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={rowPadding}
                        onChange={(e) => setRowPadding(Number(e.target.value))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />

                      <div className="text-[10px] font-mono text-black/40 mt-1 uppercase tracking-wider">
                        {rowPadding}px spacing
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Adaptive Workspace</h3>
                  <div className="space-y-4">
                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Camera Data Panel</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Display EXIF data as a floating overlay</div>
                      </div>
                      <button 
                        onClick={() => setShowCameraDataPanel(!showCameraDataPanel)}
                        className={`w-12 h-6 rounded-full transition-all relative ${showCameraDataPanel ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${showCameraDataPanel ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Narrow Pinline</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Display a narrow film-style pinline around the workspace</div>
                      </div>
                      <button 
                        onClick={() => setShowPinline(!showPinline)}
                        className={`w-12 h-6 rounded-full transition-all relative ${showPinline ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${showPinline ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5">
                      <p className="text-xs text-black/60 leading-relaxed">
                        The interface automatically adjusts its brightness based on your current workflow mode (Proof, Loupe, Retouch) to provide the optimal viewing environment for different tasks.
                      </p>
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Film Strip Position</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Choose where the film strip is displayed</div>
                      </div>
                      <div className="flex bg-black/10 p-1 rounded-xl">
                        <button 
                          onClick={() => setIsAutoFilmstrip(true)}
                          className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isAutoFilmstrip ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                        >
                          Auto
                        </button>
                        <button 
                          onClick={() => {
                            setIsAutoFilmstrip(false);
                            setFilmStripPosition('left');
                          }}
                          className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isAutoFilmstrip && filmStripPosition === 'left' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                        >
                          Left
                        </button>
                        <button 
                          onClick={() => {
                            setIsAutoFilmstrip(false);
                            setFilmStripPosition('bottom');
                          }}
                          className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isAutoFilmstrip && filmStripPosition === 'bottom' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                        >
                          Bottom
                        </button>
                        <button 
                          onClick={() => {
                            setIsAutoFilmstrip(false);
                            setFilmStripPosition('right');
                          }}
                          className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isAutoFilmstrip && filmStripPosition === 'right' ? 'bg-black text-white shadow-lg' : 'text-black/40'}`}
                        >
                          Right
                        </button>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-black/5 rounded-[24px] sm:rounded-[32px] border border-black/5 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-black">Neutral Grey Calibration</div>
                          <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Adjust for accurate neutral tone on your display</div>
                        </div>
                        <div className="text-xs font-mono text-black/40">rgb({neutralGrey}, {neutralGrey}, {neutralGrey})</div>
                      </div>

                      <div className="space-y-4">
                        <div className="h-2 w-full rounded-full bg-gradient-to-r from-[rgb(200,200,200)] to-[rgb(245,245,245)] relative">
                          <input 
                            type="range" 
                            min="200" 
                            max="245" 
                            value={neutralGrey}
                            onChange={(e) => setNeutralGrey(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-black/10 rounded-full shadow-lg pointer-events-none"
                            style={{ left: `${((parseInt(neutralGrey) - 200) / 45) * 100}%`, transform: 'translate(-50%, -50%)' }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                          <div className="space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-widest text-black/30">Sample Sequence</div>
                            <div className="p-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: `rgb(${neutralGrey}, ${neutralGrey}, ${neutralGrey})` }}>
                              <span className="text-xs sm:text-sm font-black text-black">Seqn_0001</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-widest text-black/30">Focused State</div>
                            <div className="p-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: `rgb(${Math.max(0, parseInt(neutralGrey) - 20)}, ${Math.max(0, parseInt(neutralGrey) - 20)}, ${Math.max(0, parseInt(neutralGrey) - 20)})` }}>
                              <span className="text-xs sm:text-sm font-black text-black">Editing...</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[9px] font-black uppercase tracking-widest text-black/30">Selected Item</div>
                            <div className="p-3 rounded-xl flex items-center justify-center border-2 border-black" style={{ backgroundColor: `rgb(${neutralGrey}, ${neutralGrey}, ${neutralGrey})` }}>
                              <CheckCircle2 size={16} className="text-black" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreferenceTab === 'performance' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Caching Engine</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Cache Location</label>
                      <select 
                        value={cacheSettings.cacheLocation}
                        onChange={(e) => setCacheSettings((prev: any) => ({ ...prev, cacheLocation: e.target.value }))}
                        className="w-full bg-black/5 text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/5 appearance-none text-black"
                      >
                        <option value="IndexedDB">IndexedDB (Disk)</option>
                        <option value="Memory">Memory (RAM)</option>
                        <option value="FileSystem">Native File System</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Max Cache Size</label>
                        <div className="text-xs font-mono text-black/60">{cacheSettings.maxCacheSize} MB</div>
                      </div>
                      <input 
                        type="range" 
                        min="100" 
                        max="5000" 
                        step="100"
                        value={cacheSettings.maxCacheSize}
                        onChange={(e) => setCacheSettings((prev: any) => ({ ...prev, maxCacheSize: parseInt(e.target.value) }))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={handleClearImageCache}
                      className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Clear Image Cache
                    </button>
                    <p className="text-[9px] text-black/20 font-bold uppercase tracking-widest mt-3">
                      This will remove all locally cached previews and analysis data.
                    </p>
                  </div>

                  {/* Offline Mode */}
                  <div className="flex items-center justify-between p-6 bg-black/5 rounded-3xl border border-black/5">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest block">Offline Mode</span>
                      <span className="text-[10px] text-black/40 font-bold uppercase tracking-tighter mt-1 block">Disable AI enrichment for local processing</span>
                    </div>
                    <button 
                      onClick={() => setOfflineMode(!offlineMode)}
                      className={`w-12 h-6 rounded-full relative transition-all ${offlineMode ? 'bg-black' : 'bg-black/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${offlineMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Rendering Strategy</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {[
                      { id: 'camera-previews', label: 'Camera Previews', desc: 'Fastest performance, uses embedded JPEGs' },
                      { id: 'render-in-place', label: 'Render in Place', desc: 'Highest quality, full RAW processing' }
                    ].map((mode) => (
                      <button 
                        key={mode.id}
                        onClick={() => setCacheSettings((prev: any) => ({ ...prev, previewMode: mode.id as any }))}
                        className={`p-6 rounded-3xl border text-left transition-all ${
                          cacheSettings.previewMode === mode.id 
                            ? 'bg-black/5 border-black/20 ring-1 ring-black/20' 
                            : 'bg-black/5 border-black/5 hover:bg-black/10'
                        }`}
                      >
                        <div className="text-sm font-bold mb-1 text-black">{mode.label}</div>
                        <p className="text-[10px] text-black/30 font-medium uppercase tracking-wider">{mode.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activePreferenceTab === 'selection' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Automated Selection Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Overall Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minOverallScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minOverallScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minOverallScore}%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Required Aspect Ratio</label>
                      <select 
                        value={selectionRules.requiredAspectRatio}
                        onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, requiredAspectRatio: e.target.value as any }))}
                        className="w-full bg-black/5 text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/5 appearance-none text-black"
                      >
                        <option value="any">Any Ratio</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:3">4:3 (Standard)</option>
                        <option value="3:2">3:2 (Classic)</option>
                        <option value="16:9">16:9 (Wide)</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Focus Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minFocusScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minFocusScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minFocusScore}%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Expression Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minExpressionScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minExpressionScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minExpressionScore}%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Composition Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minCompositionScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minCompositionScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minCompositionScore}%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Eyes Open Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minEyesOpenScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minEyesOpenScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minEyesOpenScore}%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Lighting Score</label>
                      <div className="flex items-center gap-6">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={selectionRules.minLightingScore}
                          onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minLightingScore: parseInt(e.target.value) }))}
                          className="flex-1 accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="text-xs font-mono text-black/60 w-10">{selectionRules.minLightingScore}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Workflow Automation</h3>
                  <div className="space-y-4">
                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Auto Advance</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Move to next photo after rating or tagging</div>
                      </div>
                      <button 
                        onClick={() => setAutoAdvance(!autoAdvance)}
                        className={`w-12 h-6 rounded-full transition-all relative ${autoAdvance ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${autoAdvance ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Auto Enhance</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Automatically apply AI enhancements</div>
                      </div>
                      <button 
                        onClick={() => setAutoEnhance(!autoEnhance)}
                        className={`w-12 h-6 rounded-full transition-all relative ${autoEnhance ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${autoEnhance ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreferenceTab === 'workflow' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Portable Metadata</h3>
                  <div className="space-y-4">
                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Enable Sidecar System</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Use _selectpro_catalog.json for portable metadata</div>
                      </div>
                      <button 
                        onClick={() => {
                          const newVal = !sidecarEnabled;
                          setSidecarEnabled(newVal);
                          localStorage.setItem('sidecarEnabled', JSON.stringify(newVal));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${sidecarEnabled ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${sidecarEnabled ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-black">Auto-Write Catalogue</div>
                        <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Save changes automatically to sidecar</div>
                      </div>
                      <button 
                        disabled={!sidecarEnabled}
                        onClick={() => {
                          const newVal = !autoWriteSidecar;
                          setAutoWriteSidecar(newVal);
                          localStorage.setItem('autoWriteSidecar', JSON.stringify(newVal));
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${!sidecarEnabled ? 'opacity-50 cursor-not-allowed' : ''} ${autoWriteSidecar ? 'bg-black' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${autoWriteSidecar ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                      </button>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={saveSidecarNow}
                        disabled={!sidecarEnabled}
                        className={`px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!sidecarEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/80'}`}
                      >
                        <Share2 size={14} />
                        Save Catalogue Now
                      </button>
                      <p className="text-[9px] text-black/20 font-bold uppercase tracking-widest mt-3">
                        Manually export the current metadata to a portable JSON file.
                      </p>
                    </div>

                    {/* Mac Download */}
                    <div className="mt-12 p-8 bg-gradient-to-br from-zinc-900 to-black rounded-[40px] text-white border border-white/10 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Monitor size={120} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                            <Monitor size={28} className="text-emerald-500" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black uppercase tracking-tighter italic">SelectPro <span className="text-emerald-500">Desktop</span></h4>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Native macOS Application</p>
                          </div>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed mb-8 max-w-md italic">
                          Unlock full hardware acceleration, background ingest, and native file system access. Built for professional workflows that demand speed and reliability.
                        </p>
                        <button className="w-full sm:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                          <Download size={16} />
                          Download for Mac
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Ingest Configuration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-3">
                          <ShieldCheck size={16} className="text-emerald-500" />
                          <div>
                            <span className="text-xs font-bold block">Server Safe Filenames</span>
                            <span className="text-[9px] text-black/40">Lowercase, no spaces</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIngestSettings((prev: any) => ({ ...prev, serverSafe: !prev.serverSafe }))}
                          className={`w-10 h-5 rounded-full transition-all relative ${ingestSettings.serverSafe ? 'bg-emerald-500' : 'bg-black/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${ingestSettings.serverSafe ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                        <div className="flex items-center gap-3">
                          <Copy size={16} className="text-blue-500" />
                          <div>
                            <span className="text-xs font-bold block">Gang RAW+JPEG</span>
                            <span className="text-[9px] text-black/40">Treat pairs as single units</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => setGangRawJpeg(!gangRawJpeg)}
                          className={`w-10 h-5 rounded-full transition-all relative ${gangRawJpeg ? 'bg-black' : 'bg-black/10'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${gangRawJpeg ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-black/5 rounded-2xl border border-black/5 space-y-3">
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-amber-500" />
                          <div>
                            <span className="text-xs font-bold block">Numbering Protocol</span>
                            <span className="text-[9px] text-black/40">Reset or progressive sequence</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIngestSettings((prev: any) => ({ ...prev, numberingProtocol: 'reset' }))}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${ingestSettings.numberingProtocol === 'reset' ? 'bg-amber-500 text-black border-amber-500' : 'bg-black/10 text-black/40 border-black/5'}`}
                          >
                            Reset
                          </button>
                          <button 
                            onClick={() => setIngestSettings((prev: any) => ({ ...prev, numberingProtocol: 'progressive' }))}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${ingestSettings.numberingProtocol === 'progressive' ? 'bg-amber-500 text-black border-amber-500' : 'bg-black/10 text-black/40 border-black/5'}`}
                          >
                            Prog
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Camera SDK Plugins</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['sonySdk', 'canonSdk', 'nikonSdk'].map((sdk) => (
                        <button 
                          key={sdk}
                          onClick={() => setPlugins((prev: any) => ({ ...prev, [sdk]: !prev[sdk] }))}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            plugins[sdk] 
                              ? 'bg-black/5 border-black/20 ring-1 ring-black/20' 
                              : 'bg-black/5 border-black/5 hover:bg-black/10'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-widest text-black">{sdk.replace('Sdk', '')}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Renaming Structure</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Project Name</label>
                        <input 
                          type="text" 
                          value={projectSettings.name}
                          onChange={(e) => setProjectSettings((prev: any) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-black/20 text-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Client ID</label>
                        <input 
                          type="text" 
                          value={projectSettings.clientId}
                          onChange={(e) => setProjectSettings((prev: any) => ({ ...prev, clientId: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-black/20 text-black"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Date Format</label>
                        <select 
                          value={ingestSettings.dateFormat}
                          onChange={(e) => setIngestSettings((prev: any) => ({ ...prev, dateFormat: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-black/20 text-black appearance-none"
                        >
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          <option value="YYMMDD">YYMMDD</option>
                          <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Separator</label>
                        <select 
                          value={ingestSettings.separator}
                          onChange={(e) => setIngestSettings((prev: any) => ({ ...prev, separator: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-black/20 text-black appearance-none"
                        >
                          <option value=" - ">" - " (Space-Dash-Space)</option>
                          <option value="_">"_" (Underscore)</option>
                          <option value="-">"-" (Hyphen)</option>
                          <option value=" ">" " (Space)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Filename Preview</p>
                    <p className="text-xs font-mono text-black/60 break-all">
                      {generateNewFilename(photos[0] || { file: { name: 'sample.jpg' } } as any, 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Cloud Storage Integration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ConnectionButton 
                      label="Dropbox" 
                      connected={connections.dropbox} 
                      onClick={() => connectProvider('dropbox')} 
                    />
                    <ConnectionButton 
                      label="Google Drive" 
                      connected={connections.googleDrive} 
                      onClick={() => connectProvider('google')} 
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Gallery Publishing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ConnectionButton 
                      label="Figma" 
                      connected={connections.figma} 
                      onClick={() => {
                        if (!connections.figma) setConnections((prev: any) => ({ ...prev, figma: true }));
                        else handlePublish('Figma');
                      }} 
                      loading={isPublishing === 'Figma'}
                    />
                    <ConnectionButton 
                      label="Canva" 
                      connected={connections.canva} 
                      onClick={() => {
                        if (!connections.canva) setConnections((prev: any) => ({ ...prev, canva: true }));
                        else handlePublish('Canva');
                      }} 
                      loading={isPublishing === 'Canva'}
                    />
                  </div>
                </div>

                <div className="p-8 bg-black/5 rounded-[32px] border border-black/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center">
                      <Wand2 size={24} className="text-black/40" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-black">Workflow Automation</h4>
                      <p className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Intelligent Asset Syncing</p>
                    </div>
                  </div>
                  <p className="text-xs text-black/60 leading-relaxed">
                    Connect your accounts to enable automatic syncing of Hero shots to your favorite design tools. 
                    When a photo is marked as a "Hero" (9 stars or green tag), it will be automatically uploaded 
                    to your connected cloud storage and made available in your design tool libraries.
                  </p>
                </div>
              </div>
            )}

            {activePreferenceTab === 'goals' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Performance Targets</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Target Keeper Rate</label>
                        <div className="text-xs font-mono text-black/60">{shootingGoals.targetKeeperRate}%</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={shootingGoals.targetKeeperRate}
                        onChange={(e) => setShootingGoals((prev: any) => ({ ...prev, targetKeeperRate: parseInt(e.target.value) }))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-black/30 font-medium uppercase tracking-wider">Goal percentage of "Keep" shots per session</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Min Sharpness Threshold</label>
                        <div className="text-xs font-mono text-black/60">{shootingGoals.minSharpnessThreshold}%</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={shootingGoals.minSharpnessThreshold}
                        onChange={(e) => setShootingGoals((prev: any) => ({ ...prev, minSharpnessThreshold: parseInt(e.target.value) }))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-black/30 font-medium uppercase tracking-wider">Minimum AI focus score for automatic selection</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Shooting Intent</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Preferred Focal Length</label>
                      <select 
                        value={shootingGoals.preferredFocalLength}
                        onChange={(e) => setShootingGoals((prev: any) => ({ ...prev, preferredFocalLength: e.target.value }))}
                        className="w-full bg-black/5 text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/5 appearance-none text-black"
                      >
                        <option value="24mm">24mm (Ultra Wide)</option>
                        <option value="35mm">35mm (Wide Storytelling)</option>
                        <option value="50mm">50mm (Normal Perspective)</option>
                        <option value="85mm">85mm (Portrait)</option>
                        <option value="135mm">135mm (Telephoto)</option>
                        <option value="200mm">200mm (Sports/Action)</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Shooting Style</label>
                      <select 
                        value={shootingGoals.shootingStyle}
                        onChange={(e) => setShootingGoals((prev: any) => ({ ...prev, shootingStyle: e.target.value }))}
                        className="w-full bg-black/5 text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/5 appearance-none text-black"
                      >
                        <option value="Candid">Candid / Documentary</option>
                        <option value="Portrait">Studio / Portrait</option>
                        <option value="Action">Action / Sports</option>
                        <option value="Commercial">Commercial / Editorial</option>
                        <option value="FineArt">Fine Art / Abstract</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Session Objectives</h3>
                  <div className="p-6 bg-black/5 rounded-3xl border border-black/5 space-y-4">
                    <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Current Session Goal</label>
                    <input 
                      type="text" 
                      value={shootingGoals.sessionGoal}
                      onChange={(e) => setShootingGoals((prev: any) => ({ ...prev, sessionGoal: e.target.value }))}
                      placeholder="e.g. 10 Hero Shots for Client"
                      className="w-full bg-white text-xs font-bold py-4 px-5 rounded-2xl focus:outline-none border border-black/10 text-black shadow-sm"
                    />
                    <p className="text-[10px] text-black/40 italic">Setting a specific objective helps the AI prioritize selections that match your intent.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Temporal Awareness</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Motordrive Shooting</label>
                        <div className="text-xs font-mono text-black/60">{shootingGoals.temporalAwareness?.motordriveShooting || 50}%</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={shootingGoals.temporalAwareness?.motordriveShooting || 50}
                        onChange={(e) => setShootingGoals((prev: any) => ({ 
                          ...prev, 
                          temporalAwareness: { 
                            ...prev.temporalAwareness, 
                            motordriveShooting: parseInt(e.target.value) 
                          } 
                        }))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-black/30 font-medium uppercase tracking-wider">
                        AI grouping density. High for bursts where only one frame is required (e.g. Marathon runner).
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Frame Variance</label>
                        <div className="text-xs font-mono text-black/60">{shootingGoals.temporalAwareness?.frameVariance || 50}%</div>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={shootingGoals.temporalAwareness?.frameVariance || 50}
                        onChange={(e) => setShootingGoals((prev: any) => ({ 
                          ...prev, 
                          temporalAwareness: { 
                            ...prev.temporalAwareness, 
                            frameVariance: parseInt(e.target.value) 
                          } 
                        }))}
                        className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                      />
                      <p className="text-[9px] text-black/30 font-medium uppercase tracking-wider">
                        Expected visual diversity. High for sequences with many interesting frames (e.g. Wedding moments).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-emerald-500/5 rounded-[32px] border border-emerald-500/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600">Shooting Feedback Loop</h4>
                      <p className="text-[10px] text-emerald-600/60 font-medium">AI will now provide real-time feedback based on these goals.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-900/60 leading-relaxed">
                    By defining your targets, SelectPro can analyze your incoming ingest and highlight where you are hitting your marks or where technical improvements (like focus precision) are needed to reach your desired keeper rate.
                  </p>
                </div>
              </div>
            )}

            {activePreferenceTab === 'backup' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">3-2-1 Backup Verification</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {backupLocations.map((loc, idx) => (
                      <div key={idx} className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center ${loc.verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {loc.tier === 'media-card' ? <Smartphone size={18} /> : (loc.tier === 'local-A' || loc.tier === 'local-B') ? <HardDrive size={18} /> : <Cloud size={18} />}
                          </div>
                          <div>
                            <div className="text-[10px] sm:text-xs font-bold text-black uppercase tracking-widest flex items-center gap-2">
                              {loc.tier}
                              {loc.tier === 'media-card' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert('Media Card Ejected Safely');
                                  }}
                                  className="p-1 hover:bg-black/10 rounded text-system-accent transition-all"
                                  title="Eject Media Card"
                                >
                                  <Zap size={10} />
                                </button>
                              )}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1 truncate max-w-[150px] sm:max-w-none">{loc.path}</div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-black/5 pt-3 sm:pt-0">
                          <div className={`text-[10px] font-black uppercase tracking-widest ${loc.verified ? 'text-emerald-500' : 'text-emerald-500'}`}>
                            {loc.verified ? 'Verified' : 'Unverified'}
                          </div>
                          <div className="text-[8px] text-black/20 font-bold uppercase tracking-widest sm:mt-1">
                            Reliability: {(loc.reliabilityScore * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-black/40 border-b border-black/5 pb-4">Deletion Safety Preferences</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'safe-folder', label: 'Safe Folder', desc: 'Move to "Tagged for Deletion"' },
                        { id: 'trash-recoverable', label: 'System Trash', desc: 'Move to OS Recycle Bin' },
                        { id: 'trash-permanent', label: 'Permanent', desc: 'Immediate disk removal' }
                      ].map((mode) => (
                        <button 
                          key={mode.id}
                          onClick={() => setDeletionPreferences(prev => ({ ...prev, mode: mode.id as any }))}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            deletionPreferences.mode === mode.id 
                              ? 'bg-black/5 border-black/20 ring-1 ring-black/20' 
                              : 'bg-black/5 border-black/5 hover:bg-black/10'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-widest text-black mb-1">{mode.label}</div>
                          <p className="text-[8px] text-black/30 font-medium leading-tight">{mode.desc}</p>
                        </button>
                      ))}
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-black">Verify Backup Before Delete</div>
                          <div className="text-[10px] text-black/30 font-medium uppercase tracking-wider mt-1">Ensure 3-2-1 rule compliance</div>
                        </div>
                        <button 
                          onClick={() => setDeletionPreferences(prev => ({ ...prev, backupVerification: { ...prev.backupVerification, enabled: !prev.backupVerification.enabled } }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${deletionPreferences.backupVerification.enabled ? 'bg-black' : 'bg-black/10'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${deletionPreferences.backupVerification.enabled ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
                        </button>
                      </div>

                      {deletionPreferences.backupVerification.enabled && (
                        <div className="space-y-4 pt-4 border-t border-black/5">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Require 3 Sources</div>
                            <button 
                              onClick={() => setDeletionPreferences(prev => ({ ...prev, backupVerification: { ...prev.backupVerification, require3Sources: !prev.backupVerification.require3Sources } }))}
                              className={`w-10 h-5 rounded-full transition-all relative ${deletionPreferences.backupVerification.require3Sources ? 'bg-black' : 'bg-black/10'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${deletionPreferences.backupVerification.require3Sources ? 'left-5.5 bg-white' : 'left-0.5 bg-black/40'}`} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-end">
                              <label className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Max Age (Freshness)</label>
                              <div className="text-[10px] font-mono text-black/40">{deletionPreferences.backupVerification.maxAgeHours}h</div>
                            </div>
                            <input 
                              type="range" 
                              min="1" 
                              max="168" 
                              value={deletionPreferences.backupVerification.maxAgeHours}
                              onChange={(e) => setDeletionPreferences(prev => ({ ...prev, backupVerification: { ...prev.backupVerification, maxAgeHours: parseInt(e.target.value) } }))}
                              className="w-full accent-black h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 bg-black/5 rounded-3xl border border-black/5 space-y-4">
                      <div className="text-xs font-bold text-black">Clear History</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'never', label: 'Never' },
                          { id: 'on-exit', label: 'On Exit' },
                          { id: 'on-import', label: 'On Import' }
                        ].map((option) => (
                          <button 
                            key={option.id}
                            onClick={() => setDeletionPreferences(prev => ({ ...prev, clearHistory: option.id as any }))}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              deletionPreferences.clearHistory === option.id 
                                ? 'bg-black/5 border-black/20 ring-1 ring-black/20' 
                                : 'bg-black/5 border-black/5 hover:bg-black/10'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black">{option.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-black/5 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-black/20">
            <span className="text-[10px] font-bold uppercase tracking-widest">Changes are applied in real-time</span>
          </div>
          <button 
            onClick={() => setShowPreferences(false)}
            className="w-full sm:w-auto px-10 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PreferencesModal;
