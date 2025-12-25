import React, { useState } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { ProcessedImage } from '../types';

interface ExportModalProps {
  images: ProcessedImage[];
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ images, onClose }) => {
  const [isZipping, setIsZipping] = useState(false);

  // Filter only completed images that have results
  const completedImages = images.filter(img => img.results.length > 0);
  const totalVariants = completedImages.reduce((acc, img) => acc + img.results.length, 0);

  const handleDownloadZip = async () => {
    if (totalVariants === 0) return;
    
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("chromathread-export");

      if (folder) {
        completedImages.forEach((img, index) => {
          img.results.forEach(res => {
            // Remove header from base64 string
            const data = res.url.split(',')[1];
            const cleanName = res.color.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `img${index + 1}_${cleanName}_${img.id.slice(0, 4)}.png`;
            folder.file(fileName, data, { base64: true });
          });
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `chromathread-batch-${new Date().toISOString().slice(0, 10)}.zip`);
      }
    } catch (error) {
      console.error("Failed to generate zip", error);
      alert("Failed to generate ZIP file. Please try downloading individual images.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">Batch Export</h3>
              <p className="text-sm text-gray-500 mt-1">Review and download {totalVariants} generated variants from {completedImages.length} images.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50">
            {completedImages.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No completed images to export yet.
              </div>
            ) : (
              <div className="space-y-6">
                {completedImages.map((img, idx) => (
                  <div key={img.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-4 items-start">
                    {/* Thumbnail of Original */}
                    <div className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                      <img src={img.originalUrl} alt="Original" className="w-full h-full object-contain" />
                    </div>

                    {/* Variants List */}
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-3">
                         <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Image {idx + 1}</span>
                         <span className="text-xs text-gray-400">ID: {img.id.slice(0, 8)}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {img.results.map((res, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-3 p-2 rounded-md border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all group">
                             <div className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: res.color.hex }}></div>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium text-gray-900 truncate">{res.color.name}</p>
                               <p className="text-xs text-gray-500">{res.color.hex}</p>
                             </div>
                             <a 
                               href={res.url} 
                               download={`chroma-${res.color.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${img.id.slice(0,4)}.png`}
                               className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                               title="Download this variant"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l7.5-7.5 7.5 7.5" />
                               </svg>
                             </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 gap-3">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping || totalVariants === 0}
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto ${
                isZipping || totalVariants === 0 ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isZipping ? 'Zipping...' : 'Download All as ZIP'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;