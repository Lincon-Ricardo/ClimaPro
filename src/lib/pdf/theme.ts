import { jsPDF } from 'jspdf';
import { setPdfFont, type PdfWeight } from './fontStyle';
import type { Company } from '../../types';
import { formatPhone, onlyDigits } from '../../lib/utils';

export type RGB = [number, number, number];

export interface PdfColors {
  brand: RGB;
  brandDark: RGB;
  brandLight: RGB;
  ink: RGB;
  muted: RGB;
  softMuted: RGB;
  line: RGB;
  soft: RGB;
  white: RGB;
  success: RGB;
  warning: RGB;
  danger: RGB;
}

const DEFAULT_BRAND: RGB = [9, 46, 110];

export function pdfColors(brand: RGB = DEFAULT_BRAND): PdfColors {
  const b = brand;
  const darken = (c: RGB, f: number): RGB => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
  const lighten = (c: RGB, f: number): RGB => [
    Math.min(255, Math.round(c[0] + (255 - c[0]) * f)),
    Math.min(255, Math.round(c[1] + (255 - c[1]) * f)),
    Math.min(255, Math.round(c[2] + (255 - c[2]) * f)),
  ];
  return {
    brand: b,
    brandDark: darken(b, 0.72),
    brandLight: lighten(b, 0.22),
    ink: [24, 34, 51],
    muted: [100, 112, 132],
    softMuted: [130, 141, 158],
    line: [225, 230, 238],
    soft: [247, 248, 251],
    white: [255, 255, 255],
    success: [21, 128, 61],
    warning: [217, 119, 6],
    danger: [220, 38, 38],
  };
}

export interface PdfContext {
  doc: jsPDF;
  c: PdfColors;
  AW: number; // page width
  PH: number; // page height
  MR: number; // right margin
  ML: number; // left margin
  CW: number; // content width
}

/** Espaço vertical reservado no topo de cada página para o cabeçalho de marca */
export const HEADER_SPACE = 61;

/** Altura do rodapé + margem de segurança para o conteúdo não colar nele */
export const FOOTER_SPACE = 27;

export function createPdf(company?: Company | null): PdfContext {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const AW = 210, PH = 297, ML = 14, MR = 196, CW = 182;
  return { doc, c: pdfColors(brandFromCompany(company)), AW, PH, MR, ML, CW };
}

export async function ensurePdfFonts(doc: jsPDF): Promise<void> {
  const { loadPdfFonts } = await import('./fonts');
  await loadPdfFonts(doc);
}

/** Cor fixa da marca (azul ClimaPro) — sem variação por nome da empresa */
export function brandFromCompany(_company?: Company | null): RGB {
  return DEFAULT_BRAND;
}

// ── helpers de texto ─────────────────────────────────────────────
export function text(
  doc: jsPDF,
  opts: {
    x: number; y: number; str: string; size: number; weight?: PdfWeight;
    color?: RGB; align?: 'left' | 'center' | 'right'; w?: number;
  },
) {
  setPdfFont(doc, opts.weight || 'normal', opts.size);
  if (opts.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
  if (opts.w) {
    const lines = doc.splitTextToSize(opts.str, opts.w);
    doc.text(lines, opts.x, opts.y, { align: opts.align || 'left' });
    return lines.length;
  }
  doc.text(opts.str, opts.x, opts.y, { align: opts.align || 'left' });
  return 1;
}

/** Retorna a altura (mm) de uma string quebrada com size */
export function textHeight(doc: jsPDF, str: string, size: number, w: number, lineH = 4.6) {
  setPdfFont(doc, 'normal', size);
  const lines = doc.splitTextToSize(str, w);
  return lines.length * lineH;
}

export function roundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number) {
  doc.roundedRect(x, y, w, h, r, r);
}

// ── seções ────────────────────────────────────────────────────────
type JsPdfWithCharSpace = jsPDF & { charSpace?: number };

