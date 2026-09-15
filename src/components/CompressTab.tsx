import React, { useState } from 'react';
import { PDFInfo } from './PDFInfo';
import { PDFFile } from '@/types';
import { Loader2, Download } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { saveAs } from 'file-saver';
import { autoCompressPdf } from '@/lib/compress';

interface CompressTabProps {
  pdf: PDFFile | null;
  onClear: () => void;
}

export function CompressTab({ pdf, onClear }: CompressTabProps) {
  const [targetSizeMB, setTargetSizeMB] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [resultFile, setResultFile] = useState<{name: string; blob: Blob; size: number} | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleCompress = async () => {
    if (!pdf) return;
    
    setIsProcessing(true);
    setResultFile(null);
    setWarning(null);
    
    const targetBytes = targetSizeMB * 1024 * 1024;
    const baseName = pdf.name.replace(/\.[^/.]+$/, "");
    
    try {
      const arrayBuffer = await pdf.file.arrayBuffer();
      const rawBytes = new Uint8Array(arrayBuffer);
      
      const { blob, targetReached, warning: compWarning } = await autoCompressPdf(
        rawBytes, 
        targetBytes, 
        setProgressMsg
      );

      if (compWarning && !targetReached) {
        setWarning('PDF belum dapat dikompres hingga target tanpa penurunan kualitas yang signifikan.');
      }
      
      setResultFile({
        name: `${baseName}_Compressed.pdf`,
        blob: blob,
        size: blob.size
      });

      setProgressMsg('Selesai');
    } catch (err) {
      console.error(err);
      alert('Gagal melakukan kompresi PDF. Browser mungkin kehabisan memori.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultFile) {
      saveAs(resultFile.blob, resultFile.name);
    }
  };

  if (!pdf) {
    return (
      <div className="py-12 text-center text-slate-500">
        Silakan unggah PDF terlebih dahulu.
      </div>
    );
  }

  const reduction = resultFile 
    ? ((pdf.size - resultFile.size) / pdf.size * 100).toFixed(1)
    : 0;
    
  const targetReached = resultFile && resultFile.size <= targetSizeMB * 1024 * 1024;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PDFInfo pdf={pdf} onClear={onClear} />
      
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-slate-800">Target Ukuran</h3>
            
            <div className="space-y-3">
              {[2, 5, 10].map(size => (
                <label key={size} className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="targetSize"
                    value={size}
                    checked={targetSizeMB === size}
                    onChange={() => setTargetSizeMB(size)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Maksimal {size} MB</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleCompress}
              disabled={isProcessing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progressMsg}</span>
                </>
              ) : (
                <span>Compress PDF</span>
              )}
            </button>
            
            <p className="text-xs text-slate-500 mt-2 text-center">
              *Proses dilakukan secara lokal di browser Anda. <br/>Teks akan dikonversi menjadi gambar untuk mengurangi ukuran secara maksimal.
            </p>
          </div>
        </div>
        
        <div className="lg:col-span-6 space-y-6">
          {resultFile && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="font-semibold text-slate-800 text-center">Hasil Kompresi</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Original Size:</span>
                  <span className="font-medium text-slate-800">{formatBytes(pdf.size)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Compressed Size:</span>
                  <span className={targetReached ? "font-bold text-green-600" : "font-bold text-orange-600"}>
                    {formatBytes(resultFile.size)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Reduction:</span>
                  <span className="font-medium text-slate-800">{reduction}%</span>
                </div>
              </div>
              
              {targetReached ? (
                <div className="text-center text-sm font-medium text-green-600 bg-green-50 p-2 rounded-lg">
                  Target {targetSizeMB} MB tercapai ✓
                </div>
              ) : warning ? (
                <div className="text-center text-sm font-medium text-orange-600 bg-orange-50 p-2 rounded-lg">
                  {warning}
                </div>
              ) : null}
              
              <button
                onClick={handleDownload}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download Hasil {targetReached ? 'Kompresi' : 'Terbaik'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
