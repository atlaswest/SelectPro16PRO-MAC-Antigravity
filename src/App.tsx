import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X,
  Focus,
  Image as ImageIcon,
  Loader2,
  Filter,
  Eye,
  EyeOff,
  Smile,
  Layout,
  ChevronRight,
  ChevronDown,
  Undo,
  Redo,
  Activity,
  Download,
  Star,
  Folder,
  Grid,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
  Tag,
  ChevronLeft,
  Search,
  MoreVertical,
  MoreHorizontal,
  User,
  Hash,
  Calendar,
  MapPin,
  Cloud,
  Clock,
  Share2,
  Cpu,
  Wand2,
  Smartphone,
  Monitor,
  CreditCard,
  Box,
  Square,
  Link as LinkIcon,
  ExternalLink,
  Check,
  Globe,
  Keyboard,
  Type,
  ShieldCheck,
  Plus,
  Sparkles,
  History,
  FileJson,
  Settings2,
  Users,
  Target,
  MousePointer2,
  RefreshCw,
  Copy,
  Database,
  Brain,
  Palette,
  Camera,
  Info,
  Columns,
  Layers,
  Linkedin,
  Instagram,
  Thermometer,
  FileText,
  Award,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageScoreTag, ImageTag } from './components/ImageScoreTag';
import { 
  PhotoItem, 
  ViewMode, 
  SortOption, 
  SelectionStrategy, 
  BackupLocation, 
  DeletionPreferences, 
  ProfessionalReview, 
  SequenceReviewItem, 
  RenamingSettings, 
  ShootingGoals,
  HistoryAction,
  PhotoScore,
  StarRating,
  FlagColor
} from './types';
import { AspectImage } from './components/AspectImage';
import CompareView from './components/CompareView';
import NineShotView from './components/NineShotView';
import { analyzeImage, SelectionResult, AnalysisSettings, analyzeProfessionalQuality, compareSequence, identifyObjects } from './services/geminiService';
import { analyzePhotoWithOpenAI } from './services/openaiService';
import { getExifData, calculateHistogram } from './services/exifService';
import { generateProxy, generateBase64Proxy, WEB_READY_PROMPT, calculateSharpness } from './services/imageService';
import { detectBlinks, identifyObjectsLocal, detectPoseLocal, initLocalAI } from './services/aiLocalService';
import { WorkerInMessage, WorkerOutMessage, PhotoScore as WorkerPhotoScore } from './workers/analysisWorker';
import { mergeScores } from './services/scoreService';
import { loadExifWithRetry, withFileRetry } from './services/fileHelper';
import { savePhotoToCache, clearCache, getAllPhotosFromCache, updatePhotoMetadata, batchUpdatePhotoMetadata } from './services/dbService';
import * as sidecarService from './services/sidecarService';
import { COLOR_TAGS } from './constants';
import PreferencesModal from './components/PreferencesModal';
import ExportModal from './components/ExportModal';
import ShootQualityReport from './components/ShootQualityReport';
import ProjectSettingsModal from './components/ProjectSettingsModal';
import PostIngestNamingDialog from './components/PostIngestNamingDialog';
import ToastContainer from './components/ToastContainer';
import SelectionRulesModal from './components/SelectionRulesModal';
import VariableSlider from './components/VariableSlider';
import VirtualContactSheet from './components/VirtualContactSheet';
import ContactSheetItem from './components/ContactSheetItem';
import Histogram from './components/Histogram';
import ConfirmationModal from './components/ConfirmationModal';
import { top9Analyzer } from './services/top9Analyzer';

const WorkflowViewLazy = React.lazy(() => import('./components/WorkflowView'));
const FilmicCurveEditorLazy = React.lazy(() => import('./components/FilmicCurveEditor'));

const AI_ENABLED_ENV = import.meta.env.VITE_ENABLE_AI === 'true';

