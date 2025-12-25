import React, { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  originalSrc: string;
  processedSrc: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ originalSrc, processedSrc }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e as unknown as MouseEvent).clientX - rect.left);
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };
  
  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const touch = (e as unknown as TouchEvent).touches[0];
    const x = (touch.clientX - rect.left);
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div 
      className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden select-none cursor-ew-resize group shadow-md"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Background: Processed Image */}
      <img 
        src={processedSrc} 
        alt="After" 
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
      />

      {/* Foreground: Original Image (Clipped) */}
      <div 
        className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={originalSrc} 
          alt="Before" 
          className="absolute top-0 left-0 w-full h-full object-contain max-w-none"
          // We need to match the parent container's width exactly to ensure alignment
          style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
        />
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none transition-transform"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        Original
      </div>
      <div className="absolute top-4 right-4 bg-indigo-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
        Recolored
      </div>
    </div>
  );
};

export default BeforeAfterSlider;