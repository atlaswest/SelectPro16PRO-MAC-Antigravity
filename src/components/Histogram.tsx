import React, { useRef, useEffect, useState } from 'react';
import { PhotoItem } from '../types';
import { calculateHistogram } from '../services/exifService';

const Histogram: React.FC<{ photo: PhotoItem; showComparison?: boolean }> = ({ photo, showComparison }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogramData, setHistogramData] = useState<{ r: number[], g: number[], b: number[] } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = photo.preview;
    img.onload = () => {
      const data = calculateHistogram(img);
      setHistogramData(data);
    };
  }, [photo.preview]);

  useEffect(() => {
    if (!canvasRef.current || !histogramData) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    const drawChannel = (data: number[], color: string, opacity: number, offset = 0) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(0, height);
      
      const step = width / 256;
      for (let i = 0; i < 256; i++) {
        // Apply a slight shift if offset is provided (simulating enhancement)
        const index = Math.max(0, Math.min(255, i - offset));
        const val = (data[index] / 100) * height;
        ctx.lineTo(i * step, height - val);
      }
      
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    // Background for better contrast
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for(let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (width / 4), 0);
      ctx.lineTo(i * (width / 4), height);
      ctx.stroke();
    }

    if (showComparison) {
      // Draw "Original" in muted tones
      drawChannel(histogramData.r, '#ff4444', 0.1);
      drawChannel(histogramData.g, '#44ff44', 0.1);
      drawChannel(histogramData.b, '#4444ff', 0.1);
      
      // Draw "Enhanced" (simulated by shifting and brighter colors)
      drawChannel(histogramData.r, '#ff4444', 0.6, 10); // Shifted right
      drawChannel(histogramData.g, '#44ff44', 0.6, 5);
      drawChannel(histogramData.b, '#4444ff', 0.6, -5); // Shifted left
    } else {
      drawChannel(histogramData.r, '#ff4444', 0.5); // Red
      drawChannel(histogramData.g, '#44ff44', 0.5); // Green
      drawChannel(histogramData.b, '#4444ff', 0.5); // Blue
      
      // Proper Luminance (Rec. 601)
      const luminance = histogramData.r.map((r, i) => (0.299 * r + 0.587 * histogramData.g[i] + 0.114 * histogramData.b[i]));
      drawChannel(luminance, '#ffffff', 0.3);
    }

    // EXIF Overlay
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const exifText = [
      photo.metadata.cameraModel,
      `${photo.metadata.aperture ? `f/${photo.metadata.aperture}` : ''} ${photo.metadata.shutterSpeed || ''} ISO ${photo.metadata.iso || ''}`,
      photo.metadata.lens
    ].filter(Boolean).join(' | ');

    if (exifText) {
      ctx.fillText(exifText, 5, 5);
    }
  }, [histogramData, photo.metadata]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100} 
      className="w-full h-full opacity-90"
    />
  );
};

export default Histogram;
