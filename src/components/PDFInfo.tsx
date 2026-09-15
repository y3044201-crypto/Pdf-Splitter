import React from 'react';
import { FileText, X } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { PDFFile } from '@/types';

interface PDFInfoProps {
  pdf: PDFFile;
  onClear: () => void;
}

export function PDFInfo({ pdf, onClear }: PDFInfoProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start justify-between">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-red-100 text-red-500 rounded-lg shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-medium text-slate-800 break-all">{pdf.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>Ukuran: <strong className="text-slate-700">{formatBytes(pdf.size)}</strong></span>
            <span>Jumlah halaman: <strong className="text-slate-700">{pdf.numPages} halaman</strong></span>
          </div>
          <p className="mt-2 text-xs text-green-600 font-medium">Status: File siap diproses</p>
        </div>
      </div>
      <button 
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
        title="Hapus file"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
