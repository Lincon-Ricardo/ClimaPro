import type { jsPDF } from 'jspdf';

export type PdfWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export const PDF_FAMILY = 'Poppins';

export function setPdfFont(doc: jsPDF, weight: PdfWeight = 'normal', size: number) {
  doc.setFont(PDF_FAMILY, weight);
  doc.setFontSize(size);
}