function lightenColor(col: string, amt: number) {
  let usePound = false;
  if (col[0] === "#") {
    col = col.slice(1);
    usePound = true;
  }
  const num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

const AppMenu = ({ label, icon: Icon, sections }: { 
  label: string, 
  icon?: any,
  sections: {
    title?: string;
    items: {
      label: string;
      icon?: any;
      onClick: () => void;
      shortcut?: string;
      description?: string;
      variant?: 'default' | 'danger';
    }[];
  }[]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-black/5 rounded-lg text-[11px] font-bold transition-all ${isOpen ? 'bg-black/5 text-system-accent' : 'text-system-text'}`}
      >
        {Icon && <Icon size={14} />}
        {label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-1 w-64 bg-white border border-black/5 rounded-xl shadow-2xl z-[200] overflow-hidden p-1.5"
          >
            {sections.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {sIdx > 0 && <div className="h-px bg-black/5 my-1.5" />}
                {section.title && (
                  <div className="px-2 py-1.5 mb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-system-secondary">{section.title}</p>
                  </div>
                )}
                {section.items.map((item, iIdx) => (
                  <button 
                    key={iIdx}
                    onClick={() => { item.onClick(); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all group ${
                      item.variant === 'danger' 
                        ? 'hover:bg-emerald-500 hover:text-white' 
                        : 'hover:bg-system-accent hover:text-white'
                    }`}
                  >
                    {item.icon && <item.icon size={14} className="group-hover:scale-110 transition-transform" />}
                    <div className="flex-1 text-left">
                      <p className={`font-bold ${item.variant === 'danger' ? 'text-emerald-500 group-hover:text-white' : ''}`}>{item.label}</p>
                      {item.description && <p className="text-[9px] opacity-60">{item.description}</p>}
                    </div>
                    {item.shortcut && <span className="text-[9px] opacity-40">{item.shortcut}</span>}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardView = ({ photos, onImport, isCacheReady, isLowPowerMode }: { photos: PhotoItem[], onImport: () => void, isCacheReady: boolean, isLowPowerMode: boolean }) => {
  const [isRecentHovered, setIsRecentHovered] = useState(false);
  const [isInsightsHovered, setIsInsightsHovered] = useState(false);
  
  // Auto-expand insights if not in low power mode or if explicitly hovered
  const showFullInsights = isInsightsHovered || (!isLowPowerMode && photos.length > 0);
  const stats = {
    total: photos.length,
    completed: photos.filter(p => p.status === 'completed').length,
    rejected: photos.filter(p => p.isRejected || p.manualRejected).length,
    topRated: photos.filter(p => p.rating >= 8).length,
  };

  return (
    <motion.div 
      initial={isLowPowerMode ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col p-8 gap-8 max-w-6xl mx-auto overflow-y-auto no-scrollbar"
    >
      <div className="flex items-center gap-8 w-full">
        <button 
          onClick={onImport}
          className={`px-8 py-6 bg-system-accent text-white rounded-3xl font-black uppercase tracking-widest text-xs ${!isLowPowerMode ? 'hover:scale-105' : ''} transition-all shadow-xl shadow-system-accent/20 flex flex-col items-center gap-2 relative ${photos.length === 0 && !isLowPowerMode ? 'animate-bounce shadow-system-accent/40' : ''}`}
        >
          {photos.length === 0 && !isLowPowerMode && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-system-highlight rounded-full animate-ping" />
          )}
          <Upload size={24} />
          Add Photos
          {photos.length === 0 && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-system-accent font-black animate-pulse">
              START HERE
            </span>
          )}
        </button>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <div className="bg-system-card p-6 rounded-2xl border border-system-border shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-system-secondary">Total Assets</span>
            <span className="text-3xl font-black text-system-text">{stats.total}</span>
          </div>
          <div className="bg-system-card p-6 rounded-2xl border border-system-border shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">AI Analyzed</span>
            <span className="text-3xl font-black text-system-text">{stats.completed}</span>
          </div>
          <div className="bg-system-card p-6 rounded-2xl border border-system-border shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Not Selected</span>
            <span className="text-3xl font-black text-system-text">{stats.rejected}</span>
          </div>
          <div className="bg-system-card p-6 rounded-2xl border border-system-border shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-system-highlight">Hero Shots</span>
            <span className="text-3xl font-black text-system-text">{stats.topRated}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div 
          className="flex flex-col gap-4 group"
          onMouseEnter={() => setIsInsightsHovered(true)}
          onMouseLeave={() => setIsInsightsHovered(false)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-system-secondary">AI Insights</h3>
            <Sparkles size={14} className="text-system-highlight" />
          </div>
          <div className={`space-y-2 relative transition-all duration-500 ease-in-out overflow-hidden ${showFullInsights ? 'max-h-[600px] opacity-100' : 'max-h-[120px] opacity-40'}`}>
            {[
              { label: 'AI Accuracy', desc: 'Global performance metric', value: '98.2%', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'A/Select Time', desc: 'Average per 1k assets', value: '4.2s', icon: Zap, color: 'text-system-highlight', bg: 'bg-system-highlight/10' },
              { label: 'Vision Load', desc: 'GPU utilization index', value: '12%', icon: Brain, color: 'text-system-accent', bg: 'bg-system-accent/10' },
              { label: 'Cache Health', desc: 'IndexedDB integrity', value: 'Optimal', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { label: 'Network Sync', desc: 'Cloud latency status', value: '14ms', icon: Globe, color: 'text-system-accent', bg: 'bg-system-accent/10' },
              { label: 'System Temp', desc: 'Thermal throttling risk', value: 'Cool', icon: Thermometer, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
            ].map((insight, i) => (
              <div key={i} className="bg-system-card p-4 rounded-2xl border border-system-border flex items-center justify-between hover:border-system-accent/20 transition-all cursor-pointer group shadow-sm mb-2">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 bg-system-bg rounded-xl flex items-center justify-center ${insight.color} group-hover:${insight.bg} transition-all`}>
                    <insight.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-system-text uppercase tracking-tight">{insight.label}</p>
                    <p className="text-[10px] text-system-secondary">{insight.desc}</p>
                  </div>
                </div>
                <div className="text-xl font-black text-system-text">{insight.value}</div>
              </div>
            ))}
            {!isInsightsHovered && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-system-bg to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ModuleSwitcher = ({ currentMode, onModeChange, hasPhotos }: { currentMode: ViewMode, onModeChange: (mode: ViewMode) => void, hasPhotos: boolean }) => {
  const modules: { id: ViewMode, label: string, icon: any }[] = [
    ...(hasPhotos ? [] : [{ id: 'import' as ViewMode, label: 'Dashboard', icon: Upload }]),
    { id: 'library', label: 'Library', icon: Grid },
    { id: 'nineShot', label: '9 Shot', icon: LayoutGrid },
    { id: 'compare', label: 'Compare', icon: Columns },
    { id: 'image', label: 'Image', icon: Maximize2 },
  ];

  return (
    <div className="flex items-center bg-system-bg rounded-lg p-0.5 border border-system-border">
      {modules.map((module) => (
        <button
          key={module.id}
          onClick={() => onModeChange(module.id)}
          className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
            currentMode === module.id 
              ? 'bg-system-card text-system-accent shadow-sm' 
              : 'text-system-secondary hover:text-system-text hover:bg-system-card/50'
          }`}
        >
          <module.icon size={12} className={currentMode === module.id ? 'text-system-accent' : 'text-system-secondary'} />
          {module.label}
        </button>
      ))}
    </div>
  );
};

interface ShootQualityData {
  sharpnessRate: number;
  blinkRate: number;
  horizonTiltRate: number;
  bestHour: string;
  heroShotsCount: number;
  totalAnalyzed: number;
}

export default function App({ isOffline = false, isMac = false }: { isOffline?: boolean, isMac?: boolean }) {
  const isAiEnabled = AI_ENABLED_ENV && !isOffline;
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const pushToHistory = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const newAction: HistoryAction = {
      ...action,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setUndoStack(prev => [newAction, ...prev].slice(0, 50));
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const action = undoStack[0];
    const remaining = undoStack.slice(1);

    setPhotos(prev => prev.map(p => {
      const idx = action.photoIds.indexOf(p.id);
      if (idx !== -1) {
        return { ...p, ...action.prevData[idx] };
      }
      return p;
    }));

    setUndoStack(remaining);
    setRedoStack(prev => [action, ...prev].slice(0, 50));

    action.photoIds.forEach((id, idx) => {
      updatePhotoMetadata(id, action.prevData[idx]);
    });
    scheduleSidecarWrite();
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const action = redoStack[0];
    const remaining = redoStack.slice(1);

    setPhotos(prev => prev.map(p => {
      const idx = action.photoIds.indexOf(p.id);
      if (idx !== -1) {
        return { ...p, ...action.newData[idx] };
      }
      return p;
    }));

    setRedoStack(remaining);
    setUndoStack(prev => [action, ...prev].slice(0, 50));

    action.photoIds.forEach((id, idx) => {
      updatePhotoMetadata(id, action.newData[idx]);
    });
    scheduleSidecarWrite();
  }, [redoStack]);
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [strategy, setStrategy] = useState<SelectionStrategy>('auto-top');
  const [professionalReview, setProfessionalReview] = useState<ProfessionalReview | null>(null);
  const [sequenceReview, setSequenceReview] = useState<SequenceReviewItem[] | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isTop9ModelLoaded, setIsTop9ModelLoaded] = useState(false);
  const [top9LoadingMsg, setTop9LoadingMsg] = useState('');
  const [isTop9Active, setIsTop9Active] = useState(false);

  useEffect(() => {
    top9Analyzer.loadModels(setTop9LoadingMsg).then(() => {
      setIsTop9ModelLoaded(true);
      setTop9LoadingMsg('Models ready');
    });
  }, []);

  const runTop9Analysis = async (targetPhotos?: PhotoItem[]) => {
    const sourcePhotos = targetPhotos || photos;
    if (sourcePhotos.length === 0) return;
    setIsReviewing(true);
    setTop9LoadingMsg('Initializing AI models...');
    try {
      await top9Analyzer.loadModels((msg) => setTop9LoadingMsg(msg));
      
      const results = [];
      const photosToAnalyze = sourcePhotos.slice(0, 50); // Limit for performance in demo
      
      for (const photo of photosToAnalyze) {
        const img = new Image();
        img.src = photo.preview;
        await new Promise((resolve) => { img.onload = resolve; });
        const score = await top9Analyzer.analyzeImage(img, photo.id);
        results.push(score);
      }
      
      const ranked = await top9Analyzer.rankImages(results, sourcePhotos, aiAnalysisSettings.shotCount || 9, shootingGoals);
      
      setPhotos(prev => prev.map(p => {
        const score = ranked.find(r => r.imageId === p.id);
        if (score) {
          return { ...p, top9Score: score };
        }
        return p;
      }));

      const top9Ids = ranked.filter(r => r.isTopCandidate).map(r => r.imageId);
      setSelectedIds(top9Ids);
      if (aiAnalysisSettings.shotCount === 1) {
        setViewMode('image');
      } else {
        setViewMode('nineShot');
      }
    } catch (error) {
      console.error("Top 9 analysis failed:", error);
    } finally {
      setIsReviewing(false);
    }
  };

  const runProfessionalReview = async () => {
    if (!selectedPhoto || !aiEnabled) return;
    setIsReviewing(true);
    try {
      const review = await analyzeProfessionalQuality(selectedPhoto.preview);
      setProfessionalReview(review);
    } catch (error) {
      console.error("Review failed:", error);
    } finally {
      setIsReviewing(false);
    }
  };

  const runSequenceComparison = async () => {
    if (selectedIds.length < 2 || !aiEnabled) return;
    setIsReviewing(true);
    try {
      const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
      const images = selectedPhotos.map(p => ({ id: p.id, base64: p.preview }));
      const results = await compareSequence(images);
      setSequenceReview(results);
      
      // Update photo metadata with flags
      setPhotos(prev => prev.map(p => {
        const review = results.find(r => r.imageId === p.id);
        if (review) {
          return {
            ...p,
            metadata: {
              ...p.metadata,
              aiFlag: review.status,
              aiScore: review.score
            }
          };
        }
        return p;
      }));
    } catch (error) {
      console.error("Sequence comparison failed:", error);
    } finally {
      setIsReviewing(false);
    }
  };
  useEffect(() => {
    // Initialize local AI models on app start
    initLocalAI();
  }, []);

  const [insightMode, setInsightMode] = useState<'off' | 'basic' | 'pro' | 'learning'>(() => {
    const saved = localStorage.getItem('selectpro_insight_mode');
    return (saved as any) || 'basic';
  });

  useEffect(() => {
    localStorage.setItem('selectpro_insight_mode', insightMode);
  }, [insightMode]);

  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'auto' | 'local' | 'hybrid'>('auto');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'Ingest' | 'selection' | 'processing' | 'insights'>('selection');
  const [manualMindset, setManualMindset] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [currentMindset, setCurrentMindset] = useState<'web' | 'mobile' | 'tablet' | 'desktop'>(() => {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
    // Modern iPads often report as Macintosh
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'tablet';
    if (/Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua)) return 'desktop';
    return 'web';
  });

  const effectiveMindset = useMemo(() => {
    if (manualMindset === 'mobile') return 'mobile';
    if (manualMindset === 'desktop') return 'desktop';
    return currentMindset;
  }, [manualMindset, currentMindset]);
  const [selectionMode, setSelectionMode] = useState<'P' | 'A' | 'S' | 'M'>(() => {
    const saved = localStorage.getItem('aiAnalysisSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.defaultMode || 'M';
    }
    return 'M';
  });
  const [autoTagging, setAutoTagging] = useState(false);
  const [isTethered, setIsTethered] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  // Analysis Worker
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const analysisCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

  useEffect(() => {
    // Initialize worker
    const worker = new Worker(new URL('./workers/analysisWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'ready':
          setIsWorkerReady(true);
          break;
        case 'progress':
          // Update photo status with stage
          setPhotos(prev => prev.map(p => p.id === msg.jobId ? { 
            ...p, 
            status: 'analyzing',
            notes: `Stage: ${msg.stage}...` 
          } : p));
          break;
        case 'result':
          const callback = analysisCallbacks.current.get(msg.jobId);
          if (callback) {
            callback(msg.score);
            analysisCallbacks.current.delete(msg.jobId);
          }
          break;
        case 'error':
          console.error(`Worker error for job ${msg.jobId}:`, msg.message);
          setPhotos(prev => prev.map(p => p.id === msg.jobId ? { ...p, status: 'error' } : p));
          analysisCallbacks.current.delete(msg.jobId);
          break;
      }
    };

    // Init worker with models and key
    const modelsPath = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    worker.postMessage({ 
      type: 'init', 
      modelsPath, 
      geminiKey: process.env.GEMINI_API_KEY || '' 
    } satisfies WorkerInMessage);

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (effectiveMindset === 'mobile' || effectiveMindset === 'tablet') {
      setIsLowPowerMode(true);
      setAutoEnhance(false); // Disable heavy features by default on mobile
    }
  }, [effectiveMindset]);
  const [filmStripPosition, setFilmStripPosition] = useState<'left' | 'bottom' | 'right'>('bottom');
  const [isAutoFilmstrip, setIsAutoFilmstrip] = useState(true);

  useEffect(() => {
    if (!isAutoFilmstrip) return;

    const handleFilmstripResize = () => {
      // Always default to bottom as requested
      setFilmStripPosition('bottom');
    };

    handleFilmstripResize();
    window.addEventListener('resize', handleFilmstripResize);
    return () => window.removeEventListener('resize', handleFilmstripResize);
  }, [isAutoFilmstrip]);

  const neutralizeAI = useCallback((ids: string[]) => {
    setPhotos(prev => prev.map(p => {
      if (ids.includes(p.id)) {
        return {
          ...p,
          status: 'pending',
          result: undefined,
          isRejected: false,
          rejectType: undefined,
          tags: [],
          rating: 0,
          colorTag: null
        };
      }
      return p;
    }));
  }, []);

  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showIngestSettings, setShowIngestSettings] = useState(false);
  const [showMindsetModal, setShowMindsetModal] = useState(false);
  const [showKeyboardSettings, setShowKeyboardSettings] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showCropTool, setShowCropTool] = useState(false);
  const [cropPreset, setCropPreset] = useState<string>('9:16');
  const [cropOverlay, setCropOverlay] = useState<'none' | 'thirds' | 'golden' | 'diagonal' | 'grid' | 'square' | 'diagonal+square'>('thirds');
  const [showAiAnalysis, setShowAiAnalysis] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFocusPeaking, setShowFocusPeaking] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiStatus, setAiStatus] = useState<'AI' | 'M' | 'L'>('AI');
  const [cameraStyle, setCameraStyle] = useState<'canon' | 'sony' | 'nikon' | 'leica'>('canon');
  const [isCacheReady, setIsCacheReady] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  
  useEffect(() => {
    let timeoutId: any = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Auto-collapse when crossing the 1024px threshold
        if (window.innerWidth < 1024) {
          setLeftSidebarCollapsed(true);
          setRightSidebarCollapsed(true);
        }
      }, 150);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  const [showProgressiveFolders, setShowProgressiveFolders] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [showCacheSettings, setShowCacheSettings] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showShootQualityReport, setShowShootQualityReport] = useState(false);
  const [shootQualityData, setShootQualityData] = useState<ShootQualityData | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showPostIngestNaming, setShowPostIngestNaming] = useState(false);
  const [newlyImportedPhotos, setNewlyImportedPhotos] = useState<PhotoItem[]>([]);
  const [showCameraDataPanel, setShowCameraDataPanel] = useState(false);
  const [showPinline, setShowPinline] = useState(() => {
    const saved = localStorage.getItem('showPinline');
    return saved ? JSON.parse(saved) : true;
  });
  const [shootingGoals, setShootingGoals] = useState<ShootingGoals>(() => {
    const saved = localStorage.getItem('shootingGoals');
    return saved ? JSON.parse(saved) : {
      targetKeeperRate: 15,
      minSharpnessThreshold: 70,
      preferredFocalLength: '35mm',
      shootingStyle: 'Candid',
      sessionGoal: '10 Heroes',
      temporalAwareness: {
        motordriveShooting: 50,
        frameVariance: 50
      }
    };
  });
  const [cameraPanelPosition, setCameraPanelPosition] = useState(() => {
    const saved = localStorage.getItem('cameraPanelPosition');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [backupLocations, setBackupLocations] = useState<BackupLocation[]>([
    { tier: 'media-card', path: '/Volumes/SD_CARD', verified: true, reliabilityScore: 0.95, lastVerifiedAt: new Date() },
    { tier: 'local-A', path: '/Volumes/WORK_DRIVE', verified: true, reliabilityScore: 0.99, lastVerifiedAt: new Date() },
    { tier: 'local-B', path: '/VOLUMES/WORK_DRIVE', verified: true, reliabilityScore: 0.99, lastVerifiedAt: new Date() },
    { tier: 'cloud-C', path: 's3://my-photos-backup', verified: false, reliabilityScore: 0.999, lastVerifiedAt: new Date() }
  ]);
  const [deletionPreferences, setDeletionPreferences] = useState<DeletionPreferences>({
    mode: 'safe-folder',
    requireConfirmation: true,
    clearHistory: 'never',
    backupVerification: {
      enabled: true,
      require3Sources: true,
      verifyBeforeDelete: true,
      maxAgeHours: 24
    }
  });
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activePreferenceTab, setActivePreferenceTab] = useState<'shortcuts' | 'ai' | 'performance' | 'selection' | 'appearance' | 'backup' | 'workflow' | 'goals'>('appearance');
  const [showToolbarCustomizer, setShowToolbarCustomizer] = useState(false);
  const [toolbarConfig, setToolbarConfig] = useState({
    showViewModes: true,
    showSelection: true,
    showStrategy: true,
    showAiProvider: true,
    showTethered: true
  });
  const [showSelectionRules, setShowSelectionRules] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [showClearCacheConfirmModal, setShowClearCacheConfirmModal] = useState(false);
  const [showSelectAllConfirmModal, setShowSelectAllConfirmModal] = useState(false);
  const [deferredAiMode, setDeferredAiMode] = useState(() => {
    const saved = localStorage.getItem('selection_deferred_ai');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          setViewMode('import');
        } else if (e.key === '2') {
          e.preventDefault();
          setViewMode('library');
        } else if (e.key === '3') {
          e.preventDefault();
          setViewMode('image');
        } else if (e.key === '4') {
          e.preventDefault();
          setViewMode('nineShot');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Web Worker for EXIF/Image tasks
  const imageWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    imageWorkerRef.current = new Worker(new URL('./workers/imageWorker.ts', import.meta.url), { type: 'module' });
    
    imageWorkerRef.current.onmessage = (e) => {
      const { type, id, metadata, error } = e.data;
      if (type === 'EXIF_RESULT') {
        // Handle EXIF result from worker
        // This would require a way to update the specific photo in the state
      }
    };

    return () => {
      imageWorkerRef.current?.terminate();
    };
  }, []);

  // Resize Observer for virtualization
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!mainContentRef.current) return;

    let timeoutId: any = null;
    const observer = new ResizeObserver((entries) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (const entry of entries) {
          setContainerDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      }, 100);
    });

    observer.observe(mainContentRef.current);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('selection_deferred_ai', JSON.stringify(deferredAiMode));
  }, [deferredAiMode]);

  useEffect(() => {
    if (selectedIds.length === 2 && viewMode !== 'compare') {
      setViewMode('compare');
    }
  }, [selectedIds, viewMode]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [selectionFrameColor, setSelectionFrameColor] = useState<'cyan' | 'canary'>('canary');
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{ count: number, files: string[] } | null>(null);
  const [showAiRejected, setShowAiRejected] = useState(false);
  const [hideUnusedCameras, setHideUnusedCameras] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [camerasExpanded, setCamerasExpanded] = useState(true);
  const [isHighResLoading, setIsHighResLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [targetZoomLevel, setTargetZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [targetZoomOrigin, setTargetZoomOrigin] = useState({ x: 50, y: 50 });
  const [subscriptionTier, setSubscriptionTier] = useState<'lite' | 'pro' | 'elite'>('pro');
  const [identitySuggestions, setIdentitySuggestions] = useState<any[]>([]);
  const [identitySearch, setIdentitySearch] = useState('');
  const [ghostText, setGhostText] = useState('');
  const [progressMode, setProgressMode] = useState<'frames' | 'percent'>('frames');
  const [interfaceColor, setInterfaceColor] = useState('#2a2a2a');
  const [neutralGrey, setNeutralGrey] = useState(() => {
    return localStorage.getItem('neutralGrey') || '240';
  });

  useEffect(() => {
    localStorage.setItem('neutralGrey', neutralGrey);
    document.documentElement.style.setProperty('--color-neutral-grey', `rgb(${neutralGrey}, ${neutralGrey}, ${neutralGrey})`);
    const activeGrey = Math.max(0, parseInt(neutralGrey) - 20);
    document.documentElement.style.setProperty('--color-neutral-grey-active', `rgb(${activeGrey}, ${activeGrey}, ${activeGrey})`);
  }, [neutralGrey]);

  const [serialFilter, setSerialFilter] = useState<string>('all');
  const [cameraNamingMode, setCameraNamingMode] = useState<'serial' | 'alpha' | 'numeric'>('serial');
  const [cameraNamingMap, setCameraNamingMap] = useState<Record<string, string>>({});
  const [isoFilter, setIsoFilter] = useState<number | 'all'>('all');
  const [isoRange, setIsoRange] = useState<{ min: number, max: number }>({ min: 0, max: 1000000 });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'bulk': true,
    'high': true,
    'medium': true,
    'low': true
  });

  const [importProgress, setImportProgress] = useState<{ current: number, total: number } | null>(null);
  const [importType, setImportType] = useState<'ingest' | 'import' | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number, total: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboardingCompleted');
  });

  const ProgressIndicator = () => {
    if (!importProgress && !analysisProgress) return null;
    
    const progress = importProgress || analysisProgress;
    let label = importProgress ? 'Importing' : 'Analyzing';
    
    if (importProgress && importType === 'ingest') {
      label = 'Ingesting from media card to internal storage';
    } else if (importProgress && importType === 'import') {
      label = 'Importing from hard drive';
    }

    const percent = Math.round((progress!.current / progress!.total) * 100);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 right-6 w-96 bg-white border border-black/10 rounded-2xl shadow-2xl z-[1000] p-4 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-system-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-system-text">{label}</span>
          </div>
          <span className="text-[10px] font-black text-system-accent">{progress!.current} / {progress!.total}</span>
        </div>
        
        <div className="h-1.5 bg-system-bg rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className="h-full bg-system-accent"
          />
        </div>
        
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[9px] text-system-secondary font-bold uppercase tracking-tight">
            {percent}% Complete
          </span>
          <Loader2 size={10} className="animate-spin text-system-accent" />
        </div>
      </motion.div>
    );
  };

  const OnboardingOverlay = () => {
    if (!showOnboarding) return null;

    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-system-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} className="text-system-accent" />
              </div>
              <h2 className="text-2xl font-black text-system-text uppercase tracking-tight mb-2">Welcome to Select Pro</h2>
              <p className="text-sm text-system-secondary mb-8">The ultimate AI-powered selection studio for professional photographers. Let's get your first session started.</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 text-left p-4 bg-system-bg rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Upload size={16} className="text-system-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">Ingest Photos</p>
                    <p className="text-[10px] text-system-secondary">Drag and drop your RAW or JPEG files anywhere to begin.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left p-4 bg-system-bg rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <Brain size={16} className="text-system-highlight" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">AI Select</p>
                    <p className="text-[10px] text-system-secondary">Our vision models automatically detect focus, eyes, and composition.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowOnboarding(false);
                  localStorage.setItem('onboardingCompleted', 'true');
                }}
                className="w-full py-4 bg-system-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-system-accent/20"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const cameraGroups = useMemo(() => {
    const cameras = Array.from(new Set(photos.map(p => p.metadata.cameraSerial)))
      .filter(Boolean)
      .filter(serial => serial !== 'Unknown') // Only show cameras from EXIF
      .map(serial => ({
        serial,
        count: photos.filter(p => p.metadata.cameraSerial === serial).length,
        model: photos.find(p => p.metadata.cameraSerial === serial)?.metadata.cameraModel || 'Unknown'
      }));

    return [
      { id: 'bulk', label: 'Bulk (100+)', cameras: cameras.filter(c => c.count >= 100) },
      { id: 'high', label: 'High (50-99)', cameras: cameras.filter(c => c.count >= 50 && c.count < 100) },
      { id: 'medium', label: 'Medium (10-49)', cameras: cameras.filter(c => c.count >= 10 && c.count < 50) },
      { id: 'low', label: 'Low (1-9)', cameras: cameras.filter(c => c.count > 0 && c.count < 10) }
    ].filter(g => g.cameras.length > 0);
  }, [photos]);

  const clusters = useMemo(() => {
    const byFocal = photos.reduce((acc, p) => {
      const fl = p.metadata.focalLength?.toString() || 'Unknown';
      if (!acc[fl]) acc[fl] = [];
      acc[fl].push(p);
      return acc;
    }, {} as Record<string, PhotoItem[]>);

    const byAspect = photos.reduce((acc, p) => {
      if (p.metadata.width && p.metadata.height) {
        const ratio = (p.metadata.width / p.metadata.height).toFixed(2);
        let label = ratio;
        if (ratio === '1.50') label = '3:2';
        else if (ratio === '1.33') label = '4:3';
        else if (ratio === '1.78') label = '16:9';
        else if (ratio === '0.67') label = '2:3';
        else if (ratio === '0.75') label = '3:4';
        else if (ratio === '0.56') label = '9:16';
        if (!acc[label]) acc[label] = [];
        acc[label].push(p);
      } else {
        if (!acc['Unknown']) acc['Unknown'] = [];
        acc['Unknown'].push(p);
      }
      return acc;
    }, {} as Record<string, PhotoItem[]>);

    const byPeople = photos.reduce((acc, p) => {
      const hasPeople = p.top9Score?.detectedSubjects.some(s => s.toLowerCase().includes('person') || s.toLowerCase().includes('face') || s.toLowerCase().includes('human')) || false;
      const label = hasPeople ? 'People Present' : 'No People';
      if (!acc[label]) acc[label] = [];
      acc[label].push(p);
      return acc;
    }, {} as Record<string, PhotoItem[]>);

    return { byFocal, byAspect, byPeople };
  }, [photos]);

  // Cache & Performance Settings
  const [cacheSettings, setCacheSettings] = useState(() => {
    const saved = localStorage.getItem('cacheSettings');
    return saved ? JSON.parse(saved) : {
      cacheLocation: 'IndexedDB',
      maxCacheSize: 1024, // MB
      previewMode: 'camera-previews', // 'camera-previews' | 'render-in-place'
      enableCaching: true,
      preheatCache: true
    };
  });

  useEffect(() => {
    localStorage.setItem('cacheSettings', JSON.stringify(cacheSettings));
  }, [cacheSettings]);

  // IndexedDB for high-speed caching
  const dbRef = useRef<IDBDatabase | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const request = indexedDB.open('NineShotCache', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      dbRef.current = e.target.result;
    };
  }, []);

  const cacheImage = useCallback(async (photo: PhotoItem) => {
    if (!dbRef.current || !photo.preview.startsWith('blob:')) return;
    
    try {
      const response = await fetch(photo.preview);
      const blob = await response.blob();
      const transaction = dbRef.current.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.put({ id: photo.id, blob, timestamp: Date.now() });
    } catch (err) {
      console.error('Failed to cache image:', err);
    }
  }, []);

  const getCachedImage = useCallback((id: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!dbRef.current) return resolve(null);
      const transaction = dbRef.current.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => resolve(null);
    });
  }, []);

  // API Identity: Social/Local API hooks for "Identify People"
  useEffect(() => {
    if (!identitySearch.trim()) {
      setIdentitySuggestions([]);
      return;
    }

    // Mock API call for identity suggestions
    const mockIdentities = [
      'John Doe (@johndoe)',
      'Jane Smith (@janesmith)',
      'Alice Johnson (@alicej)',
      'Bob Brown (@bobb)',
      'Charlie Davis (@charlied)',
      'Photography Studio (@photostudio)',
      'Event Planner (@eventplan)',
    ];

    const filtered = mockIdentities.filter(id => 
      id.toLowerCase().includes(identitySearch.toLowerCase())
    );
    setIdentitySuggestions(filtered);
  }, [identitySearch]);
  useEffect(() => {
    if (!cacheSettings.preheatCache || photos.length === 0 || selectedIds.length === 0) return;

    const currentIndex = photos.findIndex(p => p.id === selectedIds[0]);
    if (currentIndex === -1) return;

    // Pre-load next 20 and previous 5 images
    const indicesToLoad = [
      ...Array.from({ length: 20 }, (_, i) => currentIndex + i + 1),
      ...Array.from({ length: 5 }, (_, i) => currentIndex - i - 1)
    ].filter(i => i >= 0 && i < photos.length);

    indicesToLoad.forEach(index => {
      const photo = photos[index];
      if (!imageCache.current.has(photo.id)) {
        const img = new Image();
        img.src = photo.preview;
        img.onload = () => imageCache.current.set(photo.id, img);
      }
    });

    // Cleanup old cache entries to respect maxCacheSize (approximate)
    if (imageCache.current.size > 50) { // arbitrary limit for demo
      const keys = Array.from(imageCache.current.keys());
      const toRemove = keys.slice(0, keys.length - 50);
      toRemove.forEach(k => imageCache.current.delete(k));
    }
  }, [selectedIds, photos, cacheSettings.preheatCache]);

  // Keyboard Settings State
  const [keyboardSettings, setKeyboardSettings] = useState({
    preset: 'lightroom' as 'lightroom' | 'photomechanic' | 'custom',
    maxRating: 5 as 5 | 9,
    requireModifier: 'none' as 'none' | 'alt' | 'cmd' | 'shift',
    colorTagKeys: {
      red: '6',
      yellow: '7',
      green: '8',
      blue: '9',
      purple: '0'
    }
  });
  
  // Processing State
  const [processingSettings, setProcessingSettings] = useState({
    skinRetouch: false,
    retouchIntensity: 0,
    dynamicRange: 0,
    texture: 0,
    clarity: 0,
    aiDenoise: false,
    frequencySeparation: false,
    dodgeAndBurn: false,
    dodgeIntensity: 0,
    burnIntensity: 0,
    highlightReduction: 0,
    retouchTone: 'natural' as 'natural' | 'warm' | 'cool' | 'vibrant',
    filmicCurve: {
      enabled: false,
      toe: 0,
      shoulder: 0,
      slope: 0,
      blackPoint: 0,
      whitePoint: 0
    }
  });

  // Connections State
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('connections');
    return saved ? JSON.parse(saved) : {
      dropbox: false,
      googleDrive: false,
      figma: false,
      canva: false
    };
  });

  useEffect(() => {
    localStorage.setItem('connections', JSON.stringify(connections));
  }, [connections]);

  // Plugins State
  const [plugins, setPlugins] = useState({
    sonySdk: false,
    canonSdk: false,
    nikonSdk: false
  });

  // Project Settings State
  const [projectSettings, setProjectSettings] = useState({
    name: 'Untitled Session',
    clientId: 'CL-9924',
    location: 'Studio A',
    photographer: 'SGR'
  });

  const [ingestSettings, setIngestSettings] = useState({
    projectName: 'Untitled Session',
    location: 'Studio A',
    dateFormat: 'YYYY-MM-DD',
    separator: '_',
    startSeq: 1,
    serverSafe: true,
    numberingProtocol: 'progressive' as 'reset' | 'progressive'
  });

  // Library View Preferences
  const [thumbnailMinSize, setThumbnailMinSize] = useState(180);
  const [thumbnailMaxSize, setThumbnailMaxSize] = useState(260);
  const [rowPadding, setRowPadding] = useState(8);
  const [inverseThumbnailSlider, setInverseThumbnailSlider] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [fitMode, setFitMode] = useState<"grid" | "masonry">("grid");

  useEffect(() => {
    localStorage.setItem("libraryPreferences", JSON.stringify({
      thumbnailMinSize,
      thumbnailMaxSize,
      rowPadding,
      fitMode
    }))
  }, [thumbnailMinSize, thumbnailMaxSize, rowPadding, fitMode])

  useEffect(() => {
    const saved = localStorage.getItem("libraryPreferences")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setThumbnailMinSize(parsed.thumbnailMinSize ?? 120)
        setThumbnailMaxSize(parsed.thumbnailMaxSize ?? 260)
        setRowPadding(parsed.rowPadding ?? 8)
        setFitMode(parsed.fitMode ?? "grid")
      } catch (e) {
        console.error("Failed to parse libraryPreferences", e);
      }
    }
  }, [])

  // Toast Notifications State
  const [toasts, setToasts] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleClearImageCache = useCallback(async () => {
    // Clear Memory Cache
    imageCache.current.clear();
    
    // Clear IndexedDB
    if (dbRef.current) {
      const transaction = dbRef.current.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.clear();
      addToast('Cache cleared successfully');
    } else {
      // If DB not open, try opening and clearing
      const request = indexedDB.open('NineShotCache', 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        store.clear();
        addToast('Cache cleared successfully');
      };
    }
  }, [addToast]);

  const filmicTableValues = useMemo(() => {
    if (!processingSettings.filmicCurve.enabled) return "0 1";
    
    const { toe, shoulder, slope, blackPoint, whitePoint } = processingSettings.filmicCurve;
    const samples = 256;
    const values = [];
    
    for (let i = 0; i < samples; i++) {
      const x = i / (samples - 1);
      
      // Remap x based on black/white points
      let val = (x - blackPoint) / (whitePoint - blackPoint);
      val = Math.max(0, Math.min(1, val));

      // Apply slope/contrast
      val = Math.pow(val, slope);

      // Apply toe/shoulder (S-curve)
      const t = toe;
      const s = shoulder;
      if (val < t && t > 0) {
        val = (val / t) * (val / t) * t;
      } else if (val > s && s < 1) {
        const d = 1 - s;
        const v = (val - s) / d;
        val = s + (1 - (1 - v) * (1 - v)) * d;
      }
      
      values.push(val.toFixed(4));
    }
    
    return values.join(' ');
  }, [processingSettings.filmicCurve]);

  // AI Analysis Settings
  const [visibleBadges, setVisibleBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('selectpro_visible_badges');
    return saved ? JSON.parse(saved) : ['grade', 'score', 'eye', 'smile', 'blur'];
  });

  useEffect(() => {
    localStorage.setItem('selectpro_visible_badges', JSON.stringify(visibleBadges));
  }, [visibleBadges]);
  const [aiAnalysisSettings, setAiAnalysisSettings] = useState<AnalysisSettings>(() => {
    const saved = localStorage.getItem('aiAnalysisSettings');
    return saved ? JSON.parse(saved) : {
      blurSensitivity: 0,
      compositionEmphasis: 0,
      focusSensitivity: 0,
      emotionDetection: true,
      technicalQuality: true,
      aestheticScoring: true,
      autoRejectBlinks: true,
      blinkSensitivity: 50,
      winkStrictness: 70,
      faceConfidenceThreshold: 50,
      privacyMode: 'standard' as 'standard' | 'strict' | 'private',
      anonymizeFaces: false,
      storeMetadata: true,
      mode: 'M',
      defaultMode: 'M',
      skipTagging: true,
      shotCount: 9,
      autoDetectModel: true,
      manualOverride: false
    };
  });

  // Custom Selection Rules
  const [selectionRules, setSelectionRules] = useState(() => {
    const saved = localStorage.getItem('selectionRules');
    return saved ? JSON.parse(saved) : {
      minWidth: 0,
      minHeight: 0,
      requiredAspectRatio: 'any' as 'any' | '1:1' | '4:3' | '3:2' | '16:9',
      minFocusScore: 0,
      minExpressionScore: 0,
      minCompositionScore: 0,
      minEyesOpenScore: 0,
      minLightingScore: 0,
      minOverallScore: 0,
    };
  });

  const [gangRawJpeg, setGangRawJpeg] = useState(true);
  const [sidecarEnabled, setSidecarEnabled] = useState(() => {
    const saved = localStorage.getItem('sidecarEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const [autoWriteSidecar, setAutoWriteSidecar] = useState(() => {
    const saved = localStorage.getItem('autoWriteSidecar');
    return saved ? JSON.parse(saved) : true;
  });
  const [catalogDetected, setCatalogDetected] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(() => {
    const saved = localStorage.getItem('autoAdvance');
    return saved ? JSON.parse(saved) : true;
  });

  const [isFileDragging, setIsFileDragging] = useState(false);

  useEffect(() => {
    // Unregister service workers in development to prevent MIME type errors from 404s
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('Unregistered stale service worker in development');
        }
      });
    }

    const timer = setTimeout(() => setIsCacheReady(true), 1500);
    
    // Load photos from IndexedDB on mount
    const loadFromCache = async () => {
      try {
        const cachedPhotos = await getAllPhotosFromCache();
        if (cachedPhotos.length > 0) {
          const restoredPhotos: PhotoItem[] = cachedPhotos.map(cp => ({
            id: cp.id,
            preview: URL.createObjectURL(cp.blob),
            metadata: cp.metadata,
            rating: cp.rating,
            colorTag: cp.colorTag,
            tags: cp.tags,
            manualRejected: cp.manualRejected,
            status: 'completed',
            isRejected: cp.manualRejected,
            result: cp.result,
            renamedFilename: cp.renamedFilename
          }));
          setPhotos(restoredPhotos);
        }
      } catch (err: any) {
        console.error('Failed to load photos from cache:', err);
        if (err.message && err.message.includes('text/html')) {
          console.error('MIME type error detected. This usually means a script or data request returned index.html (404).');
        }
        setLoading(false);
      }
    };
    
    loadFromCache();
    
    return () => clearTimeout(timer);
  }, []);

  // Camera Info Panel Component
  const CameraInfoPanel = ({ photo, style }: { photo: PhotoItem | null, style: 'canon' | 'sony' | 'nikon' | 'leica' }) => {
    const brandColors = {
      canon: { bg: 'bg-[#E30613]', text: 'text-white', accent: 'border-white/20' },
      sony: { bg: 'bg-[#000000]', text: 'text-[#FF6600]', accent: 'border-[#FF6600]/30' },
      nikon: { bg: 'bg-[#FFE100]', text: 'text-black', accent: 'border-black/20' },
      leica: { bg: 'bg-[#E30613]', text: 'text-white', accent: 'border-white/20' }
    };

    const current = brandColors[style];

    return (
      <div className={`p-4 rounded-xl border transition-all duration-500 ${current.bg} ${current.text} ${current.accent} shadow-xl overflow-hidden relative group`}>
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Camera size={48} />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Camera Data</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-bold opacity-50">Aperture</span>
              <p className="text-lg font-black italic">f/{photo?.metadata.aperture || '--'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-bold opacity-50">Shutter</span>
              <p className="text-lg font-black italic">{photo?.metadata.shutterSpeed || '--'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-bold opacity-50">ISO</span>
              <p className="text-lg font-black italic">{photo?.metadata.iso || '--'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-bold opacity-50">Focal</span>
              <p className="text-lg font-black italic">{photo?.metadata.focalLength || '--'}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-current/10 grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold opacity-50">Model</span>
              <span className="text-[10px] font-black uppercase truncate">{photo?.metadata.cameraModel || 'No Device'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase font-bold opacity-50">Serial</span>
              <span className="text-[10px] font-mono opacity-70">{photo?.metadata.cameraSerial || '--------'}</span>
            </div>
          </div>

          {photo && (
            <div className="pt-4 border-t border-current/10 space-y-2">
              <span className="text-[8px] uppercase font-bold opacity-50">Histogram</span>
              <div className="h-16 w-full bg-black/20 rounded-lg overflow-hidden relative">
                <Histogram photo={photo} showComparison={autoEnhance} />
              </div>
            </div>
          )}
        </div>

        {/* Brand Specific Accents */}
        {style === 'leica' && <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-[#E30613] font-black text-[8px]">L</div>}
        {style === 'sony' && <div className="absolute bottom-0 right-0 w-12 h-1 bg-[#FF6600]" />}
      </div>
    );
  };

  // Floating Camera Panel Component
  const FloatingCameraPanel = ({ photo, style, position, onPositionChange, onClose }: { 
    photo: PhotoItem | null, 
    style: 'canon' | 'sony' | 'nikon' | 'leica',
    position: { x: number, y: number },
    onPositionChange: (pos: { x: number, y: number }) => void,
    onClose: () => void
  }) => {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={false}
        animate={{ x: position.x, y: position.y }}
        onDragEnd={(_, info) => {
          onPositionChange({ 
            x: position.x + info.offset.x, 
            y: position.y + info.offset.y 
          });
        }}
        className="fixed z-[500] cursor-move"
        style={{ top: '100px', right: '100px' }}
      >
        <div className="relative group">
          <button 
            onClick={onClose}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-black/10 rounded-full flex items-center justify-center text-black/40 hover:text-black shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
          <CameraInfoPanel photo={photo} style={style} />
        </div>
      </motion.div>
    );
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('cameraPanelPosition', JSON.stringify(cameraPanelPosition));
  }, [cameraPanelPosition]);

  useEffect(() => {
    localStorage.setItem('showCameraDataPanel', JSON.stringify(showCameraDataPanel));
  }, [showCameraDataPanel]);

  useEffect(() => {
    localStorage.setItem('showPinline', JSON.stringify(showPinline));
  }, [showPinline]);

  useEffect(() => {
    localStorage.setItem('shootingGoals', JSON.stringify(shootingGoals));
  }, [shootingGoals]);

  useEffect(() => {
    localStorage.setItem('aiAnalysisSettings', JSON.stringify(aiAnalysisSettings));
  }, [aiAnalysisSettings]);

  useEffect(() => {
    localStorage.setItem('selectionRules', JSON.stringify(selectionRules));
  }, [selectionRules]);

  useEffect(() => {
    localStorage.setItem('autoAdvance', JSON.stringify(autoAdvance));
  }, [autoAdvance]);

  // Zoom Lerp Effect
  useEffect(() => {
    const zoomDiff = Math.abs(zoomLevel - targetZoomLevel);
    const originDiffX = Math.abs(zoomOrigin.x - targetZoomOrigin.x);
    const originDiffY = Math.abs(zoomOrigin.y - targetZoomOrigin.y);

    if (zoomDiff < 0.0001 && originDiffX < 0.001 && originDiffY < 0.001) {
      if (zoomLevel !== targetZoomLevel) setZoomLevel(targetZoomLevel);
      if (zoomOrigin.x !== targetZoomOrigin.x || zoomOrigin.y !== targetZoomOrigin.y) {
        setZoomOrigin(targetZoomOrigin);
      }
      return;
    }

    const raf = requestAnimationFrame(() => {
      // Linear interpolation (lerp) for smooth zoom and origin
      const lerpFactor = 0.12; // Slightly slower for more "cinematic" feel
      const newZoom = zoomLevel + (targetZoomLevel - zoomLevel) * lerpFactor;
      const newOriginX = zoomOrigin.x + (targetZoomOrigin.x - zoomOrigin.x) * lerpFactor;
      const newOriginY = zoomOrigin.y + (targetZoomOrigin.y - zoomOrigin.y) * lerpFactor;
      
      setZoomLevel(newZoom);
      setZoomOrigin({ x: newOriginX, y: newOriginY });
    });

    return () => cancelAnimationFrame(raf);
  }, [zoomLevel, targetZoomLevel, zoomOrigin, targetZoomOrigin]);

  // High-res snap after dwell
  useEffect(() => {
    if (targetZoomLevel > 1) {
      setIsHighResLoading(true);
      const timer = setTimeout(() => {
        setIsHighResLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setIsHighResLoading(false);
    }
  }, [targetZoomLevel]);

  const handleZoomToggle = (e?: React.MouseEvent) => {
    if (targetZoomLevel > 1) {
      setTargetZoomLevel(1);
    } else {
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomOrigin({ x, y });
        setTargetZoomOrigin({ x, y });
      }
      setTargetZoomLevel(2); // 100% Zoom (assuming 1 is fit)
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTargetZoomOrigin({ x, y });
    
    // If not zoomed in, we still update target origin so that when we DO zoom, it's ready
    if (targetZoomLevel <= 1) {
      setZoomOrigin({ x, y });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'image') return;
    
    // Momentum Scrolling logic
    const delta = -e.deltaY;
    
    if (subscriptionTier === 'lite') {
      // Stepped zoom for Lite (Fixed increments: 25%, 50%, 100%, 200%)
      const steps = [0.25, 0.5, 1, 2, 4];
      const currentStepIdx = steps.findIndex(s => s >= targetZoomLevel);
      
      if (delta > 0) {
        const nextStep = steps[Math.min(currentStepIdx + 1, steps.length - 1)];
        setTargetZoomLevel(nextStep);
      } else {
        const prevStep = steps[Math.max(currentStepIdx - 1, 0)];
        setTargetZoomLevel(prevStep);
      }
    } else {
      // Continuous smooth zoom for Pro/Elite - Reduced speed to address "zooming too quickly"
      const zoomSpeed = subscriptionTier === 'elite' ? 0.01 : 0.005;
      const newTarget = Math.max(0.25, Math.min(4, targetZoomLevel + (delta > 0 ? zoomSpeed : -zoomSpeed)));
      
      // Coordinate-Centric Zoom: Anchor on cursor position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // For Elite tier: Auto-center on detected faces if zoom is high
      if (subscriptionTier === 'elite' && newTarget > 2 && selectedPhoto?.result?.faces?.length) {
        const face = selectedPhoto.result.faces[0];
        // Assuming face.box exists or similar metadata
        // For now, let's just nudge towards the first face if available
        // setTargetZoomOrigin({ x: face.x, y: face.y }); 
      } else {
        setTargetZoomOrigin({ x, y });
      }
      
      setTargetZoomLevel(newTarget);
    }
  };

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((p) => p.id === active.id);
        const newIndex = items.findIndex((p) => p.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isAnySdkActive = useMemo(() => {
    return photos.some(p => p.status === 'analyzing');
  }, [photos]);

  useEffect(() => {
    if (!isAnySdkActive) setIsTethered(false);
  }, [isAnySdkActive]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const simulateTetheredCapture = () => {
    if (!isAnySdkActive) {
      addToast("Please enable a Camera SDK plugin first.", 'error');
      return;
    }
    setIsTethered(true);
    setTimeout(() => {
      const mockFile = new File([""], `Tethered_${Math.floor(Math.random() * 1000)}.jpg`, { type: "image/jpeg" });
      handleFiles([mockFile]);
      setIsTethered(false);
    }, 1500);
  };

  const ingestTop10JPEGs = async () => {
    // Use real sample images from Picsum for a better browser test experience
    const sampleUrls = [
      'https://picsum.photos/seed/selectpro1/1200/800',
      'https://picsum.photos/seed/selectpro2/800/1200',
      'https://picsum.photos/seed/selectpro3/1200/800',
      'https://picsum.photos/seed/selectpro4/1200/1200',
      'https://picsum.photos/seed/selectpro5/1200/800',
    ];

    try {
      const files = await Promise.all(sampleUrls.map(async (url, i) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], `Sample_${i + 1}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      }));
      handleFiles(files);
    } catch (error) {
      console.error('Failed to ingest sample images:', error);
      // Fallback to mock files if fetch fails (e.g. offline)
      const mockFiles = Array.from({ length: 5 }).map((_, i) => {
        return new File([""], `Sample_${i + 1}.jpg`, { type: "image/jpeg" });
      });
      handleFiles(mockFiles);
    }
  };

  const autoTagPhotos = async (ids: string[]) => {
    const photosToTag = photos.filter(p => ids.includes(p.id));
    if (photosToTag.length === 0) {
      addToast('No photos selected for auto-tagging.', 'info');
      return;
    }

    addToast(`Auto-tagging ${photosToTag.length} photos using AI...`, 'info');

    for (const photo of photosToTag) {
      try {
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'analyzing' } : p));
        
        // Convert preview to base64
        const response = await fetch(photo.preview);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const base64Data = await base64Promise;

        let newTags: string[] = [];
        
        if (aiProvider === 'local' || aiProvider === 'hybrid' || aiAnalysisSettings.localAiOnly) {
          newTags = await identifyObjectsLocal(base64Data);
        } else if (aiProvider === 'gemini' || aiProvider === 'auto') {
          // Use Gemini for object recognition
          newTags = await identifyObjects(base64Data, aiAnalysisSettings.model);
        } else {
          // Fallback to OpenAI
          const result = await analyzePhotoWithOpenAI(base64Data, photo.file?.name || photo.id);
          newTags = result.tags || [];
        }
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { 
          ...p, 
          status: 'completed',
          tags: Array.from(new Set([...p.tags, ...newTags]))
        } : p));
      } catch (err) {
        console.error(`Failed to auto-tag photo ${photo.id}:`, err);
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error' } : p));
      }
    }
    addToast('Auto-tagging complete.', 'success');
  };

  const selectByOrientation = (orientation: 'portrait' | 'landscape') => {
    const ids = photos.filter(p => {
      if (!p.metadata.width || !p.metadata.height) return false;
      return orientation === 'portrait' ? p.metadata.height > p.metadata.width : p.metadata.width > p.metadata.height;
    }).map(p => p.id);
    setSelectedIds(ids);
  };

  const selectByISO = (iso: number) => {
    const ids = photos.filter(p => Number(p.metadata.iso) === iso).map(p => p.id);
    setSelectedIds(ids);
  };

  const invertSelection = () => {
    const allIds = photos.map(p => p.id);
    setSelectedIds(allIds.filter(id => !selectedIds.includes(id)));
  };
  const [renamingSettings, setRenamingSettings] = useState<RenamingSettings>(() => {
    const saved = localStorage.getItem('renamingSettings');
    return saved ? JSON.parse(saved) : {
      pattern: 'simple',
      prefix: 'wedd',
      subject: 'Ceremony',
      location: 'Copenhagen',
      personPlace: '',
      event: '',
      separator: '_',
      sequenceStart: 1,
      applyAfterImport: true,
      useExifLocation: false,
      useFolderSubject: false
    };
  });

  useEffect(() => {
    localStorage.setItem('renamingSettings', JSON.stringify(renamingSettings));
  }, [renamingSettings]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleClearCache = async () => {
    setShowClearCacheConfirmModal(true);
  };

  const selectedPhoto = useMemo(() => photos.find(p => p.id === selectedIds[0]), [photos, selectedIds]);

  // Auto-detect camera style based on metadata
  useEffect(() => {
    if (selectedPhoto?.metadata?.cameraModel) {
      const model = selectedPhoto.metadata.cameraModel.toLowerCase();
      if (model.includes('canon') || model.includes('eos')) setCameraStyle('canon');
      else if (model.includes('sony') || model.includes('alpha')) setCameraStyle('sony');
      else if (model.includes('nikon') || model.includes('nikon f') || model.includes('nikon z')) setCameraStyle('nikon');
      else if (model.includes('leica')) setCameraStyle('leica');
    }
  }, [selectedPhoto]);

  const detectBursts = (newPhotos: PhotoItem[]) => {
    if (newPhotos.length < 2) return newPhotos;
    
    // Group photos within 2 seconds of each other
    const sorted = [...newPhotos].sort((a, b) => {
      const timeA = a.file?.lastModified || (typeof a.metadata.timestamp === 'number' ? a.metadata.timestamp : 0);
      const timeB = b.file?.lastModified || (typeof b.metadata.timestamp === 'number' ? b.metadata.timestamp : 0);
      return timeA - timeB;
    });

    let currentBurstId: string | null = null;
    let lastTime = 0;

    return sorted.map((photo, index) => {
      const time = photo.file?.lastModified || (typeof photo.metadata.timestamp === 'number' ? photo.metadata.timestamp : Date.now());
      if (index === 0 || time - lastTime > 2000) {
        currentBurstId = Math.random().toString(36).substring(7);
        photo.isBurstLead = true;
      } else {
        photo.isBurstLead = false;
      }
      photo.burstId = currentBurstId!;
      lastTime = time;
      return photo;
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    // Enforce local a and local b filepaths
    const localA = backupLocations.find(l => l.tier === 'local-A')?.path;
    const localB = backupLocations.find(l => l.tier === 'local-B')?.path;

    if (!localA || !localB) {
      const pathA = prompt("Please enter the path for Local A backup (e.g., /Volumes/Drive_A/Photos):", localA || "");
      const pathB = prompt("Please enter the path for Local B backup (e.g., /Volumes/Drive_B/Photos):", localB || "");

      if (!pathA || !pathB) {
        addToast("Backup paths are required for import enforcement.", "error");
        return;
      }

      setBackupLocations(prev => {
        const next = [...prev];
        const idxA = next.findIndex(l => l.tier === 'local-A');
        const idxB = next.findIndex(l => l.tier === 'local-B');
        
        if (idxA !== -1) next[idxA] = { ...next[idxA], path: pathA, verified: true };
        else next.push({ tier: 'local-A', path: pathA, verified: true, reliabilityScore: 0.9, lastVerifiedAt: new Date() });
        
        if (idxB !== -1) next[idxB] = { ...next[idxB], path: pathB, verified: true };
        else next.push({ tier: 'local-B', path: pathB, verified: true, reliabilityScore: 0.9, lastVerifiedAt: new Date() });
        
        return next;
      });
    }

    const incomingFiles = Array.from(files);
    const duplicates: string[] = [];
    
    // Group files by name (without extension) to detect RAW+JPEG pairs
    const fileGroups: { [key: string]: { jpg?: File, raw?: File } } = {};
    const rawExtensions = ['.arw', '.cr2', '.cr3', '.nef', '.dng', '.orf', '.raf'];
    const jpgExtensions = ['.jpg', '.jpeg'];

    incomingFiles.forEach(file => {
      const lastDotIndex = file.name.lastIndexOf('.');
      if (lastDotIndex === -1) {
        const name = file.name;
        if (!fileGroups[name]) fileGroups[name] = { jpg: file };
        return;
      }
      
      const name = file.name.substring(0, lastDotIndex);
      const ext = file.name.substring(lastDotIndex).toLowerCase();
      
      if (!fileGroups[name]) fileGroups[name] = {};
      
      if (jpgExtensions.includes(ext)) {
        fileGroups[name].jpg = file;
      } else if (rawExtensions.includes(ext)) {
        fileGroups[name].raw = file;
      } else {
        fileGroups[file.name] = { jpg: file };
      }
    });

    const newPhotos: PhotoItem[] = [];
    const groupNames = Object.keys(fileGroups);
    setImportProgress({ current: 0, total: groupNames.length });

    let failedImports = 0;
    for (let i = 0; i < groupNames.length; i++) {
      const groupName = groupNames[i];
      const group = fileGroups[groupName];
      setImportProgress({ current: i + 1, total: groupNames.length });
      
      try {
        await withFileRetry(async () => {
          if (gangRawJpeg && group.jpg && group.raw) {
            // Create a single ganged entry
            const file = group.jpg;
            const hash = `${file.name}-${file.size}-${file.lastModified}`;
            const isDuplicate = photos.some(p => p.metadata.hash === hash);
            
            if (isDuplicate) {
              duplicates.push(file.name);
            } else {
              const tags = await loadExifWithRetry(file);
              const exif = await getExifData(file, tags);
              const preview = await generateProxy(group.jpg, hash, 1024, 1024, tags);
              newPhotos.push({
                id: Math.random().toString(36).substring(7),
                file: group.jpg,
                rawFile: group.raw,
                preview,
                status: 'pending',
                rating: 0,
                colorTag: null,
                tags: [],
                manualRejected: false,
                metadata: {
                  cameraSerial: exif.cameraSerial,
                  cameraModel: exif.cameraModel,
                  lens: exif.lens,
                  aperture: exif.aperture,
                  shutterSpeed: exif.shutterSpeed,
                  timestamp: exif.timestamp,
                  hash,
                  iso: exif.iso,
                  width: exif.width,
                  height: exif.height,
                  shutterCount: exif.shutterCount,
                  gps: exif.gps
                }
              });
            }
          } else {
            // Create separate entries
            if (group.jpg) {
              const file = group.jpg;
              const hash = `${file.name}-${file.size}-${file.lastModified}`;
              if (photos.some(p => p.metadata.hash === hash)) {
                duplicates.push(file.name);
              } else {
                const tags = await loadExifWithRetry(file);
                const exif = await getExifData(file, tags);
                const preview = await generateProxy(group.jpg, hash, 1024, 1024, tags);
                newPhotos.push({
                  id: Math.random().toString(36).substring(7),
                  file: group.jpg,
                  preview,
                  status: 'pending',
                  rating: 0,
                  colorTag: null,
                  tags: [],
                  manualRejected: false,
                  metadata: {
                    cameraSerial: exif.cameraSerial,
                    cameraModel: exif.cameraModel,
                    lens: exif.lens,
                    aperture: exif.aperture,
                    shutterSpeed: exif.shutterSpeed,
                    timestamp: exif.timestamp,
                    hash,
                    iso: exif.iso,
                    width: exif.width,
                    height: exif.height,
                    shutterCount: exif.shutterCount,
                    gps: exif.gps
                  }
                });
              }
            }
            if (group.raw) {
              const file = group.raw;
              const hash = `${file.name}-${file.size}-${file.lastModified}`;
              if (photos.some(p => p.metadata.hash === hash)) {
                duplicates.push(file.name);
              } else {
                const tags = await loadExifWithRetry(file);
                const exif = await getExifData(file, tags);
                const preview = await generateProxy(group.raw, hash, 1024, 1024, tags);
                newPhotos.push({
                  id: Math.random().toString(36).substring(7),
                  file: group.raw,
                  preview,
                  status: 'pending',
                  rating: 0,
                  colorTag: null,
                  tags: [],
                  manualRejected: false,
                  metadata: {
                    cameraSerial: exif.cameraSerial,
                    cameraModel: exif.cameraModel,
                    lens: exif.lens,
                    aperture: exif.aperture,
                    shutterSpeed: exif.shutterSpeed,
                    timestamp: exif.timestamp,
                    hash,
                    iso: exif.iso,
                    width: exif.width,
                    height: exif.height,
                    shutterCount: exif.shutterCount,
                    gps: exif.gps
                  }
                });
              }
            }
          }
        });
      } catch (err: any) {
        console.error('Error processing file:', groupName, err);
        if (err.message && err.message.includes('text/html')) {
          console.error('MIME type error detected during file processing. Check if workers or libraries are loading correctly.');
        }
        failedImports++;
      }
    }

    if (failedImports > 0) {
      addToast(`${failedImports} file(s) failed to import. The requested files could not be read.`, 'error');
    }

    if (duplicates.length > 0) {
      setDuplicateWarning({ count: duplicates.length, files: duplicates });
    }

    if (newPhotos.length > 0) {
      // Sidecar detection & application
      if (sidecarEnabled) {
        const catalog = await sidecarService.detectCatalogInFiles(incomingFiles);
        if (catalog) {
          sidecarService.applyCatalogToPhotos(newPhotos, catalog);
          setCatalogDetected(true);
          addToast("Sidecar catalog detected and applied.", 'info');
        }
      }

      setPhotos(prev => detectBursts([...prev, ...newPhotos]));
      if (selectedIds.length === 0) setSelectedIds([newPhotos[0].id]);
      
      // Predictive features: Suggest location/subject
      if (renamingSettings.useExifLocation) {
        const firstWithGps = newPhotos.find(p => p.metadata.gps);
        if (firstWithGps?.metadata.gps) {
          // In a real app, we'd reverse geocode. For now, we'll use a placeholder
          // or just the coordinates if no geocoder is available.
          // Let's assume we have a simple lookup or just use a generic name.
          setRenamingSettings(prev => ({ ...prev, location: 'Imported_Location' }));
        }
      }
      if (renamingSettings.useFolderSubject) {
        // Try to get folder name from first file path if available
        // In browser, we might not get full path unless it's a folder upload
        const firstFile = newPhotos[0].file as any;
        if (firstFile.webkitRelativePath) {
          const folder = firstFile.webkitRelativePath.split('/')[0];
          if (folder) setRenamingSettings(prev => ({ ...prev, subject: folder }));
        }
      }

      // Auto-navigate to Library view on import completion
      setViewMode('library');
      
      // Trigger post-ingest naming dialog if enabled
      if (renamingSettings.applyAfterImport) {
        setNewlyImportedPhotos(newPhotos);
        setShowPostIngestNaming(true);
      }
      
      // Background cache save
      newPhotos.forEach(async (photo) => {
        try {
          const res = await fetch(photo.preview);
          const proxyBlob = await res.blob();
          await savePhotoToCache({
            id: photo.id,
            blob: proxyBlob,
            metadata: photo.metadata,
            rating: photo.rating,
            colorTag: photo.colorTag,
            tags: photo.tags,
            manualRejected: photo.manualRejected
          });
        } catch (err) {
          console.error('Failed to cache photo:', photo.id, err);
        }
      });
    }
    setImportProgress(null);
    setImportType(null);
  }, [selectedIds, photos, gangRawJpeg]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    if (selectedIds.length === 2 && viewMode !== 'compare') {
      setViewMode('compare');
    }
  }, [selectedIds, viewMode]);

  const analyzePhoto = useCallback(async (photoId: string, forceTagging = false) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (!photo || (photo.status !== 'pending' && !forceTagging)) return prev;
      return prev.map(p => p.id === photoId ? { ...p, status: 'analyzing' } : p);
    });

    try {
      const currentPhotos = await new Promise<PhotoItem[]>(resolve => {
        setPhotos(prev => {
          resolve(prev);
          return prev;
        });
      });
      const photo = currentPhotos.find(p => p.id === photoId);
      if (!photo || !photo.file) return;

      const cachedScoreKey = `selectpro_score_${photo.metadata.hash}`;
      const cachedScore = localStorage.getItem(cachedScoreKey);
      
      let result: any;
      let aiScoreData: PhotoScore | undefined;

      if (cachedScore && !forceTagging) {
        result = JSON.parse(cachedScore);
        const cachedAiScoreData = localStorage.getItem(`ai_score_data_${photo.metadata.hash}`);
        if (cachedAiScoreData) {
          aiScoreData = JSON.parse(cachedAiScoreData);
        }
      } else {
        // Use worker for analysis if ready and provider is hybrid/gemini/local
        const useWorker = workerRef.current && isWorkerReady && (aiProvider === 'hybrid' || aiProvider === 'gemini' || aiProvider === 'local' || aiAnalysisSettings.localAiOnly);

        if (useWorker) {
          const proxyBase64 = await generateProxy(photo.file, photo.metadata.hash, 1024, 1024);
          
          const workerResult = await new Promise<WorkerPhotoScore>((resolve, reject) => {
            analysisCallbacks.current.set(photoId, resolve);
            workerRef.current?.postMessage({
              type: 'analyse',
              jobId: photoId,
              imagePath: photo.file?.name || photoId,
              imageDataUrl: proxyBase64,
              provider: aiProvider,
              localOnly: aiAnalysisSettings.localAiOnly
            } satisfies WorkerInMessage);
            
            // Timeout after 90s
            setTimeout(() => {
              if (analysisCallbacks.current.has(photoId)) {
                analysisCallbacks.current.delete(photoId);
                reject(new Error('Analysis timeout'));
              }
            }, 90000);
          });

          // Map worker result back to app's result format
          aiScoreData = workerResult;
          result = {
            isRejected: workerResult.grade === 'reject',
            rejectType: workerResult.grade === 'reject' ? (workerResult.local?.blurry ? 1 : 0) : 0,
            reasons: workerResult.cloud?.issues || (workerResult.local?.blurry ? ["Blurry image detected"] : []),
            scores: {
              focus: (workerResult.local?.sharpnessScore || 0) * 100,
              expression: (workerResult.local?.faces[0]?.smileScore || 0) * 100,
              composition: (workerResult.cloud?.compositionScore || 0) * 10,
              eyesOpen: (workerResult.local?.faces[0]?.eyeOpenScore || 0) * 100,
              lighting: (workerResult.cloud?.lightingScore || 0) * 10,
              overall: workerResult.finalScore * 100
            },
            isHeroPotential: workerResult.grade === 'hero',
            tags: [...(workerResult.cloud?.tags || []), ...(workerResult.local?.blurry ? ['blurry'] : [])],
            people: workerResult.local?.faces.map((f, i) => ({
              name: `Person ${i+1}`,
              confidence: 0.9,
              boundingBox: {
                ymin: f.bounds.y,
                xmin: f.bounds.x,
                ymax: f.bounds.y + f.bounds.height,
                xmax: f.bounds.x + f.bounds.width
              },
              attributes: {
                ageRange: "unknown",
                gender: "unknown",
                emotion: f.expression
              }
            })) || [],
            analysis: workerResult.cloud?.issues.join('. ') || `Analysis complete (${workerResult.durationMs}ms)`
          };
        } else {
          // Fallback to legacy inline analysis (e.g. for OpenAI or if worker not ready)
          const base64Data = await generateBase64Proxy(photo.file, photo.metadata.hash, 1024, 1024);
          
          // Professional Spec: Local blur detection before AI
          const sharpness = await calculateSharpness(base64Data);
          
          if (sharpness < 100 && aiStatus !== 'M' && !forceTagging) {
            result = {
              isRejected: true,
              rejectType: 1,
              reasons: ["Local sharpness check failed (blurry)"],
              scores: { focus: sharpness, expression: 0, composition: 0, eyesOpen: 0, lighting: 0, overall: sharpness / 2 },
              isHeroPotential: false,
              tags: ["blurry"],
              people: [],
              analysis: `Auto-rejected by SelectPro local sharpness check (Score: ${sharpness})`
            };
          } else {
            if (aiProvider === 'openai') {
              result = await analyzePhotoWithOpenAI(base64Data, photo.file?.name || photo.id);
            } else {
              result = await analyzeImage(base64Data, photo.file?.name || photo.id, {
                ...aiAnalysisSettings,
                mode: selectionMode,
                skipTagging: !autoTagging && !forceTagging
              });
            }
          }
        }
        
        // Cache result
        localStorage.setItem(cachedScoreKey, JSON.stringify(result));
        if (aiScoreData) {
          localStorage.setItem(`ai_score_data_${photo.metadata.hash}`, JSON.stringify(aiScoreData));
        }
      }

      setPhotos(prev => prev.map(p => {
        if (p.id === photoId) {
          let isRejected = result.isRejected;
          let rejectType = result.rejectType;
          let rating = p.rating;
          const currentAiScoreData = aiScoreData || p.aiScoreData;

          // Apply Selection Rules
          if (selectionRules.minWidth > 0 && p.metadata.width && p.metadata.width < selectionRules.minWidth) {
            isRejected = true;
            rejectType = 4;
          }
          if (selectionRules.minHeight > 0 && p.metadata.height && p.metadata.height < selectionRules.minHeight) {
            isRejected = true;
            rejectType = 4;
          }
          if (selectionRules.minFocusScore > 0 && result.scores.focus < selectionRules.minFocusScore) {
            isRejected = true;
            rejectType = 1;
          }
          if (selectionRules.minExpressionScore > 0 && result.scores.expression < selectionRules.minExpressionScore) {
            isRejected = true;
            rejectType = 3;
          }
          if (selectionRules.minCompositionScore > 0 && result.scores.composition < selectionRules.minCompositionScore) {
            isRejected = true;
            rejectType = 4;
          }
          if (selectionRules.minEyesOpenScore > 0 && result.scores.eyesOpen < selectionRules.minEyesOpenScore) {
            isRejected = true;
            rejectType = 3;
          }
          if (selectionRules.minLightingScore > 0 && result.scores.lighting < selectionRules.minLightingScore) {
            isRejected = true;
            rejectType = 4;
          }
          if (selectionRules.minOverallScore > 0 && result.scores.overall < selectionRules.minOverallScore) {
            isRejected = true;
            rejectType = 4;
          }

          if (isRejected) {
            rating = 0;
          } else if (result.isHeroPotential || result.scores.overall > 85) {
            rating = 9;
          } else if (result.scores.overall > 60) {
            rating = 5;
          } else {
            rating = 1;
          }

          let colorTag: string | null = p.colorTag;
          if (isRejected) colorTag = 'red';
          else if (rating === 9) colorTag = 'green';
          else if (rating === 5) colorTag = 'yellow';
          else colorTag = 'purple';

          return {
            ...p,
            status: 'completed',
            result,
            rating,
            colorTag,
            isRejected,
            rejectType,
            tags: Array.from(new Set([...p.tags, ...(result.tags || [])])),
            metadata: {
              ...p.metadata,
              recognizedPeople: result.people?.map((p: any) => ({
                name: p.name,
                confidence: p.confidence,
                boundingBox: p.boundingBox
              })) || []
            }
          };
        }
        return p;
      }));

      cacheImage(photo);
    } catch (err) {
      console.error(`Analysis failed for photo ${photoId}:`, err);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: 'error' } : p));
    }
  }, [aiProvider, aiAnalysisSettings, selectionRules, strategy, cacheImage, selectionMode, autoTagging, aiStatus, isWorkerReady]);


  const runAutoTagging = useCallback(async (ids: string[]) => {
    const photosToTag = photos.filter(p => ids.includes(p.id));
    for (const photo of photosToTag) {
      // Re-run analysis with forceTagging enabled
      analyzePhoto(photo.id, true);
    }
  }, [photos, analyzePhoto]);

  const startAnalysis = async () => {
    const pending = photos.filter(p => p.status === 'pending');
    if (pending.length === 0) {
      addToast("No pending photos to analyze.", 'info');
      return;
    }
    
    addToast(`Starting AI analysis for ${pending.length} assets...`, 'info');
    setAnalysisProgress({ current: 0, total: pending.length });
    
    const CONCURRENCY = effectiveMindset === 'mobile' || effectiveMindset === 'tablet' ? 2 : 4; // Lower concurrency on mobile/tablet
    const queue = [...pending];
    let processedCount = 0;
    
    const workers = Array(CONCURRENCY).fill(null).map(async () => {
      while (queue.length) {
        const photo = queue.shift();
        if (photo) {
          await analyzePhoto(photo.id);
          processedCount++;
          setAnalysisProgress({ current: processedCount, total: pending.length });
        }
      }
    });
    await Promise.all(workers);
    setAnalysisProgress(null);
    addToast("AI analysis complete for all assets.", 'success');

    // Calculate Shoot Quality Report
    const analyzedPhotos = photos.filter(p => p.status === 'completed' && p.result);
    if (analyzedPhotos.length > 0) {
      const total = analyzedPhotos.length;
      const avgSharpness = analyzedPhotos.reduce((acc, p) => acc + (p.result?.scores.focus || 0), 0) / total;
      const blinkCount = analyzedPhotos.filter(p => (p.result?.scores.eyesOpen || 100) < 60).length;
      const tiltCount = analyzedPhotos.filter(p => p.result?.isHorizonTilted).length;
      const heroCount = analyzedPhotos.filter(p => p.result?.isHeroPotential).length;
      
      const hourCounts: Record<number, { count: number, totalScore: number }> = {};
      analyzedPhotos.forEach(p => {
        const time = p.file?.lastModified || (typeof p.metadata.timestamp === 'number' ? p.metadata.timestamp : Date.now());
        const hour = new Date(time).getHours();
        if (!hourCounts[hour]) hourCounts[hour] = { count: 0, totalScore: 0 };
        hourCounts[hour].count++;
        hourCounts[hour].totalScore += (p.result?.scores.overall || 0);
      });
      
      let bestHour = -1;
      let maxAvg = -1;
      Object.entries(hourCounts).forEach(([hour, data]) => {
        const avg = data.totalScore / data.count;
        if (avg > maxAvg) {
          maxAvg = avg;
          bestHour = parseInt(hour);
        }
      });
      
      setShootQualityData({
        sharpnessRate: Math.round(avgSharpness),
        blinkRate: Math.round((blinkCount / total) * 100),
        horizonTiltRate: Math.round((tiltCount / total) * 100),
        bestHour: bestHour !== -1 ? `${bestHour}:00–${bestHour + 1}:00` : 'N/A',
        heroShotsCount: heroCount,
        totalAnalyzed: total
      });
      setShowShootQualityReport(true);
    }
  };

  // Progressive Analysis Effect
  useEffect(() => {
    if (strategy === 'progressive' && !deferredAiMode) {
      const pending = photos.filter(p => p.status === 'pending');
      const isAlreadyAnalyzing = photos.some(p => p.status === 'analyzing');
      
      if (pending.length > 0 && !isAlreadyAnalyzing) {
        startAnalysis();
      }
    }
  }, [photos, strategy, startAnalysis, deferredAiMode]);

  const autoSelect = () => {
    setPhotos(prev => prev.map(p => {
      if (p.status !== 'completed' || !p.result) return p;
      
      let isRejected = p.result.isRejected;

      // Apply custom selection rules
      if (selectionRules.minWidth > 0 && p.metadata.width && p.metadata.width < selectionRules.minWidth) isRejected = true;
      if (selectionRules.minHeight > 0 && p.metadata.height && p.metadata.height < selectionRules.minHeight) isRejected = true;
      if (selectionRules.minFocusScore > 0 && p.result.scores.focus < selectionRules.minFocusScore) isRejected = true;
      if (selectionRules.minExpressionScore > 0 && p.result.scores.expression < selectionRules.minExpressionScore) isRejected = true;
      if (selectionRules.minCompositionScore > 0 && p.result.scores.composition < selectionRules.minCompositionScore) isRejected = true;
      if (selectionRules.minEyesOpenScore > 0 && p.result.scores.eyesOpen < selectionRules.minEyesOpenScore) isRejected = true;
      if (selectionRules.minLightingScore > 0 && p.result.scores.lighting < selectionRules.minLightingScore) isRejected = true;
      if (selectionRules.minOverallScore > 0 && p.result.scores.overall < selectionRules.minOverallScore) isRejected = true;
      
      if (selectionRules.requiredAspectRatio !== 'any' && p.metadata.width && p.metadata.height) {
        const ratio = p.metadata.width / p.metadata.height;
        const target = selectionRules.requiredAspectRatio === '1:1' ? 1 : 
                       selectionRules.requiredAspectRatio === '4:3' ? 4/3 :
                       selectionRules.requiredAspectRatio === '3:2' ? 3/2 :
                       selectionRules.requiredAspectRatio === '16:9' ? 16/9 : 1;
        if (Math.abs(ratio - target) > 0.1) isRejected = true;
      }

      return { ...p, isRejected };
    }));
    addToast("Auto-selection rules applied to session.");
  };

  const applyAutoTop = (count: 5 | 10) => {
    const completed = photos.filter(p => p.status === 'completed' && p.result);
    const sorted = [...completed].sort((a, b) => (b.result?.scores.overall || 0) - (a.result?.scores.overall || 0));
    const topIds = new Set(sorted.slice(0, count).map(p => p.id));
    
    setPhotos(prev => prev.map(p => ({
      ...p,
      rating: topIds.has(p.id) ? 9 : 0,
      colorTag: topIds.has(p.id) ? 'green' : null
    })));
    addToast(`Applied Auto-Top ${count} selection.`);
  };

  const handleRejectInCompare = (id: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, manualRejected: true, rating: 0, colorTag: null } : p));
    setSelectedIds(prev => prev.filter(i => i !== id));
    if (selectedIds.length <= 2) {
      setViewMode('image');
    }
  };

  const pickTop5AI = () => {
    const completed = photos.filter(p => p.status === 'completed');
    if (completed.length === 0) {
      addToast("No analyzed photos found. Run AI analysis first.", 'error');
      return;
    }
    const sorted = [...completed].sort((a, b) => (b.result?.scores.overall || 0) - (a.result?.scores.overall || 0));
    const top5 = sorted.slice(0, 5).map(p => p.id);
    setSelectedIds(top5);
    setViewMode('library');
    addToast(`AI Selected Top ${top5.length} Hero Shots for comparison.`);
  };

  const identifyPeople = () => {
    addToast("AI identifying people in session...");
    setPhotos(prev => prev.map(p => ({
      ...p,
      metadata: { ...p.metadata, people: Math.random() > 0.5 ? ['Person A'] : [] }
    })));
  };

  const scoreFocus = async () => {
    if (selectedIds.length === 0 && !selectedPhoto) {
      addToast("Select photos to score focus.", 'error');
      return;
    }
    const ids = selectedIds.length > 0 ? selectedIds : [selectedPhoto!.id];
    
    setIsReviewing(true);
    addToast(`Scoring focus for ${ids.length} assets locally...`);
    try {
      const updatedPhotos = await Promise.all(photos.map(async (p) => {
        if (ids.includes(p.id)) {
          const score = await calculateSharpness(p.preview);
          return {
            ...p,
            result: {
              ...p.result,
              scores: {
                ...p.result?.scores,
                focus: score
              }
            } as any
          };
        }
        return p;
      }));
      setPhotos(updatedPhotos);
      addToast("Local focus scoring complete.");
    } catch (error) {
      console.error("Focus scoring failed:", error);
      addToast("Focus scoring failed.", 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  const runBlinkCheck = async () => {
    if (selectedIds.length === 0 && !selectedPhoto) {
      addToast("Select photos for blink check.", 'error');
      return;
    }
    const ids = selectedIds.length > 0 ? selectedIds : [selectedPhoto!.id];
    
    setIsReviewing(true);
    addToast(`Running AI blink check for ${ids.length} assets...`);
    try {
      const updatedPhotos = await Promise.all(photos.map(async (p) => {
        if (ids.includes(p.id)) {
          // Blink check still requires AI for accuracy
          const result = await analyzeImage(p.preview, p.file?.name || p.id, { skipTagging: true });
          return {
            ...p,
            result: {
              ...p.result,
              scores: {
                ...p.result?.scores,
                eyesOpen: result.scores.eyesOpen
              }
            } as any
          };
        }
        return p;
      }));
      setPhotos(updatedPhotos);
      addToast("Blink check complete.");
    } catch (error) {
      console.error("Blink check failed:", error);
      addToast("Blink check failed.", 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  const generateNewFilename = (photo: PhotoItem, index: number) => {
    const seq = (renamingSettings.sequenceStart + index).toString().padStart(4, '0');
    
    if (renamingSettings.pattern === 'simple') {
      return `Seqn_${seq}`;
    }

    const prefix = renamingSettings.prefix ? `${renamingSettings.prefix}_` : '';
    const subject = renamingSettings.subject ? `${renamingSettings.subject}_` : '';
    const location = renamingSettings.location ? `${renamingSettings.location}` : '';
    
    // Advanced pattern: [prefix]Subject_Location-Identifier
    let base = `${prefix}${subject}${location}`;
    if (base.endsWith('_')) base = base.slice(0, -1);
    
    let result = `${base}-${seq}`.toLowerCase();
    
    // Web-safe validation: Allow letters, numbers, underscore, hyphen
    result = result.replace(/[^a-z0-9-_]/g, '');
    
    return result;
  };

  const handleUpdatePhotoTag = (updated: ImageTag) => {
    const photo = photos.find(p => p.id === updated.imageId);
    if (!photo) return;

    const prevData = [{
      rating: photo.rating,
      colorTag: photo.colorTag,
      manualRejected: photo.manualRejected,
      metadata: { ...photo.metadata }
    }];

    setPhotos(prev => prev.map(p => p.id === updated.imageId ? {
      ...p,
      rating: updated.stars,
      colorTag: updated.flag === 'none' ? null : updated.flag,
      manualRejected: updated.reject,
      metadata: {
        ...p.metadata,
        aiFlag: updated.pick ? 'primary' : (updated.reject ? 'reject' : p.metadata.aiFlag)
      }
    } : p));

    const newData = [{
      rating: updated.stars,
      colorTag: updated.flag === 'none' ? null : updated.flag,
      manualRejected: updated.reject,
      metadata: {
        ...photo.metadata,
        aiFlag: updated.pick ? 'primary' : (updated.reject ? 'reject' : photo.metadata.aiFlag)
      }
    }];

    pushToHistory({
      type: 'update_metadata',
      photoIds: [updated.imageId],
      prevData,
      newData
    });

    updatePhotoMetadata(updated.imageId, {
      rating: updated.stars,
      colorTag: updated.flag === 'none' ? null : updated.flag,
      manualRejected: updated.reject
    });
    scheduleSidecarWrite();
  };

  const handlePhotoClick = (id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (e.shiftKey && selectedIds.length > 0) {
      const lastSelected = selectedIds[selectedIds.length - 1];
      const lastIdx = photos.findIndex(p => p.id === lastSelected);
      const currentIdx = photos.findIndex(p => p.id === id);
      const start = Math.min(lastIdx, currentIdx);
      const end = Math.max(lastIdx, currentIdx);
      const rangeIds = photos.slice(start, end + 1).map(p => p.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      setSelectedIds([id]);
      // Switch to single view on click
      if (viewMode !== 'image') {
        setViewMode('image');
      }
      // Simulate Hybrid Proxy Rendering (Instant-In)
      setIsHighResLoading(true);
      setTimeout(() => setIsHighResLoading(false), 300);
    }
  };

  const selectByColor = (color: string | null) => {
    setSelectedIds(photos.filter(p => p.colorTag === color).map(p => p.id));
  };

  const handlePublish = (platform: string) => {
    console.log(`Publishing to ${platform}...`);
    // Placeholder for actual publishing logic
  };

  const selectByRating = (rating: number) => {
    setSelectedIds(photos.filter(p => p.rating === rating).map(p => p.id));
  };

  const selectByPerson = (personName: string) => {
    setSelectedIds(photos.filter(p => p.result?.people.some(per => per.name === personName)).map(p => p.id));
  };

  const selectByCameraSerial = (serial: string) => {
    setSelectedIds(photos.filter(p => p.metadata.cameraSerial === serial).map(p => p.id));
  };

  const selectByTimeRange = (start: number, end: number) => {
    setSelectedIds(photos.filter(p => Number(p.metadata.timestamp) >= start && Number(p.metadata.timestamp) <= end).map(p => p.id));
  };

  const gangBySerial = () => {
    const serials = Array.from(new Set(photos.map(p => p.metadata.cameraSerial))).filter(Boolean) as string[];
    const newMap: Record<string, string> = {};
    serials.forEach((serial, index) => {
      const photo = photos.find(p => p.metadata.cameraSerial === serial);
      const model = photo?.metadata.cameraModel || '';
      const modelSuffix = model ? ` (${model})` : '';
      
      if (cameraNamingMode === 'alpha') {
        newMap[serial] = `Camera ${String.fromCharCode(65 + index)}${modelSuffix}`;
      } else if (cameraNamingMode === 'numeric') {
        newMap[serial] = `Camera ${index + 1}${modelSuffix}`;
      } else {
        newMap[serial] = serial;
      }
    });
    setCameraNamingMap(newMap);
  };

  const getLensStats = (lensName: string) => {
    const lensPhotos = photos.filter(p => p.metadata.lens === lensName);
    const apertures = lensPhotos.map(p => p.metadata.aperture).filter(Boolean) as unknown as number[];
    if (apertures.length === 0) return null;
    
    const min = Math.min(...apertures);
    const max = Math.max(...apertures);
    
    const counts: Record<number, number> = {};
    apertures.forEach(a => counts[a] = (counts[a] || 0) + 1);
    const mostUsed = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    
    return { min, max, mostUsed: parseFloat(mostUsed) };
  };

  const getShutterStats = () => {
    const shutters = photos.map(p => p.metadata.shutterSpeed).filter(Boolean) as string[];
    if (shutters.length === 0) return null;
    
    const parseShutter = (s: string) => {
      if (s.includes('/')) {
        const [num, den] = s.split('/').map(Number);
        return num / den;
      }
      return Number(s);
    };
    
    const sorted = [...shutters].sort((a, b) => parseShutter(a) - parseShutter(b));
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    const counts: Record<string, number> = {};
    shutters.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const mostUsed = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    
    return { min, max, mostUsed };
  };

  const batchRename = () => {
    if (selectedIds.length === 0) return;
    
    setPhotos(prev => {
      const selectedPhotos = prev.filter(p => selectedIds.includes(p.id));
      // Sort selected photos by their current order in the photos array
      const sortedSelected = [...selectedPhotos].sort((a, b) => {
        return prev.findIndex(p => p.id === a.id) - prev.findIndex(p => p.id === b.id);
      });

      return prev.map(p => {
        if (selectedIds.includes(p.id)) {
          const index = sortedSelected.findIndex(s => s.id === p.id);
          return { ...p, renamedFilename: generateNewFilename(p, index) };
        }
        return p;
      });
    });

    if (ingestSettings.numberingProtocol === 'progressive') {
      setIngestSettings(prev => ({
        ...prev,
        startSeq: prev.startSeq + selectedIds.length
      }));
    }

    addToast(`Batch renamed ${selectedIds.length} photos based on ingest settings.`);
  };

  const ungangPhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (!photo || !photo.rawFile) return prev;
      
      const rawPhoto: PhotoItem = {
        ...photo,
        id: Math.random().toString(36).substring(7),
        file: photo.rawFile,
        rawFile: undefined,
        preview: 'https://picsum.photos/seed/raw/800/600',
        metadata: {
          ...photo.metadata,
          hash: `${photo.rawFile.name}-${photo.rawFile.size}-${photo.rawFile.lastModified}`
        }
      };
      
      const updatedPhoto = { ...photo, rawFile: undefined };
      
      const index = prev.findIndex(p => p.id === id);
      const newList = [...prev];
      newList[index] = updatedPhoto;
      newList.splice(index + 1, 0, rawPhoto);
      return newList;
    });
  };

  const gangAllSelected = () => {
    setPhotos(prev => {
      const selected = prev.filter(p => selectedIds.includes(p.id));
      const rawExtensions = ['.arw', '.cr2', '.cr3', '.nef', '.dng', '.orf', '.raf'];
      const jpgExtensions = ['.jpg', '.jpeg'];
      
      const groups: { [key: string]: { jpg?: PhotoItem, raw?: PhotoItem } } = {};
      
      selected.forEach(p => {
        const fileName = p.file?.name || p.id;
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return;
        const name = fileName.substring(0, lastDotIndex);
        const ext = fileName.substring(lastDotIndex).toLowerCase();
        
        if (!groups[name]) groups[name] = {};
        if (jpgExtensions.includes(ext)) groups[name].jpg = p;
        else if (rawExtensions.includes(ext)) groups[name].raw = p;
      });
      
      const toRemove: string[] = [];
      const updated = prev.map(p => {
        const fileName = p.file?.name || p.id;
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return p;
        const name = fileName.substring(0, lastDotIndex);
        const group = groups[name];
        
        if (group && group.jpg && group.raw) {
          if (p.id === group.jpg.id) {
            toRemove.push(group.raw.id);
            return { ...p, rawFile: group.raw.file };
          }
        }
        return p;
      });
      
      return updated.filter(p => !toRemove.includes(p.id));
    });
    addToast('Paired all matching RAW+JPEG files in selection.');
  };

  const generateXMP = (photo: PhotoItem) => {
    const rating = photo.rating || 0;
    const tags = [...(photo.result?.tags || []), ...photo.tags].join(', ');
    const people = photo.result?.people?.map(p => p.name).join(', ') || '';
    const score = photo.result?.scores.overall || 0;
    
    return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:lr="http://ns.adobe.com/lightroom/1.0/"
    xmp:Rating="${rating}"
    photoshop:Headline="SelectPro Score: ${score}"
    photoshop:AuthorsPosition="SelectPro AI Analysis">
   <dc:subject>
    <rdf:Bag>
     ${tags.split(', ').map(tag => `<rdf:li>${tag}</rdf:li>`).join('\n     ')}
    </rdf:Bag>
   </dc:subject>
   <lr:hierarchicalSubject>
    <rdf:Bag>
     <rdf:li>SelectPro|Score|${score}</rdf:li>
     ${people.split(', ').filter(p => p).map(p => `<rdf:li>People|${p}</rdf:li>`).join('\n     ')}
    </rdf:Bag>
   </lr:hierarchicalSubject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  };

  const handleExport = () => {
    if (selectedIds.length === 0) {
      addToast("Please select photos to export first.", 'info');
      return;
    }
    setShowExportModal(true);
  };

  const filteredPhotos = useMemo(() => {
    let result = [...photos];
    
    // Search query filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.file?.name || '').toLowerCase().includes(query) ||
        (p.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
        (p.metadata.recognizedPeople || []).some(person => person.name.toLowerCase().includes(query)) ||
        (p.metadata.cameraSerial || '').toLowerCase().includes(query) ||
        (p.metadata.lens || '').toLowerCase().includes(query)
      );
    }

    // Automatic first-pass concealment logic
    if (!showAiRejected) {
      result = result.filter(p => !p.isRejected);
    }

    if (activeFolder === 'rejected') result = result.filter(p => p.result?.isRejected || p.manualRejected);
    else if (activeFolder === 'hero') result = result.filter(p => p.result?.isHeroPotential);
    else if (activeFolder === 'eyes-closed') result = result.filter(p => p.result && p.result.scores.eyesOpen < 40);
    else if (activeFolder === 'blurry') result = result.filter(p => p.result && p.result.scores.focus < 40);
    else if (activeFolder.startsWith('rating-')) {
      const r = parseInt(activeFolder.split('-')[1]);
      result = result.filter(p => p.rating === r);
    }

    if (serialFilter !== 'all') {
      result = result.filter(p => p.metadata.cameraSerial === serialFilter);
    }

    if (isoFilter !== 'all') {
      result = result.filter(p => String(p.metadata.iso) === String(isoFilter));
    }

    result = result.filter(p => {
      const iso = Number(p.metadata.iso) || 0;
      return iso >= isoRange.min && iso <= isoRange.max;
    });

    // Sorting
    switch (sortOption) {
      case 'capture-time':
        result.sort((a, b) => {
          const tA = a.metadata.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
          const tB = b.metadata.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
          return tA - tB;
        });
        break;
      case 'serial':
        result.sort((a, b) => (a.metadata.cameraSerial || '').localeCompare(b.metadata.cameraSerial || ''));
        break;
      case 'filename':
        result.sort((a, b) => (a.file?.name || a.id).localeCompare(b.file?.name || b.id));
        break;
      case 'modification-time':
        result.sort((a, b) => (a.file?.lastModified || 0) - (b.file?.lastModified || 0));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'type':
        result.sort((a, b) => (a.file?.type || '').localeCompare(b.file?.type || ''));
        break;
      case 'custom':
        // Custom order could be based on manual reordering, for now we keep it as is
        break;
      case 'default':
      default:
        // Keep original order
        break;
    }

    return result;
  }, [photos, activeFolder, serialFilter, isoFilter, isoRange, showAiRejected, sortOption, searchQuery]);

  const advanceToNext = useCallback(() => {
    if (selectedIds.length === 1) {
      const currentId = selectedIds[0];
      const currentIndex = filteredPhotos.findIndex(p => p.id === currentId);
      if (currentIndex !== -1 && currentIndex < filteredPhotos.length - 1) {
        setSelectedIds([filteredPhotos[currentIndex + 1].id]);
      }
    }
  }, [selectedIds, filteredPhotos]);

  const scheduleSidecarWrite = useCallback(async () => {
    if (!sidecarEnabled || !autoWriteSidecar || photos.length === 0) return;
    
    const catalog = sidecarService.buildCatalogFromPhotos(photos);
    if (directoryHandle) {
      try {
        await sidecarService.writeCatalogToFolder(catalog, directoryHandle);
      } catch (err) {
        console.error("Failed to auto-write sidecar:", err);
      }
    } else {
      // Fallback to download if no handle
      sidecarService.downloadCatalog(catalog);
    }
  }, [sidecarEnabled, autoWriteSidecar, photos, directoryHandle]);

  const saveSidecarNow = () => {
    const catalog = sidecarService.buildCatalogFromPhotos(photos);
    sidecarService.downloadCatalog(catalog);
    addToast("Sidecar catalog exported.", 'success');
  };

  const updateRating = (ids: string | string[], rating: number) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    const affectedPhotos = photos.filter(p => targetIds.includes(p.id));
    const prevData = affectedPhotos.map(p => ({ rating: p.rating }));
    
    let finalRating = rating;
    setPhotos(prev => prev.map(p => {
      if (targetIds.includes(p.id)) {
        if (targetIds.length === 1) {
          finalRating = p.rating === rating ? 0 : rating;
        } else {
          finalRating = rating;
        }
        return { ...p, rating: finalRating };
      }
      return p;
    }));

    const newData = affectedPhotos.map(() => ({ rating: finalRating }));
    pushToHistory({
      type: 'update_metadata',
      photoIds: targetIds,
      prevData,
      newData
    });

    if (targetIds.length === 1) {
      updatePhotoMetadata(targetIds[0], { rating: finalRating });
      if (autoAdvance && viewMode === 'image') {
        advanceToNext();
      }
    } else {
      batchUpdatePhotoMetadata(targetIds, { rating: finalRating });
    }
    scheduleSidecarWrite();
  };

  const updateColor = (ids: string | string[], color: string | null) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    const affectedPhotos = photos.filter(p => targetIds.includes(p.id));
    const prevData = affectedPhotos.map(p => ({ colorTag: p.colorTag }));

    setPhotos(prev => prev.map(p => targetIds.includes(p.id) ? { ...p, colorTag: color } : p));
    
    const newData = affectedPhotos.map(() => ({ colorTag: color }));
    pushToHistory({
      type: 'update_metadata',
      photoIds: targetIds,
      prevData,
      newData
    });

    if (targetIds.length === 1) {
      updatePhotoMetadata(targetIds[0], { colorTag: color });
      if (autoAdvance && viewMode === 'image' && color !== null) {
        advanceToNext();
      }
    } else {
      batchUpdatePhotoMetadata(targetIds, { colorTag: color });
    }
    scheduleSidecarWrite();
  };

  const toggleReject = (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    const prevData = [{ manualRejected: photo.manualRejected, rating: photo.rating, colorTag: photo.colorTag }];
    const isRejected = !photo.manualRejected;

    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, manualRejected: isRejected, rating: 0, colorTag: null };
      }
      return p;
    }));

    const newData = [{ manualRejected: isRejected, rating: 0, colorTag: null }];
    pushToHistory({
      type: 'update_metadata',
      photoIds: [id],
      prevData,
      newData
    });

    updatePhotoMetadata(id, { manualRejected: isRejected, rating: 0, colorTag: null });
    if (autoAdvance && viewMode === 'image' && isRejected) {
      advanceToNext();
    }
    scheduleSidecarWrite();
  };

  const rejectSelected = () => {
    const affectedPhotos = photos.filter(p => selectedIds.includes(p.id));
    const prevData = affectedPhotos.map(p => ({ manualRejected: p.manualRejected, rating: p.rating, colorTag: p.colorTag }));

    setPhotos(prev => prev.map(p => {
      if (selectedIds.includes(p.id)) {
        return { ...p, manualRejected: true, rating: 0, colorTag: null };
      }
      return p;
    }));

    const newData = affectedPhotos.map(() => ({ manualRejected: true, rating: 0, colorTag: null }));
    pushToHistory({
      type: 'update_metadata',
      photoIds: selectedIds,
      prevData,
      newData
    });

    batchUpdatePhotoMetadata(selectedIds, { manualRejected: true, rating: 0, colorTag: null });
    scheduleSidecarWrite();
  };

  const removePhotos = (ids: string[]) => {
    setPhotos(prev => {
      prev.filter(p => ids.includes(p.id)).forEach(p => {
        URL.revokeObjectURL(p.preview);
      });
      return prev.filter(p => !ids.includes(p.id));
    });
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handlePickWinner = (winnerId: string) => {
    const affectedIds = selectedIds.filter(id => id !== winnerId);
    const affectedPhotos = photos.filter(p => affectedIds.includes(p.id));
    const prevData = affectedPhotos.map(p => ({ manualRejected: p.manualRejected, rating: p.rating, colorTag: p.colorTag }));

    setPhotos(prev => prev.map(p => {
      if (selectedIds.includes(p.id) && p.id !== winnerId) {
        return { ...p, manualRejected: true, rating: 0, colorTag: null };
      }
      return p;
    }));

    const newData = affectedPhotos.map(() => ({ manualRejected: true, rating: 0, colorTag: null }));
    pushToHistory({
      type: 'update_metadata',
      photoIds: affectedIds,
      prevData,
      newData
    });

    batchUpdatePhotoMetadata(affectedIds, { manualRejected: true, rating: 0, colorTag: null });
    setSelectedIds([winnerId]);
    if (selectedIds.length <= 2) {
      setViewMode('image');
    }
    scheduleSidecarWrite();
  };

  const addTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        if (p.tags.includes(tag.trim())) return p;
        return { ...p, tags: [...p.tags, tag.trim()] };
      }
      return p;
    }));
    if (autoAdvance && viewMode === 'image') {
      advanceToNext();
    }
    scheduleSidecarWrite();
  };

  const removeTag = (id: string, tagToRemove: string) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, tags: p.tags.filter(t => t !== tagToRemove) };
      }
      return p;
    }));
    scheduleSidecarWrite();
  };

  const handleNoteChange = (id: string, notes: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
    scheduleSidecarWrite();
  };

  const workspaceBg = useMemo(() => {
    if (viewMode === 'library') return interfaceColor;
    if (viewMode === 'image') return lightenColor(interfaceColor, 15);
    return interfaceColor;
  }, [viewMode, interfaceColor]);

  // OAuth Handler
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const provider = event.data.provider;
        setConnections(prev => ({ ...prev, [provider]: true }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connectProvider = async (provider: string) => {
    try {
      const res = await fetch(`/api/auth/${provider}/url`);
      const { url } = await res.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentSelectedId = selectedIds[0];
      const hasCmd = e.metaKey || e.ctrlKey;
      const hasShift = e.shiftKey;
      const hasAlt = e.altKey;

      // Undo/Redo - Cmd + Z / Cmd + Shift + Z
      if (e.key.toLowerCase() === 'z' && hasCmd) {
        if (hasShift) redo();
        else undo();
        e.preventDefault();
        return;
      }
      
      // P — Pick (Rating 5)
      if (e.key.toLowerCase() === 'p' && !hasCmd && !hasShift && !hasAlt) {
        updateRating(currentSelectedId, 5);
        if (autoAdvance) {
          const currentIndex = filteredPhotos.findIndex(p => p.id === currentSelectedId);
          if (currentIndex < filteredPhotos.length - 1) {
            setSelectedIds([filteredPhotos[currentIndex + 1].id]);
          }
        }
        e.preventDefault();
      }

      // X — Reject
      if (e.key.toLowerCase() === 'x' && !hasCmd && !hasShift && !hasAlt) {
        setPhotos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, isRejected: true, rejectType: 1, manualRejected: true, rating: 0 } : p));
        if (autoAdvance) {
          const currentIndex = filteredPhotos.findIndex(p => p.id === currentSelectedId);
          if (currentIndex < filteredPhotos.length - 1) {
            setSelectedIds([filteredPhotos[currentIndex + 1].id]);
          }
        }
        e.preventDefault();
      }

      // U — Unrate
      if (e.key.toLowerCase() === 'u' && !hasCmd && !hasShift && !hasAlt) {
        setPhotos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, isRejected: false, rating: 0 } : p));
        e.preventDefault();
      }

      // F — Flag (Rating 5)
      if (e.key.toLowerCase() === 'f' && !hasCmd && !hasShift && !hasAlt) {
        updateRating(currentSelectedId, 5);
        e.preventDefault();
      }

      // Shift + P — Focus Peaking Toggle
      if (e.key.toLowerCase() === 'p' && e.shiftKey && !hasCmd && !hasAlt && viewMode === 'image') {
        setShowFocusPeaking(prev => !prev);
        e.preventDefault();
      }

      // Immersive Mode (Zen) - Shift + Z
      if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        setIsImmersive(prev => !prev);
        e.preventDefault();
      }

      // Full Screen - F11 or Cmd + Shift + F
      if (e.key === 'F11' || (e.key.toLowerCase() === 'f' && e.shiftKey && hasCmd)) {
        toggleFullScreen();
        e.preventDefault();
      }

      // Import - Cmd + I (Files) / Cmd + Alt + I (Folder)
      if (e.key.toLowerCase() === 'i' && hasCmd) {
        if (hasAlt) {
          folderInputRef.current?.click();
          e.preventDefault();
        } else if (!hasShift) {
          fileInputRef.current?.click();
          e.preventDefault();
        }
      }

      // Invert Selection - Cmd + Shift + I
      if (e.key.toLowerCase() === 'i' && hasCmd && hasShift) {
        invertSelection();
        e.preventDefault();
      }

      // Export - Cmd + E
      if (e.key.toLowerCase() === 'e' && hasCmd) {
        handleExport();
        e.preventDefault();
      }

      // Toggle AI Analysis Results - Cmd + Shift + A
      if (e.key.toLowerCase() === 'a' && hasCmd && hasShift) {
        setShowAiAnalysis(prev => !prev);
        e.preventDefault();
      }

      // Cmd+A — Select All
      if (e.key.toLowerCase() === 'a' && hasCmd && !hasShift) {
        if (photos.length > 0) {
          setShowSelectAllConfirmModal(true);
        }
        e.preventDefault();
      }

      // Backspace/Delete — Remove Selected
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey) {
        if (selectedIds.length > 0) {
          setShowRemoveConfirmModal(true);
        }
        e.preventDefault();
      }

      if (!currentSelectedId) return;
      
      let modifierMet = false;
      if (keyboardSettings.requireModifier === 'none') modifierMet = true;
      else if (keyboardSettings.requireModifier === 'alt' && hasAlt) modifierMet = true;
      else if (keyboardSettings.requireModifier === 'cmd' && hasCmd) modifierMet = true;
      else if (keyboardSettings.requireModifier === 'shift' && hasShift) modifierMet = true;

      if (modifierMet) {
        // Star Ratings
        if (e.key >= '0' && e.key <= keyboardSettings.maxRating.toString()) {
          updateRating(currentSelectedId, parseInt(e.key));
          e.preventDefault();
        }

        // Color Tags (Lightroom Style: 6-9)
        if (keyboardSettings.preset === 'lightroom') {
          if (e.key === '6') updateColor(currentSelectedId, 'red');
          if (e.key === '7') updateColor(currentSelectedId, 'yellow');
          if (e.key === '8') updateColor(currentSelectedId, 'green');
          if (e.key === '9') updateColor(currentSelectedId, 'blue');
        }
      }

      // Manual Override & SelectPro Hotkeys (Left Hand Home Row)
      
      // 1 — Select (Rating 5)
      if (e.key === '1' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        updateRating(currentSelectedId, 5);
        if (autoAdvance) {
          const currentIndex = filteredPhotos.findIndex(p => p.id === currentSelectedId);
          if (currentIndex < filteredPhotos.length - 1) {
            setSelectedIds([filteredPhotos[currentIndex + 1].id]);
          }
        }
        e.preventDefault();
      }

      // 2 — Reject
      if (e.key === '2' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        setPhotos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, isRejected: true, rejectType: 1, manualRejected: true, rating: 0 } : p));
        if (autoAdvance) {
          const currentIndex = filteredPhotos.findIndex(p => p.id === currentSelectedId);
          if (currentIndex < filteredPhotos.length - 1) {
            setSelectedIds([filteredPhotos[currentIndex + 1].id]);
          }
        }
        e.preventDefault();
      }

      // 3 — Maybe (Rating 3)
      if (e.key === '3' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        updateRating(currentSelectedId, 3);
        if (autoAdvance) {
          const currentIndex = filteredPhotos.findIndex(p => p.id === currentSelectedId);
          if (currentIndex < filteredPhotos.length - 1) {
            setSelectedIds([filteredPhotos[currentIndex + 1].id]);
          }
        }
        e.preventDefault();
      }

      // Z — Zoom Toggle (Requested by user)
      if (e.key.toLowerCase() === 'z' && viewMode === 'image') {
        handleZoomToggle();
        e.preventDefault();
      }

      // Spacebar — Loupe view toggle
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (viewMode === 'library') {
          setViewMode('image');
        } else if (viewMode === 'image') {
          handleZoomToggle();
        }
      }

      // Global Selection Shortcuts (Alt + Key)
      if (e.altKey) {
        if (e.key === '6') { selectByColor('red'); e.preventDefault(); }
        if (e.key === '7') { selectByColor('yellow'); e.preventDefault(); }
        if (e.key === '8') { selectByColor('green'); e.preventDefault(); }
        if (e.key === '9') { selectByColor('blue'); e.preventDefault(); }
        if (e.key === '0') { selectByColor(null); e.preventDefault(); }
      }

      if (e.key === 'ArrowRight') {
        const idx = filteredPhotos.findIndex(p => p.id === currentSelectedId);
        if (idx < filteredPhotos.length - 1) {
          setSelectedIds([filteredPhotos[idx + 1].id]);
          setIsHighResLoading(true);
          setTimeout(() => setIsHighResLoading(false), 300);
        }
      }
      if (e.key === 'ArrowLeft') {
        const idx = filteredPhotos.findIndex(p => p.id === currentSelectedId);
        if (idx > 0) {
          setSelectedIds([filteredPhotos[idx - 1].id]);
          setIsHighResLoading(true);
          setTimeout(() => setIsHighResLoading(false), 300);
        }
      }

      if (e.key.toLowerCase() === 'i' && !hasCmd && !hasShift && !hasAlt) { 
        setShowCameraDataPanel(prev => !prev); 
        e.preventDefault(); 
      }

      // View Shortcuts (Cmd + 1, 2, 3)
      if (hasCmd) {
        if (e.key === '1') { setViewMode('import'); e.preventDefault(); }
        if (e.key === '2') { setViewMode('library'); e.preventDefault(); }
        if (e.key === '3') { setViewMode('image'); e.preventDefault(); }
        if (e.key === '4') { setViewMode('nineShot'); e.preventDefault(); }
        
        // Sidebar Toggles
        if (e.key === '[') { setLeftSidebarCollapsed(prev => !prev); e.preventDefault(); }
        if (e.key === ']') { setRightSidebarCollapsed(prev => !prev); e.preventDefault(); }
      }

      // Zoom Shortcuts in Image View
      if (viewMode === 'image') {
        if (e.key === '=' && hasCmd) { setTargetZoomLevel(prev => Math.min(prev + 0.5, 4)); e.preventDefault(); }
        if (e.key === '-' && hasCmd) { setTargetZoomLevel(prev => Math.max(prev - 0.5, 1)); e.preventDefault(); }
        if (e.key === '0' && hasCmd && e.altKey) { setTargetZoomLevel(1); e.preventDefault(); }
      }

      // Thumbnail Scaling Shortcuts (Cmd + Shift + +/-)
      if (hasCmd && e.shiftKey) {
        if (e.key === '+' || e.key === '=') {
          setThumbnailMinSize(prev => Math.min(prev + 20, 400));
          e.preventDefault();
        }
        if (e.key === '-' || e.key === '_') {
          setThumbnailMinSize(prev => Math.max(prev - 20, 60));
          e.preventDefault();
        }
      }

      // Preferences Shortcut (Cmd + ,)
      if (hasCmd && e.key === ',') {
        setShowPreferences(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, photos, filteredPhotos, keyboardSettings, isFocusMode, viewMode, showAiRejected, autoAdvance]);

  return (
    <div 
      className="h-screen flex flex-col text-system-text font-sans overflow-hidden transition-colors duration-700 relative border border-black/10"
      style={{ backgroundColor: workspaceBg }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Window Pinline */}
      <div className="absolute inset-0 pointer-events-none z-[10001] border border-black/5" />
      
      {/* Film Pinline Accent */}
      {showPinline && (
        <div className="absolute inset-0 pointer-events-none z-[9999] border-[1.5px] border-transparent" 
             style={{ 
               borderImage: 'linear-gradient(to right, #ff8c00, #ffd700, #ff8c00) 1',
               opacity: 0.6
             }} 
        />
      )}
      
      {/* Film Sprocket/Brand Repeat Accent (Top) */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-[10000] pointer-events-none overflow-hidden flex items-center opacity-40">
        <div className="whitespace-nowrap text-[5px] font-black tracking-[0.5em] text-[#ff8c00] animate-marquee">
          KODAK PORTRA 400 • FUJI PRO 400H • ILFORD HP5 • KODAK TRI-X • KODAK PORTRA 400 • FUJI PRO 400H • ILFORD HP5 • KODAK TRI-X • 
          KODAK PORTRA 400 • FUJI PRO 400H • ILFORD HP5 • KODAK TRI-X • KODAK PORTRA 400 • FUJI PRO 400H • ILFORD HP5 • KODAK TRI-X • 
        </div>
      </div>

      <ProgressIndicator />
      <OnboardingOverlay />
      
      {/* Drag and Drop Overlay */}
      {isFileDragging && (
        <div className="absolute inset-0 z-[200] bg-system-accent/90 backdrop-blur-xl flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-bounce">
            <Upload size={48} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Drop to Ingest or Import</h2>
          <p className="text-white/60 font-medium">Release to add photos to your session</p>
          <div className="absolute inset-8 border-2 border-dashed border-white/20 rounded-3xl pointer-events-none" />
        </div>
      )}

      {/* OS-Style Menu Bar - Hidden in favor of integrated menu */}
      {false && !isImmersive && (
        <div className="h-7 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center px-3 gap-4 shrink-0 z-[110] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-system-highlight/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-4">
          <MenuButton 
            label="File" 
            items={[
              { label: 'Ingest Standard...', onClick: () => { setStrategy('auto-top'); fileInputRef.current?.click(); } },
              { label: 'Ingest Progressive (AI)...', onClick: () => { setStrategy('progressive'); fileInputRef.current?.click(); } },
              { label: 'Ingest Top 10 JPEGs', onClick: ingestTop10JPEGs },
              '---',
              { label: 'Export...', onClick: () => setShowExportModal(true) }, 
              { label: 'Renaming Structure', onClick: () => setShowProjectSettings(true) },
              { label: 'Preferences...', onClick: () => setShowPreferences(true), shortcut: 'Cmd+,' }
            ]} 
          />
          <MenuButton 
            label="Edit" 
            items={[
              { label: 'Undo', onClick: undo, shortcut: 'Cmd+Z' }, 
              { label: 'Redo', onClick: redo, shortcut: 'Cmd+Shift+Z' }, 
              '---',
              { label: 'Select All', onClick: () => photos.length > 0 && setShowSelectAllConfirmModal(true), shortcut: 'Cmd+A' },
              { label: 'Deselect All', onClick: () => setSelectedIds([]), shortcut: 'Cmd+D' },
              { label: 'Invert Selection', onClick: invertSelection, shortcut: 'Cmd+I' },
              '---',
              { label: 'Remove Selected', onClick: () => selectedIds.length > 0 && setShowRemoveConfirmModal(true), shortcut: 'Backspace' }
            ]} 
          />
              <MenuButton 
                label="View" 
                items={[
                  { label: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', onClick: () => setIsFocusMode(!isFocusMode), shortcut: 'F' },
                  { label: isImmersive ? 'Exit Immersive Mode' : 'Immersive Mode (Zen)', onClick: () => setIsImmersive(!isImmersive), shortcut: 'Shift+Z' },
                  { label: isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen', onClick: toggleFullScreen, shortcut: 'F11' },
                  '---',
                  { label: 'Dashboard View', onClick: () => setViewMode('import'), shortcut: 'Cmd+1' },
                  { label: 'Library View', onClick: () => setViewMode('library'), shortcut: 'Cmd+2' },
                  { label: 'Image View', onClick: () => setViewMode('image'), shortcut: 'Cmd+3' },
                  { label: '9 Shot View', onClick: () => setViewMode('nineShot'), shortcut: 'Cmd+4' },
                  { label: (leftSidebarCollapsed || isImmersive) ? 'Show Left Sidebar' : 'Hide Left Sidebar', onClick: () => setLeftSidebarCollapsed(!leftSidebarCollapsed), shortcut: 'Cmd+[' },
                  { label: (rightSidebarCollapsed || isImmersive) ? 'Show Right Sidebar' : 'Hide Right Sidebar', onClick: () => setRightSidebarCollapsed(!rightSidebarCollapsed), shortcut: 'Cmd+]' },
                  { label: showCropTool ? 'Hide Crop Overlay' : 'Show Crop Overlay', onClick: () => setShowCropTool(!showCropTool) },
                  { label: showProgressiveFolders ? 'Hide Rating Folders' : 'Show Rating Folders', onClick: () => setShowProgressiveFolders(!showProgressiveFolders) },
                  '---',
                  { label: 'Customize Toolbar...', onClick: () => setShowToolbarCustomizer(true) }
                ]} 
              />
          
          <div className="h-4 w-px bg-black/5 mx-1" />
          
          <MenuButton 
            label="Selection" 
            items={[
              { label: 'Select All', onClick: () => photos.length > 0 && setShowSelectAllConfirmModal(true), shortcut: 'Cmd+A' },
              { label: 'Deselect All', onClick: () => setSelectedIds([]), shortcut: 'Cmd+D' },
              { label: 'Invert Selection', onClick: invertSelection, shortcut: 'Cmd+I' },
              '---',
              { label: 'Select Vertical', onClick: () => selectByOrientation('portrait') },
              { label: 'Select Horizontal', onClick: () => selectByOrientation('landscape') },
              '---',
              { label: 'Select Red Tag', onClick: () => selectByColor('red') },
              { label: 'Select Yellow Tag', onClick: () => selectByColor('yellow') },
              { label: 'Select Green Tag', onClick: () => selectByColor('green') },
              { label: 'Select Blue Tag', onClick: () => selectByColor('blue') },
              { label: 'Select Purple Tag', onClick: () => selectByColor('purple') },
              { label: 'Select No Tag', onClick: () => selectByColor(null) },
              '---',
              ...Array.from(new Set(photos.map(p => p.metadata.iso)))
                .filter(iso => iso !== undefined)
                .sort((a, b) => Number(a) - Number(b))
                .map(iso => ({
                  label: `Select ISO ${iso}`,
                  onClick: () => selectByISO(Number(iso))
                }))
            ]} 
          />
          {isAiEnabled && (
            <MenuButton 
              label="AI" 
              items={[
                { label: 'SelectPro Scan', onClick: startAnalysis, active: isAnySdkActive },
                { label: 'Auto-Select+/- (Apply Rules)', onClick: autoSelect, shortcut: 'Shift+X', active: isAnySdkActive },
                '---',
                { label: `Strategy: ${strategy === 'progressive' ? 'Progressive' : 'Auto-Top'}`, onClick: () => setStrategy(strategy === 'progressive' ? 'auto-top' : 'progressive') },
                { label: 'AI Analysis Settings...', onClick: () => { setActivePreferenceTab('ai'); setShowPreferences(true); } },
                { label: 'Cache & Performance...', onClick: () => { setActivePreferenceTab('performance'); setShowPreferences(true); } },
                { label: 'Custom Selection Rules...', onClick: () => { setActivePreferenceTab('selection'); setShowPreferences(true); } },
                { label: 'Identify People', onClick: identifyPeople, active: isAnySdkActive }, 
                { label: 'Score Focus', onClick: scoreFocus, active: isAnySdkActive }
              ]} 
            />
          )}
          
          <div className="h-4 w-px bg-black/5 mx-1" />

          <div className="flex items-center gap-2 px-2 py-1 bg-black/5 rounded-lg border border-black/10">
            <div className="flex items-center gap-1">
              {['P', 'A', 'S', 'M'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectionMode(mode as any)}
                  className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-black transition-all ${
                    selectionMode === mode 
                      ? 'bg-system-accent text-white shadow-sm' 
                      : 'text-system-secondary hover:bg-black/5'
                  }`}
                  title={
                    mode === 'M' ? 'Manual: Full manual selection' :
                    mode === 'S' ? 'Shutter: Priorities highest shutter speed selection, add computational enhancement for ie highest priority, for 1/8000th, lowest 30 seconds' :
                    mode === 'A' ? 'Aperture: Emphasis on largest aperture f1.0/f1.2 Lowest f45' :
                    'Program: Automatic thinking emphasis on 1/250th flash considerations social photography'
                  }
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Top N Toggle */}
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-black/10">
              <span className="text-[8px] font-black uppercase tracking-widest text-system-secondary">
                {aiAnalysisSettings.shotCount === 1 ? 'Hero' : `Top ${aiAnalysisSettings.shotCount || 9}`}
              </span>
              <button 
                onClick={() => {
                  if (!isTop9Active && !isReviewing) runTop9Analysis();
                  setIsTop9Active(!isTop9Active);
                }}
                disabled={isReviewing || !isTop9ModelLoaded}
                className={`relative w-7 h-3.5 rounded-full transition-all ${isTop9Active ? 'bg-system-accent shadow-[0_0_8px_var(--color-system-accent)]' : 'bg-black/20'} ${isReviewing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                title={`${aiAnalysisSettings.shotCount === 1 ? 'Hero Shot' : `Top ${aiAnalysisSettings.shotCount || 9}`} Curation`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isTop9Active ? 'left-4' : 'left-0.5'} ${isReviewing ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            <div className="flex items-center bg-black/5 rounded-lg p-1 gap-1 border border-black/5">
              <button
                onClick={() => setAiStatus('AI')}
                className={`px-3 py-1 rounded-md text-[10px] font-black transition-all flex items-center gap-1.5 ${
                  aiStatus === 'AI' 
                    ? 'bg-white text-system-accent shadow-sm' 
                    : 'text-system-secondary hover:bg-white/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'AI' ? 'bg-system-accent animate-pulse' : 'bg-system-secondary'}`} />
                AI
              </button>
              <button
                onClick={() => setAiStatus('M')}
                className={`px-3 py-1 rounded-md text-[10px] font-black transition-all flex items-center gap-1.5 ${
                  aiStatus === 'M' 
                    ? 'bg-white text-system-accent shadow-sm' 
                    : 'text-system-secondary hover:bg-white/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'M' ? 'bg-system-accent' : 'bg-system-secondary'}`} />
                M
              </button>
              <button
                onClick={() => setAiStatus('L')}
                className={`px-3 py-1 rounded-md text-[10px] font-black transition-all flex items-center gap-1.5 ${
                  aiStatus === 'L' 
                    ? 'bg-white text-system-accent shadow-sm' 
                    : 'text-system-secondary hover:bg-white/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'L' ? 'bg-system-accent shadow-[0_0_8px_var(--color-system-accent)]' : 'bg-system-secondary'}`} />
                L
              </button>
            </div>

            <div className="h-4 w-px bg-black/10 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-system-secondary uppercase tracking-widest">Network</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-[10px] font-black ${
                navigator.onLine 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                  : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? 'bg-emerald-500' : 'bg-white animate-pulse'}`} />
                {navigator.onLine ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>

            <div className="h-4 w-px bg-black/10 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-system-secondary uppercase tracking-widest">Insights</span>
              <div className="flex items-center bg-black/5 rounded-lg p-0.5 gap-0.5 border border-black/5">
                {(['off', 'basic', 'pro', 'learning'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInsightMode(mode)}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                      insightMode === mode 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-black/10 mx-1" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-system-secondary uppercase tracking-widest">AI Engine</span>
              <div className="p-0.5 rounded-lg bg-system-accent/10 border border-system-accent/20 flex items-center">
                <button 
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-[10px] font-black ${
                    aiEnabled 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-white ${aiEnabled ? 'animate-pulse' : ''}`} />
                  {aiEnabled ? 'ACTIVE' : 'PAUSED'}
                </button>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-black/5 mx-1" />

          <button 
            onClick={pickTop5AI}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-system-accent text-white hover:bg-system-accent/90 transition-all text-[11px] font-bold shadow-sm"
          >
            <Sparkles size={12} />
            <span>AI Top 5</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          {photos.length > 0 && (
            <div 
              className="flex items-center gap-4 bg-black/5 px-6 py-1.5 rounded-full border border-black/10 cursor-pointer hover:bg-black/10 transition-all group"
              onClick={() => setProgressMode(prev => prev === 'frames' ? 'percent' : 'frames')}
            >
              <div className="relative flex items-center gap-3">
                {/* Leica M11 Style Counter Window */}
                <div className="relative w-10 h-10 bg-black rounded-full border-2 border-grey-18 flex items-center justify-center overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  {/* Magnifier Lens Effect */}
                  <div className="absolute inset-1 rounded-full bg-white/5 backdrop-blur-[1px] border border-white/10" />
                  <span className="text-[14px] font-black text-white z-10 tabular-nums">
                    {photos.filter(p => p.status === 'completed').length}
                  </span>
                </div>

                {/* 35mm Film Icon - Doubled Width */}
                <div className="w-32 h-8 bg-black rounded-sm border border-white/10 relative overflow-hidden flex flex-col justify-between py-1">
                  <div className="flex justify-between px-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/20 rounded-[1px]" />)}
                  </div>
                  <div className="flex-1 flex items-center px-1">
                    {/* Bar graph going from light to dark */}
                    <div 
                      className="h-3 bg-gradient-to-r from-white via-grey-18 to-black rounded-sm transition-all duration-500 border border-white/5" 
                      style={{ width: `${(photos.filter(p => p.status === 'completed').length / photos.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between px-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/20 rounded-[1px]" />)}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-system-secondary uppercase tracking-widest leading-none mb-0.5">Analysis Engine</span>
                <span className="text-[10px] font-bold text-system-accent tabular-nums leading-none">
                  {progressMode === 'frames' 
                    ? `${photos.filter(p => p.status === 'completed').length} / ${photos.length} Frames`
                    : `${Math.round((photos.filter(p => p.status === 'completed').length / photos.length) * 100)}% Optimized`
                  }
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-system-secondary uppercase tracking-widest">
          {isFocusMode && (
            <div className="flex items-center gap-1.5 text-system-accent animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-system-accent" />
              <span>Focus Active</span>
            </div>
          )}
          <div className="h-3 w-px bg-black/5 mx-1" />
          <button 
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-system-accent/10 text-system-accent hover:bg-system-accent/20 transition-all border border-system-accent/20"
          >
            <Download size={10} />
            <span>Download for Mac</span>
          </button>
          <div className="h-3 w-px bg-black/5 mx-1" />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-system-accent/40">SelectPro v2.4</span>
        </div>
      </div>
    )}

      {/* Module Navigation Bar */}
      {!isFocusMode && (
        <div className="h-14 bg-white border-b border-black/5 flex items-center px-6 justify-between shrink-0 z-[100]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-system-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-system-accent/20">
                <Camera size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter leading-none">SelectPro</span>
              </div>
            </div>

            <div className="h-6 w-px bg-black/5 mx-2" />

            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
              <button 
                onClick={() => window.location.search = ''}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isOffline && !isMac ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
              >
                Pro
              </button>
              <button 
                onClick={() => window.location.search = '?mode=mac'}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isMac ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
              >
                Mac
              </button>
              <button 
                onClick={() => window.location.search = '?mode=offline'}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isOffline ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
              >
                Offline
              </button>
              <button 
                onClick={() => window.location.search = '?mode=light'}
                className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-system-secondary hover:text-system-text transition-all"
              >
                Light
              </button>
            </div>

            <div className="h-6 w-px bg-black/5 mx-2" />

            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
              <button 
                onClick={() => setManualMindset('auto')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${manualMindset === 'auto' ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
                title="Auto-detect Responsive Design"
              >
                Auto
              </button>
              <button 
                onClick={() => setManualMindset('mobile')}
                className={`p-1.5 rounded-lg transition-all ${manualMindset === 'mobile' ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
                title="Force Mobile View"
              >
                <Smartphone size={14} />
              </button>
              <button 
                onClick={() => setManualMindset('desktop')}
                className={`p-1.5 rounded-lg transition-all ${manualMindset === 'desktop' ? 'bg-white text-system-accent shadow-sm' : 'text-system-secondary hover:text-system-text'}`}
                title="Force Desktop View"
              >
                <Monitor size={14} />
              </button>
            </div>

            <div className="h-6 w-px bg-black/5 mx-2" />

            <div className="flex items-center gap-1">
              <button 
                onClick={undo}
                disabled={undoStack.length === 0}
                className={`p-2 rounded-lg transition-all ${undoStack.length > 0 ? 'text-system-text hover:bg-black/5' : 'text-system-secondary opacity-30 cursor-not-allowed'}`}
                title="Undo (⌘Z)"
              >
                <Undo size={16} />
              </button>
              <button 
                onClick={redo}
                disabled={redoStack.length === 0}
                className={`p-2 rounded-lg transition-all ${redoStack.length > 0 ? 'text-system-text hover:bg-black/5' : 'text-system-secondary opacity-30 cursor-not-allowed'}`}
                title="Redo (⇧⌘Z)"
              >
                <Redo size={16} />
              </button>
            </div>
            <div className="h-6 w-px bg-black/5 mx-1" />
            
            <div className="flex items-center gap-1">
              <AppMenu 
                label="Import" 
                sections={[
                  {
                    title: 'Ingest folder or file',
                    items: [
                      { label: 'Ingest folder or file...', icon: Plus, onClick: () => { setStrategy('auto-top'); setImportType('ingest'); fileInputRef.current?.click(); }, shortcut: '⌘I', description: 'Media Card to Internal Storage' },
                      { label: 'Import folder or file...', icon: Folder, onClick: () => { setStrategy('progressive'); setImportType('import'); folderInputRef.current?.click(); }, shortcut: '⌥⌘I', description: 'Hard Drive to Workspace' },
                      { label: 'Import Samples', icon: Grid, onClick: ingestTop10JPEGs, description: 'Load demo assets' },
                    ]
                  },
                  {
                    title: 'Session',
                    items: [
                      { label: 'Export Selection...', icon: Download, onClick: () => setShowExportModal(true), shortcut: '⌘E', description: 'Save selected assets' },
                      { label: 'Renaming Structure', icon: Settings, onClick: () => setShowProjectSettings(true) },
                      { label: 'Preferences...', icon: Settings2, onClick: () => setShowPreferences(true), shortcut: '⌘,' },
                      { label: 'Clear Session Cache', icon: RefreshCw, onClick: handleClearCache, variant: 'danger', description: 'Reset current workspace' },
                    ]
                  }
                ]}
              />

              <AppMenu 
                label="Edit" 
                sections={[
                  {
                    items: [
                      { label: 'Undo', icon: Undo, onClick: undo, shortcut: '⌘Z' },
                      { label: 'Redo', icon: Redo, onClick: redo, shortcut: '⇧⌘Z' },
                    ]
                  },
                  {
                    title: 'Selection',
                    items: [
                      { label: 'Select All', icon: Check, onClick: () => photos.length > 0 && setShowSelectAllConfirmModal(true), shortcut: '⌘A' },
                      { label: 'Deselect All', icon: X, onClick: () => setSelectedIds([]), shortcut: '⌘D' },
                      { label: 'Invert Selection', icon: RefreshCw, onClick: invertSelection, shortcut: '⇧⌘I' },
                    ]
                  },
                  {
                    items: [
                      { label: 'Remove Selected', icon: Trash2, onClick: () => selectedIds.length > 0 && setShowRemoveConfirmModal(true), shortcut: '⌫', variant: 'danger' },
                    ]
                  }
                ]}
              />

              {toolbarConfig.showViewModes && (
                <AppMenu 
                  label="View" 
                  sections={[
                    {
                      items: [
                        { label: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', icon: Focus, onClick: () => setIsFocusMode(!isFocusMode), shortcut: 'F' },
                        { label: showFocusPeaking ? 'Disable Peaking' : 'Enable Focus Peaking', icon: Target, onClick: () => setShowFocusPeaking(!showFocusPeaking), shortcut: 'P' },
                        { label: isImmersive ? 'Exit Zen Mode' : 'Immersive Mode (Zen)', icon: Eye, onClick: () => setIsImmersive(!isImmersive), shortcut: '⇧Z' },
                        { label: isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen', icon: Maximize2, onClick: toggleFullScreen, shortcut: 'F11' },
                      ]
                    },
                    {
                      title: 'Views',
                      items: [
                        { label: 'Dashboard', icon: Upload, onClick: () => setViewMode('import'), shortcut: '⌘1' },
                        { label: 'Library', icon: Grid, onClick: () => setViewMode('library'), shortcut: '⌘2' },
                        { label: 'Image', icon: Maximize2, onClick: () => setViewMode('image'), shortcut: '⌘3' },
                        { label: 'Compare', icon: Columns, onClick: () => setViewMode('compare'), shortcut: '⌘C' },
                        { label: '9 Shot', icon: LayoutGrid, onClick: () => setViewMode('nineShot'), shortcut: '⌘4' },
                      ]
                    },
                    {
                      title: 'Panels',
                      items: [
                        { label: (leftSidebarCollapsed || isImmersive) ? 'Show Left Sidebar' : 'Hide Left Sidebar', icon: Columns, onClick: () => setLeftSidebarCollapsed(!leftSidebarCollapsed), shortcut: '⌘[' },
                        { label: (rightSidebarCollapsed || isImmersive) ? 'Show Right Sidebar' : 'Hide Right Sidebar', icon: Columns, onClick: () => setRightSidebarCollapsed(!rightSidebarCollapsed), shortcut: '⌘]' },
                        { label: showCameraDataPanel ? 'Hide Camera Data' : 'Show Camera Data', icon: Camera, onClick: () => setShowCameraDataPanel(!showCameraDataPanel), shortcut: 'I' },
                        { label: showPinline ? 'Hide Narrow Pinline' : 'Show Narrow Pinline', icon: Square, onClick: () => setShowPinline(!showPinline) },
                      ]
                    }
                  ]}
                />
              )}

              {toolbarConfig.showSelection && (
                <AppMenu 
                  label="Select" 
                  sections={[
                    {
                      title: 'Sort Order',
                      items: [
                        { label: 'Default Order', icon: Grid, onClick: () => setSortOption('default') },
                        { label: 'Capture Time', icon: Calendar, onClick: () => setSortOption('capture-time') },
                        { label: 'Camera Serial', icon: Hash, onClick: () => setSortOption('serial') },
                        { label: 'Filename', icon: FileText, onClick: () => setSortOption('filename') },
                        { label: 'Modification Time', icon: History, onClick: () => setSortOption('modification-time') },
                        { label: 'Rating', icon: Star, onClick: () => setSortOption('rating') },
                        { label: 'File Type', icon: FileJson, onClick: () => setSortOption('type') },
                        { label: 'Custom Order', icon: MousePointer2, onClick: () => setSortOption('custom') },
                      ]
                    }
                  ]}
                />
              )}

              {viewMode === 'image' && (
                <AppMenu 
                  label="Processing" 
                  sections={[
                    {
                      title: 'AI Enhancements',
                      items: [
                        { 
                          label: processingSettings.skinRetouch ? 'Disable Skin Retouch' : 'Enable Skin Retouch', 
                          icon: Wand2, 
                          onClick: () => setProcessingSettings(prev => ({ ...prev, skinRetouch: !prev.skinRetouch })),
                          description: 'AI-driven texture smoothing'
                        },
                        { 
                          label: processingSettings.aiDenoise ? 'Disable AI Denoise' : 'Enable AI Denoise', 
                          icon: Sparkles, 
                          onClick: () => setProcessingSettings(prev => ({ ...prev, aiDenoise: !prev.aiDenoise })),
                          description: 'Neural noise reduction'
                        },
                      ]
                    },
                    {
                      title: 'Professional Tools',
                      items: [
                        { 
                          label: showCropTool ? 'Hide Crop Overlay' : 'Show Crop Overlay', 
                          icon: Maximize2, 
                          onClick: () => setShowCropTool(prev => !prev),
                          description: 'Composition guide overlay'
                        },
                        { 
                          label: processingSettings.frequencySeparation ? 'Disable Freq. Separation' : 'Enable Freq. Separation', 
                          icon: Layers, 
                          onClick: () => setProcessingSettings(prev => ({ ...prev, frequencySeparation: !prev.frequencySeparation }))
                        },
                        { 
                          label: processingSettings.dodgeAndBurn ? 'Disable Dodge & Burn' : 'Enable Dodge & Burn', 
                          icon: Palette, 
                          onClick: () => setProcessingSettings(prev => ({ ...prev, dodgeAndBurn: !prev.dodgeAndBurn }))
                        },
                        { 
                          label: processingSettings.filmicCurve.enabled ? 'Disable Filmic Curve' : 'Enable Filmic Curve', 
                          icon: Activity, 
                          onClick: () => setProcessingSettings(prev => ({ ...prev, filmicCurve: { ...prev.filmicCurve, enabled: !prev.filmicCurve.enabled } }))
                        },
                      ]
                    },
                    {
                      items: [
                        { 
                          label: 'Reset All Processing', 
                          icon: RefreshCw, 
                          onClick: () => setProcessingSettings({
                            skinRetouch: false,
                            retouchIntensity: 0,
                            dynamicRange: 0,
                            texture: 0,
                            clarity: 0,
                            aiDenoise: false,
                            frequencySeparation: false,
                            dodgeAndBurn: false,
                            dodgeIntensity: 0,
                            burnIntensity: 0,
                            highlightReduction: 0,
                            retouchTone: 'natural',
                            filmicCurve: {
                              enabled: false,
                              toe: 0,
                              shoulder: 0,
                              slope: 0,
                              blackPoint: 0,
                              whitePoint: 0
                            }
                          }),
                          variant: 'danger'
                        },
                      ]
                    }
                  ]}
                />
              )}

              {toolbarConfig.showSelection && (
                <AppMenu 
                  label="Selection" 
                  sections={[
                    {
                      title: 'Orientation',
                      items: [
                        { label: 'Select Vertical', icon: Monitor, onClick: () => selectByOrientation('portrait') },
                        { label: 'Select Horizontal', icon: Monitor, onClick: () => selectByOrientation('landscape') },
                      ]
                    },
                    {
                      title: 'Tags',
                      items: [
                        { label: 'Select Red', icon: Tag, onClick: () => selectByColor('red'), shortcut: '⌥6' },
                        { label: 'Select Yellow', icon: Tag, onClick: () => selectByColor('yellow'), shortcut: '⌥7' },
                        { label: 'Select Green', icon: Tag, onClick: () => selectByColor('green'), shortcut: '⌥8' },
                        { label: 'Select Blue', icon: Tag, onClick: () => selectByColor('blue'), shortcut: '⌥9' },
                      ]
                    }
                  ]}
                />
              )}

              <AppMenu 
                label="Help" 
                sections={[
                  {
                    title: 'Resources',
                    items: [
                      { 
                        label: 'Download Prompt Template', 
                        icon: Download, 
                        onClick: () => {
                          const link = document.createElement('a');
                          link.href = '/prompts/select-v1.txt';
                          link.download = 'select-v1.txt';
                          link.click();
                        },
                        description: 'Save AI prompt for local use'
                      },
                      { label: 'Keyboard Shortcuts', icon: Keyboard, onClick: () => setShowKeyboardSettings(true), shortcut: '?' },
                      { label: 'About SelectPro', icon: Info, onClick: () => setShowOnboarding(true) },
                    ]
                  }
                ]}
              />

              {isAiEnabled && toolbarConfig.showStrategy && (
                <AppMenu 
                  label="AI" 
                  sections={[
                    {
                      title: 'Analysis',
                      items: [
                        { label: 'SelectPro Scan (Gemini)', icon: Sparkles, onClick: startAnalysis, description: 'Full technical & aesthetic audit' },
                        { label: 'AI Object Recognition', icon: Brain, onClick: () => autoTagPhotos(selectedIds.length > 0 ? selectedIds : photos.map(p => p.id)), description: 'Identify and tag objects, landmarks, and key elements' },
                        { label: 'Auto-Select+/-', icon: Target, onClick: autoSelect, shortcut: '⇧X', description: 'Apply active select rules' },
                        { label: 'Professional Review', icon: Award, onClick: runProfessionalReview, shortcut: '⌘R', description: 'AI Professional Quality Analysis' },
                        { label: 'Compare Selection', icon: Layers, onClick: runSequenceComparison, shortcut: '⌘⇧R', description: 'Identify best keepers in sequence' },
                        { label: `Auto-Tagging: ${autoTagging ? 'ON' : 'OFF'}`, icon: Tag, onClick: () => setAutoTagging(!autoTagging), description: 'Toggle immediate tagging' },
                        { label: 'Auto-Tag Selected', icon: Tag, onClick: () => runAutoTagging(selectedIds), description: 'Run tagging on selection' },
                        { label: 'Neutralize AI', icon: RefreshCw, onClick: () => neutralizeAI(selectedIds.length > 0 ? selectedIds : photos.map(p => p.id)), description: 'Reset AI metadata', variant: 'danger' },
                      ]
                    },
                    {
                      title: 'Tools',
                      items: [
                        { label: 'Identify People', icon: Users, onClick: identifyPeople },
                        { label: 'Local Sharpness Check', icon: Target, onClick: scoreFocus, description: 'Browser-based Laplacian variance' },
                        { label: 'AI Blink Check', icon: Eye, onClick: runBlinkCheck, description: 'Detect closed eyes' },
                      ]
                    },
                    {
                      title: 'Configuration',
                      items: [
                        { label: 'AI Analysis Settings...', icon: Settings, onClick: () => setShowAiSettings(true), description: 'Fine-tune AI intelligence parameters' },
                        { label: 'Custom Selection Rules...', icon: Filter, onClick: () => { setActivePreferenceTab('selection'); setShowPreferences(true); }, description: 'Define pass/fail thresholds' },
                      ]
                    }
                  ]}
                />
              )}
            </div>

            <div className="h-6 w-px bg-black/5 mx-1" />
            
            {toolbarConfig.showStrategy && (
              <div className="flex items-center bg-black/5 rounded-lg p-1 gap-1 border border-black/5">
                {(['P', 'A', 'S', 'M'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectionMode(mode)}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-black transition-all ${
                      selectionMode === mode 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                    title={
                      mode === 'M' ? 'Manual: Full manual selection' :
                      mode === 'S' ? 'Shutter: Priorities highest shutter speed selection, add computational enhancement for ie highest priority, for 1/8000th, lowest 30 seconds' :
                      mode === 'A' ? 'Aperture: Emphasis on largest aperture f1.0/f1.2 Lowest f45' :
                      'Program: Automatic thinking emphasis on 1/250th flash considerations social photography'
                    }
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {/* Top N Toggle */}
            {toolbarConfig.showStrategy && (
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-black/10">
                <span className="text-[8px] font-black uppercase tracking-widest text-system-secondary">
                  {aiAnalysisSettings.shotCount === 1 ? 'Hero' : `Top ${aiAnalysisSettings.shotCount || 9}`}
                </span>
                <button 
                  onClick={() => {
                    if (!isTop9Active && !isReviewing) runTop9Analysis();
                    setIsTop9Active(!isTop9Active);
                  }}
                  disabled={isReviewing || !isTop9ModelLoaded}
                  className={`relative w-7 h-3.5 rounded-full transition-all ${isTop9Active ? 'bg-system-accent shadow-[0_0_8px_var(--color-system-accent)]' : 'bg-black/20'} ${isReviewing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  title={`${aiAnalysisSettings.shotCount === 1 ? 'Hero Shot' : `Top ${aiAnalysisSettings.shotCount || 9}`} Curation`}
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isTop9Active ? 'left-4' : 'left-0.5'} ${isReviewing ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            )}

            {/* AI Provider Toggle */}
            {toolbarConfig.showAiProvider && (
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-black/10">
                <span className="text-[8px] font-black uppercase tracking-widest text-system-secondary">AI Provider</span>
                <div className="flex items-center bg-black/5 rounded-lg p-0.5 gap-0.5 border border-black/5">
                  <button
                    onClick={() => setAiProvider('auto')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                      aiProvider === 'auto' 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    AUTO
                  </button>
                  <button
                    onClick={() => setAiProvider('gemini')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                      aiProvider === 'gemini' 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    GEMINI
                  </button>
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                      aiProvider === 'openai' 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    OPENAI
                  </button>
                  <button
                    onClick={() => setAiProvider('hybrid')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                      aiProvider === 'hybrid' 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    HYBRID
                  </button>
                  <button
                    onClick={() => setAiProvider('local')}
                    className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${
                      aiProvider === 'local' 
                        ? 'bg-white text-system-accent shadow-sm' 
                        : 'text-system-secondary hover:bg-white/50'
                    }`}
                  >
                    LOCAL
                  </button>
                </div>
              </div>
            )}

            {/* Tethered Toggle */}
            {toolbarConfig.showTethered && (
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-black/10">
                <span className="text-[8px] font-black uppercase tracking-widest text-system-secondary">Tethered</span>
                <button 
                  onClick={() => setIsTethered(!isTethered)}
                  className={`relative w-7 h-3.5 rounded-full transition-all ${isTethered ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-black/20'}`}
                  title="Tethered Capture Mode"
                >
                  <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isTethered ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            )}

            {/* Thumbnail Sizing Slider */}
            <div className="flex items-center gap-2 ml-1 pl-2 border-l border-black/10 group">
              <Minimize2 size={10} className="text-system-secondary group-hover:text-system-accent transition-colors" />
              <input 
                type="range" 
                min="80" 
                max="300" 
                value={thumbnailMinSize} 
                onChange={(e) => setThumbnailMinSize(parseInt(e.target.value))}
                className="w-16 h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-system-accent hover:bg-black/20 transition-all"
                title="Thumbnail Size"
              />
              <Maximize2 size={10} className="text-system-secondary group-hover:text-system-accent transition-colors" />
            </div>

            <div className="h-6 w-px bg-black/5 mx-1" />
            
            {viewMode === 'image' && selectedPhoto && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-lg border border-black/5 animate-in fade-in slide-in-from-left-2">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black/30 leading-none mb-0.5">Dimensions</span>
                    <span className="text-[10px] font-mono font-bold text-black/70 leading-none">
                      {selectedPhoto.metadata.width} × {selectedPhoto.metadata.height}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black/30 leading-none mb-0.5">Proportions</span>
                    <span className="text-[10px] font-mono font-bold text-black/70 leading-none">
                      {selectedPhoto.metadata.width && selectedPhoto.metadata.height ? (selectedPhoto.metadata.width / selectedPhoto.metadata.height).toFixed(2) : '0.00'}:1
                    </span>
                  </div>
                  <div className="w-px h-4 bg-black/10 mx-1" />
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-black/30 leading-none mb-0.5">Source</span>
                    <span className="text-[10px] font-mono font-bold text-black/70 leading-none truncate max-w-[120px]" title={selectedPhoto.file?.name || selectedPhoto.id}>
                      {selectedPhoto.file?.name || selectedPhoto.id}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCropTool(!showCropTool)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm ${showCropTool ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/5 text-system-secondary hover:text-system-text'}`}
                  title="Toggle Crop & Composition Guides"
                >
                  <Maximize2 size={14} />
                  {showCropTool ? 'Hide Crop' : 'Crop Overlay'}
                </button>

                <button 
                  onClick={() => autoTagPhotos([selectedPhoto.id])}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black/5 border border-black/5 text-system-secondary hover:text-system-text rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm"
                  title="AI Object Recognition"
                >
                  <Box size={14} />
                  Identify Objects
                </button>
              </div>
            )}

            {toolbarConfig.showViewModes && (
              <ModuleSwitcher currentMode={viewMode} onModeChange={setViewMode} hasPhotos={photos.length > 0} />
            )}
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-system-secondary" />
               <input 
                 type="text" 
                 placeholder="Search photos..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-black/5 border-none rounded-full pl-9 pr-4 py-1.5 text-[11px] w-48 focus:ring-1 focus:ring-system-accent transition-all"
               />
             </div>
             <div className="flex items-center gap-2">
               {photos.length === 0 && (
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="flex items-center gap-2 px-4 py-1.5 bg-system-accent text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-system-accent/20"
                 >
                   <Upload size={14} />
                   Import
                 </button>
               )}
               <button 
                 onClick={() => setShowPreferences(true)}
                 className="p-2 hover:bg-black/5 rounded-lg transition-all text-system-secondary hover:text-system-text"
                 title="Preferences"
               >
                 <Settings size={18} />
               </button>
               <div className="w-8 h-8 rounded-full bg-black/5 border border-black/5 flex items-center justify-center text-system-secondary hover:text-system-text cursor-pointer transition-all">
                 <User size={16} />
               </div>
             </div>
          </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="opacity-0 absolute pointer-events-none" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      <input 
        type="file" 
        ref={folderInputRef} 
        className="opacity-0 absolute pointer-events-none" 
        {...{ webkitdirectory: "", directory: "" } as any} 
        multiple 
        onChange={(e) => e.target.files && handleFiles(e.target.files)} 
      />

      {duplicateWarning && (
        <div className="bg-system-highlight/10 border-b border-system-highlight/20 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-system-highlight/20 flex items-center justify-center text-system-highlight">
              <Copy size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-system-highlight">Duplicate Catcher: {duplicateWarning.count} files skipped</p>
              <p className="text-[10px] text-system-secondary">The same card or files were ingested twice. Duplicates have been automatically filtered.</p>
            </div>
          </div>
          <button onClick={() => setDuplicateWarning(null)} className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlays */}
        <AnimatePresence>
          {(!leftSidebarCollapsed || !rightSidebarCollapsed) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLeftSidebarCollapsed(true);
                setRightSidebarCollapsed(true);
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar - Folders - Hidden on Mobile unless explicitly opened */}
        <aside className={`border-r border-black/5 bg-white flex flex-col shrink-0 transition-all duration-500 ease-in-out z-[100] ${isFocusMode || leftSidebarCollapsed || isImmersive || (effectiveMindset === 'mobile' || effectiveMindset === 'tablet') ? 'w-0 opacity-0 -translate-x-full' : 'fixed inset-y-0 left-0 w-64 lg:relative lg:w-56 opacity-100 translate-x-0 shadow-2xl lg:shadow-none'}`}>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setLeftSidebarCollapsed(true)}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full"
          >
            <X size={20} />
          </button>
          <div className="p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search ingest..." className="w-full bg-system-bg border border-black/5 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-black/20" />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 space-y-1">
            <p className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">Library</p>

            {filmStripPosition === 'left' && (
              <div className="space-y-1 mb-6">
                <p className="px-3 py-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">Film Strip</p>
                <div className="grid grid-cols-2 gap-1 px-1">
                  {photos.map(photo => (
                    <button 
                      key={photo.id}
                      onClick={(e) => handlePhotoClick(photo.id, e)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all bg-black/40 flex items-center justify-center ${selectedIds.includes(photo.id) ? (selectionFrameColor === 'cyan' ? 'border-system-accent scale-105 z-10' : 'border-system-highlight scale-105 z-10') : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ 
                        aspectRatio: photo.metadata.width && photo.metadata.height 
                          ? `${photo.metadata.width} / ${photo.metadata.height}` 
                          : '3 / 2' 
                      }}
                    >
                      <img 
                        src={photo.preview} 
                        className="w-full h-full object-contain"
                        alt="Filmstrip" 
                        referrerPolicy="no-referrer" 
                      />
                      {selectedIds.includes(photo.id) && (
                        <div className="absolute top-0 inset-x-0 h-0.5 bg-system-highlight z-20" />
                      )}
                      <div className="absolute bottom-1 left-1 flex gap-0.5">
                        {photo.rating > 0 && <div className="bg-black/60 text-[7px] font-bold px-1 rounded-sm text-white">{photo.rating}</div>}
                        {photo.colorTag && <div className={`w-1.5 h-1.5 rounded-full ${COLOR_TAGS.find(c => c.id === photo.colorTag)?.color}`} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="h-4" />
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Filepath</p>
            </div>
            <div className="grid grid-cols-2 gap-2 px-2">
              <div className="bg-black/5 p-2 rounded border border-black/5 min-w-0">
                <p className="text-[8px] uppercase text-white/30 mb-1">Folder</p>
                <p className="text-[10px] font-mono truncate text-system-text" title="/Volumes/SD_CARD/DCIM/100SONY">
                  {selectedPhoto ? `/Volumes/SD_CARD/DCIM/100SONY` : 'No selection'}
                </p>
              </div>
              <div className="bg-black/5 p-2 rounded border border-black/5 min-w-0">
                <p className="text-[8px] uppercase text-white/30 mb-1">Filename</p>
                <p className="text-[10px] font-mono truncate text-system-text" title={selectedPhoto?.file?.name || selectedPhoto?.id}>
                  {selectedPhoto ? (selectedPhoto.file?.name || selectedPhoto.id) : 'No selection'}
                </p>
              </div>
            </div>

            <div className="h-6" />
            {/* Ingest Locations hidden from side view as requested */}
          </nav>
        </aside>

          {/* Left Sidebar Toggle Button */}
          {!isFocusMode && (
            <button 
              onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-50 p-1 bg-white border border-black/10 rounded-r-lg text-system-secondary hover:text-system-text transition-all ${leftSidebarCollapsed ? 'translate-x-0' : 'translate-x-64 md:translate-x-56'}`}
            >
              {leftSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-system-bg overflow-hidden relative">
          {isFocusMode && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />
          )}
          {isFocusMode && (
            <button 
              onClick={() => setIsFocusMode(false)}
              className="absolute top-4 left-4 z-[100] px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center gap-2"
            >
              <Minimize2 size={12} />
              Exit Focus
            </button>
          )}

          <div ref={mainContentRef} className="flex-1 overflow-hidden relative">
            {viewMode === 'import' ? (
              <div className="h-full w-full overflow-auto p-4 custom-scrollbar">
                <DashboardView photos={photos} onImport={() => fileInputRef.current?.click()} isCacheReady={isCacheReady} isLowPowerMode={isLowPowerMode} />
              </div>
            ) : viewMode === 'library' ? (
              <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar">
                {/* Recent Imports Section with Relief Effect */}
                {photos.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-system-accent rounded-full" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-system-secondary">Recent Imports</h3>
                      </div>
                      <button className="text-[9px] font-black text-system-accent/60 hover:text-system-accent uppercase tracking-widest transition-colors">View All History</button>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar px-2">
                      {photos.slice(-8).reverse().map((photo) => (
                        <div key={photo.id} className="min-w-[220px] max-w-[220px]">
                          <ContactSheetItem 
                            photo={photo}
                            selected={selectedIds.includes(photo.id)}
                            selectionColor={selectionFrameColor}
                            visibleBadges={visibleBadges}
                            onClick={(e) => handlePhotoClick(photo.id, e)}
                            onDoubleClick={() => { setSelectedIds([photo.id]); setViewMode('image'); }}
                            onTagChange={handleUpdatePhotoTag}
                            showAiAnalysis={showAiAnalysis}
                            isLowPowerMode={isLowPowerMode}
                            isMobile={effectiveMindset === 'mobile' || effectiveMindset === 'tablet'}
                            layout="below"
                            isRelief={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-system-accent">Library View</h2>
                    {selectedIds.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-1 bg-system-accent/10 border border-system-accent/20 rounded-full"
                      >
                        <span className="text-[10px] font-black text-system-accent uppercase tracking-widest">
                          {selectedIds.length} {selectedIds.length === 1 ? 'Photo' : 'Photos'} Selected
                        </span>
                        <div className="w-px h-3 bg-system-accent/20 mx-1" />
                        <button 
                          onClick={invertSelection}
                          className="text-[9px] font-bold text-system-accent/60 hover:text-system-accent transition-colors uppercase tracking-widest"
                        >
                          Invert
                        </button>
                        <button 
                          onClick={() => setSelectedIds([])}
                          className="text-[9px] font-bold text-system-accent/60 hover:text-system-accent transition-colors uppercase tracking-widest"
                        >
                          Clear
                        </button>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40">Overview of all photos in the session</p>
                </div>
                <div className="flex-1 min-h-[500px]">
                  <VirtualContactSheet 
                    images={filteredPhotos}
                    selectedIds={selectedIds}
                    selectionFrameColor={selectionFrameColor}
                    handlePhotoClick={handlePhotoClick}
                    setViewMode={setViewMode}
                    setSelectedIds={setSelectedIds}
                    containerWidth={containerDimensions.width}
                    containerHeight={containerDimensions.height - 200} // Adjust for header and recent imports
                    thumbnailMinSize={thumbnailMinSize}
                    thumbnailMaxSize={thumbnailMaxSize}
                    rowPadding={rowPadding}
                    onTagChange={handleUpdatePhotoTag}
                    showAiAnalysis={showAiAnalysis}
                    isLowPowerMode={isLowPowerMode}
                    isMobile={effectiveMindset === 'mobile' || effectiveMindset === 'tablet'}
                  />
                </div>
              </div>
            ) : viewMode === 'nineShot' ? (
              <NineShotView 
                photos={photos} 
                selectedIds={selectedIds} 
                onPhotoClick={(id) => {
                  setSelectedIds([id]);
                  setViewMode('image');
                }} 
                onMagicSelect={runTop9Analysis}
                isAnalyzing={isReviewing}
                isModelLoaded={isTop9ModelLoaded}
                loadingMsg={top9LoadingMsg}
                onTagChange={handleUpdatePhotoTag}
                aiAnalysisSettings={aiAnalysisSettings}
                showAiAnalysis={showAiAnalysis}
                visibleBadges={visibleBadges}
              />
            ) : viewMode === 'compare' ? (
              <CompareView 
                photos={photos}
                selectedIds={selectedIds}
                onPickWinner={(id: string) => {
                  setSelectedIds([id]);
                  setViewMode('image');
                }}
                onReject={(id: string) => {
                  setPhotos(prev => prev.map(p => p.id === id ? { ...p, isRejected: true, manualRejected: true, rating: 0 } : p));
                  // If we rejected one of the two, we might want to stay in compare with others or go back?
                  // For "Compare 2" fast mode, if one is rejected, the other is the winner.
                  const otherId = selectedIds.find(sid => sid !== id);
                  if (otherId) {
                    setSelectedIds([otherId]);
                    setViewMode('image');
                  }
                }}
                onUpdateRating={updateRating}
                onUpdateColor={updateColor}
                showAiAnalysis={showAiAnalysis}
                visibleBadges={visibleBadges}
              />
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-system-accent">SelectPro View</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] text-white/40 italic">Cmd + +/- to zoom, Cmd + 0 to reset</p>
                    {zoomLevel > 1 && (
                      <button 
                        onClick={() => setZoomLevel(1)}
                        className="px-2 py-0.5 bg-system-accent/10 text-system-accent text-[8px] font-bold rounded border border-system-accent/20 hover:bg-system-accent/20 transition-all"
                      >
                        RESET ZOOM
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
                  {selectedPhoto ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
                    <div 
                      className="relative group transition-all duration-300 ease-out cursor-zoom-in flex items-center justify-center"
                      style={{ 
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        aspectRatio: selectedPhoto.metadata.width && selectedPhoto.metadata.height 
                          ? `${selectedPhoto.metadata.width} / ${selectedPhoto.metadata.height}` 
                          : '3 / 2',
                        width: selectedPhoto.metadata.width && selectedPhoto.metadata.height 
                          ? (selectedPhoto.metadata.width >= selectedPhoto.metadata.height ? '100%' : 'auto')
                          : '100%',
                        height: selectedPhoto.metadata.width && selectedPhoto.metadata.height 
                          ? (selectedPhoto.metadata.width >= selectedPhoto.metadata.height ? 'auto' : '100%')
                          : 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }}
                      onClick={handleZoomToggle}
                      onMouseMove={handleMouseMove}
                    >
                      <AspectImage 
                        src={selectedPhoto.preview} 
                        mode="full"
                        alt="Preview"
                        className={`shadow-2xl rounded-sm transition-all duration-500 ${isHighResLoading ? 'blur-md opacity-50' : 'blur-0 opacity-100'}`} 
                        style={{
                          filter: `
                            brightness(${1 + (processingSettings.dynamicRange / 200) + (processingSettings.dodgeAndBurn ? processingSettings.dodgeIntensity / 500 : 0)}) 
                            contrast(${1 + (processingSettings.clarity / 200) - (processingSettings.dodgeAndBurn ? processingSettings.burnIntensity / 500 : 0)})
                            saturate(${1 + (processingSettings.texture / 300)})
                            blur(${processingSettings.skinRetouch ? (processingSettings.retouchIntensity / 150) : 0}px)
                            url(#ai-photo-enhance)
                            ${processingSettings.aiDenoise ? 'contrast(1.02) brightness(1.01)' : ''}
                            ${isHighResLoading ? 'blur(20px)' : ''}
                          `
                        }}
                      />
                      
                      {/* Focus Peaking Overlay */}
                      {showFocusPeaking && selectedPhoto.result && (
                        <AspectImage 
                          src={selectedPhoto.preview} 
                          mode="full"
                          alt="Focus Peaking"
                          className="absolute inset-0 pointer-events-none mix-blend-screen z-20" 
                          style={{
                            filter: `url(#focus-peaking-${selectedPhoto.result.scores.focus < 60 ? 'red' : 'green'})`
                          }}
                        />
                      )}
                      
                      {/* Eye-tracking / Focus Detection Overlays */}
                      {(selectedPhoto.metadata.recognizedPeople || selectedPhoto.result?.people || selectedPhoto.result?.faces)?.map((person: any, idx: number) => {
                        if (!person.boundingBox) return null;
                        const { ymin, xmin, ymax, xmax } = person.boundingBox;
                        // Gemini returns 0-1000
                        const top = ymin / 10;
                        const left = xmin / 10;
                        const width = (xmax - xmin) / 10;
                        const height = (ymax - ymin) / 10;

                        return (
                          <div 
                            key={idx}
                            className="absolute border-2 border-system-accent/60 pointer-events-none z-10 rounded-sm"
                            style={{
                              top: `${top}%`,
                              left: `${left}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.5)'
                            }}
                          >
                            <div className="absolute -top-5 left-0 bg-system-accent/80 text-white text-[8px] font-bold px-1 rounded-sm whitespace-nowrap">
                              {person.name || person.emotion || 'Person'} {Math.round(person.confidence * 100)}%
                            </div>
                            
                            {/* Corner Accents */}
                            <div className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-system-accent" />
                            <div className="absolute -top-px -right-px w-2 h-2 border-t-2 border-r-2 border-system-accent" />
                            <div className="absolute -bottom-px -left-px w-2 h-2 border-b-2 border-l-2 border-system-accent" />
                            <div className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-system-accent" />
                          </div>
                        );
                      })}

                      {/* Focus Detection Overlay */}
                      {selectedPhoto.result?.rejectType === 1 && (
                        <div className="absolute inset-0 border-4 border-emerald-500/30 pointer-events-none z-20 animate-pulse flex items-center justify-center">
                          <div className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">
                            Focus Warning Detected
                          </div>
                        </div>
                      )}
                      {/* Zoom Indicator */}
                      {zoomLevel > 1 && (
                        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full text-[10px] font-bold text-system-accent border border-system-accent/30 z-50">
                          {Math.round(zoomLevel * 100)}% ZOOM
                        </div>
                      )}
                      {/* Focus Peaking Simulation */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        {selectedPhoto.result && selectedPhoto.status === 'completed' && (
                          <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            SELECT PRO
                          </div>
                        )}
                        <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-system-accent border border-system-accent/30 uppercase">
                          {cacheSettings.previewMode === 'camera-previews' ? 'Camera Preview' : 'Rendered'}
                        </div>
                        {selectedPhoto.result?.scores.focus > 90 && (
                          <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-system-accent border border-system-accent/30">
                            SHARP
                          </div>
                        )}
                      </div>

                      {/* Crop & Composition Overlay */}
                      {showCropTool && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                          <div 
                            className="h-full border border-white/20 shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-300"
                            style={{ 
                              aspectRatio: cropPreset.includes(':') 
                                ? cropPreset.replace(':', '/') 
                                : '1/1' 
                            }}
                          >
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-[9px] font-black text-white/90 rounded-lg uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                              {cropPreset} {cropOverlay !== 'none' && `• ${cropOverlay.toUpperCase()}`}
                            </div>
                            
                            {/* Overlay Guides */}
                            {cropOverlay === 'thirds' && (
                              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                <div className="border-r border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-r border-b border-white/30" />
                                <div className="border-b border-white/30" />
                                <div className="border-r border-white/30" />
                                <div className="border-r border-white/30" />
                                <div />
                              </div>
                            )}

                            {cropOverlay === 'golden' && (
                              <div className="absolute inset-0">
                                <div className="absolute top-[38.2%] left-0 right-0 h-px bg-white/30" />
                                <div className="absolute top-[61.8%] left-0 right-0 h-px bg-white/30" />
                                <div className="absolute left-[38.2%] top-0 bottom-0 w-px bg-white/30" />
                                <div className="absolute left-[61.8%] top-0 bottom-0 w-px bg-white/30" />
                              </div>
                            )}

                            {cropOverlay === 'diagonal' && (
                              <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
                                <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" />
                              </svg>
                            )}

                            {cropOverlay === 'grid' && (
                              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20">
                                {Array.from({ length: 36 }).map((_, i) => (
                                  <div key={i} className="border-[0.5px] border-white/40" />
                                ))}
                              </div>
                            )}

                            {cropOverlay === 'square' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full aspect-square border border-white/30" />
                              </div>
                            )}

                            {cropOverlay === 'diagonal+square' && (
                              <div className="absolute inset-0">
                                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
                                  <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-full aspect-square border border-white/30 opacity-30" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Image Score Tag Overlay */}
                      <ImageScoreTag 
                        tag={{
                          imageId: selectedPhoto.id,
                          stars: (selectedPhoto.rating || 0) as StarRating,
                          flag: (selectedPhoto.colorTag || 'none') as FlagColor,
                          pick: selectedPhoto.metadata.aiFlag === 'primary',
                          reject: !!(selectedPhoto.manualRejected || selectedPhoto.isRejected),
                          top9: !!selectedPhoto.top9Score?.isTopCandidate,
                          top9Score: selectedPhoto.top9Score?.totalScore
                        }}
                        onChange={handleUpdatePhotoTag}
                      />
                    </div>
                    {/* Narrative Select Style Overlays */}
                    {selectedPhoto.result && showAiAnalysis && (
                      <div className={`absolute top-4 left-4 md:top-12 md:left-12 flex flex-col gap-2 md:gap-4 max-w-[calc(100%-2rem)] md:max-w-xs ${effectiveMindset === 'mobile' || effectiveMindset === 'tablet' ? 'opacity-80 scale-90 origin-top-left' : ''}`}>
                      <div className="bg-black/10 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-black/5 flex items-center gap-3 md:gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl font-black ${selectedPhoto.result.scores.overall > 80 ? 'bg-emerald-500 text-white' : 'bg-black/10 text-system-secondary'}`}>
                          {selectedPhoto.result.scores.overall}
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[10px] font-bold text-system-secondary uppercase tracking-widest">Overall Score</p>
                          <p className="text-xs md:text-sm font-bold text-system-text">{selectedPhoto.result.isHeroPotential ? 'Hero Potential' : 'Standard Shot'}</p>
                        </div>
                      </div>

                        {/* Face Analysis Overlay in Single View - Hidden on mobile */}
                        {selectedPhoto.result.faces && selectedPhoto.result.faces.length > 0 && !(effectiveMindset === 'mobile' || effectiveMindset === 'tablet') && (
                          <div className="bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 text-system-accent">
                              <Smile size={14} />
                              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Face Intelligence</span>
                            </div>
                            <div className="space-y-2 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-2">
                              {selectedPhoto.result.faces.map((face, i) => (
                                <div key={i} className="flex flex-col border-l-2 border-system-accent/30 pl-3 py-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-bold text-white/90">{face.gender}, {face.ageRange}</span>
                                    <span className="text-[10px] font-black text-system-accent/60">{Math.round(face.confidence * 100)}%</span>
                                  </div>
                                  <span className="text-[10px] text-system-secondary uppercase font-medium tracking-wide">{face.emotion}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-white/20 flex flex-col items-center gap-4">
                    <ImageIcon size={64} />
                    <p className="font-bold uppercase tracking-widest text-xs">No Photo Selected</p>
                  </div>
                )}
              </div>

              {/* Floating Selection Bar */}
              <AnimatePresence>
                {selectedIds.length > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className={`absolute ${effectiveMindset === 'mobile' || effectiveMindset === 'tablet' ? 'bottom-24' : 'bottom-8'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Selection</span>
                      <span className="text-sm font-black text-white tracking-tight">{selectedIds.length} Photos Selected</span>
                    </div>
                    
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={invertSelection}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/80 uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      >
                        Invert Selection
                      </button>
                      <button 
                        onClick={() => setSelectedIds([])}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

          {/* Filmstrip - Bottom */}
          {filmStripPosition === 'bottom' && (
            <div className={`border-t border-black/5 bg-white flex items-center gap-2 px-2 overflow-x-auto custom-scrollbar shrink-0 transition-all duration-500 ${isFocusMode ? 'h-0 opacity-0 translate-y-full' : 'h-20 md:h-32 opacity-100 translate-y-0'}`}>
              {photos.map(photo => (
                <button 
                  key={photo.id}
                  onClick={(e) => handlePhotoClick(photo.id, e)}
                  className={`h-16 md:h-24 shrink-0 relative rounded-sm overflow-hidden border-2 transition-all bg-black/40 flex items-center justify-center ${selectedIds.includes(photo.id) ? (selectionFrameColor === 'cyan' ? 'border-system-accent scale-105 z-10 shadow-[0_0_15px_rgba(0,122,255,0.3)]' : 'border-system-highlight scale-105 z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]') : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ 
                    aspectRatio: photo.metadata.width && photo.metadata.height 
                      ? `${photo.metadata.width} / ${photo.metadata.height}` 
                      : '3 / 2' 
                  }}
                >
                  {selectedIds.includes(photo.id) && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-system-highlight z-20 shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />
                  )}
                  <img 
                    src={photo.preview} 
                    className="w-full h-full object-contain"
                    alt="Filmstrip" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute bottom-1 left-1 flex gap-0.5">
                    {photo.rating > 0 && <div className="bg-grey-18 text-[8px] font-bold px-1 rounded-sm">{photo.rating}</div>}
                    {photo.colorTag && <div className={`w-2 h-2 rounded-full ${COLOR_TAGS.find(c => c.id === photo.colorTag)?.color}`} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar - Info & Grading */}
        <aside className={`border-l border-black/5 bg-white flex flex-col shrink-0 transition-all duration-500 ease-in-out z-[100] ${isFocusMode || rightSidebarCollapsed || isImmersive ? 'w-0 opacity-0 translate-x-full' : 'fixed inset-y-0 right-0 w-80 lg:relative lg:w-72 opacity-100 translate-x-0 shadow-2xl lg:shadow-none'}`}>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setRightSidebarCollapsed(true)}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full z-10"
          >
            <X size={20} />
          </button>

          {/* Sidebar Tabs */}
          <div className="flex border-b border-system-border p-1 shrink-0">
            {['Ingest', 'selection', 'processing', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${activeTab === tab ? 'bg-system-bg text-system-accent' : 'text-system-secondary/60 hover:text-system-text'}`}
              >
                {tab === 'selection' ? 'SelectPro' : (tab === 'insights' ? 'Insights' : tab.replace('-', ' '))}
              </button>
            ))}
          </div>

          {filmStripPosition === 'right' && (
            <div className="border-b border-black/5 p-2 bg-black/5">
              <p className="px-2 py-1 text-[9px] font-bold text-black/30 uppercase tracking-widest mb-2">Film Strip</p>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {photos.map(photo => (
                  <button 
                    key={photo.id}
                    onClick={(e) => handlePhotoClick(photo.id, e)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all bg-black/40 flex items-center justify-center ${selectedIds.includes(photo.id) ? (selectionFrameColor === 'cyan' ? 'border-system-accent scale-105 z-10' : 'border-system-highlight scale-105 z-10') : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ 
                      aspectRatio: photo.metadata.width && photo.metadata.height 
                        ? `${photo.metadata.width} / ${photo.metadata.height}` 
                        : '3 / 2' 
                    }}
                  >
                    <img 
                      src={photo.preview} 
                      className="w-full h-full object-contain"
                      alt="Filmstrip" 
                      referrerPolicy="no-referrer" 
                    />
                    {selectedIds.includes(photo.id) && (
                      <div className="absolute top-0 inset-x-0 h-0.5 bg-system-highlight z-20" />
                    )}
                    <div className="absolute bottom-1 left-1 flex gap-0.5">
                      {photo.rating > 0 && <div className="bg-black/60 text-[7px] font-bold px-1 rounded-sm text-white">{photo.rating}</div>}
                      {photo.colorTag && <div className={`w-1.5 h-1.5 rounded-full ${COLOR_TAGS.find(c => c.id === photo.colorTag)?.color}`} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'Ingest' ? (
              <div className="p-4 space-y-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-120px)]">
                {/* Camera Naming Options */}
                <div className="flex gap-1 mb-4">
                  <button 
                    onClick={() => setCameraNamingMode('serial')}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase rounded border transition-all ${cameraNamingMode === 'serial' ? 'bg-system-accent text-white border-system-accent' : 'bg-black/5 text-system-secondary border-black/10'}`}
                  >
                    Serial
                  </button>
                  <button 
                    onClick={() => setCameraNamingMode('alpha')}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase rounded border transition-all ${cameraNamingMode === 'alpha' ? 'bg-system-accent text-white border-system-accent' : 'bg-black/5 text-system-secondary border-black/10'}`}
                  >
                    Alpha
                  </button>
                  <button 
                    onClick={() => setCameraNamingMode('numeric')}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase rounded border transition-all ${cameraNamingMode === 'numeric' ? 'bg-system-accent text-white border-system-accent' : 'bg-black/5 text-system-secondary border-black/10'}`}
                  >
                    Seq
                  </button>
                </div>
                {/* Cameras Data */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Cameras Data</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setHideUnusedCameras(!hideUnusedCameras)}
                        className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border transition-all ${hideUnusedCameras ? 'bg-system-accent text-white border-system-accent' : 'text-system-secondary border-system-border hover:text-system-text'}`}
                      >
                        {hideUnusedCameras ? 'Show All' : 'Hide Unused'}
                      </button>
                      <button 
                        onClick={gangBySerial}
                        className="p-1 hover:bg-black/5 rounded text-system-accent transition-all"
                        title="Gang by Serial"
                      >
                        <Layers size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button 
                      onClick={() => setSerialFilter('all')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${serialFilter === 'all' ? 'bg-system-accent/10 text-system-accent' : 'text-system-secondary hover:bg-black/5 hover:text-system-text'}`}
                    >
                      <Camera size={14} />
                      <div className="flex-1 flex justify-between items-center">
                        <span>All Cameras</span>
                        <span className="text-[10px] opacity-40">{photos.length}</span>
                      </div>
                    </button>
                    
                    {cameraGroups.map(group => (
                      <div key={group.id} className="space-y-1">
                        <button 
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                          className="w-full flex items-center justify-between px-3 py-1 text-[9px] font-bold text-system-secondary uppercase tracking-widest hover:text-system-text transition-all"
                        >
                          <span>{group.label}</span>
                          {expandedGroups[group.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </button>
                        
                        <AnimatePresence>
                          {expandedGroups[group.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-1 pl-2"
                            >
                              {group.cameras.map(({ serial, count, model }) => (
                                <button 
                                  key={serial}
                                  onClick={() => setSerialFilter(serial)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${serialFilter === serial ? 'bg-system-accent/10 text-system-accent' : 'text-system-secondary hover:bg-black/5 hover:text-system-text'}`}
                                >
                                  <Camera size={14} />
                                  <div className="flex-1 flex justify-between items-center truncate">
                                    <div className="flex flex-col items-start truncate">
                                      <span className="truncate font-bold">{cameraNamingMap[serial] || serial}</span>
                                      <span className="text-[9px] opacity-40 truncate">{model}</span>
                                    </div>
                                    <span className="text-[10px] opacity-40 ml-2">{count}</span>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lenses & Optics */}
                <div className="space-y-4 pt-4 border-t border-system-border">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Lenses & Optics</h3>
                  <div className="space-y-3">
                    {Array.from(new Set(photos.map(p => p.metadata.lens).filter(Boolean))).map(lensName => {
                      const stats = getLensStats(lensName!);
                      const count = photos.filter(p => p.metadata.lens === lensName).length;
                      return (
                        <div key={lensName} className="p-3 bg-black/5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-system-text truncate max-w-[140px]">{lensName}</span>
                            <span className="text-[9px] font-black text-system-accent bg-system-accent/10 px-1.5 py-0.5 rounded">{count}</span>
                          </div>
                          {stats && (
                            <div className="grid grid-cols-3 gap-1">
                              <div className="flex flex-col">
                                <span className="text-[7px] uppercase font-bold opacity-40">Min</span>
                                <span className="text-[9px] font-mono font-bold">f/{stats.min}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] uppercase font-bold opacity-40">Max</span>
                                <span className="text-[9px] font-mono font-bold">f/{stats.max}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] uppercase font-bold opacity-40">Most Used</span>
                                <span className="text-[9px] font-mono font-bold">f/{stats.mostUsed}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exposure Stats */}
                <div className="space-y-4 pt-4 border-t border-system-border">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Exposure Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-black/5 rounded-xl space-y-2">
                      <span className="text-[8px] uppercase font-bold opacity-50">Shutter Range</span>
                      {getShutterStats() ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold">{getShutterStats()?.min} – {getShutterStats()?.max}</span>
                          <span className="text-[8px] opacity-40 mt-1">Most: {getShutterStats()?.mostUsed}</span>
                        </div>
                      ) : <span className="text-[10px] opacity-20">No Data</span>}
                    </div>
                    <div className="p-3 bg-black/5 rounded-xl space-y-2">
                      <span className="text-[8px] uppercase font-bold opacity-50">ISO Range</span>
                      {photos.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold">
                            {Math.min(...photos.map(p => Number(p.metadata.iso)).filter(n => !isNaN(n)))} – {Math.max(...photos.map(p => Number(p.metadata.iso)).filter(n => !isNaN(n)))}
                          </span>
                          <span className="text-[8px] opacity-40 mt-1">
                            Most: {Object.entries(photos.reduce((acc, p) => {
                              const iso = p.metadata.iso?.toString();
                              if (iso) acc[iso] = (acc[iso] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || '--'}
                          </span>
                        </div>
                      ) : <span className="text-[10px] opacity-20">No Data</span>}
                    </div>
                  </div>
                </div>

                {/* Smart Clusters */}
                <div className="space-y-4 pt-4 border-t border-system-border">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Smart Clusters</h3>
                  <div className="space-y-4">
                    {/* Focal Length Clusters */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-system-secondary/60">By Focal Length</span>
                      <div className="grid grid-cols-1 gap-1">
                        {Object.entries(clusters.byFocal).map(([fl, items]) => (
                          <div key={fl} className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setSelectedIds(items.map(p => p.id));
                                setViewMode('library');
                              }}
                              className="flex-1 flex items-center justify-between p-2 bg-black/5 rounded-lg hover:bg-system-accent/10 hover:text-system-accent transition-all text-left"
                            >
                              <span className="text-[10px] font-bold">{fl}mm</span>
                              <span className="text-[8px] opacity-40">{items.length}</span>
                            </button>
                            <button 
                              onClick={() => runTop9Analysis(items)}
                              className="p-2 bg-system-accent/10 text-system-accent rounded-lg hover:bg-system-accent hover:text-white transition-all"
                              title="Select Top 9 from Cluster"
                            >
                              <Sparkles size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio Clusters */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-system-secondary/60">By Proportions</span>
                      <div className="grid grid-cols-1 gap-1">
                        {Object.entries(clusters.byAspect).map(([ratio, items]) => (
                          <div key={ratio} className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setSelectedIds(items.map(p => p.id));
                                setViewMode('library');
                              }}
                              className="flex-1 flex items-center justify-between p-2 bg-black/5 rounded-lg hover:bg-system-accent/10 hover:text-system-accent transition-all text-left"
                            >
                              <span className="text-[10px] font-bold">{ratio}</span>
                              <span className="text-[8px] opacity-40">{items.length}</span>
                            </button>
                            <button 
                              onClick={() => runTop9Analysis(items)}
                              className="p-2 bg-system-accent/10 text-system-accent rounded-lg hover:bg-system-accent hover:text-white transition-all"
                              title="Select Top 9 from Cluster"
                            >
                              <Sparkles size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* People Clusters */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-system-secondary/60">By Content</span>
                      <div className="grid grid-cols-1 gap-1">
                        {Object.entries(clusters.byPeople).map(([label, items]) => (
                          <div key={label} className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setSelectedIds(items.map(p => p.id));
                                setViewMode('library');
                              }}
                              className="flex-1 flex items-center justify-between p-2 bg-black/5 rounded-lg hover:bg-system-accent/10 hover:text-system-accent transition-all text-left"
                            >
                              <span className="text-[10px] font-bold">{label}</span>
                              <span className="text-[8px] opacity-40">{items.length}</span>
                            </button>
                            <button 
                              onClick={() => runTop9Analysis(items)}
                              className="p-2 bg-system-accent/10 text-system-accent rounded-lg hover:bg-system-accent hover:text-white transition-all"
                              title="Select Top 9 from Cluster"
                            >
                              <Sparkles size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedPhoto ? (
              <>
                <div className="p-4 border-b border-black/5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-bold text-system-secondary opacity-50">Source Location</span>
                    <button 
                      onClick={() => {
                        // Mock opening source location
                        const fileName = selectedPhoto.file?.name || selectedPhoto.id;
                        alert(`Opening source location: /Volumes/SD_CARD/DCIM/100SONY/${fileName}`);
                      }}
                      className="w-full text-left p-2 bg-black/5 hover:bg-black/10 rounded border border-black/5 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Folder size={12} className="text-system-accent" />
                        <span className="text-[10px] font-mono text-system-secondary truncate group-hover:text-system-accent">
                          /Volumes/SD_CARD/DCIM/100SONY/{selectedPhoto.file?.name || selectedPhoto.id}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
                {activeTab === 'selection' && (
                <>
                  {/* Zoom Controls */}
                  {viewMode === 'image' && (
                    <div className="p-4 bg-system-bg/30 border-b border-system-border">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-system-secondary mb-4 flex items-center gap-2">
                        <ZoomIn size={12} /> Zoom Controls
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] font-bold text-system-secondary w-8">Fit</span>
                          <input 
                            type="range"
                            min="1"
                            max="4"
                            step="0.01"
                            value={targetZoomLevel}
                            onChange={(e) => setTargetZoomLevel(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-system-border rounded-lg appearance-none cursor-pointer accent-system-accent"
                          />
                          <span className="text-[9px] font-bold text-system-secondary w-8 text-right">{Math.round(targetZoomLevel * 100)}%</span>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setTargetZoomLevel(1)}
                            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-tighter rounded border transition-all ${targetZoomLevel === 1 ? 'bg-system-accent text-white border-system-accent' : 'bg-system-card text-system-secondary border-system-border hover:text-system-text'}`}
                          >
                            Fit
                          </button>
                          <button 
                            onClick={() => setTargetZoomLevel(2)}
                            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-tighter rounded border transition-all ${Math.abs(targetZoomLevel - 2) < 0.05 ? 'bg-system-accent text-white border-system-accent' : 'bg-system-card text-system-secondary border-system-border hover:text-system-text'}`}
                          >
                            100%
                          </button>
                          <button 
                            onClick={() => setTargetZoomLevel(4)}
                            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-tighter rounded border transition-all ${Math.abs(targetZoomLevel - 4) < 0.05 ? 'bg-system-accent text-white border-system-accent' : 'bg-system-card text-system-secondary border-system-border hover:text-system-text'}`}
                          >
                            200%
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Override Legend */}
                  <div className="p-4 bg-system-bg/50 border-b border-system-border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-system-accent mb-3 flex items-center gap-2">
                      <Zap size={12} /> Override Legend
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-system-secondary">
                        <kbd className="px-1.5 py-0.5 bg-system-card rounded border border-system-border text-system-text shadow-sm">Z</kbd>
                        <span>Zoom Toggle</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-system-secondary">
                        <kbd className="px-1.5 py-0.5 bg-system-card rounded border border-system-border text-system-text shadow-sm">X</kbd>
                        <span>Toggle AI Hide</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-system-secondary">
                        <kbd className="px-1.5 py-0.5 bg-system-card rounded border border-system-border text-system-text shadow-sm">C</kbd>
                        <span>Clear Reject</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-system-secondary">
                        <kbd className="px-1.5 py-0.5 bg-system-card rounded border border-system-border text-system-text shadow-sm">1-4</kbd>
                        <span>Manual Select+/-</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-system-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">
                        {selectedIds.length > 1 ? `Batch Grading (${selectedIds.length})` : 'Grading'}
                      </h3>
                      <button 
                        onClick={() => setShowAiRejected(!showAiRejected)}
                        className={`flex items-center gap-2 px-2 py-1 rounded border text-[8px] font-black uppercase transition-all shadow-sm ${showAiRejected ? 'bg-system-accent text-white border-system-accent' : 'bg-system-card text-system-secondary border-system-border hover:text-system-text'}`}
                      >
                        {showAiRejected ? <Eye size={10} /> : <EyeOff size={10} />}
                        {showAiRejected ? 'Excluded Visible' : 'Excluded Hidden'}
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      {/* Star Rating 1-9 */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Rating</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-system-accent">
                              {selectedIds.length > 1 
                                ? 'Set Rating' 
                                : selectedPhoto.rating > 0 ? `${selectedPhoto.rating} Stars` : 'Unrated'}
                            </span>
                            {(selectedIds.length > 1 || selectedPhoto.rating > 0) && (
                              <button 
                                onClick={() => updateRating(selectedIds.length > 1 ? selectedIds : selectedPhoto.id, 0)}
                                className="p-1 hover:bg-black/5 rounded text-system-secondary hover:text-emerald-600 transition-all"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 justify-between">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => (
                            <button 
                              key={r}
                              onClick={() => updateRating(selectedIds.length > 1 ? selectedIds : selectedPhoto.id, r)}
                              className={`group relative flex-1 h-8 rounded flex items-center justify-center transition-all ${
                                selectedIds.length === 1 && selectedPhoto.rating >= r 
                                  ? 'text-system-highlight' 
                                  : 'text-black/10 hover:text-black/30'
                              }`}
                            >
                              <Star size={14} fill={(selectedIds.length === 1 && selectedPhoto.rating >= r) ? 'currentColor' : 'none'} />
                              <span className="absolute -bottom-4 opacity-0 group-hover:opacity-100 text-[8px] font-bold transition-opacity">{r}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Tags */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          {COLOR_TAGS.map(tag => (
                            <button 
                              key={tag.id}
                              onClick={() => updateColor(selectedIds.length > 1 ? selectedIds : selectedPhoto.id, (selectedIds.length === 1 && selectedPhoto.colorTag === tag.id) ? null : tag.id)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${tag.color} ${
                                selectedIds.length === 1 && selectedPhoto.colorTag === tag.id 
                                  ? 'border-system-accent scale-110' 
                                  : 'border-transparent opacity-60 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                        <button 
                          onClick={() => {
                            if (selectedIds.length > 1) {
                              rejectSelected();
                            } else {
                              toggleReject(selectedPhoto.id);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm ${
                            (selectedIds.length === 1 && selectedPhoto.manualRejected) || (selectedIds.length > 1 && selectedIds.every(id => photos.find(p => p.id === id)?.manualRejected))
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'
                          }`}
                        >
                          <XCircle size={14} />
                          {selectedIds.length > 1 ? 'Reject All' : 'Not Selected'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary mb-3">Select+/- Options</h3>
                      <button 
                        onClick={() => setAutoAdvance(!autoAdvance)}
                        className={`w-full py-2 px-3 rounded-lg border font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-between shadow-sm ${autoAdvance ? 'bg-system-accent border-system-accent text-white' : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap size={14} />
                          Auto-Advance
                        </div>
                        {autoAdvance ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-system-border" />}
                      </button>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary mb-3">Crop & Composition</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={() => setShowCropTool(!showCropTool)}
                          className={`w-full py-2 px-3 rounded-lg border font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-between shadow-sm ${showCropTool ? 'bg-system-accent border-system-accent text-white' : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Maximize2 size={14} />
                            Crop Overlay
                          </div>
                          {showCropTool ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border border-system-border" />}
                        </button>

                        {showCropTool && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-system-secondary ml-1">Aspect Ratio</label>
                              <select 
                                value={cropPreset}
                                onChange={(e) => setCropPreset(e.target.value)}
                                className="w-full bg-black/5 border border-black/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-system-text focus:outline-none focus:border-system-accent/30"
                              >
                                <option value="1:1">1:1 (Square)</option>
                                <option value="4:5">4:5 (Portrait)</option>
                                <option value="5:7">5:7 (L-Format)</option>
                                <option value="2:3">2:3 (Classic 35mm)</option>
                                <option value="3:4">3:4 (Standard)</option>
                                <option value="9:16">9:16 (Stories/TikTok)</option>
                                <option value="16:9">16:9 (HD Wide)</option>
                                <option value="2.35:1">2.35:1 (Cinemascope)</option>
                                <option value="custom">Custom Ratio</option>
                              </select>
                            </div>

                            {cropPreset === 'custom' && (
                              <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                <input 
                                  type="number" 
                                  placeholder="W"
                                  className="w-full bg-black/5 border border-black/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-system-text focus:outline-none focus:border-system-accent/30"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const h = cropPreset.split(':')[1] || '1';
                                    setCropPreset(`${val}:${h}`);
                                  }}
                                />
                                <span className="text-system-secondary text-[10px]">:</span>
                                <input 
                                  type="number" 
                                  placeholder="H"
                                  className="w-full bg-black/5 border border-black/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-system-text focus:outline-none focus:border-system-accent/30"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const w = cropPreset.split(':')[0] || '1';
                                    setCropPreset(`${w}:${val}`);
                                  }}
                                />
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-system-secondary ml-1">Overlay Guide</label>
                              <div className="grid grid-cols-3 gap-1">
                                {(['none', 'thirds', 'golden', 'diagonal', 'grid', 'square', 'diagonal+square'] as const).map((overlay) => (
                                  <button
                                    key={overlay}
                                    onClick={() => setCropOverlay(overlay)}
                                    className={`py-1.5 rounded-md text-[7px] font-black uppercase tracking-tighter transition-all border ${
                                      cropOverlay === overlay 
                                        ? 'bg-black text-white border-black' 
                                        : 'bg-black/5 text-system-secondary border-transparent hover:bg-black/10'
                                    }`}
                                  >
                                    {overlay}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="pt-4 border-t border-black/5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary mb-3">Photo Categories</h3>
                      <div className="space-y-1">
                        <FolderItem icon={Grid} label="All Photos" count={photos.length} active={activeFolder === 'all'} onClick={() => setActiveFolder('all')} />
                        <FolderItem icon={Star} label="Hero Shots" count={photos.filter(p => p.result?.isHeroPotential).length} active={activeFolder === 'hero'} onClick={() => setActiveFolder('hero')} />
                        <FolderItem icon={Eye} label="Eyes Closed" count={photos.filter(p => p.result && p.result.scores.eyesOpen < 40).length} active={activeFolder === 'eyes-closed'} onClick={() => setActiveFolder('eyes-closed')} />
                        <FolderItem icon={Focus} label="Blurry / Out of Focus" count={photos.filter(p => p.result && p.result.scores.focus < 40).length} active={activeFolder === 'blurry'} onClick={() => setActiveFolder('blurry')} />
                        <FolderItem icon={Trash2} label="Not Selected" count={photos.filter(p => p.result?.isRejected || p.manualRejected).length} active={activeFolder === 'rejected'} onClick={() => setActiveFolder('rejected')} />
                        
                        {showProgressiveFolders && (
                          <div className="pt-2 space-y-1">
                            <p className="px-3 py-2 text-[10px] font-bold text-black/20 uppercase tracking-widest">Progressive</p>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => (
                              <FolderItem 
                                key={r} 
                                icon={Star} 
                                label={`Rating ${r}`} 
                                count={photos.filter(p => p.rating === r).length} 
                                active={activeFolder === `rating-${r}`} 
                                onClick={() => setActiveFolder(`rating-${r}`)} 
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">AI Analysis</h3>
                        <button 
                          onClick={() => setShowAiAnalysis(!showAiAnalysis)}
                          className={`p-1.5 rounded-lg border transition-all ${showAiAnalysis ? 'bg-system-accent/10 border-system-accent/20 text-system-accent' : 'bg-black/5 border-black/10 text-system-secondary hover:text-system-text'}`}
                          title={showAiAnalysis ? 'Hide AI Analysis' : 'Show AI Analysis'}
                        >
                          {showAiAnalysis ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>
                      {selectedPhoto.result && showAiAnalysis ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Metric label="Focus" value={selectedPhoto.result.scores.focus} />
                            <Metric label="Expression" value={selectedPhoto.result.scores.expression} />
                            <Metric label="Eyes" value={selectedPhoto.result.scores.eyesOpen} />
                            <Metric label="Lighting" value={selectedPhoto.result.scores.lighting} />
                          </div>
                          
                          {/* People Recognition */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                                <User size={10} /> Identify People
                              </p>
                              <div className="flex items-center gap-2">
                                <button className="p-1 hover:bg-white/10 rounded text-system-accent" title="Local API Sync">
                                  <RefreshCw size={10} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-system-secondary" />
                              <input 
                                type="text" 
                                value={identitySearch}
                                onChange={(e) => setIdentitySearch(e.target.value)}
                                placeholder="Search social handles or names..."
                                className="w-full bg-black/5 border border-black/5 rounded-xl py-2 pl-9 pr-4 text-[11px] focus:outline-none focus:border-system-accent transition-all"
                              />
                              
                              <AnimatePresence>
                                {identitySuggestions.length > 0 && identitySearch && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                  >
                                    {identitySuggestions.map((s, i) => (
                                      <button 
                                        key={i}
                                        onClick={() => {
                                          setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? {
                                            ...p,
                                            socialHandles: { ...p.socialHandles, [s.type]: s.handle }
                                          } : p));
                                          setIdentitySearch('');
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center justify-between group transition-all"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-white/80">{s.name}</span>
                                          <span className="text-[9px] text-white/30">{s.handle}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-system-accent uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{s.type}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {(selectedPhoto.metadata.recognizedPeople || selectedPhoto.result.people).length > 0 && (
                              <div className="space-y-2">
                                {(selectedPhoto.metadata.recognizedPeople || selectedPhoto.result.people).map((person: any, i: number) => (
                                  <div key={i} className="p-3 bg-system-accent/5 border border-system-accent/10 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                      <input 
                                        type="text"
                                        value={person.name}
                                        onChange={(e) => {
                                          const newName = e.target.value;
                                          setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? {
                                            ...p,
                                            metadata: {
                                              ...p.metadata,
                                              recognizedPeople: (p.metadata.recognizedPeople || p.result.people).map((per: any, idx: number) => 
                                                idx === i ? { ...per, name: newName } : per
                                              )
                                            }
                                          } : p));
                                        }}
                                        className="text-[10px] font-black text-system-accent uppercase tracking-widest bg-transparent border-none focus:outline-none w-full"
                                      />
                                      <span className="text-[8px] font-bold text-system-secondary shrink-0">{Math.round(person.confidence * 100)}% Confidence</span>
                                    </div>
                                    {person.attributes && (
                                      <div className="flex gap-2 text-[8px] text-system-accent/60 font-bold uppercase">
                                        <span>{person.attributes.gender}</span>
                                        <span>•</span>
                                        <span>{person.attributes.ageRange}</span>
                                        <span>•</span>
                                        <span>{person.attributes.emotion}</span>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <div className="relative flex-1">
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-system-accent/40">
                                          <Linkedin size={10} />
                                        </div>
                                        <input 
                                          type="text" 
                                          placeholder="LinkedIn"
                                          className="w-full bg-black/5 border border-black/5 rounded-lg py-1 pl-6 pr-2 text-[9px] focus:outline-none focus:border-system-accent/50"
                                          value={selectedPhoto.socialHandles?.linkedin || ''}
                                          onChange={(e) => {
                                            setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? {
                                              ...p,
                                              socialHandles: { ...p.socialHandles, linkedin: e.target.value }
                                            } : p));
                                          }}
                                        />
                                      </div>
                                      <div className="relative flex-1">
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-system-accent/40">
                                          <Instagram size={10} />
                                        </div>
                                        <input 
                                          type="text" 
                                          placeholder="Instagram"
                                          className="w-full bg-black/5 border border-black/5 rounded-lg py-1 pl-6 pr-2 text-[9px] focus:outline-none focus:border-system-accent/50"
                                          value={selectedPhoto.socialHandles?.instagram || ''}
                                          onChange={(e) => {
                                            setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? {
                                              ...p,
                                              socialHandles: { ...p.socialHandles, instagram: e.target.value }
                                            } : p));
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* AI Tags */}
                          {selectedPhoto.result.tags.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Tag size={10} /> AI Tags
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selectedPhoto.result.tags.map((tag, i) => (
                                  <span key={i} className="px-2 py-1 bg-black/5 text-system-secondary text-[10px] font-medium rounded-md border border-black/5">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="p-3 bg-black/5 rounded-xl border border-black/5">
                            <p className="text-[11px] text-system-secondary leading-relaxed italic">"{selectedPhoto.result.analysis}"</p>
                          </div>
                          {selectedPhoto.result.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {selectedPhoto.result.reasons.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded border border-emerald-500/20">{r}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : selectedPhoto.result ? (
                        <div className="p-8 text-center space-y-3 bg-black/5 rounded-2xl border border-dashed border-black/10">
                          <EyeOff size={24} className="mx-auto text-system-secondary opacity-20" />
                          <p className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">AI Results Hidden</p>
                          <button 
                            onClick={() => setShowAiAnalysis(true)}
                            className="text-[9px] font-black text-system-accent uppercase tracking-widest hover:underline"
                          >
                            Show Analysis
                          </button>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-3 bg-black/5 rounded-2xl border border-dashed border-black/10">
                          <Sparkles size={24} className="mx-auto text-system-secondary opacity-20" />
                          <p className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">No Analysis Available</p>
                          <button 
                            onClick={() => runTop9Analysis()}
                            className="text-[9px] font-black text-system-accent uppercase tracking-widest hover:underline"
                          >
                            Run Magic Select
                          </button>
                        </div>
                      )}
                    </section>
                    
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Keywords & Tags</h3>
                        <button 
                          onClick={() => autoTagPhotos(selectedIds.length > 0 ? selectedIds : [selectedPhoto.id])}
                          className="flex items-center gap-1 px-2 py-1 bg-system-accent/10 hover:bg-system-accent/20 text-system-accent rounded-lg transition-all border border-system-accent/20"
                          title="AI Object Recognition"
                        >
                          <Box size={10} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Object Recognition</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedPhoto.tags.map((tag, i) => (
                            <span 
                              key={i} 
                              className="group flex items-center gap-1.5 px-2.5 py-1 bg-black/5 hover:bg-black/10 border border-black/5 rounded-lg text-[10px] font-bold text-system-secondary transition-all"
                            >
                              {tag}
                              <button 
                                onClick={() => removeTag(selectedPhoto.id, tag)}
                                className="opacity-0 group-hover:opacity-100 hover:text-emerald-500 transition-all"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          {selectedPhoto.tags.length === 0 && (
                            <p className="text-[10px] text-white/20 italic">No tags added yet</p>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addTag(selectedPhoto.id, tagInput);
                                setTagInput('');
                              }
                            }}
                            placeholder="Add tag..."
                            className="w-full bg-black/5 border border-black/5 rounded-xl py-2 px-3 text-[11px] focus:outline-none focus:border-system-accent/50 transition-all pr-8"
                          />
                          <button 
                            onClick={() => {
                              addTag(selectedPhoto.id, tagInput);
                              setTagInput('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-system-accent transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary mb-3">Metadata</h3>
                      <div className="space-y-2">
                        <MetaRow label="Filename" value={selectedPhoto.file?.name || selectedPhoto.id} />
                        <MetaRow label="Size" value={selectedPhoto.file ? `${(selectedPhoto.file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'} />
                        <MetaRow label="Type" value={selectedPhoto.file?.type || 'Unknown'} />
                      </div>
                    </section>

                    <div className="pt-4 border-t border-white/10">
                      <button 
                        onClick={handleExport}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-system-accent hover:bg-system-accent/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-system-accent/20"
                      >
                        <Download size={16} />
                        Export & Rename
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'insights' && (
                <div className="h-full overflow-y-auto custom-scrollbar p-4">
                  <ShootQualityReport photos={photos} />
                </div>
              )}

              {activeTab === 'processing' && (
                <div className="p-4 space-y-6">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-system-highlight" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Low Power Mode</h3>
                      </div>
                      <button 
                        onClick={() => setIsLowPowerMode(!isLowPowerMode)}
                        className={`w-10 h-5 rounded-full relative transition-all ${isLowPowerMode ? 'bg-system-highlight' : 'bg-system-bg border border-system-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isLowPowerMode ? 'left-6' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>
                    <p className="text-[9px] text-system-secondary italic">Disables heavy UI effects and reduces AI concurrency for better performance on mobile.</p>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Wand2 size={14} className="text-system-accent" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Auto Enhance</h3>
                      </div>
                      <button 
                        onClick={() => setAutoEnhance(!autoEnhance)}
                        className={`w-10 h-5 rounded-full relative transition-all ${autoEnhance ? 'bg-system-accent' : 'bg-system-bg border border-system-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoEnhance ? 'left-6' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Filmic Curve</h3>
                      <button 
                        onClick={() => setProcessingSettings(prev => ({ 
                          ...prev, 
                          filmicCurve: { ...prev.filmicCurve, enabled: !prev.filmicCurve.enabled } 
                        }))}
                        className={`w-10 h-5 rounded-full relative transition-all ${processingSettings.filmicCurve.enabled ? 'bg-system-highlight' : 'bg-system-bg border border-system-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${processingSettings.filmicCurve.enabled ? 'left-6' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>

                    {processingSettings.filmicCurve.enabled && photos.length > 0 && selectedIds.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <React.Suspense fallback={<div className="h-32 flex items-center justify-center bg-system-bg rounded-xl border border-system-border"><Loader2 className="animate-spin text-system-accent" /></div>}>
                          <FilmicCurveEditorLazy 
                            photo={photos.find(p => p.id === selectedIds[0])}
                            settings={processingSettings.filmicCurve}
                            onChange={(s) => setProcessingSettings(prev => ({ ...prev, filmicCurve: s }))}
                          />
                        </React.Suspense>
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary">Skin Retouching</h3>
                      <button 
                        onClick={() => setProcessingSettings(prev => ({ ...prev, skinRetouch: !prev.skinRetouch }))}
                        className={`w-10 h-5 rounded-full relative transition-all ${processingSettings.skinRetouch ? 'bg-emerald-500' : 'bg-system-bg border border-system-border'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${processingSettings.skinRetouch ? 'left-6' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>
                    
                    {processingSettings.skinRetouch && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-system-secondary uppercase tracking-widest">
                            <span>Intensity</span>
                            <span>{processingSettings.retouchIntensity}%</span>
                          </div>
                          <input 
                            type="range" 
                            value={processingSettings.retouchIntensity}
                            onChange={(e) => setProcessingSettings(prev => ({ ...prev, retouchIntensity: parseInt(e.target.value) }))}
                            className="w-full accent-emerald-500 h-1 bg-system-bg rounded-full appearance-none cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setProcessingSettings(prev => ({ ...prev, frequencySeparation: !prev.frequencySeparation }))}
                            className={`p-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm ${processingSettings.frequencySeparation ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'}`}
                          >
                            Freq. Separation
                          </button>
                          <button 
                            onClick={() => setProcessingSettings(prev => ({ ...prev, dodgeAndBurn: !prev.dodgeAndBurn }))}
                            className={`p-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm ${processingSettings.dodgeAndBurn ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'}`}
                          >
                            Dodge & Burn
                          </button>
                        </div>

                        {processingSettings.dodgeAndBurn && (
                          <div className="space-y-3 p-3 bg-system-card rounded-xl border border-system-border animate-in zoom-in-95 shadow-sm">
                            <VariableSlider 
                              label="Dodge (Highlights)" 
                              value={processingSettings.dodgeIntensity} 
                              onChange={(v) => setProcessingSettings(prev => ({ ...prev, dodgeIntensity: v }))} 
                            />
                            <VariableSlider 
                              label="Burn (Shadows)" 
                              value={processingSettings.burnIntensity} 
                              onChange={(v) => setProcessingSettings(prev => ({ ...prev, burnIntensity: v }))} 
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-1">
                          {['natural', 'warm', 'cool', 'vibrant'].map(tone => (
                            <button
                              key={tone}
                              onClick={() => setProcessingSettings(prev => ({ ...prev, retouchTone: tone as any }))}
                              className={`py-1 rounded text-[8px] font-bold uppercase border transition-all shadow-sm ${processingSettings.retouchTone === tone ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-system-card border-system-border text-system-secondary hover:text-system-text'}`}
                            >
                              {tone}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 bg-system-card border border-system-border rounded-xl shadow-sm">
                          <p className="text-[10px] text-system-secondary leading-relaxed">
                            AI-powered frequency separation and texture smoothing applied to detected faces.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-system-secondary mb-4">Computational Variables</h3>
                    <div className="space-y-5">
                      <VariableSlider 
                        label="Dynamic Range" 
                        value={processingSettings.dynamicRange} 
                        onChange={(v) => setProcessingSettings(prev => ({ ...prev, dynamicRange: v }))} 
                      />
                      <VariableSlider 
                        label="Texture" 
                        value={processingSettings.texture} 
                        onChange={(v) => setProcessingSettings(prev => ({ ...prev, texture: v }))} 
                      />
                      <VariableSlider 
                        label="Clarity" 
                        value={processingSettings.clarity} 
                        onChange={(v) => setProcessingSettings(prev => ({ ...prev, clarity: v }))} 
                      />
                      <VariableSlider 
                        label="Highlight Reduction" 
                        value={processingSettings.highlightReduction} 
                        onChange={(v) => setProcessingSettings(prev => ({ ...prev, highlightReduction: v }))} 
                      />
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Cpu size={14} className="text-system-accent" />
                          <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">AI Denoise</span>
                        </div>
                        <button 
                          onClick={() => setProcessingSettings(prev => ({ ...prev, aiDenoise: !prev.aiDenoise }))}
                          className={`w-10 h-5 rounded-full relative transition-all ${processingSettings.aiDenoise ? 'bg-system-accent' : 'bg-system-bg border border-system-border'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${processingSettings.aiDenoise ? 'left-6' : 'left-1 shadow-sm'}`} />
                        </button>
                      </div>
                    </div>
                  </section>

                  <div className="p-4 bg-system-card rounded-2xl border border-system-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Wand2 size={16} className="text-system-accent" />
                      <h4 className="text-xs font-bold text-system-text">Auto-Enhance Active</h4>
                    </div>
                    <p className="text-[10px] text-system-secondary leading-relaxed">
                      Computational photography engine is optimizing RAW data based on AI scene recognition.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <p className="text-xs font-bold text-system-secondary uppercase tracking-widest">Select a photo to view details</p>
            </div>
          )}
        </div>
      </aside>

          {/* Right Sidebar Toggle Button */}
          {!isFocusMode && (
            <button 
              onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-50 p-1 bg-white border border-black/10 rounded-l-lg text-system-secondary hover:text-system-text transition-all ${rightSidebarCollapsed ? 'translate-x-0' : '-translate-x-full sm:-translate-x-80 md:-translate-x-80'}`}
            >
              {rightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
      </div>

      <PostIngestNamingDialog 
        isOpen={showPostIngestNaming}
        onClose={() => setShowPostIngestNaming(false)}
        newPhotos={newlyImportedPhotos}
        settings={renamingSettings}
        onUpdateSettings={(s) => setRenamingSettings(prev => ({ ...prev, ...s }))}
        onApply={(renamed) => {
          setPhotos(prev => prev.map(p => {
            const match = renamed.find(r => r.id === p.id);
            if (match) {
              const updated = { ...p, renamedFilename: match.renamedFilename };
              // Background save to cache
              fetch(updated.preview).then(res => res.blob()).then(blob => {
                savePhotoToCache({
                  id: updated.id,
                  blob,
                  metadata: updated.metadata,
                  result: updated.result,
                  rating: updated.rating,
                  colorTag: updated.colorTag,
                  tags: updated.tags,
                  manualRejected: updated.manualRejected,
                  renamedFilename: updated.renamedFilename
                });
              });
              return updated;
            }
            return p;
          }));
          addToast(`Successfully renamed ${renamed.length} items.`, 'success');
        }}
      />

      {/* Ingest Settings Modal */}
      <AnimatePresence>
        {showIngestSettings && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-white/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between bg-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-system-accent flex items-center justify-center shadow-lg shadow-system-accent/20">
                    <FileText size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-black">Ingest Settings</h2>
                    <p className="text-xs text-black/30 font-bold uppercase tracking-widest mt-1">Naming & Organization</p>
                  </div>
                </div>
                <button onClick={() => setShowIngestSettings(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-black/20 hover:text-black">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest block">Project Name</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                      <input 
                        type="text" 
                        value={ingestSettings.projectName}
                        onChange={(e) => setIngestSettings(prev => ({ ...prev, projectName: e.target.value }))}
                        className="w-full bg-black/5 border border-black/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-system-accent transition-all text-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest block">Location</label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                      <input 
                        type="text" 
                        value={ingestSettings.location}
                        onChange={(e) => setIngestSettings(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-black/5 border border-black/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-system-accent transition-all text-black"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest block">Date Format</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                        <select 
                          value={ingestSettings.dateFormat}
                          onChange={(e) => setIngestSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-system-accent appearance-none transition-all text-black"
                        >
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          <option value="YYMMDD">YYMMDD</option>
                          <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-black/30 uppercase tracking-widest block">Separator</label>
                      <div className="relative">
                        <Type size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                        <select 
                          value={ingestSettings.separator}
                          onChange={(e) => setIngestSettings(prev => ({ ...prev, separator: e.target.value }))}
                          className="w-full bg-black/5 border border-black/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-system-accent appearance-none transition-all text-black"
                        >
                          <option value=" - ">" - " (Space-Dash-Space)</option>
                          <option value="_">"_" (Underscore)</option>
                          <option value="-">"-" (Hyphen)</option>
                          <option value=" ">" " (Space)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Start Sequence</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none font-mono text-sm">
                        <span className="text-white/10">
                          {ingestSettings.startSeq.toString().padStart(4, '0').slice(0, Math.max(0, 4 - ingestSettings.startSeq.toString().length))}
                        </span>
                      </div>
                      <input 
                        type="number" 
                        value={ingestSettings.startSeq}
                        onChange={(e) => setIngestSettings(prev => ({ ...prev, startSeq: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-system-accent transition-all text-right pr-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <Layers size={16} className="text-system-accent" />
                        <div>
                          <span className="text-xs font-bold block">Gang RAW+JPEG</span>
                          <span className="text-[9px] text-white/40">Treat pairs as single units</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setGangRawJpeg(!gangRawJpeg)}
                        className={`w-10 h-5 rounded-full transition-all relative ${gangRawJpeg ? 'bg-system-accent' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${gangRawJpeg ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold block">Server Safe Filenames</span>
                          <span className="text-[9px] text-white/40">Lowercase, no spaces or special chars</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIngestSettings(prev => ({ ...prev, serverSafe: !prev.serverSafe }))}
                        className={`w-10 h-5 rounded-full transition-all relative ${ingestSettings.serverSafe ? 'bg-emerald-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${ingestSettings.serverSafe ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center gap-3">
                        <RefreshCw size={16} className="text-system-highlight" />
                        <div>
                          <span className="text-xs font-bold block">Numbering Protocol</span>
                          <span className="text-[9px] text-white/40">Automatic reset or progressive sequence</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIngestSettings(prev => ({ ...prev, numberingProtocol: 'reset' }))}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${ingestSettings.numberingProtocol === 'reset' ? 'bg-system-highlight text-black border-system-highlight' : 'bg-black/20 text-white/40 border-white/5 hover:border-white/10'}`}
                        >
                          Auto Reset
                        </button>
                        <button 
                          onClick={() => setIngestSettings(prev => ({ ...prev, numberingProtocol: 'progressive' }))}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${ingestSettings.numberingProtocol === 'progressive' ? 'bg-system-highlight text-black border-system-highlight' : 'bg-black/20 text-white/40 border-white/5 hover:border-white/10'}`}
                        >
                          Progressive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Camera SDK Plugins</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <PluginToggle 
                      label="Sony" 
                      active={plugins.sonySdk} 
                      onClick={() => setPlugins(prev => ({ ...prev, sonySdk: !prev.sonySdk }))} 
                    />
                    <PluginToggle 
                      label="Canon" 
                      active={plugins.canonSdk} 
                      onClick={() => setPlugins(prev => ({ ...prev, canonSdk: !prev.canonSdk }))} 
                    />
                    <PluginToggle 
                      label="Nikon" 
                      active={plugins.nikonSdk} 
                      onClick={() => setPlugins(prev => ({ ...prev, nikonSdk: !prev.nikonSdk }))} 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button 
                    onClick={() => { setShowIngestSettings(false); setShowMindsetModal(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    <Globe size={16} />
                    Distribution & Mindsets
                  </button>
                </div>

                <div className="p-4 bg-system-accent/5 border border-system-accent/10 rounded-2xl">
                  <p className="text-[10px] font-bold text-system-accent uppercase tracking-widest mb-2">Filename Preview</p>
                  <p className="text-xs font-mono text-white/60 break-all">
                    {generateNewFilename(photos[0] || { file: { name: 'sample.jpg' } } as any, 0)}
                  </p>
                </div>

                <button 
                  onClick={() => setShowIngestSettings(false)}
                  className="w-full py-4 bg-system-accent hover:bg-system-accent/90 text-white rounded-2xl font-bold transition-all shadow-lg shadow-system-accent/20"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreferences && (
          <PreferencesModal 
            showPreferences={showPreferences}
            setShowPreferences={setShowPreferences}
            activePreferenceTab={activePreferenceTab}
            setActivePreferenceTab={setActivePreferenceTab}
            keyboardSettings={keyboardSettings}
            setKeyboardSettings={setKeyboardSettings}
            aiAnalysisSettings={aiAnalysisSettings}
            setAiAnalysisSettings={setAiAnalysisSettings}
            cameraStyle={cameraStyle}
            setCameraStyle={setCameraStyle}
            interfaceColor={interfaceColor}
            setInterfaceColor={setInterfaceColor}
            cacheSettings={cacheSettings}
            setCacheSettings={setCacheSettings}
            handleClearImageCache={handleClearImageCache}
            selectionRules={selectionRules}
            setSelectionRules={setSelectionRules}
            autoAdvance={autoAdvance}
            setAutoAdvance={setAutoAdvance}
            deferredAiMode={deferredAiMode}
            setDeferredAiMode={setDeferredAiMode}
            autoEnhance={autoEnhance}
            setAutoEnhance={setAutoEnhance}
            filmStripPosition={filmStripPosition}
            setFilmStripPosition={setFilmStripPosition}
            isAutoFilmstrip={isAutoFilmstrip}
            setIsAutoFilmstrip={setIsAutoFilmstrip}
            showCameraDataPanel={showCameraDataPanel}
            setShowCameraDataPanel={setShowCameraDataPanel}
            showPinline={showPinline}
            setShowPinline={setShowPinline}
            shootingGoals={shootingGoals}
            setShootingGoals={setShootingGoals}
            backupLocations={backupLocations}
            setBackupLocations={setBackupLocations}
            deletionPreferences={deletionPreferences}
            setDeletionPreferences={setDeletionPreferences}
            thumbnailMinSize={thumbnailMinSize}
            setThumbnailMinSize={setThumbnailMinSize}
            thumbnailMaxSize={thumbnailMaxSize}
            setThumbnailMaxSize={setThumbnailMaxSize}
            rowPadding={rowPadding}
            setRowPadding={setRowPadding}
            inverseThumbnailSlider={inverseThumbnailSlider}
            setInverseThumbnailSlider={setInverseThumbnailSlider}
            offlineMode={offlineMode}
            setOfflineMode={setOfflineMode}
            connections={connections}
            setConnections={setConnections}
            isPublishing={isPublishing}
            handlePublish={handlePublish}
            connectProvider={connectProvider}
            ingestSettings={ingestSettings}
            setIngestSettings={setIngestSettings}
            projectSettings={projectSettings}
            setProjectSettings={setProjectSettings}
            plugins={plugins}
            setPlugins={setPlugins}
            sidecarEnabled={sidecarEnabled}
            setSidecarEnabled={setSidecarEnabled}
            autoWriteSidecar={autoWriteSidecar}
            setAutoWriteSidecar={setAutoWriteSidecar}
            saveSidecarNow={saveSidecarNow}
            gangRawJpeg={gangRawJpeg}
            setGangRawJpeg={setGangRawJpeg}
            generateNewFilename={generateNewFilename}
            photos={photos}
            neutralGrey={neutralGrey}
            setNeutralGrey={setNeutralGrey}
            aiProvider={aiProvider}
            setAiProvider={setAiProvider}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShootQualityReport && shootQualityData && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-zinc-800 to-zinc-900">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">Shoot Quality Report</h2>
                  <p className="text-xs font-bold text-system-highlight uppercase tracking-[0.3em]">SelectPro Audit Complete</p>
                </div>
                <button 
                  onClick={() => setShowShootQualityReport(false)} 
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-10 grid grid-cols-2 gap-8 bg-zinc-900">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Sharpness Rate</p>
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-black text-white tracking-tighter">{shootQualityData.sharpnessRate}%</span>
                    <span className={`text-xs font-bold mb-2 ${shootQualityData.sharpnessRate > 80 ? 'text-emerald-500' : 'text-emerald-500'}`}>
                      {shootQualityData.sharpnessRate > 80 ? '✓ EXCELLENT' : '▼ BELOW AVG'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${shootQualityData.sharpnessRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${shootQualityData.sharpnessRate > 80 ? 'bg-emerald-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Blink Rate</p>
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-black text-white tracking-tighter">{shootQualityData.blinkRate}%</span>
                    <span className={`text-xs font-bold mb-2 ${shootQualityData.blinkRate < 10 ? 'text-emerald-500' : 'text-system-highlight'}`}>
                      {shootQualityData.blinkRate < 10 ? '✓ OPTIMAL' : '⚠ ATTENTION'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${shootQualityData.blinkRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-system-highlight"
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Photographer Insights</p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-system-highlight/20 flex items-center justify-center shrink-0">
                        <Maximize2 size={16} className="text-system-highlight" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white mb-1">Horizon Tilt Detected</p>
                        <p className="text-[10px] text-white/40 leading-relaxed">{shootQualityData.horizonTiltRate}% of frames have significant tilt. Check your tripod level.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Clock size={16} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white mb-1">Peak Performance</p>
                        <p className="text-[10px] text-white/40 leading-relaxed">Your highest scoring frames were captured between {shootQualityData.bestHour}.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Session Summary</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-black text-white tracking-tighter">{shootQualityData.heroShotsCount}</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Hero Potentials</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white tracking-tighter">{shootQualityData.totalAnalyzed}</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Total Audited</p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShootQualityReport(false)}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-all mt-6"
                  >
                    Continue to Selection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toolbar Customizer Modal */}
      <AnimatePresence>
        {showToolbarCustomizer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-black/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-system-text">Customize Toolbar</h2>
                <button onClick={() => setShowToolbarCustomizer(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-secondary">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-system-secondary">View Modes (Proof/Loupe/Retouch)</span>
                  <button 
                    onClick={() => setToolbarConfig(prev => ({ ...prev, showViewModes: !prev.showViewModes }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${toolbarConfig.showViewModes ? 'bg-system-accent' : 'bg-black/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toolbarConfig.showViewModes ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-system-secondary">Selection Tools</span>
                  <button 
                    onClick={() => setToolbarConfig(prev => ({ ...prev, showSelection: !prev.showSelection }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${toolbarConfig.showSelection ? 'bg-system-accent' : 'bg-black/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toolbarConfig.showSelection ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-system-secondary">Select+/- Strategy</span>
                  <button 
                    onClick={() => setToolbarConfig(prev => ({ ...prev, showStrategy: !prev.showStrategy }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${toolbarConfig.showStrategy ? 'bg-system-accent' : 'bg-black/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toolbarConfig.showStrategy ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-system-secondary">AI Provider</span>
                  <button 
                    onClick={() => setToolbarConfig(prev => ({ ...prev, showAiProvider: !prev.showAiProvider }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${toolbarConfig.showAiProvider ? 'bg-system-accent' : 'bg-black/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toolbarConfig.showAiProvider ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-system-secondary">Tethered Capture</span>
                  <button 
                    onClick={() => setToolbarConfig(prev => ({ ...prev, showTethered: !prev.showTethered }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${toolbarConfig.showTethered ? 'bg-system-accent' : 'bg-black/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${toolbarConfig.showTethered ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <div className="p-6 bg-black/5 flex justify-end">
                <button 
                  onClick={() => setShowToolbarCustomizer(false)}
                  className="px-6 py-2 bg-system-accent text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-system-accent/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportModal && (
          <ExportModal 
            isOpen={showExportModal} 
            onClose={() => setShowExportModal(false)} 
            photos={photos.filter(p => selectedIds.includes(p.id))} 
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProjectSettings && (
          <ProjectSettingsModal 
            isOpen={showProjectSettings} 
            onClose={() => setShowProjectSettings(false)} 
            settings={projectSettings}
            onSave={(newSettings) => {
              setProjectSettings(newSettings);
              addToast('Project settings saved successfully');
            }}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} />
      
      <AnimatePresence>
        {showCameraDataPanel && selectedPhoto && (
          <FloatingCameraPanel 
            photo={selectedPhoto}
            style={cameraStyle}
            position={cameraPanelPosition}
            onPositionChange={setCameraPanelPosition}
            onClose={() => setShowCameraDataPanel(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showRemoveConfirmModal}
        onClose={() => setShowRemoveConfirmModal(false)}
        onConfirm={() => {
          removePhotos(selectedIds);
          setShowRemoveConfirmModal(false);
          addToast(`${selectedIds.length} photos ${deletionPreferences.mode === 'safe-folder' ? 'moved to safe folder' : 'removed'}`, 'info');
        }}
        title="Confirm Deletion"
        message={`Are you sure you want to ${deletionPreferences.mode === 'safe-folder' ? 'move to safe folder' : 'permanently delete'} ${selectedIds.length} selected photos?`}
        confirmText={deletionPreferences.mode === 'safe-folder' ? 'Move to Safe Folder' : 'Permanently Delete'}
        variant={deletionPreferences.mode === 'trash-permanent' ? 'danger' : 'default'}
      />

      <ConfirmationModal
        isOpen={showClearCacheConfirmModal}
        onClose={() => setShowClearCacheConfirmModal(false)}
        onConfirm={async () => {
          try {
            await clearCache();
            setPhotos([]);
            setSelectedIds([]);
            addToast('Session cache cleared successfully.', 'success');
          } catch (err) {
            addToast('Failed to clear cache.', 'error');
          }
        }}
        title="Clear Session Cache?"
        message="Are you sure you want to clear the session cache? This will remove all imported photos and reset the workspace."
        confirmText="Clear Cache"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showSelectAllConfirmModal}
        onClose={() => setShowSelectAllConfirmModal(false)}
        onConfirm={() => setSelectedIds(photos.map(p => p.id))}
        title="Select All Photos?"
        message={`This will select all ${photos.length} photos in your current session.`}
        confirmText="Select All"
      />

      <AnimatePresence>
        {showKeyboardSettings && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between bg-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-system-accent flex items-center justify-center shadow-lg shadow-system-accent/20">
                    <Keyboard size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-system-text">Command Mapping</h2>
                    <p className="text-xs text-system-secondary font-bold uppercase tracking-widest mt-1">Workflow Optimization Engine</p>
                  </div>
                </div>
                <button onClick={() => setShowKeyboardSettings(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-secondary hover:text-system-text">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Visual Keyboard Row */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest block">Visual Reference (Number Row)</label>
                  <div className="flex gap-1.5 p-4 bg-black/5 rounded-2xl border border-black/10 overflow-x-auto">
                    {['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key) => {
                      const isRating = parseInt(key) >= 1 && parseInt(key) <= keyboardSettings.maxRating;
                      const isColor = keyboardSettings.preset === 'lightroom' && parseInt(key) >= 6 && parseInt(key) <= 9;
                      
                      return (
                        <div key={key} className={`flex-1 min-w-[40px] h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
                          isRating ? 'bg-system-accent/10 border-system-accent/40 text-system-accent' : 
                          isColor ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-600' : 
                          'bg-black/5 border-black/10 text-system-secondary'
                        }`}>
                          <span className="text-xs font-bold">{key}</span>
                          <div className="mt-1">
                            {isRating && <Star size={8} className="fill-current" />}
                            {isColor && <Tag size={8} className="fill-current" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest block">Software Preset</label>
                      <div className="space-y-2">
                        {[
                          { id: 'lightroom', name: 'Classic', color: 'blue', desc: '1-5 Stars, 6-9 Color Tags' },
                          { id: 'photomechanic', name: 'Optimised', color: 'emerald', desc: 'Optimized for 1-9 Ingest' },
                          { id: 'custom', name: 'Custom Mapping', color: 'amber', desc: 'User-defined shortcuts' }
                        ].map((p) => (
                          <button 
                            key={p.id}
                            onClick={() => setKeyboardSettings(prev => ({ ...prev, preset: p.id as any, maxRating: p.id === 'photomechanic' ? 9 : 5 }))}
                            className={`w-full p-4 rounded-2xl border text-left transition-all group ${
                              keyboardSettings.preset === p.id 
                                ? `bg-system-accent/10 border-system-accent/50` 
                                : 'bg-black/5 border-black/10 hover:bg-black/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${keyboardSettings.preset === p.id ? `text-system-accent` : 'text-system-secondary'}`}>{p.name}</span>
                              {keyboardSettings.preset === p.id && <CheckCircle2 size={14} className={`text-system-accent`} />}
                            </div>
                            <p className="text-[10px] text-system-secondary font-medium">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest block">Configuration</label>
                      <div className="p-6 bg-black/5 rounded-3xl border border-black/10 space-y-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Rating Range</span>
                            <div className="flex bg-black/10 p-1 rounded-lg">
                              {[5, 9].map(num => (
                                <button 
                                  key={num}
                                  onClick={() => setKeyboardSettings(prev => ({ ...prev, maxRating: num as any }))}
                                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${keyboardSettings.maxRating === num ? 'bg-system-accent text-white' : 'text-system-secondary hover:text-system-text'}`}
                                >
                                  1-{num}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Modifier</span>
                            <select 
                              value={keyboardSettings.requireModifier}
                              onChange={(e) => setKeyboardSettings(prev => ({ ...prev, requireModifier: e.target.value as any }))}
                              className="bg-black/10 text-[10px] font-bold py-1.5 px-3 rounded-lg focus:outline-none border border-black/10 text-system-text"
                            >
                              <option value="none">None</option>
                              <option value="alt">Alt / Opt</option>
                              <option value="cmd">Cmd / Ctrl</option>
                              <option value="shift">Shift</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-black/10 space-y-4">
                          <h4 className="text-[10px] font-bold text-system-accent uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12} />
                            Active Shortcuts
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Rating</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">
                                {keyboardSettings.requireModifier !== 'none' ? `${keyboardSettings.requireModifier.toUpperCase()} + ` : ''}1-{keyboardSettings.maxRating}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Navigation</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">Arrows</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Views (1, 2, 3)</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">Cmd + 1/2/3</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Sidebars</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">Cmd + [ / ]</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Zoom (Loupe)</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">Cmd + +/-/0</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-system-secondary">Reject</span>
                              <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">X</span>
                            </div>
                            {keyboardSettings.preset === 'lightroom' && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-system-secondary">Color Tags</span>
                                <span className="text-system-text font-mono bg-black/10 px-1.5 rounded">6-9</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowKeyboardSettings(false)}
                  className="w-full py-5 bg-system-accent text-white rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-system-accent/20 flex items-center justify-center gap-3 group"
                >
                  Save & Apply Mapping
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Distribution Mindsets Modal */}
      <AnimatePresence>
        {showMindsetModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase text-system-text">Distribution Mindsets</h2>
                  <p className="text-xs text-system-secondary font-bold uppercase tracking-widest mt-1">Subscription & Deployment Models</p>
                </div>
                <button onClick={() => setShowMindsetModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-secondary">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <MindsetCard 
                  icon={Smartphone}
                  title="Mobile First"
                  subtitle="AppStore / Google Play"
                  features={["In-App Subscriptions", "Push Notifications", "Cloud Sync"]}
                  price="$19.99/mo"
                  onClick={() => { setCurrentMindset('mobile'); setShowMindsetModal(false); }}
                  active={effectiveMindset === 'mobile'}
                />
                <MindsetCard 
                  icon={Monitor}
                  title="Desktop Pro"
                  subtitle="macOS Standalone"
                  features={["Native Performance", "Local SDK Access", "One-time Purchase"]}
                  price="$149.00"
                  highlight
                  onClick={() => { setCurrentMindset('desktop'); setShowMindsetModal(false); }}
                  active={effectiveMindset === 'desktop'}
                />
                <MindsetCard 
                  icon={Box}
                  title="Enterprise"
                  subtitle="Windows / Web"
                  features={["Volume Licensing", "SSO Integration", "Priority Support"]}
                  price="Contact Us"
                  onClick={() => { setCurrentMindset('web'); setShowMindsetModal(false); }}
                  active={effectiveMindset === 'web'}
                />
              </div>

              <div className="p-8 bg-black/5 border-t border-black/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard className="text-system-accent" />
                  <div>
                    <p className="text-sm font-bold text-system-text">Ready to scale?</p>
                    <p className="text-[10px] text-system-secondary uppercase font-bold tracking-widest">Select a mindset to begin deployment</p>
                  </div>
                </div>
                <button className="px-6 py-3 bg-system-accent text-white rounded-full font-bold transition-all shadow-lg shadow-system-accent/20">
                  Get Started
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InstallModal 
        isOpen={showInstallModal} 
        onClose={() => setShowInstallModal(false)} 
        deferredPrompt={deferredPrompt} 
        addToast={addToast}
      />

      {/* Cache & Performance Settings Modal */}
      <AnimatePresence>
        {showCacheSettings && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-system-text">Cache & Performance</h2>
                  <p className="text-[10px] text-system-secondary font-bold uppercase tracking-widest mt-1">Optimize for speed</p>
                </div>
                <button onClick={() => setShowCacheSettings(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-text">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6 text-system-text">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Cache Location</label>
                    <select 
                      value={cacheSettings.cacheLocation}
                      onChange={(e) => setCacheSettings(prev => ({ ...prev, cacheLocation: e.target.value }))}
                      className="w-full bg-black/5 border border-black/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-system-accent appearance-none"
                    >
                      <option value="IndexedDB">IndexedDB (Disk)</option>
                      <option value="Memory">Memory (RAM)</option>
                      <option value="FileSystem">File System API (Native)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-system-secondary uppercase tracking-widest">
                      <span>Max Cache Size</span>
                      <span>{cacheSettings.maxCacheSize} MB</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="5000" 
                      step="100"
                      value={cacheSettings.maxCacheSize}
                      onChange={(e) => setCacheSettings(prev => ({ ...prev, maxCacheSize: parseInt(e.target.value) }))}
                      className="w-full accent-system-accent h-1 bg-black/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Preview Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setCacheSettings(prev => ({ ...prev, previewMode: 'camera-previews' }))}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${cacheSettings.previewMode === 'camera-previews' ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/10 text-system-secondary'}`}
                      >
                        Camera Previews
                      </button>
                      <button 
                        onClick={() => setCacheSettings(prev => ({ ...prev, previewMode: 'render-in-place' }))}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase border transition-all ${cacheSettings.previewMode === 'render-in-place' ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/10 text-system-secondary'}`}
                      >
                        Render in Place
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-3">
                      <RefreshCw size={16} className="text-system-accent" />
                      <span className="text-xs font-bold">Pre-heat Next Image</span>
                    </div>
                    <button 
                      onClick={() => setCacheSettings(prev => ({ ...prev, preheatCache: !prev.preheatCache }))}
                      className={`w-10 h-5 rounded-full transition-all relative ${cacheSettings.preheatCache ? 'bg-system-accent' : 'bg-black/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${cacheSettings.preheatCache ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCacheSettings(false)}
                  className="w-full py-4 bg-system-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-system-accent/20"
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Analysis Settings Modal */}
      <AnimatePresence>
        {showAiSettings && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-system-text">AI Analysis Parameters</h2>
                  <p className="text-[10px] text-system-secondary font-bold uppercase tracking-widest mt-1">Fine-tune the intelligence</p>
                </div>
                <button onClick={() => setShowAiSettings(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-text">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <VariableSlider 
                  label="Blur Sensitivity" 
                  value={aiAnalysisSettings.blurSensitivity} 
                  onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, blurSensitivity: v }))} 
                />
                <VariableSlider 
                  label="Composition Emphasis" 
                  value={aiAnalysisSettings.compositionEmphasis} 
                  onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, compositionEmphasis: v }))} 
                />
                <VariableSlider 
                  label="Focus Sensitivity" 
                  value={aiAnalysisSettings.focusSensitivity} 
                  onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, focusSensitivity: v }))} 
                />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-3">
                      <Smile size={16} className="text-system-accent" />
                      <span className="text-xs font-bold text-system-text">Emotion Detection</span>
                    </div>
                    <button 
                      onClick={() => setAiAnalysisSettings(prev => ({ ...prev, emotionDetection: !prev.emotionDetection }))}
                      className={`w-10 h-5 rounded-full transition-all relative ${aiAnalysisSettings.emotionDetection ? 'bg-system-accent' : 'bg-black/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${aiAnalysisSettings.emotionDetection ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="p-4 bg-black/5 rounded-2xl border border-black/5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Eye size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Privacy Settings</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {['standard', 'strict', 'private'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setAiAnalysisSettings(prev => ({ ...prev, privacyMode: mode as any }))}
                          className={`py-2 rounded-lg text-[9px] font-bold uppercase border transition-all ${aiAnalysisSettings.privacyMode === mode ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-black/5 border-black/10 text-system-secondary'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Anonymize Faces</span>
                      <button 
                        onClick={() => setAiAnalysisSettings(prev => ({ ...prev, anonymizeFaces: !prev.anonymizeFaces }))}
                        className={`w-8 h-4 rounded-full relative transition-all ${aiAnalysisSettings.anonymizeFaces ? 'bg-emerald-500' : 'bg-black/10'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${aiAnalysisSettings.anonymizeFaces ? 'left-4.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5">
                    <span className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Blink Removal</span>
                    <button 
                      onClick={() => setAiAnalysisSettings(prev => ({ ...prev, autoRejectBlinks: !prev.autoRejectBlinks }))}
                      className={`w-8 h-4 rounded-full relative transition-all ${aiAnalysisSettings.autoRejectBlinks ? 'bg-emerald-500' : 'bg-black/10'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${aiAnalysisSettings.autoRejectBlinks ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {aiAnalysisSettings.autoRejectBlinks && (
                    <div className="pt-2 space-y-4">
                      <VariableSlider 
                        label="Blink Sensitivity" 
                        value={aiAnalysisSettings.blinkSensitivity || 50} 
                        onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, blinkSensitivity: v }))} 
                      />
                      <VariableSlider 
                        label="Wink Strictness" 
                        value={aiAnalysisSettings.winkStrictness || 70} 
                        onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, winkStrictness: v }))} 
                      />
                      <VariableSlider 
                        label="Face Confidence" 
                        value={aiAnalysisSettings.faceConfidenceThreshold || 50} 
                        onChange={(v) => setAiAnalysisSettings(prev => ({ ...prev, faceConfidenceThreshold: v }))} 
                      />
                      <p className="text-[9px] text-white/40 mt-1 italic">
                        Sensitivity: How closed eyes must be. Wink: Sensitivity threshold for individual eye check. Confidence: Minimum face detection score.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2 text-system-accent">
                    <LayoutGrid size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Visible Badges</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['grade', 'score', 'eye', 'smile', 'blur'].map(badge => (
                      <button
                        key={badge}
                        onClick={() => setVisibleBadges(prev => 
                          prev.includes(badge) ? prev.filter(b => b !== badge) : [...prev, badge]
                        )}
                        className={`py-2 rounded-lg text-[9px] font-bold uppercase border transition-all ${visibleBadges.includes(badge) ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/10 text-system-secondary'}`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>
                </div>

                <button 
                  onClick={() => setShowAiSettings(false)}
                  className="w-full py-4 bg-system-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-system-accent/20"
                >
                  Apply Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Selection Rules Modal */}
      <AnimatePresence>
        {showSelectionRules && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-system-text">Custom Select+/- Rules</h2>
                  <p className="text-[10px] text-system-secondary font-bold uppercase tracking-widest mt-1">Define your standards</p>
                </div>
                <button onClick={() => setShowSelectionRules(false)} className="p-2 hover:bg-black/5 rounded-full transition-all text-system-text">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6 text-system-text">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Min Width</label>
                    <input 
                      type="number" 
                      value={selectionRules.minWidth}
                      onChange={(e) => setSelectionRules(prev => ({ ...prev, minWidth: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black/5 border border-black/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-system-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Min Height</label>
                    <input 
                      type="number" 
                      value={selectionRules.minHeight}
                      onChange={(e) => setSelectionRules(prev => ({ ...prev, minHeight: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black/5 border border-black/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-system-accent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Required Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['any', '1:1', '4:3', '3:2', '16:9'].map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setSelectionRules(prev => ({ ...prev, requiredAspectRatio: ratio as any }))}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${selectionRules.requiredAspectRatio === ratio ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/10 text-system-secondary hover:text-system-text'}`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <VariableSlider 
                  label="Min Focus Score" 
                  value={selectionRules.minFocusScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minFocusScore: v }))} 
                />

                <VariableSlider 
                  label="Min Expression Score" 
                  value={selectionRules.minExpressionScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minExpressionScore: v }))} 
                />

                <VariableSlider 
                  label="Min Composition Score" 
                  value={selectionRules.minCompositionScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minCompositionScore: v }))} 
                />

                <VariableSlider 
                  label="Min Eyes Open Score" 
                  value={selectionRules.minEyesOpenScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minEyesOpenScore: v }))} 
                />

                <VariableSlider 
                  label="Min Lighting Score" 
                  value={selectionRules.minLightingScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minLightingScore: v }))} 
                />

                <VariableSlider 
                  label="Min Overall AI Score" 
                  value={selectionRules.minOverallScore} 
                  onChange={(v) => setSelectionRules(prev => ({ ...prev, minOverallScore: v }))} 
                />

                <button 
                  onClick={() => setShowSelectionRules(false)}
                  className="w-full py-4 bg-system-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-system-accent/20"
                >
                  Save Rules
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SVG Filters for Advanced Retouching */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="focus-peaking-red">
            <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="focus-peaking-green">
            <feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="ai-photo-enhance">
            {/* Filmic Tone Curve */}
            {processingSettings.filmicCurve.enabled && (
              <feComponentTransfer>
                <feFuncR type="table" tableValues={filmicTableValues} />
                <feFuncG type="table" tableValues={filmicTableValues} />
                <feFuncB type="table" tableValues={filmicTableValues} />
              </feComponentTransfer>
            )}

            {/* Highlight Reduction using Component Transfer */}
            <feComponentTransfer>
              <feFuncR type="table" tableValues={`0 ${0.5 - (processingSettings.highlightReduction / 400)} ${1 - (processingSettings.highlightReduction / 200)}`} />
              <feFuncG type="table" tableValues={`0 ${0.5 - (processingSettings.highlightReduction / 400)} ${1 - (processingSettings.highlightReduction / 200)}`} />
              <feFuncB type="table" tableValues={`0 ${0.5 - (processingSettings.highlightReduction / 400)} ${1 - (processingSettings.highlightReduction / 200)}`} />
            </feComponentTransfer>

            {/* Frequency Separation Simulation (High Pass Layer) */}
            {processingSettings.frequencySeparation && (
              <>
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k2="1" k3="-1" k4="0.5" result="highpass" />
                <feBlend in="highpass" in2="SourceGraphic" mode="overlay" />
              </>
            )}

            {/* Skin Smoothing / Surface Blur Simulation */}
            {processingSettings.skinRetouch && (
              <feGaussianBlur stdDeviation={processingSettings.retouchIntensity / 100} />
            )}
          </filter>
        </defs>
      </svg>

      {/* Professional Review Result Overlay */}
      {professionalReview && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setProfessionalReview(null)}
        >
          <motion.div 
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-system-highlight/20 flex items-center justify-center">
                  <Award className="text-system-highlight" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-white">Professional Review</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AI Quality Assessment</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-system-highlight italic">{professionalReview.score}/10</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${professionalReview.keep ? 'text-emerald-500' : 'text-emerald-500'}`}>
                  {professionalReview.keep ? 'KEEPER' : 'REJECT'}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Analysis Summary</h3>
                <p className="text-sm text-white/80 leading-relaxed font-medium italic">"{professionalReview.reason}"</p>
              </div>

              {professionalReview.technical_issues.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Technical Issues</h3>
                  <div className="flex flex-wrap gap-2">
                    {professionalReview.technical_issues.map((issue, i) => (
                      <span key={i} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setProfessionalReview(null)}
              className="w-full mt-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
            >
              Dismiss Review
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Sequence Review Result Overlay */}
      {sequenceReview && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSequenceReview(null)}
        >
          <motion.div 
            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Layers className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase text-white">Sequence Comparison</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AI Sequence Audit</p>
                </div>
              </div>
              <button 
                onClick={() => setSequenceReview(null)}
                className="p-2 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {sequenceReview.map((item) => {
                const photo = photos.find(p => p.id === item.imageId);
                return (
                  <div key={item.imageId} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div 
                      className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-black/40"
                      style={{ 
                        aspectRatio: photo?.metadata.width && photo?.metadata.height 
                          ? `${photo.metadata.width} / ${photo.metadata.height}` 
                          : '3 / 2' 
                      }}
                    >
                      <img 
                        src={photo?.preview} 
                        alt="" 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          item.status === 'primary' ? 'bg-emerald-500 text-white' :
                          item.status === 'alternate' ? 'bg-system-highlight text-white' :
                          'bg-emerald-500 text-white'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-xs font-black text-white italic">{item.score}/10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setSequenceReview(null)}
                className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setSequenceReview(null);
                }}
                className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
              >
                Apply Results
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {isReviewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-system-highlight border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black text-white uppercase tracking-[0.3em] animate-pulse">Analyzing...</p>
          </div>
        </div>
      )}

      {/* Mobile Navigation & Settings */}
      {(effectiveMindset === 'mobile' || effectiveMindset === 'tablet') && !isFocusMode && !isImmersive && (
        <MobileBottomNav 
          activeTab={viewMode === 'import' ? 'import' : (viewMode === 'library' ? 'library' : 'image')} 
          onTabChange={(tab) => {
            if (tab === 'import') setViewMode('import');
            else if (tab === 'library') setViewMode('library');
            else if (tab === 'image') setViewMode('image');
          }}
          onOpenSettings={() => setShowMobileSettings(true)}
        />
      )}

      <MobilePreferences isOpen={showMobileSettings} onClose={() => setShowMobileSettings(false)}>
        <div className="space-y-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 mb-4">App Mindset</h3>
            <button 
              onClick={() => {
                setShowMobileSettings(false);
                setShowMindsetModal(true);
              }}
              className="w-full p-4 bg-system-accent text-white rounded-2xl flex items-center justify-between shadow-lg shadow-system-accent/20 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid size={20} />
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Switch Mindset</p>
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Current: {effectiveMindset}</p>
                </div>
              </div>
              <ChevronRight size={16} />
            </button>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Performance & AI</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-system-highlight" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Low Power Mode</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Optimize for battery</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLowPowerMode(!isLowPowerMode)}
                  className={`w-12 h-6 rounded-full relative transition-all ${isLowPowerMode ? 'bg-system-highlight' : 'bg-black/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLowPowerMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Brain size={18} className="text-system-accent" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">AI Analysis</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Enable SelectPro AI</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-all ${aiEnabled ? 'bg-system-accent' : 'bg-black/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Camera size={18} className="text-emerald-500" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Tethered Mode</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Capture from camera</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTethered(!isTethered)}
                  className={`w-12 h-6 rounded-full relative transition-all ${isTethered ? 'bg-emerald-500' : 'bg-black/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isTethered ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">App Selector</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setShowMobileSettings(false); setViewMode('library'); }}
                className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl border border-black/5 hover:bg-black/10 transition-all"
              >
                <div className="w-10 h-10 bg-system-accent/10 rounded-xl flex items-center justify-center text-system-accent">
                  <Zap size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">SelectPro</span>
              </button>
              <button className="flex flex-col items-center gap-2 p-4 bg-black/5 rounded-2xl border border-black/5 hover:bg-black/10 transition-all opacity-40 grayscale cursor-not-allowed">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                  <Layers size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">EditPro</span>
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Display & UI</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-system-highlight" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Low Power Mode</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Save Battery & Speed</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLowPowerMode(!isLowPowerMode)}
                  className={`w-12 h-6 rounded-full relative transition-all ${isLowPowerMode ? 'bg-system-highlight' : 'bg-black/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLowPowerMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Palette size={18} className="text-purple-500" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Selection Frame</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Cyan / Canary</p>
                  </div>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-black/5">
                  <button 
                    onClick={() => setSelectionFrameColor('cyan')}
                    className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${selectionFrameColor === 'cyan' ? 'bg-system-accent text-white' : 'text-system-secondary'}`}
                  >
                    Cyan
                  </button>
                  <button 
                    onClick={() => setSelectionFrameColor('canary')}
                    className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${selectionFrameColor === 'canary' ? 'bg-system-highlight text-white' : 'text-system-secondary'}`}
                  >
                    Canary
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Wand2 size={18} className="text-pink-500" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Auto-Enhance</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Neural Touch-up</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAutoEnhance(!autoEnhance)}
                  className={`w-12 h-6 rounded-full relative transition-all ${autoEnhance ? 'bg-pink-500' : 'bg-black/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoEnhance ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <button 
                onClick={() => {
                  if (confirm('Clear local cache and reset SelectPro?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-500 transition-all"
              >
                <Trash2 size={16} />
                Clear Local Cache
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Support</h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-system-accent" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Help Center</p>
                    <p className="text-[9px] font-bold text-system-secondary/60 uppercase tracking-widest">Documentation & Guides</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-black/20" />
              </button>
            </div>
          </section>

          <div className="pt-10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-system-accent/40">
              <Camera size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">SelectPro v2.4</p>
            <p className="text-[8px] font-bold text-black/10 uppercase tracking-widest">Designed for Professional Workflow</p>
          </div>
        </div>
      </MobilePreferences>
    </div>
  );
}

const SortablePhoto = React.memo(({ photo, selected, selectionColor, onClick }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const frameColor = selectionColor === 'cyan' ? 'border-system-accent ring-system-accent/20' : 'border-system-highlight ring-system-highlight/20';

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        aspectRatio: photo.metadata.width && photo.metadata.height 
          ? `${photo.metadata.width} / ${photo.metadata.height}` 
          : '3 / 2' 
      }} 
      {...attributes} 
      {...listeners}
      onClick={onClick}
      className={`relative rounded-sm overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all bg-black/40 flex items-center justify-center ${selected ? `${frameColor} ring-4 z-10` : 'border-black/5 hover:border-black/20'}`}
    >
      <img 
        src={photo.preview} 
        className="w-full h-full object-contain pointer-events-none" 
        alt="Thumbnail" 
        referrerPolicy="no-referrer" 
      />
      <div className="absolute top-1 left-1 flex flex-col gap-1">
        {photo.result?.isHeroPotential && <div className="bg-system-highlight text-black text-[8px] font-black px-1 rounded-sm uppercase">Hero</div>}
        {(photo.result?.isRejected || photo.isRejected || photo.manualRejected) && <div className="bg-emerald-600 text-white text-[8px] font-black px-1 rounded-sm uppercase">Select+/-</div>}
        {photo.renamedFilename && <div className="bg-system-accent text-white text-[7px] font-black px-1 rounded-sm uppercase truncate max-w-[80px]" title={photo.renamedFilename}>Renamed</div>}
        {photo.rawFile && <div className="bg-system-accent text-white text-[7px] font-black px-1 rounded-sm uppercase">RAW+JPG</div>}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between px-1.5">
        <div className="flex items-center gap-1">
          {photo.rating > 0 && <span className="text-[10px] font-black text-white">{photo.rating}</span>}
          {photo.colorTag && <div className={`w-2 h-2 rounded-full ${COLOR_TAGS.find(c => c.id === photo.colorTag)?.color}`} />}
        </div>
      </div>
    </div>
  );
});

function MobileBottomNav({ activeTab, onTabChange, onOpenSettings }: { activeTab: string, onTabChange: (tab: any) => void, onOpenSettings: () => void }) {
  return (
    <div className="fixed bottom-0 inset-x-0 h-16 bg-white/90 backdrop-blur-2xl border-t border-black/5 flex items-center justify-around px-4 z-[200] lg:hidden pb-safe">
      <button 
        onClick={() => onTabChange('import')}
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'import' ? 'text-system-accent scale-110' : 'text-system-secondary opacity-40'}`}
      >
        <Upload size={20} className={activeTab === 'import' ? 'stroke-[2.5px]' : 'stroke-2'} />
        <span className="text-[9px] font-black uppercase tracking-widest">Ingest</span>
      </button>
      <button 
        onClick={() => onTabChange('library')}
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'library' ? 'text-system-accent scale-110' : 'text-system-secondary opacity-40'}`}
      >
        <LayoutGrid size={20} className={activeTab === 'library' ? 'stroke-[2.5px]' : 'stroke-2'} />
        <span className="text-[9px] font-black uppercase tracking-widest">Library</span>
      </button>
      <button 
        onClick={() => onTabChange('image')}
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'image' ? 'text-system-accent scale-110' : 'text-system-secondary opacity-40'}`}
      >
        <Maximize2 size={20} className={activeTab === 'image' ? 'stroke-[2.5px]' : 'stroke-2'} />
        <span className="text-[9px] font-black uppercase tracking-widest">Select</span>
      </button>
      <button 
        onClick={onOpenSettings}
        className="flex flex-col items-center gap-1 text-system-secondary opacity-40 hover:opacity-100 transition-all duration-300"
      >
        <MoreHorizontal size={20} />
        <span className="text-[9px] font-black uppercase tracking-widest">More</span>
      </button>
    </div>
  );
}

function MobilePreferences({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
      <div className="h-16 flex items-center justify-between px-6 border-b border-black/5 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-system-accent">Preferences</h2>
          <p className="text-[9px] font-bold text-system-secondary/40 uppercase tracking-widest">Mobile Optimized</p>
        </div>
        <button 
          onClick={onClose} 
          className="w-10 h-10 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-full transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 pb-32">
        {children}
      </div>
    </div>
  );
}

function FolderItem({ icon: Icon, label, count, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${active ? 'bg-system-accent text-white' : 'text-system-secondary hover:bg-black/5 hover:text-system-text'}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={14} className={active ? 'text-white' : 'text-system-secondary/40'} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-white/60' : 'text-system-secondary/20'}`}>{count}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-system-card p-2 rounded-lg border border-system-border shadow-sm">
      <p className="text-[9px] font-bold text-system-secondary uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-system-text">{value}%</span>
        <div className="w-12 h-1 bg-system-bg rounded-full overflow-hidden">
          <div className="h-full bg-system-accent" style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );
}

function InstallModal({ isOpen, onClose, deferredPrompt, addToast }: { isOpen: boolean, onClose: () => void, deferredPrompt: any, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) {
  if (!isOpen) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      onClose();
    } else {
      addToast("To install on Mac: 1. Open in Chrome/Safari, 2. Click 'Share'/'Settings', 3. Select 'Add to Dock'/'Install App'", 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white border border-black/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-system-accent flex items-center justify-center text-white shadow-xl shadow-system-accent/20">
            <Monitor size={40} />
          </div>
          
          <div className="text-system-text">
            <h2 className="text-2xl font-black tracking-tight mb-2">Install Select Pro</h2>
            <p className="text-sm text-system-secondary leading-relaxed">
              Run Select Pro as a standalone desktop app on your Mac. It will appear in your Applications folder and Dock for instant access.
            </p>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={handleInstall}
              className="w-full py-4 bg-system-accent text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-system-accent/20"
            >
              {deferredPrompt ? 'Install Now' : 'Show Instructions'}
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-black/5 text-system-secondary rounded-2xl font-bold uppercase tracking-widest hover:bg-black/10 hover:text-system-text transition-all"
            >
              Maybe Later
            </button>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold text-system-secondary/40 uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <Check size={12} />
              <span>Native Performance</span>
            </div>
            <div className="flex items-center gap-1">
              <Check size={12} />
              <span>Offline Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionButton({ label, connected, onClick, loading }: { label: string, connected: boolean, onClick: () => void, loading?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all shadow-sm ${connected ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-system-card border-system-border text-system-secondary hover:bg-system-bg hover:text-system-text'}`}
    >
      <div className="flex items-center gap-3">
        {loading ? <Loader2 size={14} className="animate-spin" /> : (connected ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />)}
        <span className="text-xs font-bold">{label}</span>
      </div>
      {loading ? (
        <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span>
      ) : connected ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
          <Share2 size={12} className="opacity-60" />
        </div>
      ) : (
        <ExternalLink size={12} className="opacity-40" />
      )}
    </button>
  );
}

function PluginToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${active ? 'bg-system-accent border-system-accent text-white' : 'bg-black/5 border-black/5 text-system-secondary hover:text-system-text'}`}
    >
      {label}
    </button>
  );
}

// ─── MenuBar shared state (module-level, no context needed) ──────────────────
// Tracks whether any menu in the bar is currently open, enabling "sweep" hover.
let _mbActive = false;
let _mbCloseActive: (() => void) | null = null;

function _mbOpen(closeFn: () => void) {
  if (_mbCloseActive && _mbCloseActive !== closeFn) _mbCloseActive();
  _mbCloseActive = closeFn;
  _mbActive = true;
}
function _mbClear() {
  _mbCloseActive = null;
  _mbActive = false;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MenuItemDef =
  | '---'
  | { label: string; onClick?: () => void; shortcut?: string; disabled?: boolean; active?: boolean };

// ─── MenuButton ───────────────────────────────────────────────────────────────
function MenuButton({ label, items }: { label: string; items: MenuItemDef[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs   = useRef<(HTMLButtonElement | null)[]>([]);

  // Actionable (non-separator, non-disabled) item indices for keyboard nav
  const actionableIndices = items.reduce<number[]>((acc, item, i) => {
    if (item !== '---' && !item.disabled) acc.push(i);
    return acc;
  }, []);

  const calcPos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuW = 208; // w-52
    const left  = Math.min(rect.left, window.innerWidth - menuW - 8);
    setMenuPos({ top: rect.bottom + 1, left });
  };

  const open = () => {
    calcPos();
    setIsOpen(true);
    setFocusedIdx(-1);
    _mbOpen(() => { setIsOpen(false); setFocusedIdx(-1); });
  };

  const close = () => {
    setIsOpen(false);
    setFocusedIdx(-1);
    _mbClear();
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
      setFocusedIdx(-1);
      _mbClear();
    }, 90);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  // Click-outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus management: when focusedIdx changes, focus that item
  useEffect(() => {
    if (focusedIdx >= 0) itemRefs.current[focusedIdx]?.focus();
    else if (!isOpen)    buttonRef.current?.focus();
  }, [focusedIdx, isOpen]);

  const moveFocus = (dir: 1 | -1) => {
    if (!actionableIndices.length) return;
    setFocusedIdx(prev => {
      const cur = actionableIndices.indexOf(prev);
      const next = cur === -1
        ? (dir === 1 ? 0 : actionableIndices.length - 1)
        : (cur + dir + actionableIndices.length) % actionableIndices.length;
      return actionableIndices[next];
    });
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) open();
      setTimeout(() => moveFocus(1), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) open();
      setTimeout(() => moveFocus(-1), 0);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); moveFocus(1); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); moveFocus(-1); }
    if (e.key === 'Tab')        { e.preventDefault(); moveFocus(e.shiftKey ? -1 : 1); }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(e) => { e.stopPropagation(); isOpen ? close() : open(); }}
        onMouseEnter={() => { cancelClose(); if (_mbActive) open(); }}
        onMouseLeave={scheduleClose}
        onKeyDown={handleTriggerKeyDown}
        className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-black/8 text-system-text'
            : 'text-system-text/70 hover:text-system-text'
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          className="fixed w-52 bg-white/95 backdrop-blur-sm border border-black/10 rounded-lg shadow-2xl py-1 z-[200]"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onKeyDown={handleMenuKeyDown}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => {
            if (item === '---') {
              return <div key={i} role="separator" className="h-px bg-black/6 my-1 mx-2" />;
            }

            const { label: itemLabel, onClick, shortcut, disabled = false, active = false } = item;

            return (
              <button
                key={i}
                ref={el => { itemRefs.current[i] = el; }}
                role="menuitem"
                disabled={disabled || active}
                tabIndex={focusedIdx === i ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled || active) return;
                  onClick?.();
                  close();
                }}
                onMouseEnter={() => setFocusedIdx(i)}
                onMouseLeave={() => setFocusedIdx(-1)}
                className={`w-full text-left px-3 py-[5px] text-[11px] flex items-center justify-between gap-3 outline-none transition-colors ${
                  active
                    ? 'bg-system-accent/5 text-system-accent/40 cursor-default'
                    : disabled
                    ? 'opacity-30 cursor-default'
                    : focusedIdx === i
                    ? 'bg-system-accent text-white'
                    : 'hover:bg-system-accent hover:text-white cursor-pointer'
                }`}
              >
                <span className="truncate">{itemLabel}</span>
                {shortcut && (
                  <span className={`text-[9px] shrink-0 font-mono ${
                    focusedIdx === i ? 'opacity-70' : 'opacity-35'
                  }`}>
                    {shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MindsetCard({ icon: Icon, title, subtitle, features, price, highlight, onClick, active }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-3xl border flex flex-col gap-4 text-left transition-all ${active ? 'ring-4 ring-system-accent/40' : ''} ${highlight ? 'bg-system-accent border-system-accent text-white shadow-xl shadow-system-accent/20' : 'bg-white border-black/10 hover:bg-black/5'}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${highlight ? 'bg-white/20' : 'bg-black/5 text-system-accent'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-lg font-black tracking-tight leading-tight text-system-text">{title}</h3>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-white/60' : 'text-system-secondary'}`}>{subtitle}</p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f: string, i: number) => (
          <li key={i} className="flex items-center gap-2 text-[11px] font-medium">
            <Check size={12} className={highlight ? 'text-white' : 'text-system-accent'} />
            <span className={highlight ? 'text-white/80' : 'text-system-secondary'}>{f}</span>
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-black/5 w-full">
        <p className={`text-xl font-black ${highlight ? 'text-white' : 'text-system-text'}`}>{price}</p>
      </div>
    </button>
  );
}

function MetaRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[10px] font-bold text-system-secondary/40 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-[10px] font-medium text-system-secondary truncate">{value}</span>
    </div>
  );
}




