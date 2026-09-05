import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import autoTable from 'jspdf-autotable';
import {
  MessageCircle, FileDown, Check, X, Pencil, Wrench, Camera, StickyNote,
  CheckCircle2, Clock, Trash2, Loader2,
} from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { uploadServicePhoto, deleteServicePhoto } from '../lib/storage';
import { log } from '../lib/logger';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Select, Textarea } from '../components/Fields';
import {
  STATUS_LABEL, STATUS_STYLE, STATUS_DOT, formatBRL, formatDate, telToWhats,
  toggleChecklistItem, todayISO,
} from '../lib/utils';
import {
  createPdf, text, sectionLabel, divider, drawBrandHeader, drawBrandFooter, textHeight, drawSignature, HEADER_SPACE,
  FOOTER_SPACE, fitOneLine, measureLines, newBrandedPage, stampFooters,
} from '../lib/pdf/theme';
import { setPdfFont } from '../lib/pdf/fonts';
import { VoiceReport, SuperheatCalc } from '../components/FieldTools';
import type { ChecklistItem } from '../types';

const STEP_OPTIONS: { value: string; label: string }[] = [
  { value: 'solicitacao', label: 'Solicitação recebida' },
  { value: 'orcamento_enviado', label: 'Orçamento enviado' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

const PHOTO_STEPS: { key: 'fotosAntes' | 'fotosDurante' | 'fotosDepois'; label: string }[] = [
  { key: 'fotosAntes', label: 'Antes' },
  { key: 'fotosDurante', label: 'Durante' },
  { key: 'fotosDepois', label: 'Depois' },
];

function PhotoUpload({
  label,
  photos,
  onAdd,
  onRemove,
  uploadCtx,
  className = '',
}: {
  label: string;
  photos: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (url: string) => void;
  uploadCtx: { companyId: string; orderId: string; step: string };
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p} className="relative">
            <img src={p} alt={label} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => onRemove(p)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-1 text-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50 dark:border-neutral-600"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </button>
      </div>
      {uploading && <p className="mt-1 text-[11px] text-neutral-400">Enviando foto(s)...</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length === 0) return;
          setUploading(true);
          try {
            const urls: string[] = [];
            for (const f of files) {
              const url = await uploadServicePhoto(uploadCtx.companyId, uploadCtx.orderId, uploadCtx.step, f);
              urls.push(url);
            }
            onAdd(urls);
          } catch (err: any) {
            toast('error', err?.message || 'Não foi possível enviar a foto.');
          } finally {
            setUploading(false);
          }
        }}
      />
    </div>
  );
}

