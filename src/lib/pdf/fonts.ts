import { jsPDF } from 'jspdf';
import { PoppinsRegular } from './poppins_regular';
import { PoppinsMedium } from './poppins_medium';
import { PoppinsSemiBold } from './poppins_semibold';
import { PoppinsBold } from './poppins_bold';

export type PdfWeight = 'normal' | 'medium' | 'semibold' | 'bold';

const FILE = 'Poppins.ttf';
const FAMILY = 'Poppins';

function b64(dataUri: string) {
  return dataUri.split(',')[1];
}

export function loadPdfFonts(doc: jsPDF) {
  doc.addFileToVFS(FILE, b64(PoppinsRegular));
  doc.addFileToVFS(FILE + 'M', b64(PoppinsMedium));
  doc.addFileToVFS(FILE + 'S', b64(PoppinsSemiBold));
  doc.addFileToVFS(FILE + 'B', b64(PoppinsBold));
  doc.addFont(FILE, FAMILY, 'normal');
  doc.addFont(FILE + 'M', FAMILY, 'medium');
  doc.addFont(FILE + 'S', FAMILY, 'semibold');
  doc.addFont(FILE + 'B', FAMILY, 'bold');
}

export function setPdfFont(doc: jsPDF, weight: PdfWeight = 'normal', size: number) {
  doc.setFont(FAMILY, weight);
  doc.setFontSize(size);
}
