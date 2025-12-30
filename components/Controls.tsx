import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, PRODUCT_CATEGORIES, COLOR_LIBRARY, ColorDefinition, GenerationSettings, ImageSize, ModelTier } from '../types';

interface ControlsProps {
  mode: 'recolor' | 'generate';
  setMode: (mode: 'recolor' | 'generate') => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  genSettings: GenerationSettings;
  updateGenSettings: (newSettings: Partial<GenerationSettings>) => void;
  isProcessing: boolean;
  onProcess: () => void;
  hasImages: boolean;
  imageCount: number;
  isSampling: boolean;
  setSampling: (sampling: boolean) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  mode,
  setMode,
  settings, 
  updateSettings,
  genSettings,
  updateGenSettings,
  isProcessing,
  onProcess,
  hasImages,
  imageCount,
  isSampling,
  setSampling
}) => {
  const [customHex, setCustomHex] = useState('#6366f1');
  const [customName, setCustomName] = useState('My Custom Color');
  const [activeTab, setActiveTab] = useState<string>(Object.keys(COLOR_LIBRARY)[0]);
  
  // Reference Swatch Sampler state
  const [refImage, setRefImage] = useState<string | null>(null);
  const refCanvasRef = useRef<HTMLCanvasElement>(null);
  const refImgRef = useRef<HTMLImageElement>(null);
  const [hoverColor, setHoverColor] = useState('#ffffff');
  const [isHoveringRef, setIsHoveringRef] = useState(false);

  const toggleColor = (color: ColorDefinition) => {
    const exists = settings.targetColors.find(c => c.hex.toLowerCase() === color.hex.toLowerCase());
    if (exists) {
      updateSettings({
        targetColors: settings.targetColors.filter(c => c.hex.toLowerCase() !== color.hex.toLowerCase())
      });
    } else {
      updateSettings({
        targetColors: [...settings.targetColors, color]
      });
    }
  };

  const selectCurrentCategory = () => {
    const categoryColors = COLOR_LIBRARY[activeTab];
    const newColors = [...settings.targetColors];
    categoryColors.forEach(color => {
      if (!newColors.find(c => c.hex.toLowerCase() === color.hex.toLowerCase())) {
        newColors.push(color);
      }
    });
    updateSettings({ targetColors: newColors });
  };

  const clearColors = () => {
    updateSettings({ targetColors: [] });
  };

  const addCustomColor = (hex: string = customHex, name: string = customName) => {
    const newColor: ColorDefinition = { name: name || 'Custom', hex };
    if (!settings.targetColors.find(c => c.hex.toLowerCase() === hex.toLowerCase())) {
      updateSettings({
        targetColors: [...settings.targetColors, newColor]
      });
    }
  };

  // Reference Sampler Logic
  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setRefImage(ev.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const drawRefToCanvas = () => {
    if (!refImgRef.current || !refCanvasRef.current) return;
    const canvas = refCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = refImgRef.current.naturalWidth;
    canvas.height = refImgRef.current.naturalHeight;
    ctx.drawImage(refImgRef.current, 0, 0);
  };

  const getRefColor = (e: React.MouseEvent) => {
    if (!refImgRef.current || !refCanvasRef.current) return '#ffffff';
    const rect = refImgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = refImgRef.current.naturalWidth / rect.width;
    const scaleY = refImgRef.current.naturalHeight / rect.height;
    
    const ctx = refCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#ffffff';
    
    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    return `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
  };

  const totalVariants = mode === 'recolor' ? settings.targetColors.length * imageCount : 1;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6 h-fit sticky top-6">
      
      {/* Mode Switcher */}
      <div className="flex p-1 bg-gray-100 rounded-lg">
        <button 
          onClick={() => setMode('recolor')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'recolor' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Recolor Batch
        </button>
        <button 
          onClick={() => setMode('generate')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'generate' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          AI Generate
        </button>
      </div>

      {mode === 'recolor' && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">AI Model Engine</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateSettings({ modelTier: 'flash' })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-left ${
                settings.modelTier === 'flash' 
                  ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span className={`w-2 h-2 rounded-full ${settings.modelTier === 'flash' ? 'bg-indigo-500' : 'bg-gray-300'}`}></span>
                <span className={`text-[11px] font-bold ${settings.modelTier === 'flash' ? 'text-indigo-700' : 'text-gray-600'}`}>Performance</span>
              </div>
              <span className="text-[9px] text-gray-500 leading-tight w-full">2.5 Flash • Fast & Efficient</span>
            </button>
            <button
              onClick={() => updateSettings({ modelTier: 'pro' })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all text-left ${
                settings.modelTier === 'pro' 
                  ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span className={`w-2 h-2 rounded-full ${settings.modelTier === 'pro' ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                <span className={`text-[11px] font-bold ${settings.modelTier === 'pro' ? 'text-purple-700' : 'text-gray-600'}`}>High Fidelity</span>
              </div>
              <span className="text-[9px] text-gray-500 leading-tight w-full">3 Pro • Ultra-Accuracy</span>
            </button>
          </div>
        </section>
      )}

      {mode === 'recolor' ? (
        <>
          {/* 1. Category Selection */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Product Category</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => updateSettings({ category: cat })}
                  className={`text-xs py-2 px-1 rounded-md border transition-all ${
                    settings.category === cat 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* 2. Swatch Sampler (New Feature) */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Swatch Sampler</h3>
                {refImage && (
                  <button onClick={() => setRefImage(null)} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear</button>
                )}
             </div>
             
             {!refImage ? (
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white hover:border-indigo-400 transition-colors group">
                   <input type="file" accept="image/*" onChange={handleRefUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                   <div className="flex flex-col items-center gap-2 text-slate-400 pointer-events-none group-hover:text-indigo-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      <span className="text-[10px] font-bold uppercase">Upload Ref Swatch</span>
                   </div>
                </div>
             ) : (
                <div 
                  className="relative aspect-video bg-white rounded-lg border border-slate-200 overflow-hidden cursor-crosshair group"
                  onMouseEnter={() => setIsHoveringRef(true)}
                  onMouseLeave={() => setIsHoveringRef(false)}
                  onMouseMove={(e) => setHoverColor(getRefColor(e))}
                  onClick={(e) => addCustomColor(getRefColor(e), `Swatch ${getRefColor(e)}`)}
                >
                   <img 
                    ref={refImgRef}
                    src={refImage} 
                    alt="Ref Swatch" 
                    className="w-full h-full object-cover"
                    onLoad={drawRefToCanvas}
                   />
                   <canvas ref={refCanvasRef} className="hidden" />
                   <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[8px] font-black text-indigo-600 uppercase shadow-sm border border-indigo-100">Click to extract color</div>
                   </div>
                   {isHoveringRef && (
                      <div 
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: hoverColor }}
                      >
                         <span className={`text-[6px] font-bold ${parseInt(hoverColor.slice(1), 16) > 0xffffff / 2 ? 'text-black' : 'text-white'}`}>{hoverColor}</span>
                      </div>
                   )}
                </div>
             )}
          </section>

          {/* 3. Color Library */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Color Library</h3>
              <div className="flex gap-2">
                <button 
                  onClick={selectCurrentCategory}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                >
                  Add Set
                </button>
                <span className="text-gray-300 text-[10px]">|</span>
                <button 
                  onClick={clearColors}
                  className="text-[10px] font-bold text-gray-400 hover:text-red-600 uppercase"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Library Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar mb-3 border-b border-gray-100">
              {Object.keys(COLOR_LIBRARY).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`text-[10px] whitespace-nowrap px-3 py-1.5 rounded-full font-bold transition-all ${
                    activeTab === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {COLOR_LIBRARY[activeTab].map((preset) => {
                const isSelected = settings.targetColors.some(c => c.hex.toLowerCase() === preset.hex.toLowerCase());
                return (
                  <button
                    key={preset.hex}
                    onClick={() => toggleColor(preset)}
                    className={`group relative w-full aspect-square rounded-lg border-2 transition-transform hover:scale-105 flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-100'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  >
                     <div className={`text-[8px] font-bold uppercase drop-shadow-md text-center px-1 leading-tight ${
                       preset.hex === '#FFFFFF' ? 'text-gray-400' : 'text-white'
                     }`}>
                        {isSelected ? '✓' : ''}
                     </div>
                  </button>
                );
              })}
            </div>

            {/* Custom & Picker Input */}
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 bg-transparent flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Label (e.g. Sage)"
                    className="flex-1 text-[11px] p-1.5 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={() => addCustomColor()} 
                    className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm"
                    title="Add to batch"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSampling(!isSampling)}
                disabled={!hasImages}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                  isSampling 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                    : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200'
                } ${!hasImages ? 'opacity-50 cursor-not-allowed border-gray-100 text-gray-400 bg-gray-50' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l1.5 1.5.75-.75V8.758l2.25 2.25a.75.75 0 010 1.06l-6.387 6.387a2.121 2.121 0 01-2.999 0l-5.118-5.118a2.121 2.121 0 010-2.999l6.387-6.387a.75.75 0 011.06 0l2.25 2.25v.75l-.75.75-1.5-1.5" />
                </svg>
                {isSampling ? 'Cancel Sampling' : 'Sample from Image'}
              </button>
            </div>
          </section>

          {/* Selected Swatches Summary */}
          {settings.targetColors.length > 0 && (
            <section className="animate-in fade-in slide-in-from-top-2">
               <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Batch Queue ({settings.targetColors.length})</h3>
               <div className="flex flex-wrap gap-1.5">
                  {settings.targetColors.map(c => (
                    <div key={c.hex} className="group relative flex items-center gap-1.5 bg-white border border-gray-200 py-1 px-1.5 rounded-full text-[10px] font-medium text-gray-700 shadow-sm">
                       <div className="w-3 h-3 rounded-full border border-gray-100" style={{ backgroundColor: c.hex }}></div>
                       <span className="max-w-[80px] truncate">{c.name}</span>
                       <button 
                        onClick={() => toggleColor(c)}
                        className="text-gray-300 hover:text-red-500"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                  ))}
               </div>
            </section>
          )}

          {/* 3. Advanced Settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Advanced Settings</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Fabric Type</label>
              <input
                type="text"
                value={settings.fabricType}
                onChange={(e) => updateSettings({ fabricType: e.target.value })}
                placeholder="e.g. Cotton Rib, Silk, Denim"
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <Toggle label="Strict Collection Consistency" active={settings.batchConsistency} onChange={(v) => updateSettings({ batchConsistency: v })} />
              <Toggle label="Fabric Awareness Mode" active={settings.fabricAwareness} onChange={(v) => updateSettings({ fabricAwareness: v })} />
              <Toggle label="Print & Embroidery Protect" active={settings.printProtection} onChange={(v) => updateSettings({ printProtection: v })} />
              <Toggle label="E-commerce Color Accuracy" active={settings.colorAccuracy} onChange={(v) => updateSettings({ colorAccuracy: v })} />
              <Toggle label="Edge Precision Mode" active={settings.edgePrecision} onChange={(v) => updateSettings({ edgePrecision: v })} />
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Generation Controls */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">AI Generation Settings</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Prompt</label>
              <textarea
                value={genSettings.prompt}
                onChange={(e) => updateGenSettings({ prompt: e.target.value })}
                rows={4}
                placeholder="A professional model wearing a minimalist linen summer dress in sage green, studio lighting, high resolution..."
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">Image Size (Resolution)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateGenSettings({ imageSize: size })}
                    className={`text-xs py-2 rounded-md border font-medium transition-all ${
                      genSettings.imageSize === size 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1:1', '3:4', '4:3', '9:16', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => updateGenSettings({ aspectRatio: ratio })}
                    className={`text-xs py-1 rounded-md border transition-all ${
                      genSettings.aspectRatio === ratio 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' 
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Action Button */}
      <button
        onClick={onProcess}
        disabled={isProcessing || isSampling || (mode === 'recolor' && (!hasImages || settings.targetColors.length === 0)) || (mode === 'generate' && !genSettings.prompt)}
        className={`w-full py-4 rounded-lg text-white font-semibold shadow-md transition-all flex flex-col items-center justify-center gap-1 ${
          isProcessing || isSampling || (mode === 'recolor' && (!hasImages || settings.targetColors.length === 0)) || (mode === 'generate' && !genSettings.prompt)
            ? 'bg-gray-400 cursor-not-allowed' 
            : settings.modelTier === 'pro' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
        } hover:shadow-lg active:transform active:scale-95`}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Processing Batch...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span>{mode === 'recolor' ? 'Generate Variants' : 'Generate Concept'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            {mode === 'recolor' && totalVariants > 0 && (
              <span className="text-[10px] opacity-80 font-normal">
                {totalVariants} Total • {settings.modelTier.toUpperCase()} Engine
              </span>
            )}
          </>
        )}
      </button>

      {mode === 'generate' && (
        <p className="text-[10px] text-gray-400 text-center leading-tight">
          High-resolution generation (2K/4K) utilizes the Gemini 3 Pro engine.
        </p>
      )}
    </div>
  );
};

const Toggle: React.FC<{label: string, active: boolean, onChange: (v: boolean) => void}> = ({ label, active, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-600">{label}</span>
    <button 
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${active ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default Controls;