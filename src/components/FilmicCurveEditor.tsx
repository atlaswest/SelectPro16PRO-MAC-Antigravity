import React, { useRef, useEffect, useState } from 'react';
import { calculateHistogram } from '../services/exifService';
import { suggestToneCurve } from '../services/geminiService';
import { Sparkles, Loader2 } from 'lucide-react';

interface FilmicSettings {
  enabled: boolean;
  toe: number;
  shoulder: number;
  slope: number;
  blackPoint: number;
  whitePoint: number;
}

interface Props {
  photo: any;
  settings: FilmicSettings;
  onChange: (settings: FilmicSettings) => void;
}

export default function FilmicCurveEditor({ photo, settings, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogramData, setHistogramData] = useState<{ r: number[], g: number[], b: number[] } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (!photo?.preview) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo.preview;
    img.onload = () => {
      const data = calculateHistogram(img);
      setHistogramData(data);
    };
  }, [photo?.preview]);

  useEffect(() => {
    if (!canvasRef.current || !histogramData) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    // Draw Histogram
    const drawChannel = (data: number[], color: string, opacity: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(0, height);
      const step = width / 256;
      for (let i = 0; i < 256; i++) {
        const val = (data[i] / 100) * height;
        ctx.lineTo(i * step, height - val);
      }
      ctx.lineTo(width, height);
      ctx.fill();
    };

    drawChannel(histogramData.r, '#ef4444', 0.3);
    drawChannel(histogramData.g, '#10b981', 0.3);
    drawChannel(histogramData.b, '#3b82f6', 0.3);

    // Draw Curve
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const filmic = (x: number) => {
      // Simplified filmic curve
      // x is 0-1
      const { toe, shoulder, slope, blackPoint, whitePoint } = settings;
      
      // Remap x based on black/white points
      let val = (x - blackPoint) / (whitePoint - blackPoint);
      val = Math.max(0, Math.min(1, val));

      // Apply slope/contrast
      val = Math.pow(val, slope);

      // Apply toe/shoulder (S-curve)
      // This is a very basic approximation
      const t = toe;
      const s = shoulder;
      if (val < t) {
        val = (val / t) * (val / t) * t;
      } else if (val > s) {
        const d = 1 - s;
        const v = (val - s) / d;
        val = s + (1 - (1 - v) * (1 - v)) * d;
      }

      return val;
    };

    for (let i = 0; i <= width; i++) {
      const x = i / width;
      const y = filmic(x);
      if (i === 0) ctx.moveTo(i, height - y * height);
      else ctx.lineTo(i, height - y * height);
    }
    ctx.stroke();

    // Draw Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 4) * width, 0);
      ctx.lineTo((i / 4) * width, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i / 4) * height);
      ctx.lineTo(width, (i / 4) * height);
      ctx.stroke();
    }

  }, [histogramData, settings]);

  const autoOptimize = () => {
    if (!histogramData) return;
    
    // Find black point (first non-zero bin)
    let black = 0;
    for (let i = 0; i < 256; i++) {
      if (histogramData.r[i] > 2 || histogramData.g[i] > 2 || histogramData.b[i] > 2) {
        black = i / 255;
        break;
      }
    }
    
    // Find white point (last non-zero bin)
    let white = 1;
    for (let i = 255; i >= 0; i--) {
      if (histogramData.r[i] > 2 || histogramData.g[i] > 2 || histogramData.b[i] > 2) {
        white = i / 255;
        break;
      }
    }
    
    onChange({
      ...settings,
      blackPoint: Math.min(0.4, black * 0.8), // conservative
      whitePoint: Math.max(0.6, white + (1 - white) * 0.2), // conservative
      slope: 1.1,
      toe: 0.1,
      shoulder: 0.9
    });
  };

  const handleAiSuggest = async () => {
    if (!photo?.preview) return;
    setIsSuggesting(true);
    try {
      let base64Data = photo.preview;
      if (photo.preview.startsWith('blob:')) {
        const response = await fetch(photo.preview);
        const blob = await response.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      const suggestion = await suggestToneCurve(base64Data);
      onChange({
        ...settings,
        ...suggestion,
        enabled: true
      });
    } catch (error) {
      console.error("AI Suggestion failed:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Response Curve</div>
        <div className="flex gap-2">
          <button 
            onClick={handleAiSuggest}
            disabled={isSuggesting}
            className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[8px] font-black uppercase tracking-widest rounded border border-purple-500/20 transition-all disabled:opacity-50"
          >
            {isSuggesting ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            AI Suggest
          </button>
          <button 
            onClick={autoOptimize}
            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded border border-amber-500/20 transition-all"
          >
            Auto-Optimize
          </button>
          <button 
            onClick={() => onChange({ enabled: true, toe: 0, shoulder: 1, slope: 1, blackPoint: 0, whitePoint: 1 })}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/40 text-[8px] font-black uppercase tracking-widest rounded border border-white/10 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="relative aspect-square bg-black/40 rounded-xl border border-white/10 overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={400} 
          className="w-full h-full"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[8px] font-bold uppercase tracking-widest text-white/40">
          Filmic Response Curve
        </div>
      </div>

      <div className="space-y-3">
        <Slider 
          label="Slope (Contrast)" 
          value={settings.slope} 
          min={0.1} 
          max={3.0} 
          step={0.01}
          onChange={(v) => onChange({ ...settings, slope: v })} 
        />
        <Slider 
          label="Toe (Shadows)" 
          value={settings.toe} 
          min={0} 
          max={0.5} 
          step={0.01}
          onChange={(v) => onChange({ ...settings, toe: v })} 
        />
        <Slider 
          label="Shoulder (Highlights)" 
          value={settings.shoulder} 
          min={0.5} 
          max={1.0} 
          step={0.01}
          onChange={(v) => onChange({ ...settings, shoulder: v })} 
        />
        <div className="grid grid-cols-2 gap-3">
          <Slider 
            label="Black Point" 
            value={settings.blackPoint} 
            min={0} 
            max={0.5} 
            step={0.01}
            onChange={(v) => onChange({ ...settings, blackPoint: v })} 
          />
          <Slider 
            label="White Point" 
            value={settings.whitePoint} 
            min={0.5} 
            max={1.0} 
            step={0.01}
            onChange={(v) => onChange({ ...settings, whitePoint: v })} 
          />
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase tracking-widest">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" 
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  );
}
