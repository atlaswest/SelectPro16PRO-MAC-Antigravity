import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Star, 
  Tag, 
  Info, 
  ChevronUp, 
  ChevronDown,
  Menu,
  X,
  Zap,
  Eye,
  Monitor,
  Maximize2,
  Minimize2,
  Share2,
  Download,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { PhotoItem, ViewMode } from './types';
import { AnalysisSettings, analyzeImage } from './services/geminiService';
import { detectBlinks } from './services/aiLocalService';
import Histogram from './components/Histogram';

const MobileApp: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'gallery' | 'viewer'>('gallery');
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);

  const [aiSettings, setAiSettings] = useState<AnalysisSettings>({
    autoRejectBlinks: true,
    blinkSensitivity: 50,
    winkStrictness: 70,
    faceConfidenceThreshold: 50,
    emotionDetection: true,
    technicalQuality: true,
    aestheticScoring: true,
    shotCount: 1,
    mode: 'A'
  });

  const currentPhoto = photos[currentIndex] || null;

  // Handle file uploads
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending',
      rating: 0,
      colorTag: null,
      tags: [],
      manualRejected: false,
      metadata: {
        hash: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now()
      }
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    if (viewMode === 'gallery') setViewMode('viewer');
  };

  const analyzeCurrent = useCallback(async () => {
    if (!currentPhoto || currentPhoto.status === 'completed') return;
    
    setIsAnalyzing(true);
    setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { ...p, status: 'analyzing' } : p));

    try {
      // Local Blink Detection
      const img = new Image();
      img.src = currentPhoto.preview;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const blinkResult = await detectBlinks(img, {
        sensitivity: aiSettings.blinkSensitivity,
        winkStrictness: aiSettings.winkStrictness,
        faceConfidenceThreshold: aiSettings.faceConfidenceThreshold
      });

      // Gemini Analysis
      const result = await analyzeImage(currentPhoto.preview, 'mobile_upload.jpg', aiSettings);

      setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { 
        ...p, 
        status: 'completed',
        rating: result.isHeroPotential ? 5 : 3,
        tags: result.tags,
        isRejected: result.isRejected || blinkResult.anyBlinks,
        result: { ...result, blinkAnalysis: blinkResult }
      } : p));
    } catch (err) {
      console.error('Analysis failed:', err);
      setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { ...p, status: 'error' } : p));
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentPhoto, aiSettings]);

  const handleRating = (rating: number) => {
    if (!currentPhoto) return;
    setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { ...p, rating } : p));
  };

  const handleReject = () => {
    if (!currentPhoto) return;
    setPhotos(prev => prev.map(p => p.id === currentPhoto.id ? { ...p, manualRejected: !p.manualRejected } : p));
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 z-50 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white fill-current" />
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase italic">SelectPro <span className="text-emerald-500">Light</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Mindset Switcher (Responsive Override) */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button 
              onClick={() => {
                // This would normally be handled by a parent state in App.tsx
                // But for the sake of the component, we'll trigger a reload with a param
                const url = new URL(window.location.href);
                url.searchParams.set('mindset', 'mobile');
                window.location.href = url.toString();
              }}
              className={`p-2 rounded-md transition-all ${window.location.search.includes('mindset=mobile') || !window.location.search.includes('mindset=desktop') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-white/40 hover:text-white'}`}
              title="Mobile View"
            >
              <Smartphone size={16} />
            </button>
            <button 
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('mindset', 'desktop');
                window.location.href = url.toString();
              }}
              className={`p-2 rounded-md transition-all ${window.location.search.includes('mindset=desktop') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-white/40 hover:text-white'}`}
              title="Desktop View"
            >
              <Monitor size={16} />
            </button>
          </div>

          <button 
            onClick={() => window.location.search = ''} 
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 group"
            title="Turn Off Light Mode"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-emerald-500 transition-colors">Off</span>
            <Monitor size={16} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {photos.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
              <Camera size={40} className="text-white/20" />
            </div>
            <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tight">Ready for Curation</h2>
            <p className="text-sm text-white/40 mb-8 max-w-xs leading-relaxed">
              Upload your session photos for instant AI-powered selection and blink detection.
            </p>
            <label className="w-full max-w-xs py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-600/20 cursor-pointer text-center active:scale-95 transition-transform">
              Select Photos
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {viewMode === 'viewer' ? (
              <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPhoto.id}
                    src={currentPhoto.preview}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {currentPhoto.status === 'analyzing' && (
                    <div className="px-3 py-1 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Analyzing
                    </div>
                  )}
                  {currentPhoto.isRejected && (
                    <div className="px-3 py-1 bg-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                      Rejected
                    </div>
                  )}
                  {currentPhoto.rating === 5 && (
                    <div className="px-3 py-1 bg-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full text-black">
                      Hero
                    </div>
                  )}
                </div>

                {/* Minimal Overlay Controls */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                  <button 
                    onClick={handleReject}
                    className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-auto transition-all ${currentPhoto.manualRejected ? 'bg-emerald-600 text-white' : 'bg-black/40 backdrop-blur-md text-white/40 border border-white/10'}`}
                  >
                    <XCircle size={24} />
                  </button>

                  <button 
                    onClick={analyzeCurrent}
                    disabled={isAnalyzing || currentPhoto.status === 'completed'}
                    className={`w-16 h-16 rounded-full flex items-center justify-center pointer-events-auto shadow-2xl transition-all active:scale-90 ${currentPhoto.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}
                  >
                    {isAnalyzing ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={28} className="fill-current" />}
                  </button>

                  <button 
                    onClick={() => handleRating(currentPhoto.rating === 5 ? 0 : 5)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-auto transition-all ${currentPhoto.rating === 5 ? 'bg-amber-500 text-black' : 'bg-black/40 backdrop-blur-md text-white/40 border border-white/10'}`}
                  >
                    <Star size={24} className={currentPhoto.rating === 5 ? 'fill-current' : ''} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <button 
                      key={photo.id} 
                      onClick={() => {
                        setCurrentIndex(index);
                        setViewMode('viewer');
                      }}
                      className={`aspect-square relative rounded-lg overflow-hidden border-2 transition-all ${currentIndex === index ? 'border-emerald-500' : 'border-transparent'}`}
                    >
                      <img src={photo.preview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {photo.isRejected && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
                      {photo.rating === 5 && <div className="absolute bottom-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />}
                    </button>
                  ))}
                  <label className="aspect-square bg-white/5 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                    <Camera size={24} className="text-white/20" />
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Swipe-up Variables Panel */}
      <AnimatePresence>
        {variablesOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col"
          >
            <div className="h-20 flex items-center justify-between px-8 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Zap size={20} className="text-white fill-current" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">AI Variables</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Real-time enrichment</p>
                </div>
              </div>
              <button 
                onClick={() => setVariablesOpen(false)}
                className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">AI Analysis Parameters</h3>
                  <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active</div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest block">Blur Sensitivity</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Precision edge detection</span>
                      </div>
                      <span className="text-sm font-black italic text-emerald-500">{aiSettings.blurSensitivity}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={aiSettings.blurSensitivity} 
                      onChange={(e) => setAiSettings(prev => ({ ...prev, blurSensitivity: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest block">Composition Emphasis</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Rule of thirds weighting</span>
                      </div>
                      <span className="text-sm font-black italic text-emerald-500">{aiSettings.compositionEmphasis}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={aiSettings.compositionEmphasis} 
                      onChange={(e) => setAiSettings(prev => ({ ...prev, compositionEmphasis: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-600"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-widest block">Blink Sensitivity</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Eye state threshold</span>
                      </div>
                      <span className="text-sm font-black italic text-emerald-500">{aiSettings.blinkSensitivity}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={aiSettings.blinkSensitivity} 
                      onChange={(e) => setAiSettings(prev => ({ ...prev, blinkSensitivity: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none accent-emerald-600"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Neural Engine</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left group active:scale-95 transition-all">
                    <span className="text-[8px] font-black uppercase text-white/40 block mb-1 group-hover:text-emerald-500">Model</span>
                    <span className="text-xs font-bold uppercase tracking-widest">Gemini 3.1</span>
                  </button>
                  <button className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left group active:scale-95 transition-all">
                    <span className="text-[8px] font-black uppercase text-white/40 block mb-1 group-hover:text-emerald-500">Mode</span>
                    <span className="text-xs font-bold uppercase tracking-widest">High Precision</span>
                  </button>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-white/10 bg-black">
              <button 
                onClick={() => setVariablesOpen(false)}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar (Mobile Navigation) */}
      {photos.length > 0 && (
        <div className="h-20 bg-black border-t border-white/10 flex items-center justify-between px-8 z-50">
          <button onClick={() => setViewMode('gallery')} className={`flex flex-col items-center gap-1.5 ${viewMode === 'gallery' ? 'text-emerald-500' : 'text-white/40'}`}>
            <Menu size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Gallery</span>
          </button>
          
          <button 
            onClick={() => setVariablesOpen(true)}
            className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center -mt-10 shadow-2xl shadow-emerald-600/40 border-4 border-black active:scale-90 transition-all"
          >
            <Zap size={24} className="text-white fill-current" />
          </button>

          <button onClick={() => setShowInfo(true)} className={`flex flex-col items-center gap-1.5 ${showInfo ? 'text-emerald-500' : 'text-white/40'}`}>
            <Info size={22} />
            <span className="text-[9px] font-black uppercase tracking-widest">Info</span>
          </button>
        </div>
      )}

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 z-[2000] bg-black flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <h2 className="text-sm font-black uppercase tracking-widest">Preferences</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">AI Curation</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest">Blink Removal</span>
                    <button 
                      onClick={() => setAiSettings(prev => ({ ...prev, autoRejectBlinks: !prev.autoRejectBlinks }))}
                      className={`w-10 h-5 rounded-full relative transition-all ${aiSettings.autoRejectBlinks ? 'bg-emerald-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${aiSettings.autoRejectBlinks ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  {/* Simplified Sliders for Mobile */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-white/40">
                        <span>Blur Sensitivity</span>
                        <span>{aiSettings.blurSensitivity}%</span>
                      </div>
                      <input 
                        type="range" 
                        value={aiSettings.blurSensitivity} 
                        onChange={(e) => setAiSettings(prev => ({ ...prev, blurSensitivity: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-white/40">
                        <span>Composition Emphasis</span>
                        <span>{aiSettings.compositionEmphasis}%</span>
                      </div>
                      <input 
                        type="range" 
                        value={aiSettings.compositionEmphasis} 
                        onChange={(e) => setAiSettings(prev => ({ ...prev, compositionEmphasis: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-600"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-white/40">
                        <span>Blink Sensitivity</span>
                        <span>{aiSettings.blinkSensitivity}%</span>
                      </div>
                      <input 
                        type="range" 
                        value={aiSettings.blinkSensitivity} 
                        onChange={(e) => setAiSettings(prev => ({ ...prev, blinkSensitivity: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none accent-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Device</h3>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase">Low Power Mode</span>
                    <div className="w-10 h-5 bg-white/10 rounded-full relative">
                      <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase">Offline Mode</span>
                    <div className="w-10 h-5 bg-white/10 rounded-full relative">
                      <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </section>

              <button 
                onClick={() => {
                  setPhotos([]);
                  setShowSettings(false);
                }}
                className="w-full py-4 border border-emerald-600/30 text-emerald-500 rounded-2xl font-black uppercase tracking-widest text-xs active:bg-emerald-600/10 transition-all"
              >
                Clear All Data
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileApp;
