import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL, formatDate } from '../utils';
import type { Budget, BudgetItem, Company, Customer } from '../../types';
import {
  createPdf, text, sectionLabel, divider, drawBrandHeader, drawBrandFooter,
  textHeight, statusBadge, drawSignature, HEADER_SPACE, FOOTER_SPACE,
  fitOneLine, measureLines, newBrandedPage, stampFooters,
} from './theme';
import { drawInfoBox } from './blocks';
import { setPdfFont } from './fonts';

export function generateBudgetPdf(budget: Budget, customer: Customer | undefined, company: Company | null | undefined): jsPDF {
  const b = budget;
  const ctx = createPdf(company);
  const { doc, c, ML, MR, CW, PH } = ctx;
  const sLabel: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };
  const subtitle = `${b.serviceType || 'Serviço'} · Cliente: ${customer?.name || '-'}`;
  const headerArgs = {
    company,
    title: 'ORÇAMENTO',
    subtitle,
    docName: 'Documento comercial',
    rightLines: [
      `Validade: ${b.validity || '7 dias'}`,
      `Emissão: ${formatDate(b.createdAt)}`,
      `Nº ${b.number}`,
    ],
  };
  const header = () => { drawBrandHeader(ctx, headerArgs); drawBrandFooter(ctx, company); };
  header();
  let y = HEADER_SPACE;
  const meta = [
    { k: 'Nº do orçamento', v: b.number },
    { k: 'Status', v: sLabel[b.status] || b.status },
    { k: 'Emissão', v: formatDate(b.createdAt) },
    { k: 'Validade', v: b.validity || '7 dias' },
  ];
  const metaBoxW = CW / 4;
  const metaH = 17;
  doc.setFillColor(c.soft[0], c.soft[1], c.soft[2]);
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(ML, y - 3, CW, metaH, 2, 2, 'FD');
  meta.forEach((m, i) => {
    const x = ML + i * metaBoxW;
    if (m.k === 'Status') {
      sectionLabel(doc, m.k, x + 2, y + 1.5, c.muted);
      const valW = metaBoxW - 8;
      statusBadge(doc, c, m.v, b.status, x + 2 + valW / 2, y + 5.4);
      return;
    }
    sectionLabel(doc, m.k, x + 2, y + 1.5, c.muted);
    setPdfFont(doc, 'semibold', 9.5);
    text(doc, { x: x + 2, y: y + 7.6, str: fitOneLine(doc, m.v, metaBoxW - 6), size: 9.5, weight: 'semibold', color: c.ink });
    if (i > 0) {
      doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
      doc.setLineWidth(0.2);
      doc.line(x, y - 1, x, y + metaH - 2);
    }
  });
  y += metaH + 6;
  const colW = (CW - 6) / 2;
  const cAddr = [customer?.street, customer?.number, customer?.district, customer?.city].filter(Boolean).join(', ');
  const cContact = [customer?.phone, customer?.email, customer?.document && `CPF/CNPJ ${customer.document}`].filter(Boolean).join('   ·   ');
  const withCtx = (x: number, label: string, title: string, s1?: string, s2?: string) => {
    const h = drawInfoBox(ctx, x, y, colW, label, title, s1, s2);
    return h;
  };
  const boxH = Math.max(withCtx(ML, 'CLIENTE', customer?.name || '-', cAddr || undefined, cContact || undefined), withCtx(ML + colW + 6, 'SERVIÇO', b.serviceType || '-', b.description || undefined));
  y += boxH + 9;
  setPdfFont(doc, 'normal', 8);
  const subtotal = b.items.reduce((s: number, i: BudgetItem) => s + i.total, 0);
  const descW = CW - 15 - 38 - 33;
  (doc as unknown as { lastAutoTable?: unknown }).lastAutoTable = undefined;
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 210 - MR, top: HEADER_SPACE, bottom: FOOTER_SPACE },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawBrandHeader(ctx, headerArgs);
        drawBrandFooter(ctx, company);
      }
    },
    head: [['Descrição', 'Qtd.', 'Valor unit.', 'Total']],
    body: b.items.map((i: BudgetItem) => [i.description, String(i.qty), formatBRL(i.unitValue), formatBRL(i.total)]),
    theme: 'grid',
    styles: {
      font: 'Poppins', fontStyle: 'normal', fontSize: 8,
      cellPadding: { top: 3.4, bottom: 3.4, left: 4, right: 4 },
      textColor: c.ink, lineColor: c.line, lineWidth: 0.15, overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: c.brandDark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5,
      lineWidth: 0, cellPadding: { top: 3.8, bottom: 3.8, left: 4, right: 4 }, halign: 'left',
      overflow: 'visible',
    },
    alternateRowStyles: { fillColor: c.soft },
    columnStyles: {
      0: { cellWidth: descW, halign: 'left' },
      1: { halign: 'center', cellWidth: 15, fontStyle: 'normal' },
      2: { halign: 'right', cellWidth: 38, fontStyle: 'normal' },
      3: { halign: 'right', cellWidth: 33, fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.section === 'head') data.cell.styles.halign = data.column.index === 0 ? 'left' : 'center';
      if (data.section === 'body' && data.column.index === 1) data.cell.styles.halign = 'center';
    },
  });
  const tableEnd = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y;
  y = tableEnd + 6;
  const totW = 68;
  const totX = MR - totW;
  const rows: Array<[string, string, string | null]> = [['Subtotal', formatBRL(subtotal), null]];
  if (b.labor > 0) rows.push(['Mão de obra', formatBRL(b.labor), null]);
  if (b.displacement > 0) rows.push(['Deslocamento', formatBRL(b.displacement), null]);
  if (b.discount > 0) rows.push(['Desconto', `- ${formatBRL(b.discount)}`, 'danger']);
  const totalsH = rows.length * 5.8 + 15;
  if (y + totalsH > PH - FOOTER_SPACE) y = newBrandedPage(ctx, headerArgs);
  let ty = y - 2;
  setPdfFont(doc, 'normal', 8.5);
  for (const [label, val, variant] of rows) {
    text(doc, { x: totX + 2, y: ty + 3.5, str: label, size: 8.5, weight: 'normal', color: variant === 'danger' ? c.danger : c.muted });
    text(doc, { x: MR, y: ty + 3.5, str: val, size: 8.5, weight: 'semibold', color: c.ink, align: 'right' });
    ty += 5.8;
  }
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.2);
  doc.line(totX + 2, ty - 0.8, MR, ty - 0.8);
  doc.setFillColor(c.brandDark[0], c.brandDark[1], c.brandDark[2]);
  doc.roundedRect(totX, ty + 0.8, totW, 13, 2.5, 2.5, 'F');
  text(doc, { x: totX + 5, y: ty + 8.4, str: 'TOTAL', size: 9.5, weight: 'bold', color: c.white });
  text(doc, { x: MR - 5, y: ty + 8.4, str: formatBRL(b.total), size: 12, weight: 'bold', color: c.white, align: 'right' });
  ty += 14;
  let contentEnd = ty + 5;
  const condRows = [
    company?.paymentCondition && `Pagamento: ${company.paymentCondition}`,
    company?.executionTerm && `Execução: ${company.executionTerm}`,
    company?.warranty && `Garantia: ${company.warranty}`,
    `Validade: ${b.validity || company?.defaultValidity || '7 dias'}`,
  ].filter(Boolean) as string[];
  if (condRows.length) {
    const condH = condRows.map((row) => measureLines(doc, row, 7.5, 'normal', CW).length).reduce((s, n) => s + n * 4.6, 0) + 8;
    if (contentEnd + condH + 4 > PH - FOOTER_SPACE) contentEnd = newBrandedPage(ctx, headerArgs);
    sectionLabel(doc, 'Condições comerciais', ML, contentEnd + 2, c.brand);
    let cyy = contentEnd + 8;
    condRows.forEach((row) => {
      const n = text(doc, { x: ML, y: cyy, str: row, size: 7.5, weight: 'normal', color: c.muted, w: CW });
      cyy += n * 4.6;
    });
    contentEnd = cyy + 4;
  }
  if (b.notes) {
    const noteH = textHeight(doc, b.notes, 8, CW);
    if (contentEnd + noteH + 8 > PH - FOOTER_SPACE) contentEnd = newBrandedPage(ctx, headerArgs);
    sectionLabel(doc, 'Observações / condições', ML, contentEnd + 2, c.brand);
    text(doc, { x: ML, y: contentEnd + 8, str: b.notes, size: 8, weight: 'normal', color: c.muted, w: CW });
    contentEnd += noteH + 14;
  }
  if (contentEnd + 70 > PH - FOOTER_SPACE) contentEnd = newBrandedPage(ctx, headerArgs);
  const sigTop = contentEnd + 6;
  const sigW = (CW - 16) / 2;
  const sigY = sigTop + 24;
  divider(doc, c, sigTop, ML, MR);
  const ccol = ML + sigW / 2;
  setPdfFont(doc, 'semibold', 8);
  doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
  doc.text(fitOneLine(doc, customer?.name || 'Cliente', sigW - 10), ccol, sigTop + 7, { align: 'center' });
  if (b.customerSignature && b.customerSignature !== 'undefined') drawSignature(doc, b.customerSignature, ccol, sigY, sigW - 4, 11);
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
  const accTop = sigY + 10;
  sectionLabel(doc, 'Aceite do cliente', ML, accTop, c.brand);
  doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, accTop + 2, CW, 12, 2, 2, 'S');
  doc.roundedRect(ML + 4, accTop + 6.4, 3.2, 3.2, 0.6, 0.6, 'S');
  text(doc, { x: ML + 10, y: accTop + 9, str: '[ ] Aprovo o orçamento e autorizo a execução dos serviços.', size: 7.5, weight: 'normal', color: c.ink, w: CW - 60 });
  text(doc, { x: MR - 5, y: accTop + 9, str: 'Data: __/__/____', size: 6.5, weight: 'normal', color: c.muted, align: 'right' });
  stampFooters(ctx, company);
  return doc;
}
