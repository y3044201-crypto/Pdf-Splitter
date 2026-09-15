import { jsPDF } from 'jspdf';
import { pdfjsLib } from './pdfjs';
import { formatBytes } from './utils';

export async function compressToPDF(pdfDoc: any, scale: number, quality: number, numPages: number, onProgress: (p: number) => void): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  for (let i = 1; i <= numPages; i++) {
    onProgress(i);
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    
    const imgData = canvas.toDataURL('image/jpeg', quality);
    const orientation = viewport.width > viewport.height ? 'l' : 'p';
    
    if (i > 1) {
      doc.addPage('a4', orientation);
    }
    
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  }
  
  // Clean up canvas
  canvas.width = 0;
  canvas.height = 0;
  
  return doc.output('blob');
}

export async function autoCompressPdf(
  rawBytes: Uint8Array,
  targetBytes: number,
  onProgressMsg: (msg: string) => void
): Promise<{ blob: Blob; originalSize: number; targetReached: boolean; warning: string | null }> {
  const originalSize = rawBytes.length;
  
  const MAX_BYTES = targetBytes; 
  const MIN_BYTES = targetBytes - (0.10 * 1024 * 1024); // e.g. 1.90 MB if target is 2.00 MB

  if (originalSize <= MAX_BYTES) {
    let warning = null;
    if (originalSize < MIN_BYTES) {
      warning = `Ukuran PDF hasil split sudah lebih kecil dari batas minimum ${formatBytes(MIN_BYTES)} dan tidak perlu diperbesar secara artifisial.`;
    }
    return {
      blob: new Blob([rawBytes], { type: 'application/pdf' }),
      originalSize,
      targetReached: true, // Already valid
      warning
    };
  }

  onProgressMsg('Menganalisis ukuran dan mengoptimalkan PDF...');
  const loadingTask = pdfjsLib.getDocument({ data: rawBytes });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let low = 0.0;
  let high = 1.0;
  let bestBlob: Blob | null = null;
  let bestDiff = Infinity;
  let targetReached = false;
  
  const MAX_ITERATIONS = 6;
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    // Map mid (0-1) to scale (0.5 - 2.0) and quality (0.1 - 1.0)
    const scale = 0.5 + (1.5 * mid); 
    const quality = 0.1 + (0.9 * mid);
    
    // Allow UI to breathe
    await new Promise(r => setTimeout(r, 50));

    const blob = await compressToPDF(pdfDoc, scale, quality, numPages, (p) => {
       onProgressMsg(`Mencari ukuran optimal (Iteration ${i + 1}/${MAX_ITERATIONS})... Halaman ${p}/${numPages}`);
    });
    
    const size = blob.size;
    
    if (size <= MAX_BYTES) {
       const diff = MAX_BYTES - size;
       if (diff < bestDiff) {
         bestDiff = diff;
         bestBlob = blob;
       }
    } else {
       if (!bestBlob || bestBlob.size > MAX_BYTES) {
          if (!bestBlob || size < bestBlob.size) {
              bestBlob = blob;
          }
       }
    }

    if (size >= MIN_BYTES && size <= MAX_BYTES) {
      targetReached = true;
      bestBlob = blob;
      onProgressMsg(`Ukuran saat ini: ${formatBytes(size)}. Target tercapai ✓`);
      break;
    }

    if (size > MAX_BYTES) {
      high = mid; // Need more compression
    } else {
      low = mid; // Need less compression
    }
  }

  let warning = null;
  const finalBlob = bestBlob || new Blob([rawBytes], { type: 'application/pdf' });

  if (!targetReached) {
      if (finalBlob.size > MAX_BYTES) {
          warning = `Target ${formatBytes(MIN_BYTES)}–${formatBytes(MAX_BYTES)} tidak dapat dicapai secara optimal untuk PDF ini.`;
      } else if (finalBlob.size < MIN_BYTES) {
          warning = `Ukuran PDF hasil kompresi lebih kecil dari ${formatBytes(MIN_BYTES)} dan tidak perlu diperbesar secara artifisial.`;
          targetReached = true; // Count as success per user requirements if it's naturally small
      }
  }

  await loadingTask.destroy();

  return {
    blob: finalBlob,
    originalSize,
    targetReached,
    warning
  };
}
