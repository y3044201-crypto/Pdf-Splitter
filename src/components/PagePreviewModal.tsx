import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PagePreviewModalProps {
  pageNumber: number;
  pdfDocument: any;
  totalPages: number;
  onClose: () => void;
  onNavigate: (newPage: number) => void;
}

export function PagePreviewModal({ pageNumber, pdfDocument, totalPages, onClose, onNavigate }: PagePreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);

  const renderPage = async (currentScale: number) => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    renderPage(scale);
  }, [pageNumber, scale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && pageNumber > 1) onNavigate(pageNumber - 1);
      if (e.key === 'ArrowRight' && pageNumber < totalPages) onNavigate(pageNumber + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, totalPages, onClose, onNavigate]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  
  const handleFitWidth = async () => {
    if (!containerRef.current) return;
    const page = await pdfDocument.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const containerWidth = containerRef.current.clientWidth - 80; // account for padding/nav
    setScale(containerWidth / unscaledViewport.width);
  };
  
  const handleFitScreen = async () => {
    if (!containerRef.current) return;
    const page = await pdfDocument.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const containerHeight = containerRef.current.clientHeight - 80;
    const containerWidth = containerRef.current.clientWidth - 120;
    const heightScale = containerHeight / unscaledViewport.height;
    const widthScale = containerWidth / unscaledViewport.width;
    setScale(Math.min(heightScale, widthScale));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-6 shadow-lg shrink-0 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-lg tracking-tight">Halaman {pageNumber} <span className="text-slate-400 font-normal">/ {totalPages}</span></span>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-800 rounded-lg p-1">
          <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-md transition-colors" title="Zoom Out">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium w-12 text-center text-slate-200">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-md transition-colors" title="Zoom In">
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <button onClick={handleFitWidth} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium px-3 text-slate-200" title="Fit to Width">
            Fit Width
          </button>
          <button onClick={handleFitScreen} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium px-3 text-slate-200" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        <button onClick={onClose} className="p-2 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative" ref={containerRef}>
        {/* Nav Left */}
        <button 
          onClick={() => pageNumber > 1 && onNavigate(pageNumber - 1)}
          disabled={pageNumber <= 1}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full z-10 disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Canvas Container */}
        <div className="flex-1 overflow-auto bg-transparent flex items-start justify-center p-8">
           <div className={cn("relative bg-white shadow-2xl transition-opacity duration-200 rounded-sm", isLoading ? "opacity-50" : "opacity-100")}>
              <canvas ref={canvasRef} className="block" />
           </div>
        </div>

        {/* Nav Right */}
        <button 
          onClick={() => pageNumber < totalPages && onNavigate(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
          className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full z-10 disabled:opacity-0 transition-all shadow-lg backdrop-blur-sm"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
