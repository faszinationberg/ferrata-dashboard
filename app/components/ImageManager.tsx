import React, { useState } from 'react';

interface ImageManagerProps {
  existingUrls: string[];
  newFiles: File[];
  onRemoveExisting: (url: string) => void;
  onRemoveNew: (index: number) => void;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageManager({ existingUrls, newFiles, onRemoveExisting, onRemoveNew, onSelect }: ImageManagerProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  // Kombinierte Liste für die Großansicht (URLs + Blob-URLs für neue Dateien)
  const allImages = [
    ...(existingUrls || []),
    ...newFiles.map(file => URL.createObjectURL(file))
  ];

  const navigate = (direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullscreenIndex === null) return;
    if (direction === 'next') {
      setFullscreenIndex((fullscreenIndex + 1) % allImages.length);
    } else {
      setFullscreenIndex((fullscreenIndex - 1 + allImages.length) % allImages.length);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-slate-50 text-slate-900">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
        Dokumentation (Klicken zum Vergrößern)
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {allImages.map((url, idx) => {
          const isNew = idx >= (existingUrls?.length || 0);
          return (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 group cursor-zoom-in shadow-sm">
              <img 
                src={url} 
                className="w-full h-full object-cover" 
                onClick={() => setFullscreenIndex(idx)}
                alt="Vorschau" 
              />
              
              {/* Lösch-Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  isNew ? onRemoveNew(idx - existingUrls.length) : onRemoveExisting(url);
                }}
                className="absolute top-2 right-2 bg-red-600/90 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
              >
                ×
              </button>

              {isNew && (
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-[8px] text-white text-center py-1 font-black uppercase tracking-tighter">Neu</div>
              )}
            </div>
          );
        })}

        {/* Upload Button */}
        <label className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all text-slate-300 hover:text-blue-500">
          <input type="file" multiple accept="image/*" className="hidden" onChange={onSelect} />
          <span className="text-2xl mb-1">📸</span>
          <span className="text-[8px] font-black uppercase">Hinzufügen</span>
        </label>
      </div>

      {/* --- FULLSCREEN LIGHTBOX --- */}
      {fullscreenIndex !== null && (
        <div 
          className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setFullscreenIndex(null)}
        >
          <button className="absolute top-6 right-6 text-white text-4xl font-light z-[210] p-4">×</button>
          
          {allImages.length > 1 && (
            <>
              <button 
                onClick={(e) => navigate('prev', e)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full text-white text-2xl hover:bg-white/20 transition-all"
              >
                ‹
              </button>
              <button 
                onClick={(e) => navigate('next', e)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full text-white text-2xl hover:bg-white/20 transition-all"
              >
                ›
              </button>
            </>
          )}

          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={allImages[fullscreenIndex]} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
              alt="Vollbild" 
            />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">
              Bild {fullscreenIndex + 1} von {allImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}