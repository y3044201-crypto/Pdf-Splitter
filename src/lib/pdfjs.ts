import * as pdfjsLib from 'pdfjs-dist';

// Since pdfjs-dist relies on a worker, we configure it to use the local worker script
// For Vite, we can usually import the worker URL or rely on the standard unpkg CDN if things fail.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export { pdfjsLib };
