import React, { useRef, useEffect, useState } from 'react';

interface ImageSamplerProps {
  src: string;
  onColorPicked: (hex: string) => void;
  onCancel: () => void;
}

const ImageSampler: React.FC<ImageSamplerProps> = ({ src, onColorPicked, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoverColor, setHoverColor] = useState('#ffffff');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getHexColor = (x: number, y: number) => {
    if (!canvasRef.current || !imgRef.current) return '#ffffff';
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#ffffff';

    // Get the actual displayed dimensions vs natural dimensions
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;

    const pixelX = Math.floor(x * scaleX);
    const pixelY = Math.floor(y * scaleY);

    const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
    return `#${((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1).toUpperCase()}`;
  };

  const handleImageLoad = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imgRef.current.naturalWidth;
    canvas.height = imgRef.current.naturalHeight;
    ctx.drawImage(imgRef.current, 0, 0);
    setIsLoaded(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });
    setHoverColor(getHexColor(x, y));
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onColorPicked(getHexColor(x, y));
  };

  return (
    <div className="relative cursor-crosshair group overflow-hidden" onMouseMove={handleMouseMove} onClick={handleClick}>
      <img 
        ref={imgRef}
        src={src} 
        alt="Sampler Source" 
        className="w-full h-full object-contain pointer-events-none"
        onLoad={handleImageLoad}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Sampling Overlay */}
      <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold text-indigo-600 shadow-lg border border-indigo-100 uppercase tracking-widest">
          Click to sample pigment
        </div>
      </div>

      {/* Floating Loupe */}
      <div 
        className="fixed pointer-events-none z-[100] w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-75"
        style={{ 
          left: mousePos.x + 20, 
          top: mousePos.y + 20,
          backgroundColor: hoverColor,
          transform: 'scale(1)'
        }}
      >
        <div className={`text-[8px] font-black ${parseInt(hoverColor.slice(1), 16) > 0xffffff / 2 ? 'text-black/50' : 'text-white/50'}`}>
          {hoverColor}
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="absolute top-2 right-2 p-1.5 bg-white/90 text-gray-500 rounded-full shadow-sm hover:text-red-500 z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default ImageSampler;