export function sectionLabel(doc: jsPDF, label: string, x: number, y: number, color: RGB) {
  setPdfFont(doc, 'semibold', 7.2);
  doc.setTextColor(color[0], color[1], color[2]);
  (doc as JsPdfWithCharSpace).charSpace = 0.6;
  doc.text(label.toUpperCase(), x, y);
  (doc as JsPdfWithCharSpace).charSpace = 0;
}

export function divider(doc: jsPDF, c: PdfColors, y: number, x1: number, x2: number) {
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

/** Lista de contatos da empresa formatada e sem duplicação (phone/whatsapp iguais) */
export function companyContacts(company?: Company | null): string {
  if (!company) return '';
  const tel = (v?: string) => (v && onlyDigits(v).length >= 10 ? formatPhone(v) : (v || '').trim());
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const v of [company.phone, company.whatsapp]) {
    if (!v) continue;
    const d = onlyDigits(v);
    if (!d) continue;
    if (seen.has(d)) continue;
    seen.add(d);
    parts.push(tel(v));
  }
  if (company.email && company.email.trim()) parts.push(company.email.trim());
  return parts.join('   ·   ');
}

/** Detecta o formato da imagem (PNG ou JPEG) a partir do dataURL */
export function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (/^data:image\/jpeg/i.test(dataUrl) || /^data:image\/jpg/i.test(dataUrl)) return 'JPEG';
  return 'PNG';
}

/** Trunca um texto para caber em uma linha de largura maxW (com …) */
export function fitOneLine(doc: jsPDF, str: string, maxW: number): string {
  const s = (str || '').trim();
  if (!s || doc.getTextWidth(s) <= maxW) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(`${s.slice(0, mid).trim()}…`) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return `${s.slice(0, Math.max(1, lo)).trim()}…`;
}

/** Quebra em até maxLines linhas, com … na última se precisar */
export function clampLines(doc: jsPDF, str: string, w: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(str, w) as string[];
  if (lines.length <= maxLines) return lines;
  const cut = lines.slice(0, maxLines);
  cut[maxLines - 1] = `${cut[maxLines - 1].replace(/…?$/, '').slice(0, -1).trim()}…`;
  return cut;
}
/** Quebra com a fonte correta ativa (evita medir com fonte residual do cabeçalho) */
export function measureLines(doc: jsPDF, str: string, size: number, weight: PdfWeight, w: number): string[] {
  setPdfFont(doc, weight, size);
  return doc.splitTextToSize(str || '-', w) as string[];
}

/** Lê largura/altura (px) de um PNG em dataURL */
function pngSize(dataUrl: string): { w: number; h: number } | null {
  try {
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return null;
    const bin = atob(m[1]);
    if (bin.charCodeAt(12) !== 0x49 || bin.charCodeAt(13) !== 0x48 || bin.charCodeAt(14) !== 0x52) return null;
    const dw = bin.charCodeAt(16) * 16777216 + bin.charCodeAt(17) * 65536 + bin.charCodeAt(18) * 256 + bin.charCodeAt(19);
    const dh = bin.charCodeAt(20) * 16777216 + bin.charCodeAt(21) * 65536 + bin.charCodeAt(22) * 256 + bin.charCodeAt(23);
    if (!dw || !dh) return null;
    return { w: dw, h: dh };
  } catch {
    return null;
  }
}

/** Desenha uma assinatura/logo (dataURL PNG ou JPEG) de forma proporcional */
export function drawSignature(
  doc: jsPDF,
  dataUrl: string,
  centerX: number,
  lineY: number,
  maxW: number,
  maxH: number,
): boolean {
  const dim = pngSize(dataUrl);
  const top = lineY - maxH;
  let w = maxW;
  let h = maxH;
  if (dim && dim.w && dim.h) {
    const ratio = dim.h / dim.w;
    h = maxH;
    w = h / ratio;
    if (w > maxW) { w = maxW; h = w * ratio; }
  }
  try {
    doc.setFillColor(255, 255, 255);
    doc.rect(centerX - w / 2 - 1, top - 1, w + 2, h + 2, 'F');
    doc.addImage(dataUrl, imageFormat(dataUrl), centerX - w / 2, top, w, h);
    return true;
  } catch {
    return false;
  }
}

