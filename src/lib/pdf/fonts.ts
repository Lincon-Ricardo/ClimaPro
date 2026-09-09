import type { jsPDF } from 'jspdf';
import { PDF_FAMILY } from './fontStyle';

const FILE = 'Poppins.ttf';

function b64(dataUri: string) {
  return dataUri.split(',')[1];
}

let loaded = false;

export function isPdfFontsLoaded(): boolean {
  return loaded;
}

export async function loadPdfFonts(doc: jsPDF): Promise<void> {
  if (loaded) return;
  const [{ PoppinsRegular }, { PoppinsMedium }, { PoppinsSemiBold }, { PoppinsBold }] = await Promise.all([
    import('./poppins_regular'),
    import('./poppins_medium'),
    import('./poppins_semibold'),
    import('./poppins_bold'),
  ]);
  doc.addFileToVFS(FILE, b64(PoppinsRegular));
  doc.addFileToVFS(`${FILE}M`, b64(PoppinsMedium));
  doc.addFileToVFS(`${FILE}S`, b64(PoppinsSemiBold));
  doc.addFileToVFS(`${FILE}B`, b64(PoppinsBold));
  doc.addFont(FILE, PDF_FAMILY, 'normal');
  doc.addFont(`${FILE}M`, PDF_FAMILY, 'medium');
  doc.addFont(`${FILE}S`, PDF_FAMILY, 'semibold');
  doc.addFont(`${FILE}B`, PDF_FAMILY, 'bold');
  loaded = true;
}

export { setPdfFont } from './fontStyle';
export type { PdfWeight } from './fontStyle';
