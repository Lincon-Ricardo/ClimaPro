import type { PdfContext } from './theme';
import { sectionLabel, text, measureLines } from './theme';

export function drawInfoBox(
  ctx: PdfContext,
  x: number,
  y: number,
  w: number,
  label: string,
  title: string,
  sub1?: string,
  sub2?: string,
  opts?: { brandAccent?: boolean },
): number {
  const { doc, c } = ctx;
  const innerW = w - 12;
  const labelTop = y - 4;
  const titleLines = measureLines(doc, title, 10, 'semibold', innerW).length;
  const sub1Lines = sub1 ? measureLines(doc, sub1, 8, 'normal', innerW).length : 0;
  const sub2Lines = sub2 ? measureLines(doc, sub2, 8, 'normal', innerW).length : 0;
  const contentH = 10 + titleLines * 4.2 + sub1Lines * 3.8 + sub2Lines * 3.8 + 2;
  const boxHeight = Math.max(24, contentH);
  doc.setFillColor(c.soft[0], c.soft[1], c.soft[2]);
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, labelTop, w, boxHeight, 2, 2, 'FD');
  if (opts?.brandAccent !== false) {
    doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
    doc.roundedRect(x, labelTop, 2.2, 6, 1, 1, 'F');
  }
  sectionLabel(doc, label, x + 5, y + 1, c.muted);
  let ty = y + 7.5;
  const n1 = text(doc, { x: x + 5, y: ty, str: title, size: 10, weight: 'semibold', color: c.ink, w: innerW });
  ty += n1 * 4.2 + 1.5;
  if (sub1) { const n = text(doc, { x: x + 5, y: ty, str: sub1, size: 8, weight: 'normal', color: c.muted, w: innerW }); ty += n * 3.8 + 0.8; }
  if (sub2) text(doc, { x: x + 5, y: ty, str: sub2, size: 8, weight: 'normal', color: c.muted, w: innerW });
  return boxHeight;
}