export default function ServicoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const order = useLiveQuery(() => db.serviceOrders.get(id!), [id]);
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const team = useLiveQuery(() => db.users.toArray(), []) || [];
  const isAdmin = user?.role === 'admin';

  const [signOpen, setSignOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMonths, setReminderMonths] = useState(3);
  const sigRef = useRef<SignatureCanvas>(null);
  const [obs, setObs] = useState('');
  const [obsSaving, setObsSaving] = useState(false);

  useEffect(() => {
    setObs(order?.observacoesTecnicas || '');
  }, [order?.observacoesTecnicas]);

  useEffect(() => {
    if (!order || obs === order.observacoesTecnicas) return;
    setObsSaving(true);
    const t = setTimeout(() => {
      db.serviceOrders.update(order.id, { observacoesTecnicas: obs })
        .then(() => setObsSaving(false))
        .catch(() => setObsSaving(false));
    }, 600);
    return () => clearTimeout(t);
  }, [obs, order]);

  if (!order) return null;
  const o = order;
  const customer = customers.find((c) => c.id === o.customerId);
  const eq = equipment.find((e) => e.id === o.equipmentId);
  const company = companies[0];

  async function setField(changes: Record<string, any>) {
    await db.serviceOrders.update(o.id, changes);
  }

  async function setStatus(status: string) {
    await setField({ status });
    toast('success', `Status atualizado: ${STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status}`);
  }

  function toggleItem(it: ChecklistItem) {
    const list = o.checklist ? toggleChecklistItem(o.checklist, it.id) : [];
    setField({ checklist: list });
  }

  function saveSignature() {
    const dataUrl = sigRef.current?.isEmpty() ? undefined : sigRef.current?.getTrimmedCanvas().toDataURL('image/png');
    if (!dataUrl) {
      toast('error', 'Desenhe a assinatura antes de salvar.');
      return;
    }
    setField({ customerSignature: dataUrl, signatureDate: todayISO() });
    setSignOpen(false);
    toast('success', 'Assinatura salva!');
  }

  async function markPaid() {
    await setField({ paymentStatus: 'pago', paymentMethod });
    const payment = await db.payments.where('serviceOrderId').equals(o.id).first();
    const changes = {
      customerId: o.customerId,
      value: Number(o.value) || 0,
      method: paymentMethod || 'outro',
      status: 'pago',
      paidAt: todayISO(),
      createdAt: payment?.createdAt || new Date().toISOString(),
    };
    if (payment) {
      await db.payments.update(payment.id, changes);
    } else {
      await db.payments.add({ id: crypto.randomUUID(), serviceOrderId: o.id, ...changes });
    }
    setPayOpen(false);
    toast('success', 'Pagamento registrado como pago.');
  }

  function generatePDF() {
    const ctx = createPdf(company);
    const { doc, c, ML, MR, CW, PH } = ctx;

    const payLabel = o.paymentStatus === 'pago' ? 'Pago' : 'Pendente';
    const payMethod = o.paymentStatus === 'pago' && o.paymentMethod ? ` · ${o.paymentMethod}` : '';
    const rightLines = [
      `Técnico: ${o.technician || user?.firstName || '-'}`,
      `Data: ${formatDate(o.date)}`,
      `OS Nº ${o.osNumber}`,
    ];
    const headerArgs = {
      company,
      title: 'ORDEM DE SERVIÇO',
      docName: 'Atendimento técnico',
      rightLines,
    };

    const header = () => {
      drawBrandHeader(ctx, headerArgs);
      drawBrandFooter(ctx, company);
    };
    header();

    let y = HEADER_SPACE;

    // ── cliente + equipamento ───────────────────────────────────
    const colW = (CW - 6) / 2;
    const drawBox = (x: number, label: string, title: string, s1?: string, s2?: string, s3?: string) => {
      const innerW = colW - 14;
      const labelTop = y - 4;
      const titleLines = measureLines(doc, title, 10, 'semibold', innerW).length;
      const len1 = s1 ? measureLines(doc, s1, 8, 'normal', innerW).length : 0;
      const len2 = s2 ? measureLines(doc, s2, 8, 'normal', innerW).length : 0;
      const len3 = s3 ? measureLines(doc, s3, 8, 'normal', innerW).length : 0;
      const contentH = 10 + titleLines * 4.2 + (len1 + len2 + len3) * 3.8 + 2;
      const boxHeight = Math.max(26, contentH);
      doc.setFillColor(c.soft[0], c.soft[1], c.soft[2]);
      doc.setDrawColor(c.line[0], c.line[1], c.line[2]);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, labelTop, colW, boxHeight, 2, 2, 'FD');
      doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
      doc.roundedRect(x, labelTop, 2.2, 6, 1, 1, 'F');
      sectionLabel(doc, label, x + 5, y + 1, c.muted);
      let ty = y + 7.5;
      const n0 = text(doc, { x: x + 5, y: ty, str: title, size: 10, weight: 'semibold', color: c.ink, w: innerW });
      ty += n0 * 4.2 + 1.5;
      if (s1) { const n = text(doc, { x: x + 5, y: ty, str: s1, size: 8, weight: 'normal', color: c.muted, w: innerW }); ty += n * 3.8 + 0.8; }
      if (s2) { const n = text(doc, { x: x + 5, y: ty, str: s2, size: 8, weight: 'normal', color: c.muted, w: innerW }); ty += n * 3.8 + 0.8; }
      if (s3) text(doc, { x: x + 5, y: ty, str: s3, size: 8, weight: 'normal', color: c.muted, w: innerW });
      return boxHeight;
    };

    const custAddr = [customer?.street, customer?.number, customer?.district, customer?.city].filter(Boolean).join(', ') || o.address;
    const custContact = [customer?.phone, customer?.email].filter(Boolean).join('   ·   ');
    const eqTitle = eq ? [`${eq.brand} ${eq.model}`.trim(), `${eq.btus} BTU`].filter(Boolean).join(' · ') : (o.service || '-');
    const eqSub = eq ? [eq.type, eq.installLocation, eq.serial && `S/N ${eq.serial}`].filter(Boolean).join('   ·   ') : '';
    const boxH = Math.max(drawBox(ML, 'CLIENTE', customer?.name || '-', custAddr || undefined, custContact || undefined), drawBox(ML + colW + 6, 'EQUIPAMENTO', eqTitle, eqSub || undefined, eq?.warranty || undefined));
    y += boxH + 8;

    // ── serviço solicitado ──────────────────────────────────────
    sectionLabel(doc, 'Serviço solicitado', ML, y, c.brand);
    const problemTxt = (o.service || '') + (o.problem ? ` — ${o.problem}` : '');
    text(doc, { x: ML, y: y + 6, str: problemTxt || '-', size: 9, weight: 'normal', color: c.ink, w: CW });
    y += 6 + textHeight(doc, problemTxt || '-', 9, CW);

    // ── checklist executado ─────────────────────────────────────
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

    // ── observações técnicas ────────────────────────────────────
    if (o.observacoesTecnicas) {
      const obsH = 6 + textHeight(doc, o.observacoesTecnicas, 8.5, CW);
      if (y + obsH > PH - FOOTER_SPACE) { y = newBrandedPage(ctx, headerArgs); }
      sectionLabel(doc, 'Observações técnicas', ML, y, c.brand);
      text(doc, { x: ML, y: y + 6, str: o.observacoesTecnicas, size: 8.5, weight: 'normal', color: c.muted, w: CW });
      y += 6 + textHeight(doc, o.observacoesTecnicas, 8.5, CW);
    }

    // ── valores ─────────────────────────────────────────────────
    y += 6;
    const valRows: Array<[string, string]> = [
      ['Valor do serviço', formatBRL(Number(o.value) || 0)],
      ['Status', STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] || o.status],
      ['Pagamento', payLabel + payMethod],
    ];
    const boxW2 = 120;
    const bx2X = MR - boxW2;
    const boxH2 = valRows.length * 6 + 6;
    if (y + boxH2 > PH - FOOTER_SPACE) { y = newBrandedPage(ctx, headerArgs); }
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

    // ── assinaturas (bloco no fluxo, com respiro antes do rodapé)
    const sigNeed = 42;
    if (y + sigNeed > PH - FOOTER_SPACE) { y = newBrandedPage(ctx, headerArgs); }
    const sigTop = y + 6;
    const sigW = (CW - 16) / 2;
    const sigGap = 16;
    const sigY = sigTop + 24;
    divider(doc, c, sigTop, ML, MR);
    // cliente
    const ccol = ML + sigW / 2;
    setPdfFont(doc, 'semibold', 8);
    doc.setTextColor(c.ink[0], c.ink[1], c.ink[2]);
    doc.text(fitOneLine(doc, customer?.name || 'Cliente', sigW - 10), ccol, sigTop + 7, { align: 'center' });
    if (o.customerSignature && o.customerSignature !== 'undefined') {
      drawSignature(doc, o.customerSignature, ccol, sigY, sigW - 4, 11);
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

    stampFooters(ctx, company);
    doc.save(`OS-${o.osNumber}.pdf`);
    toast('success', 'PDF gerado!');
  }

  async function handleDelete() {
    if (!confirm(`Excluir a OS "${o.osNumber}"?\n\nEssa ação não pode ser desfeita.`)) return;
    try {
      await db.serviceOrders.delete(o.id);
      toast('success', 'Serviço excluído!');
      navigate('/app/servicos');
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    }
  }

  const phone = customer?.whatsapp || customer?.phone;
  const waLink = phone ? `https://wa.me/${telToWhats(phone)}` : null;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`OS Nº ${o.osNumber}`}
        subtitle={`${customer?.name || 'Cliente'} · ${formatDate(o.date)}`}
        action={
          <div className="flex gap-2">
            {waLink && <Button as="a" href={waLink} target="_blank" rel="noreferrer" variant="secondary" size="sm"><MessageCircle size={16} /> WhatsApp</Button>}
            <Button variant="outline" size="sm" onClick={generatePDF}><FileDown size={16} /> PDF</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} aria-label="Excluir serviço" title="Excluir serviço"><Trash2 size={16} /></Button>
          </div>
        }
      />

      <Card className="mb-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Status
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[o.status as keyof typeof STATUS_STYLE] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300'}`}>
            {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] || o.status}
          </span>
        </div>
        <div className="mb-3 flex flex-col gap-1.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900/50 dark:bg-sky-950/20 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
            🧑‍🔧 Técnico responsável
          </label>
          {isAdmin ? (
            <select
              value={o.technician || ''}
              onChange={async (e) => {
                const v = e.target.value;
                try {
                  await setField({ technician: v });
                  toast('success', v ? `OS atribuída a ${v}!` : 'Técnico removido da OS.');
                } catch {
                  toast('error', 'Não foi possível atualizar o técnico.');
                }
              }}
              className="w-full rounded-lg border border-sky-300 bg-white px-2.5 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-sky-500 dark:border-sky-800 dark:bg-neutral-900 dark:text-neutral-100 sm:w-64"
            >
              <option value="">⚠️ Sem técnico (atribuir)</option>
              {team.map((u: any) => (
                <option key={u.id} value={u.name}>
                  {u.role === 'admin' ? '👑 ' : '🔧 '}{u.name}
                </option>
              ))}
              {o.technician && !team.some((u: any) => u.name === o.technician) && (
                <option value={o.technician}>{o.technician} (antigo)</option>
              )}
            </select>
          ) : (
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {o.technician || 'Não atribuído'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEP_OPTIONS.filter((s) => s.value !== 'cancelado').map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                o.status === s.value ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 dark:bg-neutral-700/60 dark:text-neutral-300 dark:hover:bg-primary-900/40'
              }`}
            >
              {s.value === 'concluido' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="font-bold text-neutral-800 dark:text-neutral-100">Cliente</div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Nome</dt><dd className="font-medium">{customer?.name || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Telefone</dt><dd className="font-medium">{customer?.phone || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Endereço</dt><dd className="font-medium">{o.address || customer?.street || '-'}</dd></div>
          </dl>
          {eq && (
            <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <div className="text-xs font-semibold uppercase text-neutral-400">Equipamento</div>
              <div className="mt-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">{eq.brand} {eq.model} · {eq.btus} BTU</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{eq.installLocation}</div>
            </div>
          )}
        </Card>

        <Card>
          <div className="font-bold text-neutral-800 dark:text-neutral-100">Valores</div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Valor do serviço</dt><dd className="font-bold text-primary-700 dark:text-primary-300">{formatBRL(Number(o.value) || 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500 dark:text-neutral-400">Pagamento</dt>
              <dd>
                <button onClick={() => setPayOpen(true)} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                  {o.paymentStatus === 'pago' ? 'Pago ✓' : 'Pendente'}
                </button>
              </dd>
            </div>
          </dl>
          {o.reminderMonths ? (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">🔁 Lembrete de manutenção: {o.reminderMonths} meses</p>
          ) : (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setReminderOpen(true)}>Configurar lembrete</Button>
          )}
        </Card>
      </div>

      <Card className="mt-3">
        <div className="mb-3 flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
          <CheckCircle2 size={18} className="text-primary-600" /> Checklist
        </div>
        <div className="space-y-1.5">
          {(o.checklist || []).map((it: ChecklistItem) => (
            <label key={it.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${it.done ? 'border-green-200 bg-green-50 text-neutral-500 line-through dark:border-green-900/50 dark:bg-green-900/20 dark:text-neutral-400' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'}`}>
              <input type="checkbox" checked={!!it.done} onChange={() => toggleItem(it)} className="h-4 w-4 accent-primary-700" />
              {it.label}
            </label>
          ))}
          {(!o.checklist || o.checklist.length === 0) && <p className="text-sm text-neutral-400">Nenhum item no checklist.</p>}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="mb-3 flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
          <Camera size={18} className="text-primary-600" /> Fotos
        </div>
        <div className="space-y-4">
          {PHOTO_STEPS.map((s) => (
            <PhotoUpload
              key={s.key}
              label={s.label}
              photos={o[s.key] || []}
              uploadCtx={{ companyId: o.companyId || user?.companyId || '', orderId: o.id, step: s.key }}
              onAdd={(urls) => setField({ [s.key]: [...(o[s.key] || []), ...urls] })}
              onRemove={(url) => {
                setField({ [s.key]: ((o[s.key] as string[]) || []).filter((x: string) => x !== url) });
                deleteServicePhoto(url);
              }}
            />
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="mb-2 flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
          <StickyNote size={18} className="text-primary-600" /> Observações técnicas / Laudo
        </div>
        <div className="mb-3 space-y-2">
          <VoiceReport onApply={(txt) => setObs((prev) => (prev ? prev.replace(/\s+$/, '') + '\n' + txt : txt))} />
          <SuperheatCalc onApply={(txt) => setObs((prev) => (prev ? prev.replace(/\s+$/, '') + '\n' + txt : txt))} />
        </div>
        <Textarea
          value={obs}
          placeholder="O laudo aplicado aparecerá aqui e será salvo nesta OS..."
          rows={7}
          onChange={(e) => setObs(e.target.value)}
        />
        <p className="mt-1 text-right text-[11px] text-neutral-400 dark:text-neutral-500" aria-live="polite">
          {obsSaving ? 'Salvando laudo...' : obs ? 'Laudo salvo nesta OS' : 'Nenhum laudo registrado'}
        </p>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-neutral-800 dark:text-neutral-100">Assinatura do cliente</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{o.signatureDate ? `Assinado em ${formatDate(o.signatureDate)}` : 'Ainda não assinado'}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setSignOpen(true)}>
            <Pencil size={15} /> {o.customerSignature ? 'Refazer' : 'Assinar'}
          </Button>
        </div>
        {o.customerSignature && (
          <img src={o.customerSignature} alt="Assinatura" className="mt-3 h-24 w-full rounded-xl border border-neutral-200 bg-white object-contain dark:border-neutral-700 dark:bg-neutral-800" />
        )}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pagamento">
        <div className="space-y-3">
          <Select label="Método de pagamento" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
            <option value="outro">Outro</option>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <Button onClick={markPaid}>Marcar como pago</Button>
          </div>
        </div>
      </Modal>

      <Modal open={reminderOpen} onClose={() => setReminderOpen(false)} title="Lembrete de manutenção">
        <div className="space-y-3">
          <Select label="Repetir lembrete" value={String(reminderMonths)} onChange={(e) => setReminderMonths(Number(e.target.value))}>
            <option value="1">1 mês</option>
            <option value="2">2 meses</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setReminderOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setField({ reminderMonths }); setReminderOpen(false); toast('success', 'Lembrete configurado!'); }}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={signOpen} onClose={() => setSignOpen(false)} title="Assinatura do cliente">
        <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800">
          <SignatureCanvas ref={sigRef} canvasProps={{ className: 'h-40 w-full' }} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" type="button" onClick={() => sigRef.current?.clear()}>Limpar</Button>
          <Button onClick={saveSignature}>Salvar assinatura</Button>
        </div>
      </Modal>
    </div>
  );
}
