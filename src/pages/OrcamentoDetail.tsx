import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MessageCircle, FileDown, Check, X, CalendarPlus, Pencil, Save } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Fields';
import { BudgetItemsEditor } from '../components/BudgetItemsEditor';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, formatDate, telToWhats, budgetTotal, parseMoney, numberToBRLInput } from '../lib/utils';
import { Loading } from '../components/Loading';
import {
  createPdf, text, sectionLabel, divider, drawBrandHeader, drawBrandFooter, textHeight, statusBadge, drawSignature, HEADER_SPACE,
  FOOTER_SPACE, fitOneLine, measureLines, newBrandedPage, stampFooters,
} from '../lib/pdf/theme';
import { setPdfFont } from '../lib/pdf/fonts';
import type { Budget, BudgetItem } from '../types';

const STATUS_STYLE: Record<string, string> = {
  rascunho: 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300',
  enviado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  aprovado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  recusado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};
const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export default function OrcamentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const budget = useLiveQuery(() => db.budgets.get(id!), [id]);
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Budget | null>(null);
  const [moneyText, setMoneyText] = useState({ labor: '', displacement: '', discount: '' });

  if (!budget) return <Loading />;
  const b = budget;
  const customer = customers.find((c) => c.id === b.customerId);
  const company = companies[0];

  function startEdit() {
    setDraft({ ...b, items: b.items.map((i: BudgetItem) => ({ ...i })) });
    setMoneyText({
      labor: b.labor ? numberToBRLInput(b.labor) : '',
      displacement: b.displacement ? numberToBRLInput(b.displacement) : '',
      discount: b.discount ? numberToBRLInput(b.discount) : '',
    });
    setEditing(true);
  }

  function setDraftMoney(key: 'labor' | 'displacement' | 'discount', raw: string) {
    const clean = raw.replace(/[^\d,.]/g, '');
    setMoneyText((t) => ({ ...t, [key]: clean }));
    setDraft((d) => (d ? { ...d, [key]: parseMoney(clean) } : d));
  }

  async function saveEdit() {
    if (!draft) return;
    const items = draft.items.filter((i) => i.description);
    if (items.length === 0) {
      toast('error', 'Adicione ao menos um item.');
      return;
    }
    const total = budgetTotal(items, draft.labor, draft.displacement, draft.discount);
    await db.budgets.update(b.id, {
      serviceType: draft.serviceType,
      description: draft.description,
      items,
      labor: draft.labor,
      displacement: draft.displacement,
      discount: draft.discount,
      validity: draft.validity,
      notes: draft.notes,
      total,
    });
    toast('success', 'Orçamento atualizado!');
    setEditing(false);
  }

  async function setStatus(status: 'aprovado' | 'recusado') {
    if (b.status === 'aprovado') return;
    await db.budgets.update(b.id, {
      status,
      approvedAt: status === 'aprovado' ? new Date().toISOString().slice(0, 10) : undefined,
    });
    toast(status === 'aprovado' ? 'success' : 'info', status === 'aprovado' ? 'Orçamento aprovado!' : 'Orçamento recusado.');
  }

  function generatePDF(): jsPDF {
    const ctx = createPdf(company);
    const { doc, c, ML, MR, CW, PH } = ctx;

    const sLabel: Record<string, string> = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };
    const subtitle = `${b.serviceType || 'Serviço'} · Cliente: ${customer?.name || '-'}`;

    const rightLines = [
      `Validade: ${b.validity || '7 dias'}`,
      `Emissão: ${formatDate(b.createdAt)}`,
      `Nº ${b.number}`,
    ];
    const headerArgs = {
      company,
      title: 'ORÇAMENTO',
      subtitle,
      docName: 'Documento comercial',
      rightLines,
    };

    const header = () => {
      drawBrandHeader(ctx, headerArgs);
      drawBrandFooter(ctx, company);
    };

    header();

    let y = HEADER_SPACE;

    // ── bloco de valores do documento ───────────────────────────
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

    // ── cliente + serviço ───────────────────────────────────────
    const colW = (CW - 6) / 2;
    const drawInfoBox = (x: number, label: string, title: string, sub1?: string, sub2?: string) => {
      const innerW = colW - 12;
      const labelTop = y - 4;
      const titleLines = measureLines(doc, title, 10, 'semibold', innerW).length;
      const sub1Lines = sub1 ? measureLines(doc, sub1, 8, 'normal', innerW).length : 0;
      const sub2Lines = sub2 ? measureLines(doc, sub2, 8, 'normal', innerW).length : 0;
      const contentH = 10 + titleLines * 4.2 + sub1Lines * 3.8 + sub2Lines * 3.8 + 2;
      const boxHeight = Math.max(24, contentH);
      doc.setFillColor(c.soft[0], c.soft[1], c.soft[2]);
      doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, labelTop, colW, boxHeight, 2, 2, 'FD');
      doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
      doc.roundedRect(x, labelTop, 2.2, 6, 1, 1, 'F');
      sectionLabel(doc, label, x + 5, y + 1, c.muted);
      let ty = y + 7.5;
      const n1 = text(doc, { x: x + 5, y: ty, str: title, size: 10, weight: 'semibold', color: c.ink, w: innerW });
      ty += n1 * 4.2 + 1.5;
      if (sub1) { const n = text(doc, { x: x + 5, y: ty, str: sub1, size: 8, weight: 'normal', color: c.muted, w: innerW }); ty += n * 3.8 + 0.8; }
      if (sub2) text(doc, { x: x + 5, y: ty, str: sub2, size: 8, weight: 'normal', color: c.muted, w: innerW });
      return boxHeight;
    };
    const cAddr = [customer?.street, customer?.number, customer?.district, customer?.city].filter(Boolean).join(', ');
    const cContact = [customer?.phone, customer?.email, customer?.document && `CPF/CNPJ ${customer.document}`].filter(Boolean).join('   ·   ');
    const boxH = Math.max(drawInfoBox(ML, 'CLIENTE', customer?.name || '-', cAddr || undefined, cContact || undefined), drawInfoBox(ML + colW + 6, 'SERVIÇO', b.serviceType || '-', b.description || undefined));
    y += boxH + 9;

    // ── itens ───────────────────────────────────────────────────
    setPdfFont(doc, 'normal', 8);
    const subtotal = b.items.reduce((s: number, i: BudgetItem) => s + i.total, 0);
    const descW = CW - 15 - 38 - 33;
    (doc as any).lastAutoTable = undefined;
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 210 - MR, top: HEADER_SPACE, bottom: FOOTER_SPACE },
      // só nas páginas 2+ (a 1ª já tem header desenhado acima)
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
    const tableEnd = (doc as any).lastAutoTable?.finalY ?? y;
    y = tableEnd + 6;

    // ── totais ──────────────────────────────────────────────────
    const totW = 68;
    const totX = MR - totW;
    const rows: Array<[string, string, string | null]> = [
      ['Subtotal', formatBRL(subtotal), null],
    ];
    if (b.labor > 0) rows.push(['Mão de obra', formatBRL(b.labor), null]);
    if (b.displacement > 0) rows.push(['Deslocamento', formatBRL(b.displacement), null]);
    if (b.discount > 0) rows.push(['Desconto', `- ${formatBRL(b.discount)}`, 'danger']);
    const totalsH = rows.length * 5.8 + 15;
    if (y + totalsH > PH - FOOTER_SPACE) { y = newBrandedPage(ctx, headerArgs); }

    let ty = y - 2;
    setPdfFont(doc, 'normal', 8.5);
    for (const [label, val, variant] of rows) {
      text(doc, { x: totX + 2, y: ty + 3.5, str: label, size: 8.5, weight: 'normal', color: variant === 'danger' ? c.danger : c.muted });
      text(doc, { x: MR, y: ty + 3.5, str: val, size: 8.5, weight: 'semibold', color: c.ink, align: 'right' });
      ty += 5.8;
      if (variant === 'danger') { doc.setDrawColor(c.line[0], c.line[1], c.line[2]); doc.setLineWidth(0.2); }
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

    // ── condições comerciais ────────────────────────────────────
    const condRows = [
      company?.paymentCondition && `Pagamento: ${company.paymentCondition}`,
      company?.executionTerm && `Execução: ${company.executionTerm}`,
      company?.warranty && `Garantia: ${company.warranty}`,
      `Validade: ${b.validity || company?.defaultValidity || '7 dias'}`,
    ].filter(Boolean) as string[];
    if (condRows.length) {
      const condLines = condRows.map((row) => measureLines(doc, row, 7.5, 'normal', CW).length);
      const condH = condLines.reduce((s, n) => s + n * 4.6, 0) + 8;
      if (contentEnd + condH + 4 > PH - FOOTER_SPACE) { contentEnd = newBrandedPage(ctx, headerArgs); }
      sectionLabel(doc, 'Condições comerciais', ML, contentEnd + 2, c.brand);
      let cyy = contentEnd + 8;
      condRows.forEach((row) => {
        const n = text(doc, { x: ML, y: cyy, str: row, size: 7.5, weight: 'normal', color: c.muted, w: CW });
        cyy += n * 4.6;
      });
      contentEnd = cyy + 4;
    }

    // ── observações ─────────────────────────────────────────────
    if (b.notes) {
      const noteH = textHeight(doc, b.notes, 8, CW);
      if (contentEnd + noteH + 8 > PH - FOOTER_SPACE) { contentEnd = newBrandedPage(ctx, headerArgs); }
      sectionLabel(doc, 'Observações / condições', ML, contentEnd + 2, c.brand);
      text(doc, { x: ML, y: contentEnd + 8, str: b.notes, size: 8, weight: 'normal', color: c.muted, w: CW });
      contentEnd += noteH + 14;
    }

    // ── assinaturas + aceite (bloco no fluxo, com respiro antes do rodapé)
    const sigBlockH = 46;
    const aceiteH = 24;
    if (contentEnd + sigBlockH + aceiteH > PH - FOOTER_SPACE) { contentEnd = newBrandedPage(ctx, headerArgs); }
    const sigTop = contentEnd + 6;
    const sigW = (CW - 16) / 2;
    const sigGap = 16;
    const sigY = sigTop + 24;
    divider(doc, c, sigTop, ML, MR);
    // cliente
    const ccol = ML + sigW / 2;
    setPdfFont(doc, 'semibold', 8);
    doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
    doc.text(fitOneLine(doc, customer?.name || 'Cliente', sigW - 10), ccol, sigTop + 7, { align: 'center' });
    if (b.customerSignature && b.customerSignature !== 'undefined') {
      drawSignature(doc, b.customerSignature, ccol, sigY, sigW - 4, 11);
    }
    doc.setDrawColor(c.ink[0], c.ink[1], c.ink[2]);
    doc.setLineWidth(0.45);
    doc.line(ML, sigY, ML + sigW, sigY);
    text(doc, { x: ccol, y: sigY + 5, str: 'Assinatura do cliente', size: 6.5, weight: 'normal', color: c.muted, align: 'center' });
    // empresa
    const sx2 = ML + sigW + sigGap;
    const scol = sx2 + sigW / 2;
    setPdfFont(doc, 'semibold', 8);
    doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
    doc.text(fitOneLine(doc, company?.name || 'Empresa', sigW - 10), scol, sigTop + 7, { align: 'center' });
    if (company?.signature) {
      drawSignature(doc, company.signature, scol, sigY, sigW - 4, 11);
    }
    doc.setDrawColor(c.ink[0], c.ink[1], c.ink[2]);
    doc.setLineWidth(0.45);
    doc.line(sx2, sigY, sx2 + sigW, sigY);
    text(doc, { x: scol, y: sigY + 5, str: 'Responsável', size: 6.5, weight: 'normal', color: c.muted, align: 'center' });

    // ── aceite do cliente ───────────────────────────────────────
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

  function baixarPDF() {
    try {
      const doc = generatePDF();
      doc.save(`orcamento-${b.number}.pdf`);
      toast('success', 'PDF gerado!');
    } catch {
      toast('error', 'Não foi possível gerar o PDF. Tente novamente.');
    }
  }

  function visualizarPDF() {
    try {
      const doc = generatePDF();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast('error', 'Não foi possível visualizar o PDF. Tente novamente.');
    }
  }

  function shareWhatsApp() {
    if (!customer) {
      toast('error', 'Cliente não encontrado. Não é possível enviar o orçamento.');
      return;
    }
    const message = [
      `Olá, ${customer?.name || ''}! Tudo bem? 👋`,
      ``,
      `Conforme conversamos, segue o orçamento referente ao serviço de ${b.serviceType.toLowerCase() || 'ar-condicionado'}.`,
      ``,
      ...b.items.map((i: BudgetItem) => `• ${i.description} (${i.qty}x) - ${formatBRL(i.total)}`),
      b.labor > 0 ? `Mão de obra: ${formatBRL(b.labor)}` : null,
      b.displacement > 0 ? `Deslocamento: ${formatBRL(b.displacement)}` : null,
      b.discount > 0 ? `Desconto: -${formatBRL(b.discount)}` : null,
      ``,
      `💰 TOTAL: ${formatBRL(b.total)}`,
      `Orçamento nº ${b.number} · Validade: ${b.validity || '7 dias'}`,
      ``,
      `Aprovação: ${window.location.origin}/orcamento/${b.id}`,
      ``,
      `Obrigado pela preferência!`,
    ]
      .filter(Boolean)
      .join('\n');
    const num = telToWhats(customer.whatsapp || customer.phone);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function agendarServico() {
    if (!customer) return;
    const osId = crypto.randomUUID();
    await db.serviceOrders.add({
      id: osId,
      osNumber: `OS-${String(Date.now()).slice(-5)}`,
      budgetId: b.id,
      customerId: customer.id,
      problem: b.description || '',
      service: b.serviceType,
      value: b.total,
      date: '',
      time: '',
      address: `${customer.street || ''} ${customer.number || ''}`.trim(),
      technician: '',
      status: 'agendado',
      checklist: [
        { id: crypto.randomUUID(), label: 'Equipamento desligado', done: false },
        { id: crypto.randomUUID(), label: 'Filtros verificados', done: false },
        { id: crypto.randomUUID(), label: 'Evaporadora higienizada', done: false },
        { id: crypto.randomUUID(), label: 'Condensadora higienizada', done: false },
        { id: crypto.randomUUID(), label: 'Dreno verificado', done: false },
        { id: crypto.randomUUID(), label: 'Pressão verificada', done: false },
        { id: crypto.randomUUID(), label: 'Teste realizado', done: false },
        { id: crypto.randomUUID(), label: 'Equipamento funcionando', done: false },
      ],
      fotosAntes: [],
      fotosDurante: [],
      fotosDepois: [],
      observacoesTecnicas: '',
      paymentStatus: 'pendente',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    if (b.status !== 'aprovado') {
      await db.budgets.update(b.id, { status: 'aprovado', approvedAt: new Date().toISOString().slice(0, 10) });
    }
    toast('success', 'Ordem de serviço criada!');
    navigate(`/app/servicos/${osId}`);
  }

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400">← Voltar</button>
      <PageHeader
        title={`Orçamento #${b.number}`}
        action={
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[b.status] || ''}`}>{STATUS_LABEL[b.status]}</span>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}><Pencil size={15} /> Editar</Button>
            )}
          </div>
        }
      />

      {editing && draft ? (
        <Card>
          <div className="space-y-4">
            <Select
              label="Tipo de serviço"
              value={draft.serviceType}
              onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })}
            >
              {['Instalação', 'Manutenção preventiva', 'Manutenção corretiva', 'Higienização', 'Limpeza', 'Reparo', 'Visita técnica', 'Orçamento', 'Gás / Carga'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Textarea
              label="Descrição do serviço"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <BudgetItemsEditor
              items={draft.items}
              onChange={(items: BudgetItem[]) => setDraft({ ...draft, items })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Mão de obra" inputMode="decimal" value={moneyText.labor} placeholder="0,00" onChange={(e) => setDraftMoney('labor', e.target.value)} />
              <Input label="Deslocamento" hint="Taxa cobrada pelo deslocamento até o local" inputMode="decimal" value={moneyText.displacement} placeholder="0,00" onChange={(e) => setDraftMoney('displacement', e.target.value)} />
            </div>
            <Input label="Desconto" hint="Valor a ser descontado do total" inputMode="decimal" value={moneyText.discount} placeholder="0,00" onChange={(e) => setDraftMoney('discount', e.target.value)} />
            <Input label="Prazo de validade" value={draft.validity} onChange={(e) => setDraft({ ...draft, validity: e.target.value })} placeholder="7 dias" />
            <Textarea label="Observações / condições" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />

            <div className="flex items-center justify-between rounded-xl bg-primary-50 dark:bg-primary-900/40 px-4 py-3">
              <span className="font-semibold text-primary-700 dark:text-primary-300">Valor total</span>
              <span className="text-xl font-extrabold text-primary-800 dark:text-primary-200">
                {formatBRL(budgetTotal(draft.items.filter((i) => i.description), draft.labor, draft.displacement, draft.discount))}
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button type="button" onClick={saveEdit}><Save size={16} /> Salvar alterações</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Cliente</div>
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{customer?.name || 'Cliente'}</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {customer ? `${customer.street || ''} ${customer.number || ''}`.trim() || '—' : ''}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Total</div>
            <div className="text-2xl font-extrabold text-primary-800 dark:text-primary-200">{formatBRL(b.total)}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-100 dark:border-neutral-700 pt-4">
          <div className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{b.serviceType}</div>
          {b.description && <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">{b.description}</p>}
          <div className="space-y-1.5">
            {b.items.map((i: BudgetItem) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">{i.qty}x {i.description}</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{formatBRL(i.total)}</span>
              </div>
            ))}
            {b.labor > 0 && (
              <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                <span>Mão de obra</span><span>{formatBRL(b.labor)}</span>
              </div>
            )}
            {b.displacement > 0 && (
              <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                <span>Deslocamento</span><span>{formatBRL(b.displacement)}</span>
              </div>
            )}
            {b.discount > 0 && (
              <div className="flex justify-between text-sm text-danger dark:text-red-400">
                <span>Desconto</span><span>- {formatBRL(b.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-100 dark:border-neutral-700 pt-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
              <span>Total</span><span>{formatBRL(b.total)}</span>
            </div>
          </div>
        </div>

        {b.notes && (
          <div className="mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">Observações: </span>{b.notes}
          </div>
        )}
        <div className="mt-2 text-xs text-neutral-400">Validade: {b.validity || '7 dias'} · Criado em {formatDate(b.createdAt)}</div>
      </Card>
      )}

      <div className="mt-5 space-y-2">
        {b.status !== 'aprovado' && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="success" onClick={() => setStatus('aprovado')}><Check size={16} /> Aprovar</Button>
            <Button variant="danger" onClick={() => setStatus('recusado')}><X size={16} /> Recusar</Button>
          </div>
        )}
        <Button variant="secondary" full onClick={visualizarPDF}><FileDown size={16} /> Visualizar PDF</Button>
        <Button full onClick={baixarPDF}><FileDown size={16} /> Baixar PDF</Button>
        <Button full onClick={shareWhatsApp}><MessageCircle size={16} /> Enviar via WhatsApp</Button>
        {b.status === 'aprovado' && (
          <Button variant="success" full onClick={agendarServico}><CalendarPlus size={16} /> Agendar serviço</Button>
        )}
      </div>
    </div>
  );
}
