import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Image as ImageIcon, FileJson, FileCode } from 'lucide-react';
import { PhotoItem } from '../types';
import { generateXMP } from '../services/xmpService';
import { getPhotoFromCache } from '../services/dbService';
import JSZip from 'jszip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, photos, addToast }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async (format: string) => {
    if (photos.length === 0) {
      addToast('No photos selected for export', 'error');
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const total = photos.length;

      if (format === 'XMP' || format === 'JPEG' || format === 'Batch') {
        for (let i = 0; i < total; i++) {
          const photo = photos[i];
          const fileName = photo.file?.name || photo.id;
          const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

          // Add XMP if requested
          if (format === 'XMP' || format === 'Batch') {
            const xmp = generateXMP(photo);
            zip.file(`${baseName}.xmp`, xmp);
          }

          // Add JPEG if requested
          if (format === 'JPEG' || format === 'Batch') {
            const cached = await getPhotoFromCache(photo.id);
            if (cached?.blob) {
              const extension = fileName.split('.').pop() || 'jpg';
              zip.file(`${baseName}.${extension}`, cached.blob);
            }
          }

          if (i % 5 === 0 || i === total - 1) {
            setProgress(Math.round(((i + 1) / total) * 100));
            // Small delay to keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `SelectPro_Export_${format}_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast(`Successfully exported ${photos.length} items as ${format} ZIP`, 'success');
        onClose();
      } else if (format === 'JSON') {
        const exportData = photos.map(p => ({
          id: p.id,
          filename: p.file?.name,
          rating: p.rating,
          colorTag: p.colorTag,
          tags: p.tags,
          aiResult: p.result,
          metadata: p.metadata
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SelectPro_Metadata_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addToast(`Successfully exported metadata for ${photos.length} items`, 'success');
        onClose();
      }
    } catch (err) {
      console.error(`${format} Export failed:`, err);
      addToast(`Failed to export as ${format}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md flex flex-col gap-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter uppercase text-black">Export Assets</h2>
          {!isExporting && (
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black">
              <X size={20} />
            </button>
          )}
        </div>
        
        {isExporting ? (
          <div className="py-12 flex flex-col items-center gap-6">
            <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-system-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-black/40">Processing Batch... {progress}%</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-black/5 rounded-xl flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Selected Items</span>
                <span className="text-xl font-bold text-black">{photos.length} Photos</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleExport('JPEG')} className="p-4 border border-black/10 rounded-xl hover:bg-black/5 transition-all flex flex-col items-center gap-2 text-black">
                  <ImageIcon size={24} />
                  <span className="text-xs font-bold">JPEG</span>
                </button>
                <button onClick={() => handleExport('JSON')} className="p-4 border border-black/10 rounded-xl hover:bg-black/5 transition-all flex flex-col items-center gap-2 text-black">
                  <FileJson size={24} />
                  <span className="text-xs font-bold">JSON Data</span>
                </button>
                <button onClick={() => handleExport('XMP')} className="p-4 border border-black/10 rounded-xl hover:bg-black/5 transition-all flex flex-col items-center gap-2 text-black col-span-2">
                  <FileCode size={24} />
                  <span className="text-xs font-bold">XMP Sidecars (Lightroom/C1)</span>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => handleExport('Batch')}
              className="w-full py-4 bg-system-accent text-white rounded-xl font-bold uppercase tracking-widest hover:bg-system-accent/90 transition-all shadow-lg shadow-system-accent/20"
            >
              Begin Export
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ExportModal;
