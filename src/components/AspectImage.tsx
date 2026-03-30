import React from 'react';

interface AspectImageProps {
  src: string;
  alt?: string;
  mode?: 'thumbnail' | 'full';
  className?: string;
  style?: React.CSSProperties;
}

export const AspectImage: React.FC<AspectImageProps> = ({ 
  src, 
  alt = "Image", 
  mode = 'thumbnail',
  className = "",
  style = {}
}) => {
  return (
    <div className={`
      relative flex items-center justify-center overflow-hidden
      ${mode === 'thumbnail' ? 'bg-black/20 w-full h-full' : 'bg-black w-full h-full'}
      ${className}
    `}>
      <img
        src={src}
        alt={alt}
        className="block w-full h-full object-contain transition-all duration-300"
        style={style}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
};
