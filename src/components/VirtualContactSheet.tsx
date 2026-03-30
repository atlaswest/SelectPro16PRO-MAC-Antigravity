import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Grid } from 'react-window';
import { PhotoItem } from '../types';
import ContactSheetItem from './ContactSheetItem';
import { ImageTag } from './ImageScoreTag';

interface VirtualContactSheetProps {
  images: PhotoItem[];
  selectedIds: string[];
  selectionFrameColor: 'cyan' | 'canary';
  handlePhotoClick: (id: string, e: React.MouseEvent) => void;
  setViewMode: (mode: any) => void;
  setSelectedIds: (ids: string[]) => void;
  containerWidth: number;
  containerHeight: number;
  thumbnailMinSize: number;
  thumbnailMaxSize: number;
  rowPadding: number;
  onTagChange?: (updated: ImageTag) => void;
  showAiAnalysis?: boolean;
  isLowPowerMode?: boolean;
  isMobile?: boolean;
  visibleBadges?: string[];
}

const VirtualContactSheet: React.FC<VirtualContactSheetProps> = React.memo(({
  images,
  selectedIds,
  selectionFrameColor,
  handlePhotoClick,
  setViewMode,
  setSelectedIds,
  containerWidth,
  containerHeight,
  thumbnailMinSize,
  thumbnailMaxSize,
  rowPadding,
  onTagChange,
  showAiAnalysis = true,
  isLowPowerMode = false,
  isMobile = false,
  visibleBadges = ['grade', 'score', 'eyes', 'smile', 'blur', 'composition', 'lighting']
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbSize, setThumbSize] = useState(thumbnailMinSize);
  const [columnCount, setColumnCount] = useState(1);
  const [collapsedBurstIds, setCollapsedBurstIds] = useState<Set<string>>(new Set());

  const toggleBurst = (burstId: string) => {
    setCollapsedBurstIds(prev => {
      const next = new Set(prev);
      if (next.has(burstId)) next.delete(burstId);
      else next.add(burstId);
      return next;
    });
  };

  const visibleImages = useMemo(() => {
    return images.filter(img => {
      if (!img.burstId) return true;
      if (img.isBurstLead) return true;
      return !collapsedBurstIds.has(img.burstId);
    });
  }, [images, collapsedBurstIds]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.offsetWidth - 32; // Account for padding

    // Adaptive calculation (grid density logic)
    const ideal = width / 6;

    const clamped = Math.max(
      thumbnailMinSize,
      Math.min(thumbnailMaxSize, ideal)
    );

    const cols = Math.floor(width / (clamped + rowPadding));
    setColumnCount(Math.max(1, cols));
    setThumbSize(clamped);
  }, [thumbnailMinSize, thumbnailMaxSize, containerWidth, rowPadding]);

  const rowCount = Math.ceil(visibleImages.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style, ariaAttributes }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    const img = visibleImages[index];

    if (!img) return null;

    return (
      <div 
        {...ariaAttributes}
        style={{
          ...style,
          padding: rowPadding / 2,
        }}
      >
        <ContactSheetItem 
          photo={img} 
          selected={selectedIds.includes(img.id)} 
          selectionColor={selectionFrameColor}
          onClick={(e: React.MouseEvent) => handlePhotoClick(img.id, e)}
          onDoubleClick={() => { setSelectedIds([img.id]); setViewMode('image'); }}
          onTagChange={onTagChange}
          showAiAnalysis={showAiAnalysis}
          isLowPowerMode={isLowPowerMode}
          isMobile={isMobile}
          onToggleBurst={toggleBurst}
          isCollapsed={img.burstId ? collapsedBurstIds.has(img.burstId) : false}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden bg-system-bg">
      <Grid
        columnCount={columnCount}
        columnWidth={(containerWidth - 32) / columnCount}
        rowCount={rowCount}
        rowHeight={thumbSize + rowPadding}
        style={{ height: containerHeight, width: containerWidth }}
        className="custom-scrollbar"
        cellComponent={Cell}
        cellProps={{}}
      />
    </div>
  );
});

export default VirtualContactSheet;
