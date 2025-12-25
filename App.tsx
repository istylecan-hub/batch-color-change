import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Controls from './components/Controls';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import ExportModal from './components/ExportModal';
import { AppSettings, ProcessedImage, COLOR_PRESETS } from './types';
import { recolorImageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0); // 0 to 1
  const [showExport, setShowExport] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>({
    category: 'TOP',
    targetColors: [COLOR_PRESETS[0]], // Default to first preset
    fabricType: 'Cotton',
    fabricAwareness: true,
    printProtection: false,
    colorAccuracy: true,
    edgePrecision: true,
  });

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

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Process function with rate limiting (Sequential to avoid 429)
  const processBatch = async () => {
    if (images.length === 0 || settings.targetColors.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Create a flattened list of tasks: [Image1+Color1, Image1+Color2, Image2+Color1, ...]
    const tasks = [];
    for (const img of images) {
      for (const color of settings.targetColors) {
        tasks.push({ imageId: img.id, color, originalUrl: img.originalUrl });
      }
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;

    // Reset status to processing
    setImages(prev => prev.map(img => ({ ...img, status: 'processing', errorMsg: undefined })));

    // Sequential Processing with Delay
    for (const task of tasks) {
      try {
        const processedBase64 = await recolorImageWithGemini(task.originalUrl, settings, task.color);
        
        // Update state with result
        setImages(prev => prev.map(img => {
          if (img.id === task.imageId) {
            // Check if result for this color already exists (overwrite if so)
            const existingResults = img.results.filter(r => r.color.hex !== task.color.hex);
            return {
              ...img,
              results: [...existingResults, { color: task.color, url: processedBase64 }],
              status: 'completed',
              activeResultIndex: existingResults.length // Auto-select the new one
            };
          }
          return img;
        }));

      } catch (err: any) {
        console.error(`Failed to process image ${task.imageId} for color ${task.color.name}`, err);
        setImages(prev => prev.map(img => {
          if (img.id === task.imageId && img.results.length === 0) {
            return { ...img, errorMsg: "Partial or full failure. check console." };
          }
          return img;
        }));
      }

      completedTasks++;
      setProcessingProgress(completedTasks / totalTasks);
      
      // Artificial delay to respect Rate Limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const setActiveResult = (imageId: string, index: number) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, activeResultIndex: index } : img
    ));
  };

  const hasCompletedImages = images.some(img => img.results.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Chroma<span className="text-indigo-600">Thread</span> AI</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-gray-400 font-mono hidden sm:block">
                v1.3 • Multi-Color Batch
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Controls (Sticky on Desktop) */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Controls 
              settings={settings} 
              updateSettings={updateSettings} 
              isProcessing={isProcessing}
              onProcess={processBatch}
              hasImages={images.length > 0}
            />
          </div>

          {/* Right: Gallery & Upload */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 group relative overflow-hidden">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Upload Batch Images</h3>
                <p className="text-sm text-gray-500 mt-1">Drag & drop or click to select multiple files</p>
                <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG, WEBP (Max 10MB)</p>
              </div>
            </div>

            {/* Progress Bar (Global) */}
            {isProcessing && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${processingProgress * 100}%` }}
                ></div>
                <p className="text-xs text-gray-500 text-right mt-1">Processing tasks... {Math.round(processingProgress * 100)}%</p>
              </div>
            )}

            {/* Gallery Grid */}
            {images.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Project Workspace ({images.length})</h2>
                  <div className="flex items-center gap-3">
                    {hasCompletedImages && (
                      <button 
                        onClick={() => setShowExport(true)} 
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm flex items-center gap-2"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l7.5-7.5 7.5 7.5" />
                         </svg>
                         Export Batch
                      </button>
                    )}
                    <button onClick={() => setImages([])} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear All</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {images.map((img) => {
                    const hasResults = img.results.length > 0;
                    const activeIndex = img.activeResultIndex ?? (hasResults ? 0 : -1);
                    const activeResult = hasResults ? img.results[activeIndex] : null;

                    return (
                      <div key={img.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="relative">
                          {activeResult ? (
                            <BeforeAfterSlider originalSrc={img.originalUrl} processedSrc={activeResult.url} />
                          ) : (
                            <div className="aspect-[3/4] w-full bg-gray-100 relative">
                               <img src={img.originalUrl} className="w-full h-full object-contain" alt="Original" />
                               {img.status === 'processing' && !hasResults && (
                                 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center flex-col text-white">
                                    <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm font-medium">Waiting for queue...</span>
                                 </div>
                               )}
                               {img.status === 'error' && (
                                 <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center p-4 text-center">
                                   <div className="text-red-600">
                                     <p className="font-bold">Error</p>
                                     <p className="text-sm">{img.errorMsg || 'Failed to process'}</p>
                                   </div>
                                 </div>
                               )}
                            </div>
                          )}
                          
                          {/* Remove Button */}
                          <button 
                            onClick={() => removeImage(img.id)}
                            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-20"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Variants Selector */}
                        {hasResults && (
                          <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto">
                            {img.results.map((res, idx) => (
                              <button
                                key={`${res.color.hex}-${idx}`}
                                onClick={() => setActiveResult(img.id, idx)}
                                className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-transform ${
                                  idx === activeIndex ? 'border-indigo-600 scale-110' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: res.color.hex }}
                                title={res.color.name}
                              />
                            ))}
                          </div>
                        )}

                        {/* Card Footer - Downloads */}
                        {hasResults && (
                          <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
                             <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                <span className="font-medium">Separate Downloads:</span>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {img.results.map((res, idx) => (
                                  <a 
                                    key={idx}
                                    href={res.url} 
                                    download={`chroma-${res.color.name.replace(/\s+/g, '-').toLowerCase()}-${img.id.slice(0,4)}.png`}
                                    className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                                  >
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: res.color.hex}}></div>
                                    <span>{res.color.name}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-gray-400">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l7.5-7.5 7.5 7.5" />
                                    </svg>
                                  </a>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {images.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p>Upload images to begin the batch recoloring workflow.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* dedicated export modal */}
      {showExport && (
        <ExportModal images={images} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
};

export default App;