export interface PDFFile {
  file: File;
  name: string;
  size: number;
  originalSize?: number; // In case of compression
  numPages: number;
  document: any; // pdfjs document or raw bytes depending on context
  rawBytes: Uint8Array;
}
