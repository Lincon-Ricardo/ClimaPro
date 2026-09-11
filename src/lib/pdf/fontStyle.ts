import type { jsPDF } from 'jspdf';

export type PdfWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export const PDF_FAMILY = 'Poppins';

export function setPdfFont(doc: jsPDF, weight: PdfWeight = 'normal', size: number) {
  try {
    doc.setFont(PDF_FAMILY, weight);
  } catch {
    doc.setFont('helvetica', weight === 'normal' || weight === 'medium' ? 'normal' : 'bold');
  }
  doc.setFontSize(size);
}
