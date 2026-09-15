import React, { useRef, useState } from 'react';
import { FileUp, File as FileIcon } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { PDFFile } from '@/types';
import { pdfjsLib } from '@/lib/pdfjs';

interface PDFUploaderProps {
  onFileSelect: (pdf: PDFFile) => void;
  isLoading: boolean;
}

export function PDFUploader({ onFileSelect, isLoading }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    // reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    if (file.type !== 'application/pdf') {
      setError('File harus berformat PDF.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ data: rawBytes });
      const pdfDocument = await loadingTask.promise;
      
      onFileSelect({
        file,
        name: file.name,
        size: file.size,
        numPages: pdfDocument.numPages,
        document: pdfDocument,
        rawBytes,
      });
    } catch (err: any) {
      setError('Gagal membaca PDF. Pastikan file tidak rusak atau terenkripsi.');
      console.error(err);
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
          isLoading ? "opacity-50 pointer-events-none" : ""
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
            <FileUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">Drag & Drop PDF di sini</p>
            <p className="text-sm text-slate-500 mt-1">atau klik untuk memilih file</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors">
            Pilih File PDF
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
