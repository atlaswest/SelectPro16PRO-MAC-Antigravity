import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PhotoItem } from '../types';
import { CheckCircle2, AlertCircle, Zap, Target, Eye, Smile, Image as ImageIcon } from 'lucide-react';

interface ShootQualityReportProps {
  photos: PhotoItem[];
}

const ShootQualityReport: React.FC<ShootQualityReportProps> = ({ photos }) => {
  const analyzedPhotos = photos.filter(p => p.aiScoreData);
  
  if (analyzedPhotos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-black/5 rounded-3xl border-2 border-dashed border-black/10">
        <AlertCircle size={48} className="text-black/20 mb-4" />
        <h3 className="text-xl font-black uppercase tracking-tighter text-black/40">No Analysis Data</h3>
        <p className="text-sm text-black/30 max-w-xs mt-2">Run SelectPro Scan to generate your shoot quality report.</p>
      </div>
    );
  }

  const avgScore = Math.round(analyzedPhotos.reduce((acc, p) => acc + ((p.aiScoreData?.finalScore || 0) * 100), 0) / analyzedPhotos.length);
  const sharpRate = Math.round((analyzedPhotos.filter(p => (p.aiScoreData?.local?.sharpnessScore || 0) > 0.7).length / analyzedPhotos.length) * 100);
  
  const getAvgEyeScore = (p: any) => {
    const faces = p.aiScoreData?.local?.faces || [];
    if (faces.length === 0) return 100;
    return (faces.reduce((sum: number, f: any) => sum + f.eyeOpenScore, 0) / faces.length) * 100;
  };
  
  const blinkRate = Math.round((analyzedPhotos.filter(p => getAvgEyeScore(p) < 30).length / analyzedPhotos.length) * 100);
  const heroCount = photos.filter(p => p.aiScoreData?.grade === 'hero').length;

  const scoreDistribution = [
    { range: '0-20', count: analyzedPhotos.filter(p => (p.aiScoreData?.finalScore || 0) * 100 <= 20).length },
    { range: '21-40', count: analyzedPhotos.filter(p => (p.aiScoreData?.finalScore || 0) * 100 > 20 && (p.aiScoreData?.finalScore || 0) * 100 <= 40).length },
    { range: '41-60', count: analyzedPhotos.filter(p => (p.aiScoreData?.finalScore || 0) * 100 > 40 && (p.aiScoreData?.finalScore || 0) * 100 <= 60).length },
    { range: '61-80', count: analyzedPhotos.filter(p => (p.aiScoreData?.finalScore || 0) * 100 > 60 && (p.aiScoreData?.finalScore || 0) * 100 <= 80).length },
    { range: '81-100', count: analyzedPhotos.filter(p => (p.aiScoreData?.finalScore || 0) * 100 > 80).length },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 bg-white rounded-3xl shadow-xl border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase text-black">Shoot Quality Report</h2>
          <p className="text-xs font-bold text-black/40 uppercase tracking-widest mt-1">SelectPro AI Analysis Summary</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-system-accent text-white rounded-full">
          <Zap size={16} />
          <span className="text-sm font-black uppercase tracking-widest">AI Scanned</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
          <div className="flex items-center gap-2 text-black/40 mb-2">
            <Target size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Avg Score</span>
          </div>
          <div className="text-3xl font-black text-black">{avgScore}</div>
          <div className="text-[10px] font-bold text-system-accent uppercase mt-1">Excellent</div>
        </div>
        <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
          <div className="flex items-center gap-2 text-black/40 mb-2">
            <ImageIcon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Sharpness</span>
          </div>
          <div className="text-3xl font-black text-black">{sharpRate}%</div>
          <div className="text-[10px] font-bold text-emerald-500 uppercase mt-1">In Focus</div>
        </div>
        <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
          <div className="flex items-center gap-2 text-black/40 mb-2">
            <Eye size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Blink Rate</span>
          </div>
          <div className="text-3xl font-black text-black">{blinkRate}%</div>
          <div className="text-[10px] font-bold text-amber-500 uppercase mt-1">Eyes Closed</div>
        </div>
        <div className="p-4 bg-black/5 rounded-2xl border border-black/5">
          <div className="flex items-center gap-2 text-black/40 mb-2">
            <Smile size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Hero Shots</span>
          </div>
          <div className="text-3xl font-black text-black">{heroCount}</div>
          <div className="text-[10px] font-bold text-system-highlight uppercase mt-1">High Potential</div>
        </div>
      </div>

      <div className="h-64 w-full">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-4">Score Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={scoreDistribution}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
            <XAxis 
              dataKey="range" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#00000040' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#00000040' }} 
            />
            <Tooltip 
              cursor={{ fill: '#00000005' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 700 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {scoreDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 4 ? '#00E5FF' : '#00000010'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-4 bg-system-accent/5 rounded-2xl border border-system-accent/10 flex items-start gap-4">
        <div className="p-2 bg-system-accent text-white rounded-lg">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-system-accent">Photographer Insights</h4>
          <p className="text-xs text-black/60 mt-1 leading-relaxed">
            Your sharpness rate is slightly below your average. Consider checking your shutter speed in low light. 
            However, your blink rate is excellent, indicating great timing on portraits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShootQualityReport;
