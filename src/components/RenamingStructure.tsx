import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Info, AlertCircle, CheckCircle2, ChevronDown, Hash, MapPin, Tag, Type, User, Calendar, Sparkles } from 'lucide-react';
import { RenamingSettings, PhotoItem } from '../types';

interface RenamingStructureProps {
  settings: RenamingSettings;
  onUpdate: (settings: Partial<RenamingSettings>) => void;
  photos: PhotoItem[];
}

const RenamingStructure: React.FC<RenamingStructureProps> = ({ settings, onUpdate, photos }) => {
  const BLOCKED_CHARS = /[ #%&{}<>*?/\$!'":@+`|=]/g;

  const validateValue = (val: string) => {
    return val.replace(BLOCKED_CHARS, '').toLowerCase().replace(/\s+/g, '_');
  };

  const generatePreview = (index: number) => {
    const seq = (settings.sequenceStart + index).toString().padStart(4, '0');
    
    if (settings.pattern === 'simple') {
      return `Seqn_${seq}`;
    }

    const person = settings.personPlace ? `${settings.personPlace}_` : '';
    const event = settings.event ? `${settings.event}_` : '';
    const location = settings.location ? `${settings.location}` : '';
    
    // Advanced pattern: [Person]_[Event]_[Location]-[Sequence]
    let base = `${person}${event}${location}`;
    if (base.endsWith('_')) base = base.slice(0, -1);
    
    return `${base}-${seq}`.toLowerCase();
  };

  const previews = useMemo(() => {
    return [0, 1, 2].map(i => generatePreview(i));
  }, [settings]);

  const charCount = previews[0].length;
  const countColor = charCount > 70 ? 'text-red-500' : charCount > 50 ? 'text-yellow-500' : 'text-emerald-500';

  const hasInvalidChars = (val: string) => BLOCKED_CHARS.test(val);

  return (
    <div className="space-y-8">
      {/* Pattern Selection */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onUpdate({ pattern: 'simple' })}
          className={`p-6 rounded-3xl border-2 transition-all text-left group ${
            settings.pattern === 'simple' 
              ? 'border-black bg-black text-white shadow-xl' 
              : 'border-black/5 bg-black/5 text-black hover:border-black/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Hash size={20} className={settings.pattern === 'simple' ? 'text-white/60' : 'text-black/40'} />
            {settings.pattern === 'simple' && <CheckCircle2 size={16} className="text-white" />}
          </div>
          <div className="text-sm font-black uppercase tracking-tight">Simple</div>
          <div className={`text-[10px] mt-1 font-medium uppercase tracking-widest ${settings.pattern === 'simple' ? 'text-white/40' : 'text-black/30'}`}>
            Seqn_0001
          </div>
        </button>

        <button
          onClick={() => onUpdate({ pattern: 'advanced' })}
          className={`p-6 rounded-3xl border-2 transition-all text-left group ${
            settings.pattern === 'advanced' 
              ? 'border-black bg-black text-white shadow-xl' 
              : 'border-black/5 bg-black/5 text-black hover:border-black/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Type size={20} className={settings.pattern === 'advanced' ? 'text-white/60' : 'text-black/40'} />
            {settings.pattern === 'advanced' && <CheckCircle2 size={16} className="text-white" />}
          </div>
          <div className="text-sm font-black uppercase tracking-tight">Advanced</div>
          <div className={`text-[10px] mt-1 font-medium uppercase tracking-widest ${settings.pattern === 'advanced' ? 'text-white/40' : 'text-black/30'}`}>
            Person_Event_Location-ID
          </div>
        </button>
      </div>

      {/* Configuration Inputs */}
      <div className="space-y-6">
        {settings.pattern === 'advanced' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Person/Place */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                  <User size={10} /> Person / Place
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={settings.personPlace}
                    onChange={(e) => onUpdate({ personPlace: validateValue(e.target.value) })}
                    placeholder="e.g. JohnDoe"
                    className="w-full p-4 bg-black/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10 shadow-inner border border-black/5"
                  />
                  {/* Relief Suggestions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Client', 'Family', 'Studio', 'Outdoor'].map(s => (
                      <button
                        key={s}
                        onClick={() => onUpdate({ personPlace: validateValue(s) })}
                        className="px-2 py-1 bg-white border border-black/5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black/40 hover:text-black hover:border-black/20 hover:shadow-md transition-all active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Event */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                  <Calendar size={10} /> Event
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={settings.event}
                    onChange={(e) => onUpdate({ event: validateValue(e.target.value) })}
                    placeholder="e.g. Wedding"
                    className="w-full p-4 bg-black/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10 shadow-inner border border-black/5"
                  />
                  {/* Relief Suggestions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Ceremony', 'Reception', 'Portrait', 'Action'].map(s => (
                      <button
                        key={s}
                        onClick={() => onUpdate({ event: validateValue(s) })}
                        className="px-2 py-1 bg-white border border-black/5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black/40 hover:text-black hover:border-black/20 hover:shadow-md transition-all active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                  <MapPin size={10} /> Location
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => onUpdate({ location: validateValue(e.target.value) })}
                    placeholder="e.g. London"
                    className="w-full p-4 bg-black/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10 shadow-inner border border-black/5"
                  />
                  {/* Relief Suggestions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Downtown', 'Park', 'Beach', 'Mountain'].map(s => (
                      <button
                        key={s}
                        onClick={() => onUpdate({ location: validateValue(s) })}
                        className="px-2 py-1 bg-white border border-black/5 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black/40 hover:text-black hover:border-black/20 hover:shadow-md transition-all active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
              <Hash size={10} /> Sequence Start
            </label>
            <input
              type="number"
              value={settings.sequenceStart}
              onChange={(e) => onUpdate({ sequenceStart: parseInt(e.target.value) || 1 })}
              className="w-full p-4 bg-black/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <div className="pt-6">
            <div className={`text-2xl font-black tracking-tighter ${countColor}`}>
              {charCount}
              <span className="text-[10px] uppercase tracking-widest ml-1 opacity-40">chars</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Features */}
      <div className="p-6 bg-black/5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
              <MapPin size={14} className="text-black/60" />
            </div>
            <div>
              <div className="text-xs font-bold text-black">Smart Location Suggestion</div>
              <div className="text-[10px] text-black/40 uppercase tracking-wider">Extract from EXIF GPS data</div>
            </div>
          </div>
          <button 
            onClick={() => onUpdate({ useExifLocation: !settings.useExifLocation })}
            className={`w-10 h-5 rounded-full transition-all relative ${settings.useExifLocation ? 'bg-emerald-500' : 'bg-black/10'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${settings.useExifLocation ? 'left-6 bg-white' : 'left-1 bg-black/40'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
              <Tag size={14} className="text-black/60" />
            </div>
            <div>
              <div className="text-xs font-bold text-black">Predictive Subject</div>
              <div className="text-[10px] text-black/40 uppercase tracking-wider">Derive from folder structure</div>
            </div>
          </div>
          <button 
            onClick={() => onUpdate({ useFolderSubject: !settings.useFolderSubject })}
            className={`w-10 h-5 rounded-full transition-all relative ${settings.useFolderSubject ? 'bg-emerald-500' : 'bg-black/10'}`}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${settings.useFolderSubject ? 'left-6 bg-white' : 'left-1 bg-black/40'}`} />
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-black/40">Real-time Preview</h4>
          {charCount > 50 && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-600 uppercase tracking-wider">
              <AlertCircle size={12} /> Web-safe limit exceeded
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {previews.map((name, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-black/5 rounded-2xl group hover:bg-black/10 transition-all">
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-black text-black/20 w-4">{i + 1}</div>
                <div className="text-xs font-mono font-bold text-black flex items-center gap-1">
                  {settings.pattern === 'simple' ? (
                    <>
                      <span>Seqn_</span>
                      <input
                        type="text"
                        value={name.split('_')[1]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) onUpdate({ sequenceStart: val });
                        }}
                        className="w-16 px-2 py-0.5 rounded-md font-black text-base cursor-text transition-colors focus:outline-none focus:ring-0"
                        style={{ 
                          backgroundColor: 'var(--color-neutral-grey)',
                          // Using a slightly darker tone for focus if possible, or just relying on focus state
                        }}
                        onFocus={(e) => e.target.style.backgroundColor = 'var(--color-neutral-grey-active)'}
                        onBlur={(e) => e.target.style.backgroundColor = 'var(--color-neutral-grey)'}
                      />
                    </>
                  ) : (
                    <>
                      {name.split('-')[0]}
                      <span className="text-black/30">-</span>
                      <input
                        type="text"
                        value={name.split('-')[1]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) onUpdate({ sequenceStart: val });
                        }}
                        className="w-16 px-2 py-0.5 rounded-md font-black text-base cursor-text transition-colors focus:outline-none focus:ring-0"
                        style={{ 
                          backgroundColor: 'var(--color-neutral-grey)'
                        }}
                        onFocus={(e) => e.target.style.backgroundColor = 'var(--color-neutral-grey-active)'}
                        onBlur={(e) => e.target.style.backgroundColor = 'var(--color-neutral-grey)'}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="text-[10px] font-black text-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                .JPG
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timing Option */}
      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Info size={14} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-black">Apply naming after import completes</div>
            <div className="text-[10px] text-black/40 uppercase tracking-wider">Recommended batch workflow</div>
          </div>
        </div>
        <button 
          onClick={() => onUpdate({ applyAfterImport: !settings.applyAfterImport })}
          className={`w-12 h-6 rounded-full transition-all relative ${settings.applyAfterImport ? 'bg-emerald-500' : 'bg-black/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${settings.applyAfterImport ? 'left-7 bg-white' : 'left-1 bg-black/40'}`} />
        </button>
      </div>
    </div>
  );
};

export default RenamingStructure;
