import React, { useMemo, useState, useEffect } from 'react';
import { PageThumbnail } from './PageThumbnail';
import { PagePreviewModal } from './PagePreviewModal';
import { PDFFile } from '@/types';
import { CheckSquare, Square } from 'lucide-react';

interface PageSelectorProps {
  pdf: PDFFile;
  selectedPages: number[];
  onChange: (pages: number[]) => void;
  onError: (errorMsg: string | null) => void;
}

export function PageSelector({ pdf, selectedPages, onChange, onError }: PageSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number | null>(null);

  // Sync input value when selectedPages change from thumbnails
  useEffect(() => {
    const parsed = parsePageInput(inputValue, pdf.numPages);
    if (!parsed.valid || JSON.stringify(parsed.pages) !== JSON.stringify(selectedPages)) {
       setInputValue(selectedPages.join(', '));
       setError(null);
       onError(null);
    }
  }, [selectedPages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.trim() === '') {
      const msg = 'Silakan masukkan nomor halaman yang ingin dipisahkan.';
      setError(msg);
      onError(msg);
      onChange([]);
      return;
    }

    const { valid, errorMsg, pages } = parsePageInput(val, pdf.numPages);
    
    if (!valid) {
      setError(errorMsg);
      onError(errorMsg);
    } else {
      setError(null);
      onError(null);
      onChange(pages);
    }
  };

  const handleThumbnailToggle = (pageNum: number) => {
    const newSelected = selectedPages.includes(pageNum)
      ? selectedPages.filter(p => p !== pageNum)
      : [...selectedPages, pageNum].sort((a, b) => a - b);
    
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    onChange(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
  };

  const handleClearSelection = () => {
    onChange([]);
  };

  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-semibold text-slate-800">
          Nomor Halaman yang Akan Dipisahkan
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Contoh: 1,3,5-8,10"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-800"
        />
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>

      {/* Preview Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        {/* Header/Toolbar */}
        <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-slate-800">Preview Halaman PDF</h4>
            <div className="text-sm text-slate-500 mt-0.5">
              <span className="font-medium text-slate-700">{pdf.numPages}</span> total halaman &bull; <span className="font-medium text-blue-600">{selectedPages.length}</span> dipilih
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleSelectAll}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
            >
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Pilih Semua</span>
            </button>
            <button 
              onClick={handleClearSelection}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm"
            >
              <Square className="w-4 h-4 text-slate-400" />
              <span>Hapus Pilihan</span>
            </button>
          </div>
        </div>
        
        {/* Grid Container */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {pageNumbers.map(num => (
              <PageThumbnail
                key={num}
                pageNumber={num}
                pdfDocument={pdf.document}
                isSelected={selectedPages.includes(num)}
                onToggle={handleThumbnailToggle}
                onPreview={setPreviewPage}
              />
            ))}
          </div>
        </div>
      </div>

      {previewPage !== null && (
        <PagePreviewModal
          pageNumber={previewPage}
          totalPages={pdf.numPages}
          pdfDocument={pdf.document}
          onClose={() => setPreviewPage(null)}
          onNavigate={setPreviewPage}
        />
      )}
    </div>
  );
}

// Helper to parse input like "1,3,5-8,10"
function parsePageInput(input: string, maxPages: number): { valid: boolean; errorMsg: string | null; pages: number[] } {
  if (!input.trim()) {
    return { valid: false, errorMsg: 'Silakan masukkan nomor halaman yang ingin dipisahkan.', pages: [] };
  }

  const sanitized = input.replace(/\s+/g, '');
  const formatRegex = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
  
  if (!formatRegex.test(sanitized)) {
    return { valid: false, errorMsg: 'Format nomor halaman tidak valid. Gunakan contoh: 1,3,5-8', pages: [] };
  }

  const parts = sanitized.split(',');
  const result = new Set<number>();

  for (const part of parts) {
    // Range
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (start <= 0 || end <= 0) {
        return { valid: false, errorMsg: 'Nomor halaman tidak valid. Halaman dimulai dari 1.', pages: [] };
      }
      
      if (start > maxPages || end > maxPages) {
        const invalidPage = start > maxPages ? start : end;
        return { valid: false, errorMsg: `Halaman ${invalidPage} tidak tersedia. PDF hanya memiliki ${maxPages} halaman.`, pages: [] };
      }

      if (start > end) {
        return { valid: false, errorMsg: 'Rentang halaman tidak valid. Nomor awal harus lebih kecil atau sama dengan nomor akhir.', pages: [] };
      }
      
      for (let i = start; i <= end; i++) {
        result.add(i);
      }
    } else {
      // Single page
      const num = parseInt(part, 10);
      
      if (num <= 0) {
        return { valid: false, errorMsg: 'Nomor halaman tidak valid. Halaman dimulai dari 1.', pages: [] };
      }
      
      if (num > maxPages) {
        return { valid: false, errorMsg: `Halaman ${num} tidak tersedia. PDF hanya memiliki ${maxPages} halaman.`, pages: [] };
      }
      
      result.add(num);
    }
  }

  return { valid: true, errorMsg: null, pages: Array.from(result).sort((a, b) => a - b) };
}
