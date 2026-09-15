import React, { useState } from 'react';
import { PDFUploader } from '@/components/PDFUploader';
import { SplitTab } from '@/components/SplitTab';
import { CompressTab } from '@/components/CompressTab';
import { PDFFile } from '@/types';
import { FileDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'split' | 'compress'>('split');
  const [pdf, setPdf] = useState<PDFFile | null>(null);

  const handleReset = () => {
    setPdf(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.svg" alt="PDF TOOLS Logo" className="w-9 h-9 object-contain" />
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-800">PDF TOOLS</h1>
              <p className="text-xs text-slate-500 font-medium">Pisahkan dan kompres file PDF dengan mudah</p>
            </div>
          </div>
          
          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex space-x-1 p-1 bg-white border border-slate-200 rounded-lg max-w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('split')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === 'split' 
                ? "bg-blue-50 text-blue-700 shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            Split PDF
          </button>
          <button
            onClick={() => setActiveTab('compress')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === 'compress' 
                ? "bg-blue-50 text-blue-700 shadow-sm" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            Compress PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[500px]">
          {!pdf ? (
            <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto py-12">
              <PDFUploader onFileSelect={setPdf} isLoading={false} />
              <p className="text-sm text-slate-500 mt-6 text-center">
                File Anda diproses secara lokal dan tidak dikirim ke server. Privasi Anda terjaga.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'split' && <SplitTab pdf={pdf} onClear={handleReset} />}
              {activeTab === 'compress' && <CompressTab pdf={pdf} onClear={handleReset} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
