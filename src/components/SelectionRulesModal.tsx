import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import VariableSlider from './VariableSlider';

interface SelectionRulesModalProps {
  showSelectionRules: boolean;
  setShowSelectionRules: (show: boolean) => void;
  selectionRules: any;
  setSelectionRules: React.Dispatch<React.SetStateAction<any>>;
}

const SelectionRulesModal: React.FC<SelectionRulesModalProps> = ({
  showSelectionRules,
  setShowSelectionRules,
  selectionRules,
  setSelectionRules
}) => {
  if (!showSelectionRules) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-black/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-black/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase text-system-text">Custom SelectPro Rules</h2>
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
                onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minWidth: parseInt(e.target.value) || 0 }))}
                className="w-full bg-black/5 border border-black/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-system-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">Min Height</label>
              <input 
                type="number" 
                value={selectionRules.minHeight}
                onChange={(e) => setSelectionRules((prev: any) => ({ ...prev, minHeight: parseInt(e.target.value) || 0 }))}
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
                  onClick={() => setSelectionRules((prev: any) => ({ ...prev, requiredAspectRatio: ratio as any }))}
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
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minFocusScore: v }))} 
          />

          <VariableSlider 
            label="Min Expression Score" 
            value={selectionRules.minExpressionScore} 
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minExpressionScore: v }))} 
          />

          <VariableSlider 
            label="Min Composition Score" 
            value={selectionRules.minCompositionScore} 
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minCompositionScore: v }))} 
          />

          <VariableSlider 
            label="Min Eyes Open Score" 
            value={selectionRules.minEyesOpenScore} 
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minEyesOpenScore: v }))} 
          />

          <VariableSlider 
            label="Min Lighting Score" 
            value={selectionRules.minLightingScore} 
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minLightingScore: v }))} 
          />

          <VariableSlider 
            label="Min Overall AI Score" 
            value={selectionRules.minOverallScore} 
            onChange={(v) => setSelectionRules((prev: any) => ({ ...prev, minOverallScore: v }))} 
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
  );
};

export default SelectionRulesModal;
