import { formatBRL, formatDate, paymentLabel } from '../utils';
import { STATUS_LABEL } from '../utils';
import type { Company, Customer, Equipment, ServiceOrder, ChecklistItem } from '../../types';
import {
  createPdf, ensurePdfFonts, text, sectionLabel, divider, drawBrandHeader, drawBrandFooter,
  textHeight, drawSignature, HEADER_SPACE, FOOTER_SPACE, fitOneLine,
  measureLines, newBrandedPage, stampFooters,
} from './theme';
import { drawInfoBox } from './blocks';
import { setPdfFont } from './fontStyle';

export async function generateServiceOrderPdf(
  o: ServiceOrder,
  customer: Customer | undefined,
  eq: Equipment | undefined,
  company: Company | null | undefined,
  technicianName?: string,
  opts?: { save?: boolean },
) {
  const ctx = createPdf(company);
  await ensurePdfFonts(ctx.doc);
  const { doc, c, ML, MR, CW, PH } = ctx;
  const payLabel = o.paymentStatus === 'pago' ? 'Pago' : 'Pendente';
  const payMethod = o.paymentStatus === 'pago' && o.paymentMethod ? ` · ${paymentLabel(o.paymentMethod)}` : '';
  const headerArgs = {
    company,
    title: 'ORDEM DE SERVIÇO',
    docName: 'Atendimento técnico',
    rightLines: [
      `Técnico: ${o.technician || technicianName || '-'}`,
      `Data: ${formatDate(o.date)}`,
      `OS Nº ${o.osNumber}`,
    ],
  };
  const header = () => { drawBrandHeader(ctx, headerArgs); drawBrandFooter(ctx, company); };
  header();
  let y = HEADER_SPACE;
  const colW = (CW - 6) / 2;
  const custAddr = [customer?.street, customer?.number, customer?.district, customer?.city].filter(Boolean).join(', ') || o.address;
  const custContact = [customer?.phone, customer?.email].filter(Boolean).join('   ·   ');
  const eqTitle = eq ? [`${eq.brand} ${eq.model}`.trim(), `${eq.btus} BTU`].filter(Boolean).join(' · ') : (o.service || '-');
  const eqSub = eq ? [eq.type, eq.installLocation, eq.serial && `S/N ${eq.serial}`].filter(Boolean).join('   ·   ') : '';
  const boxH = Math.max(
    drawInfoBox(ctx, ML, y, colW, 'CLIENTE', customer?.name || '-', custAddr || undefined, custContact || undefined),
    drawInfoBox(ctx, ML + colW + 6, y, colW, 'EQUIPAMENTO', eqTitle, eqSub || undefined, eq?.warranty || undefined),
  );
  y += boxH + 8;
  sectionLabel(doc, 'Serviço solicitado', ML, y, c.brand);
  const problemTxt = (o.service || '') + (o.problem ? ` — ${o.problem}` : '');
  text(doc, { x: ML, y: y + 6, str: problemTxt || '-', size: 9, weight: 'normal', color: c.ink, w: CW });
  y += 6 + textHeight(doc, problemTxt || '-', 9, CW);
  const doneItems = (o.checklist || []).filter((it: ChecklistItem) => it.done);
  if (doneItems.length > 0) {
    y += 6;
    divider(doc, c, y - 2, ML, MR);
    sectionLabel(doc, 'Executado', ML, y, c.brand);
    y += 2;
    const half = Math.ceil(doneItems.length / 2);
    setPdfFont(doc, 'normal', 8);
    doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
    let cy = y + 6;
    const colMax = Math.max(half, doneItems.length - half);
    const itemW = CW / 2 - 10;
    for (let i = 0; i < colMax; i++) {
      if (cy > PH - FOOTER_SPACE) { y = newBrandedPage(ctx, headerArgs); cy = y + 6; setPdfFont(doc, 'normal', 8); doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]); }
      if (doneItems[i]) { doc.setFillColor(c.success[0], c.success[1], c.success[2]); doc.circle(ML + 1.5, cy - 1.5, 1.1, 'F'); doc.text(fitOneLine(doc, doneItems[i].label, itemW), ML + 5, cy); }
      if (doneItems[half + i]) {
        const x2 = ML + CW / 2 + 5;
        doc.setFillColor(c.success[0], c.success[1], c.success[2]); doc.circle(x2 - 3, cy - 1.5, 1.1, 'F');
        doc.text(fitOneLine(doc, doneItems[half + i].label, itemW), x2 + 1, cy);
      }
      cy += 5;
    }
    y = cy + 4;
  }
  if (o.observacoesTecnicas) {
    const obsH = 6 + textHeight(doc, o.observacoesTecnicas, 8.5, CW);
    if (y + obsH > PH - FOOTER_SPACE) y = newBrandedPage(ctx, headerArgs);
    sectionLabel(doc, 'Observações técnicas', ML, y, c.brand);
    text(doc, { x: ML, y: y + 6, str: o.observacoesTecnicas, size: 8.5, weight: 'normal', color: c.muted, w: CW });
    y += 6 + textHeight(doc, o.observacoesTecnicas, 8.5, CW);
  }
  y += 6;
  const valRows: Array<[string, string]> = [
    ['Valor do serviço', formatBRL(Number(o.value) || 0)],
    ['Status', STATUS_LABEL[o.status] || o.status],
    ['Pagamento', payLabel + payMethod],
  ];
  const boxW2 = 120;
  const bx2X = MR - boxW2;
  const boxH2 = valRows.length * 6 + 6;
  if (y + boxH2 > PH - FOOTER_SPACE) y = newBrandedPage(ctx, headerArgs);
  doc.setFillColor(c.soft[0], c.soft[1], c.soft[2]);
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(bx2X, y - 4, boxW2, boxH2, 2, 2, 'FD');
  let vy = y;
  setPdfFont(doc, 'normal', 8.5);
  for (const [k, v] of valRows) {
    text(doc, { x: bx2X + 5, y: vy + 3, str: k, size: 8.5, weight: 'normal', color: c.muted });
    text(doc, { x: MR - 5, y: vy + 3, str: v, size: 8.5, weight: 'semibold', color: c.ink, align: 'right' });
    vy += 6;
  }
  y = vy + 2;
  if (y + 42 > PH - FOOTER_SPACE) y = newBrandedPage(ctx, headerArgs);
  const sigTop = y + 6;
  const sigW = (CW - 16) / 2;
  const sigY = sigTop + 24;
  divider(doc, c, sigTop, ML, MR);
  const ccol = ML + sigW / 2;
  setPdfFont(doc, 'semibold', 8);
  doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
  doc.text(fitOneLine(doc, customer?.name || 'Cliente', sigW - 10), ccol, sigTop + 7, { align: 'center' });
  if (o.customerSignature && o.customerSignature !== 'undefined') drawSignature(doc, o.customerSignature, ccol, sigY, sigW - 4, 11);
  doc.setDrawColor(c.ink[0], c.ink[1], c.ink[2]);
  doc.setLineWidth(0.45);
  doc.line(ML, sigY, ML + sigW, sigY);
  text(doc, { x: ccol, y: sigY + 5, str: 'Assinatura do cliente', size: 6.5, weight: 'normal', color: c.muted, align: 'center' });
  const sx2 = ML + sigW + 16;
  const scol = sx2 + sigW / 2;
  setPdfFont(doc, 'semibold', 8);
  doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
  doc.text(fitOneLine(doc, company?.name || 'Empresa', sigW - 10), scol, sigTop + 7, { align: 'center' });
  if (company?.signature) drawSignature(doc, company.signature, scol, sigY, sigW - 4, 11);
  doc.setDrawColor(c.ink[0], c.ink[1], c.ink[2]);
  doc.setLineWidth(0.45);
  doc.line(sx2, sigY, sx2 + sigW, sigY);
  text(doc, { x: scol, y: sigY + 5, str: 'Responsável', size: 6.5, weight: 'normal', color: c.muted, align: 'center' });
  stampFooters(ctx, company);
  if (opts?.save) doc.save(`OS-${o.osNumber}.pdf`);
  return doc;
}

export { measureLines };
