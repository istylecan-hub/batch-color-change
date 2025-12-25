import React, { useState } from 'react';
import { AppSettings, PRODUCT_CATEGORIES, COLOR_PRESETS, ColorDefinition } from '../types';

interface ControlsProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isProcessing: boolean;
  onProcess: () => void;
  hasImages: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  settings, 
  updateSettings, 
  isProcessing,
  onProcess,
  hasImages
}) => {
  const [customHex, setCustomHex] = useState('#000000');
  
  const toggleColor = (color: ColorDefinition) => {
    const exists = settings.targetColors.find(c => c.hex === color.hex);
    if (exists) {
      updateSettings({
        targetColors: settings.targetColors.filter(c => c.hex !== color.hex)
      });
    } else {
      updateSettings({
        targetColors: [...settings.targetColors, color]
      });
    }
  };

  const addCustomColor = () => {
    const newColor: ColorDefinition = { name: 'Custom', hex: customHex };
    // Check if already exists
    if (!settings.targetColors.find(c => c.hex === customHex)) {
      updateSettings({
        targetColors: [...settings.targetColors, newColor]
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6 h-fit sticky top-6">
      
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

      {/* 2. Color Selection */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Target Colors</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {settings.targetColors.length} Selected
          </span>
        </div>
        
        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {COLOR_PRESETS.map((preset) => {
            const isSelected = settings.targetColors.some(c => c.hex === preset.hex);
            return (
              <button
                key={preset.hex}
                onClick={() => toggleColor(preset)}
                className={`group relative w-full aspect-square rounded-full border-2 transition-transform hover:scale-105 focus:outline-none ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.hex }}
                title={preset.name}
              >
                 {isSelected && (
                   <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                     ✓
                   </span>
                 )}
              </button>
            );
          })}
        </div>

        {/* Custom Picker */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <input
            type="color"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent"
          />
          <div className="flex-1">
             <div className="text-xs text-gray-500 font-medium">Add Custom</div>
             <div className="text-sm font-mono text-gray-800 uppercase">{customHex}</div>
          </div>
          <button 
            onClick={addCustomColor}
            className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
            title="Add Color"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Selected List Chips */}
        {settings.targetColors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 max-h-32 overflow-y-auto">
            {settings.targetColors.map((color, idx) => (
              <div key={`${color.hex}-${idx}`} className="flex items-center gap-2 pl-1 pr-2 py-1 bg-gray-100 rounded-full border border-gray-200 text-xs">
                <div className="w-4 h-4 rounded-full border border-black/10" style={{backgroundColor: color.hex}}></div>
                <span className="max-w-[80px] truncate">{color.name === 'Custom' ? color.hex : color.name}</span>
                <button 
                  onClick={() => toggleColor(color)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Fabric & Toggles */}
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
          <Toggle 
            label="Fabric Awareness Mode" 
            active={settings.fabricAwareness} 
            onChange={(v) => updateSettings({ fabricAwareness: v })} 
          />
          <Toggle 
            label="Print & Embroidery Protect" 
            active={settings.printProtection} 
            onChange={(v) => updateSettings({ printProtection: v })} 
          />
          <Toggle 
            label="E-commerce Color Accuracy" 
            active={settings.colorAccuracy} 
            onChange={(v) => updateSettings({ colorAccuracy: v })} 
          />
          <Toggle 
            label="Edge Precision Mode" 
            active={settings.edgePrecision} 
            onChange={(v) => updateSettings({ edgePrecision: v })} 
          />
        </div>
      </section>

      {/* Action Button */}
      <button
        onClick={onProcess}
        disabled={isProcessing || !hasImages || settings.targetColors.length === 0}
        className={`w-full py-3.5 rounded-lg text-white font-semibold shadow-md transition-all flex items-center justify-center gap-2 ${
          isProcessing || !hasImages || settings.targetColors.length === 0
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:transform active:scale-95'
        }`}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing Batch...
          </>
        ) : (
          <>
            <span>Generate {settings.targetColors.length > 0 ? `(${settings.targetColors.length})` : ''} Variants</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </>
        )}
      </button>

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