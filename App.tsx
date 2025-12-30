import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Controls from './components/Controls';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import ExportModal from './components/ExportModal';
import ImageSampler from './components/ImageSampler';
import { AppSettings, ProcessedImage, COLOR_PRESETS, GenerationSettings, ColorDefinition } from './types';
import { recolorImageWithGemini, generateImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<'recolor' | 'generate'>('recolor');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [generatedDesigns, setGeneratedDesigns] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0); 
  const [showExport, setShowExport] = useState(false);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  
  // API Key Status (Pro models only)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const [settings, setSettings] = useState<AppSettings>({
    category: 'TOP',
    targetColors: [COLOR_PRESETS[0]],
    fabricType: 'Cotton',
    fabricAwareness: true,
    printProtection: false,
    colorAccuracy: true,
    edgePrecision: true,
    batchConsistency: true,
    modelTier: 'flash' 
  });

  const [genSettings, setGenSettings] = useState<GenerationSettings>({
    prompt: '',
    imageSize: '1K',
    aspectRatio: '1:1'
  });

  // Check for API Key on mount (Needed for Pro models)
  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  // Handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImages(prev => [...prev, {
              id: uuidv4(),
              originalUrl: e.target!.result as string,
              results: [],
              status: 'pending'
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRecolorBatch = async () => {
    if (images.length === 0 || settings.targetColors.length === 0) return;
    
    if (settings.modelTier === 'pro' && !hasApiKey) {
      setHasApiKey(false); 
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setRateLimitActive(false);
    setIsSampling(false);
    
    const tasks = [];
    for (const img of images) {
      for (const color of settings.targetColors) {
        tasks.push({ imageId: img.id, color, originalUrl: img.originalUrl });
      }
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;
    setImages(prev => prev.map(img => ({ ...img, status: 'processing', errorMsg: undefined })));

    for (const task of tasks) {
      try {
        const processedBase64 = await recolorImageWithGemini(task.originalUrl!, settings, task.color);
        setImages(prev => prev.map(img => {
          if (img.id === task.imageId) {
            const existingResults = img.results.filter(r => r.color?.hex !== task.color.hex);
            return {
              ...img,
              results: [...existingResults, { color: task.color, url: processedBase64 }],
              status: 'completed',
              activeResultIndex: existingResults.length
            };
          }
          return img;
        }));
      } catch (err: any) {
        console.error(`Failed to process image ${task.imageId}`, err);
        const errStr = err.toString();
        const isRateLimit = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");
        const isApiKeyError = errStr.includes("Requested entity was not found") || errStr.includes("APIKEY_ERROR");

        if (isRateLimit) setRateLimitActive(true);
        if (isApiKeyError && settings.modelTier === 'pro') setHasApiKey(false);

        setImages(prev => prev.map(img => {
          if (img.id === task.imageId && img.results.length === 0) {
            return { 
              ...img, 
              status: 'error', 
              errorMsg: isApiKeyError 
                ? "API Key invalid or missing for selected engine."
                : isRateLimit 
                ? "Quota limit hit. System is retrying with exponential backoff." 
                : "Generation error. Please try again." 
            };
          }
          return img;
        }));
      }
      completedTasks++;
      setProcessingProgress(completedTasks / totalTasks);
      await new Promise(resolve => setTimeout(resolve, settings.modelTier === 'pro' ? 5000 : 2000));
    }
    setIsProcessing(false);
    setRateLimitActive(false);
  };

  const handleGenerateImage = async () => {
    if (!genSettings.prompt) return;

    if (!hasApiKey) {
      setHasApiKey(false);
      return;
    }
    
    setIsProcessing(true);
    setIsSampling(false);
    const newGenId = uuidv4();
    
    const placeholder: ProcessedImage = {
      id: newGenId,
      results: [],
      status: 'processing'
    };
    setGeneratedDesigns(prev => [placeholder, ...prev]);

    try {
      const generatedUrl = await generateImageWithGemini(genSettings);
      setGeneratedDesigns(prev => prev.map(img => 
        img.id === newGenId ? {
          ...img,
          results: [{ 
            url: generatedUrl, 
            prompt: genSettings.prompt,
            size: genSettings.imageSize 
          }],
          status: 'completed',
          activeResultIndex: 0
        } : img
      ));
    } catch (err: any) {
      const errStr = err.toString();
      const isApiKeyError = errStr.includes("Requested entity was not found") || errStr.includes("APIKEY_ERROR");
      if (isApiKeyError) setHasApiKey(false);

      setGeneratedDesigns(prev => prev.map(img => 
        img.id === newGenId ? {
          ...img,
          status: 'error',
          errorMsg: "Generation failed. Verify your prompt and API project status."
        } : img
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const onProcess = () => {
    if (mode === 'recolor') handleRecolorBatch();
    else handleGenerateImage();
  };

  const removeImage = (id: string, isGen: boolean = false) => {
    if (isGen) setGeneratedDesigns(prev => prev.filter(img => img.id !== id));
    else setImages(prev => prev.filter(img => img.id !== id));
  };

  const setActiveResult = (imageId: string, index: number) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, activeResultIndex: index } : img
    ));
  };

  const handleSampleColor = (hex: string) => {
    const newColor: ColorDefinition = { name: `Sampled ${hex}`, hex };
    if (!settings.targetColors.find(c => c.hex.toLowerCase() === hex.toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        targetColors: [...prev.targetColors, newColor]
      }));
    }
    // Optional: Auto-turn off sampling after pick if desired, or keep on for multiple picks
    // setIsSampling(false);
  };

  if (hasApiKey === false && (settings.modelTier === 'pro' || mode === 'generate')) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-2xl">C</div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Unlock Pro Features</h1>
            <p className="text-gray-600">You've selected the <b>Gemini 3 Pro</b> engine. High-fidelity textile modeling and AI design generation require a paid API key from a Google Cloud Project.</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-sm text-purple-800 text-left space-y-2">
            <p className="font-semibold">Pro Mode Benefits:</p>
            <ul className="list-disc list-inside space-y-1 opacity-90 text-[12px]">
              <li>Spectral textile simulation & deeper shadow analysis.</li>
              <li>AI Design Lab for concept generation.</li>
              <li>Up to 4K catalog resolution.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleSelectKey}
              className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg hover:shadow-purple-200 active:scale-95"
            >
              Select Paid API Key
            </button>
            <button 
              onClick={() => {
                setSettings(s => ({ ...s, modelTier: 'flash' }));
                setMode('recolor');
                setHasApiKey(null); 
              }}
              className="text-sm text-gray-500 hover:text-indigo-600 font-medium"
            >
              Continue with Performance (Flash) Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasCompletedImages = images.some(img => img.results.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Chroma<span className="text-indigo-600">Thread</span> AI</h1>
            <div className={`text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-tighter ml-1 ${settings.modelTier === 'pro' ? 'bg-purple-600' : 'bg-indigo-600'}`}>
              {settings.modelTier.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-4">
             {rateLimitActive && (
               <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                 CONGESTION CONTROL
               </div>
             )}
             {settings.batchConsistency && (
               <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                 COLOR SYNC ACTIVE
               </div>
             )}
             <div className="text-xs text-gray-400 font-mono hidden sm:block">v1.8.0 • Spectral Sampler</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 xl:col-span-3">
            <Controls 
              mode={mode}
              setMode={setMode}
              settings={settings} 
              updateSettings={(s) => setSettings(p => ({...p, ...s}))}
              genSettings={genSettings}
              updateGenSettings={(s) => setGenSettings(p => ({...p, ...s}))}
              isProcessing={isProcessing}
              onProcess={onProcess}
              hasImages={images.length > 0}
              imageCount={images.length}
              isSampling={isSampling}
              setSampling={setIsSampling}
            />
          </div>

          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            {mode === 'recolor' ? (
              <>
                {isSampling && (
                  <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                       <span className="text-xs font-bold uppercase tracking-widest">Spectral Sampler Mode Active</span>
                    </div>
                    <button onClick={() => setIsSampling(false)} className="text-[10px] font-black bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full uppercase transition-colors">Done Sampling</button>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 group relative overflow-hidden">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Upload Photography</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {settings.batchConsistency ? 'Engine will synchronize colors across all garments.' : 'Individual processing mode active.'}
                    </p>
                  </div>
                </div>

                {isProcessing && (
                  <div className={`space-y-3 mb-4 p-4 rounded-xl border ${settings.batchConsistency ? 'bg-green-50/30 border-green-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`${settings.modelTier === 'pro' ? 'bg-purple-600' : 'bg-indigo-600'} h-2 rounded-full transition-all duration-300`} style={{ width: `${processingProgress * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                         <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                           {settings.batchConsistency ? 'Synchronizing Dye-Match' : 'Processing Batch'}
                         </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold">{Math.round(processingProgress * 100)}% Complete</span>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                         Workspace
                         <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{images.length} assets</span>
                      </h2>
                      <div className="flex items-center gap-3">
                        {hasCompletedImages && (
                          <button onClick={() => setShowExport(true)} className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm flex items-center gap-2 transition-all active:scale-95">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l7.5-7.5 7.5 7.5" /></svg>
                             Export Collection
                          </button>
                        )}
                        <button onClick={() => setImages([])} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear All</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {images.map((img) => (
                        <div key={img.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group transition-all hover:shadow-md ${isSampling ? 'ring-4 ring-indigo-600 shadow-2xl scale-[1.02]' : ''}`}>
                          <div className="relative">
                            {isSampling ? (
                               <ImageSampler 
                                 src={img.originalUrl!} 
                                 onColorPicked={handleSampleColor} 
                                 onCancel={() => setIsSampling(false)} 
                               />
                            ) : img.results.length > 0 ? (
                              <BeforeAfterSlider originalSrc={img.originalUrl!} processedSrc={img.results[img.activeResultIndex ?? 0].url} />
                            ) : (
                              <div className="aspect-[3/4] w-full bg-gray-100 relative">
                                 <img src={img.originalUrl} className="w-full h-full object-contain" alt="Original" />
                                 {img.status === 'processing' && (
                                   <div className={`absolute inset-0 ${settings.modelTier === 'pro' ? 'bg-purple-900/40' : 'bg-indigo-900/40'} backdrop-blur-[2px] flex items-center justify-center flex-col text-white`}>
                                      <svg className="animate-spin h-8 w-8 mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                      <span className="text-[10px] font-black tracking-widest uppercase">
                                        {settings.batchConsistency ? 'Dye-Match Sync' : 'Spectral Calibration'}
                                      </span>
                                      <span className="text-[9px] opacity-60 mt-1">Normalizing textile maps...</span>
                                   </div>
                                 )}
                                 {img.status === 'error' && (
                                   <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center p-6 text-center">
                                     <div className="text-red-600">
                                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 mx-auto mb-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                                       <p className="font-bold text-sm leading-tight">{img.errorMsg}</p>
                                     </div>
                                   </div>
                                 )}
                              </div>
                            )}
                            {!isSampling && (
                              <button onClick={() => removeImage(img.id)} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 z-10">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                          {img.results.length > 0 && !isSampling && (
                            <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                              {settings.batchConsistency && (
                                <div className="text-[8px] font-black text-green-600 uppercase border border-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0 bg-green-50 mr-1">Sync</div>
                              )}
                              {img.results.map((res, idx) => (
                                <button key={idx} onClick={() => setActiveResult(img.id, idx)} className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all ${idx === (img.activeResultIndex ?? 0) ? (settings.modelTier === 'pro' ? 'border-purple-600 scale-110 shadow-sm' : 'border-indigo-600 scale-110 shadow-sm') : 'border-gray-200'}`} style={{ backgroundColor: res.color?.hex }} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">AI Design Lab</h2>
                  {generatedDesigns.length > 0 && (
                    <button onClick={() => setGeneratedDesigns([])} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear Canvas</button>
                  )}
                </div>

                {generatedDesigns.length === 0 && !isProcessing && (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center bg-white/50">
                    <div className="w-20 h-20 bg-purple-50 text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                       </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight">AI Synthesis (Pro)</h3>
                    <p className="text-gray-500 mt-2 max-w-sm">Use <b>Gemini 3 Pro</b> to generate high-fidelity production assets from scratch.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedDesigns.map((gen) => (
                    <div key={gen.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group relative">
                       <div className="aspect-square w-full bg-gray-100 flex items-center justify-center relative">
                          {gen.status === 'processing' ? (
                            <div className="flex flex-col items-center gap-4 text-purple-600">
                               <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               <span className="text-sm font-semibold animate-pulse tracking-widest uppercase text-purple-600">Pro Rendering...</span>
                            </div>
                          ) : gen.status === 'completed' ? (
                            <img src={gen.results[0].url} className="w-full h-full object-cover" alt="Generated Design" />
                          ) : (
                            <div className="p-6 text-center text-red-500">
                               <p className="text-sm font-semibold">Pro Quota Error</p>
                               <p className="text-xs mt-1 leading-tight">{gen.errorMsg}</p>
                            </div>
                          )}
                          <button onClick={() => removeImage(gen.id, true)} className="absolute top-3 right-3 bg-black/30 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showExport && <ExportModal images={images} onClose={() => setShowExport(false)} />}
    </div>
  );
};

export default App;