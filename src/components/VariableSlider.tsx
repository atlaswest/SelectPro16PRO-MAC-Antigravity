import React from 'react';

interface VariableSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

const VariableSlider: React.FC<VariableSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-system-secondary uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-mono text-system-accent font-bold">{value}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-black/5 rounded-full appearance-none cursor-pointer accent-system-accent"
      />
    </div>
  );
};

export default VariableSlider;
