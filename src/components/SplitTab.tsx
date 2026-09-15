import React, { useState } from 'react';
import { PDFInfo } from './PDFInfo';
import { PageSelector } from './PageSelector';
import { PDFFile } from '@/types';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2, Download } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { autoCompressPdf } from '@/lib/compress';

interface SplitTabProps {
  pdf: PDFFile | null;
  onClear: () => void;
}

export function SplitTab({ pdf, onClear }: SplitTabProps) {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [splitMode, setSplitMode] = useState<'merge' | 'separate'>('merge');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [resultFiles, setResultFiles] = useState<{
    name: string; 
    blob: Blob; 
    size: number;
    originalSplitSize?: number;
    targetReached?: boolean;
    warning?: string | null;
  }[] | null>(null);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleSplit = async () => {
    if (!pdf || selectedPages.length === 0 || validationError) return;
    
    setIsProcessing(true);
    setResultFiles(null);
    
    try {
      setProgressMsg('Membaca PDF...');
      const arrayBuffer = await pdf.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      
      const results: any[] = [];
      let baseName = pdf.name.replace(/\.[^/.]+$/, "");
      if (baseName.endsWith('_Split')) {
          baseName = baseName.replace(/_Split$/, '');
      }

      const TARGET_BYTES = 2 * 1024 * 1024; // 2 MB

      if (splitMode === 'merge') {
        setProgressMsg('Memisahkan halaman...');
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, selectedPages.map(p => p - 1));
        
        for (const page of copiedPages) {
          newPdf.addPage(page);
        }
        
        setProgressMsg('Membuat PDF hasil split...');
        const pdfBytes = await newPdf.save();
        
        setProgressMsg('Memeriksa ukuran file...');
        const { blob, originalSize, targetReached, warning } = await autoCompressPdf(
          pdfBytes, 
          TARGET_BYTES, 
          setProgressMsg
        );
        
        const finalName = `${baseName}_Split.pdf`;
        results.push({
          name: finalName,
          blob,
          size: blob.size,
          originalSplitSize: originalSize,
          targetReached,
          warning
        });
        
        // Auto trigger final download
        triggerDownload(blob, finalName);
      } else {
        const zip = new JSZip();
        for (let i = 0; i < selectedPages.length; i++) {
          setProgressMsg(`Memisahkan halaman ${selectedPages[i]} (${i+1}/${selectedPages.length})...`);
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [selectedPages[i] - 1]);
          newPdf.addPage(copiedPage);
          
          const pdfBytes = await newPdf.save();
          
          const paddedNum = selectedPages[i].toString().padStart(3, '0');
          const fileName = `${baseName}_Page_${paddedNum}.pdf`;
          
          const { blob, originalSize, targetReached, warning } = await autoCompressPdf(
            pdfBytes, 
            TARGET_BYTES, 
            (msg) => setProgressMsg(`Halaman ${selectedPages[i]}: ${msg}`)
          );
          
          results.push({
            name: fileName,
            blob,
            size: blob.size,
            originalSplitSize: originalSize,
            targetReached,
            warning
          });
          zip.file(fileName, blob);
        }
        setProgressMsg('Membuat file ZIP...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerDownload(zipBlob, 'Split_Results.zip');
      }
      
      setProgressMsg('Selesai');
      setResultFiles(results);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('memory')) {
        alert('File terlalu besar untuk diproses. Silakan gunakan file yang lebih kecil.');
      } else {
        alert('Gagal memisahkan PDF. Silakan coba kembali.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultFiles) return;

    if (resultFiles.length === 1) {
      triggerDownload(resultFiles[0].blob, resultFiles[0].name);
    } else {
      const zip = new JSZip();
      resultFiles.forEach(f => {
        zip.file(f.name, f.blob);
      });
      zip.generateAsync({ type: 'blob' }).then(content => {
        triggerDownload(content, 'Split_Results.zip');
      });
    }
  };

  if (!pdf) {
    return (
      <div className="py-12 text-center text-slate-500">
        Silakan pilih file PDF terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PDFInfo pdf={pdf} onClear={onClear} />
      
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <PageSelector 
            pdf={pdf}
            selectedPages={selectedPages}
            onChange={setSelectedPages}
            onError={setValidationError}
          />
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-slate-800">Mode Split</h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="splitMode"
                  value="merge"
                  checked={splitMode === 'merge'}
                  onChange={() => setSplitMode('merge')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <span className="text-sm text-slate-700">Gabungkan semua halaman terpilih menjadi 1 PDF</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="splitMode"
                  value="separate"
                  checked={splitMode === 'separate'}
                  onChange={() => setSplitMode('separate')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <span className="text-sm text-slate-700">Buat 1 PDF untuk setiap halaman</span>
              </label>
            </div>

            <button
              onClick={handleSplit}
              disabled={selectedPages.length === 0 || isProcessing || !!validationError}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="truncate">{progressMsg || 'Processing...'}</span>
                </>
              ) : (
                <span>Split PDF</span>
              )}
            </button>
            
            {resultFiles && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {resultFiles.length === 1 ? (() => {
                  const res = resultFiles[0];
                  const reduction = res.originalSplitSize 
                    ? ((res.originalSplitSize - res.size) / res.originalSplitSize * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <div className="text-center">
                      <div className="text-green-600 font-medium mb-3">PDF Berhasil Diproses ✓</div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>Nama File: <span className="font-medium text-slate-800">{res.name}</span></div>
                        <div>Jumlah Halaman: <span className="font-medium text-slate-800">{selectedPages.length} halaman</span></div>
                        <div>Ukuran Sebelum Compression: <span className="font-medium text-slate-800">{formatBytes(res.originalSplitSize!)}</span></div>
                        <div>Ukuran Final: <span className="font-medium text-slate-800">{formatBytes(res.size)}</span></div>
                        {reduction !== '0.0' && <div>Pengurangan: <span className="font-medium text-slate-800">{reduction}%</span></div>}
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                           <div className="flex justify-between items-center">
                             <span className="text-slate-600">Status:</span>
                             {res.targetReached ? (
                               <span className="font-bold text-green-600">✓ TARGET TERCAPAI</span>
                             ) : res.originalSplitSize && res.originalSplitSize <= 2 * 1024 * 1024 ? (
                               <span className="font-bold text-green-600">✓ TARGET TERCAPAI</span>
                             ) : (
                               <span className="font-bold text-orange-600">Target Optimal Tidak Tercapai</span>
                             )}
                           </div>
                           <div className="flex justify-between items-center mt-1">
                             <span className="text-slate-600">Target:</span>
                             <span className="font-medium text-slate-800">1.90 – 2.00 MB</span>
                           </div>
                           {res.warning && !res.targetReached && (
                             <div className="mt-2 text-xs text-orange-600 text-left bg-orange-50 p-2 rounded">
                                {res.warning}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="text-center">
                    <div className="text-green-600 font-medium mb-3">Split PDF berhasil</div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>File: <span className="font-medium text-slate-800">Split_Results.zip</span></div>
                      <div>Halaman: <span className="font-medium text-slate-800">{resultFiles.length} file</span></div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleDownload}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Hasil Akhir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
