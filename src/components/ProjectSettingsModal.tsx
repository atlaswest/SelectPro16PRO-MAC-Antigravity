import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSave: (settings: any) => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md flex flex-col gap-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter uppercase text-black">Renaming Structure</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Project Name</label>
            <input 
              type="text" 
              className="w-full p-3 bg-black/5 rounded-lg border-none focus:ring-2 focus:ring-system-accent text-black" 
              value={localSettings.name}
              onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Client ID</label>
            <input 
              type="text" 
              className="w-full p-3 bg-black/5 rounded-lg border-none focus:ring-2 focus:ring-system-accent text-black" 
              value={localSettings.clientId}
              onChange={(e) => setLocalSettings({ ...localSettings, clientId: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-black/40">Photographer</label>
            <input 
              type="text" 
              className="w-full p-3 bg-black/5 rounded-lg border-none focus:ring-2 focus:ring-system-accent text-black" 
              value={localSettings.photographer}
              onChange={(e) => setLocalSettings({ ...localSettings, photographer: e.target.value })}
            />
          </div>
        </div>
        
        <button 
          onClick={() => { onSave(localSettings); onClose(); }}
          className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-black/90 transition-all"
        >
          Save Settings
        </button>
      </motion.div>
    </div>
  );
};

export default ProjectSettingsModal;
