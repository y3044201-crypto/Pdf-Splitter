import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Maximize2 } from 'lucide-react';

interface PageThumbnailProps {
  pageNumber: number;
  pdfDocument: any;
  isSelected: boolean;
  onToggle: (pageNum: number) => void;
  onPreview: (pageNum: number) => void;
}

export function PageThumbnail({ pageNumber, pdfDocument, isSelected, onToggle, onPreview }: PageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let renderTask: any = null;
    let isMounted = true;

    const renderPage = async () => {
      if (!isVisible || !canvasRef.current || isRendered) return;

      try {
        const page = await pdfDocument.getPage(pageNumber);
        
        // Use higher scale for better readability on large thumbnails
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = canvasRef.current;
        
        if (!isMounted) return;
        
        setAspectRatio(viewport.width / viewport.height);

        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        if (isMounted) setIsRendered(true);
      } catch (err) {
        if ((err as Error)?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pageNumber, pdfDocument, isRendered, isVisible]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all border-2 group",
        isSelected 
          ? "border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20" 
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
      )}
      onClick={() => onToggle(pageNumber)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onPreview(pageNumber);
      }}
    >
      <div 
         className="relative w-full bg-slate-100/80 rounded-lg shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02]"
         style={{ aspectRatio: aspectRatio ? aspectRatio : 1 / 1.414 }}
      >
        {!isRendered && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
               Memuat...
            </div>
        )}
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain block bg-white" />
        
        {/* Selection Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500/10 flex items-start justify-end p-3 pointer-events-none transition-opacity">
             <div className="bg-blue-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                <Check className="w-5 h-5 stroke-[3]" />
             </div>
          </div>
        )}

        {/* Preview Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(pageNumber);
          }}
          className="absolute bottom-3 right-3 p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
          title="Perbesar Preview"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
      <span className={cn(
        "mt-4 text-base font-semibold",
        isSelected ? "text-blue-700" : "text-slate-700"
      )}>
        Halaman {pageNumber}
      </span>
    </div>
  );
}