// ── Badge de status ──────────────────────────────────────────────
export function statusBadge(
  doc: jsPDF,
  c: PdfColors,
  label: string,
  status: string,
  cx: number, y: number,
  maxW = 44,
) {
  const map: Record<string, RGB> = {
    rascunho: c.softMuted,
    enviado: c.brandLight,
    aprovado: c.success,
    recusado: c.danger,
    pagado: c.success,
    pago: c.success,
    pendente: c.warning,
    concluido: c.success,
    cancelado: c.danger,
    agendado: c.brandLight,
    em_andamento: c.brandLight,
  };
  const color = map[status] || c.muted;
  setPdfFont(doc, 'bold', 7);
  const w = Math.min(maxW, doc.getTextWidth(fitOneLine(doc, label.toUpperCase(), maxW - 9)) + 9);
  const h = 6;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(cx - w / 2, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(fitOneLine(doc, label.toUpperCase(), w - 4), cx, y + h / 2 + 1, { align: 'center' });
  return w;
}

// ── cabeçalho / rodapé de marca ──────────────────────────────────
export function drawBrandHeader(
  ctx: PdfContext,
  opts: {
    company?: Company | null;
    title: string;
    subtitle?: string;
    rightLines: string[];
    accent?: RGB;
    docName?: string;
  },
) {
  const { doc, c, AW, MR, ML } = ctx;
  const company = opts.company;
  const bandH = 52;
  const logo = company?.logo;

  // ── faixa de marca ─────────────────────────────────────────────
  doc.setFillColor(c.brandDark[0], c.brandDark[1], c.brandDark[2]);
  doc.rect(0, 0, AW, 5, 'F');
  doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
  doc.rect(0, 5, AW, bandH - 6, 'F');
  // linha de destaque discreta na base do cabeçalho
  doc.setFillColor(c.brandLight[0], c.brandLight[1], c.brandLight[2]);
  doc.rect(0, bandH - 1.6, AW, 1.6, 'F');

  // ── logo (moldura suave) ───────────────────────────────────────
  let bx = 0;
  if (logo) {
    const logoSize = 20;
    const logoY = 14;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(c.brandLight[0], c.brandLight[1], c.brandLight[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, logoY, logoSize, logoSize, 2, 2, 'FD');
    try { doc.addImage(logo, imageFormat(logo), ML + 2, logoY + 2, logoSize - 4, logoSize - 4, undefined, 'FAST'); } catch { /* logo opcional: segue sem imagem */ }
    bx = logoSize + 6;
  }

  // ── coluna do documento (direita, reservada) ───────────────────
  const rightW = 78;
  const rightX = MR - rightW;
  const x = ML + bx;
  const leftW = rightX - x - 6;

  // ── identidade da empresa (esquerda, sem vazar) ─────────────────
  setPdfFont(doc, 'bold', 15);
  doc.setTextColor(255, 255, 255);
  doc.text(fitOneLine(doc, company?.name || 'ClimaPro', leftW), x, 19);

  setPdfFont(doc, 'normal', 7.5);
  doc.setTextColor(204, 218, 238);
  const infoLine = [company?.cnpj && `CNPJ ${company.cnpj}`, company?.address].filter(Boolean).join('   ·   ');
  const contactLine = companyContacts(company);
  const LH = 3.2;
  let ly = 24.5;
  if (infoLine) {
    const lines = clampLines(doc, infoLine, leftW, 2);
    doc.text(lines, x, ly);
    ly += lines.length * LH;
  }
  if (contactLine) {
    const lines = clampLines(doc, contactLine, leftW, 2);
    doc.text(lines, x, ly);
  }

  // ── título do documento (direita) ─────────────────────────────
  setPdfFont(doc, 'semibold', 8);
  doc.setTextColor(200, 214, 236);
  (doc as JsPdfWithCharSpace).charSpace = 0.7;
  doc.text(fitOneLine(doc, (opts.docName || '').toUpperCase(), rightW), MR, 15, { align: 'right' });
  (doc as JsPdfWithCharSpace).charSpace = 0;
  setPdfFont(doc, 'bold', 15);
  doc.setTextColor(255, 255, 255);
  doc.text(fitOneLine(doc, opts.title, rightW), MR, 24, { align: 'right' });
  let metaY = 31;
  if (opts.subtitle) {
    setPdfFont(doc, 'semibold', 7.5);
    doc.setTextColor(222, 232, 246);
    const subLines = clampLines(doc, opts.subtitle, rightW, 2);
    doc.text(subLines, MR, metaY, { align: 'right' });
    metaY += subLines.length * 4 + 3;
  } else {
    metaY += 3;
  }

  // ── metadados do documento (direita, sob o título) ─────────────
  let rz = Math.max(metaY, 34);
  if (rz + (opts.rightLines.length) * 4.2 > bandH - 2) rz = bandH - 2 - opts.rightLines.length * 4.2;
  setPdfFont(doc, 'normal', 7.5);
  doc.setTextColor(214, 226, 242);
  opts.rightLines.forEach((l, i) => {
    doc.text(fitOneLine(doc, l, rightW), MR, rz + i * 4.2, { align: 'right' });
  });
}

export function drawBrandFooter(ctx: PdfContext, company?: Company | null, pageNo?: number, total?: number) {
  const { doc, c, AW, MR, ML, PH } = ctx;
  const fh = 20;
  // fundo do rodapé
  doc.setFillColor(c.brandDark[0], c.brandDark[1], c.brandDark[2]);
  doc.rect(0, PH - fh, AW, fh, 'F');
  // linha de destaque discreta no topo do rodapé
  doc.setFillColor(c.brandLight[0], c.brandLight[1], c.brandLight[2]);
  doc.rect(0, PH - fh, AW, 1.2, 'F');
  // faixa base fina na cor da marca
  doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
  doc.rect(0, PH - 1.6, AW, 1.6, 'F');

  const pageTxt = `Página ${pageNo ?? doc.getNumberOfPages()} de ${total ?? doc.getNumberOfPages()}`;
  setPdfFont(doc, 'semibold', 8.5);
  const pageW = doc.getTextWidth(pageTxt) + 6;
  const leftW = MR - ML - pageW - 6;

  // nome da empresa (linha 1, maior e em negrito)
  const rawLabel = company?.name?.trim() || 'ClimaPro';
  setPdfFont(doc, 'bold', 10);
  doc.setTextColor(255, 255, 255);
  doc.text(fitOneLine(doc, rawLabel, leftW), ML, PH - 12.5, { align: 'left' });

  // contatos (linha 2)
  const contacts = companyContacts(company);
  if (contacts) {
    setPdfFont(doc, 'normal', 8.5);
    doc.setTextColor(200, 214, 236);
    doc.text(fitOneLine(doc, contacts, leftW), ML, PH - 7, { align: 'left' });
  }

  // página (direita, centralizada verticalmente e legível)
  setPdfFont(doc, 'semibold', 8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(pageTxt, MR, PH - 10, { align: 'right' });
}

/** Redesenha todos os rodapés com a numeração final correta (chamar antes de salvar) */
export function stampFooters(ctx: PdfContext, company?: Company | null) {
  const { doc } = ctx;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawBrandFooter(ctx, company, i, total);
  }
  doc.setPage(total);
}

/** Nova página já com cabeçalho + rodapé (evita página pelada) */
export function newBrandedPage(
  ctx: PdfContext,
  headerArgs: { company?: Company | null; title: string; subtitle?: string; rightLines: string[]; docName?: string },
  startY = HEADER_SPACE,
): number {
  ctx.doc.addPage();
  drawBrandHeader(ctx, headerArgs);
  drawBrandFooter(ctx, headerArgs.company);
  return startY;
}

/** Empurra para a próxima linha verticalmente, respeitando a margem de rodapé */
export function fitOrNewPage(ctx: PdfContext, y: number, needed: number, startY = 42): number {
  const { PH } = ctx;
  if (y + needed > PH - 20) {
    ctx.doc.addPage();
    return startY;
  }
  return y;
}
