import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  MessageCircle, FileDown, Check, X, Pencil, Wrench, Camera, StickyNote,
  CheckCircle2, Clock, Trash2, Loader2, Wallet, CreditCard, Banknote,
  Repeat, CalendarClock, MapPin, Phone, CalendarDays,
} from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { uploadServicePhoto, deleteServicePhoto, getSignedPhotoUrl } from '../lib/storage';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Select, Textarea } from '../components/Fields';
import {
  STATUS_LABEL, STATUS_STYLE, formatBRL, formatDate, telToWhats,
  addMonths, todayISO, PAYMENT_METHODS, paymentLabel, normalizePaymentMethod,
} from '../lib/utils';
import { PdfPreviewModal, usePdfPreview } from '../components/PdfPreview';
import { useServiceOrderActions } from '../hooks/useServiceOrderActions';
import { VoiceReport, SuperheatCalc } from '../components/FieldTools';
import { errMsg } from '../lib/errors';
import { createCharge, chargeWhatsLink } from '../lib/charge';
import type { ChecklistItem, ServiceOrder, User } from '../types';

function ChargeButton({ orderId, customerId, value, osNumber }: { orderId: string; customerId: string; value: number; osNumber: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function handleCharge() {
    if (busy || value <= 0) {
      if (value <= 0) toast('error', 'Defina o valor da OS antes de cobrar.');
      return;
    }
    setBusy(true);
    try {
      const res = await createCharge({ customerId, orderId, value, description: `OS ${osNumber} — ClimaPro`, dueInDays: 3 });
      const { supabase } = await import('../lib/supabaseClient');
      const { data } = await supabase.from('customers').select('whatsapp, phone, name').eq('id', customerId).maybeSingle();
      const msg = `Olá, ${data?.name || 'cliente'}! Segue a cobrança da OS ${osNumber} no valor de ${formatBRL(value)} (vence ${formatDate(res.dueDate)}).${res.payUrl ? `\nPague aqui: ${res.payUrl}` : ''}\nObrigado! ❄️`;
      const link = chargeWhatsLink(data?.whatsapp || data?.phone, msg);
      if (link) window.open(link, '_blank');
      toast('success', res.payUrl ? 'Cobrança gerada! Link enviado ao WhatsApp.' : 'Cobrança gerada no Asaas!');
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível gerar a cobrança.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant="light" disabled={busy} onClick={handleCharge} className="shadow-lg" title="Gerar link Asaas e cobrar no WhatsApp">
      <MessageCircle size={14} /> {busy ? 'Gerando…' : 'Cobrar'}
    </Button>
  );
}

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

function useSignedPhotos(src: string[]) {
  const [signed, setSigned] = useState<string[]>(src);
  useEffect(() => {
    let alive = true;
    const urlLike = src.some((s) => s.includes('/service-photos/') && !s.includes('token=') && !s.includes('X-Amz-'));
    if (!urlLike) { setSigned(src); return; }
    Promise.all(src.map((s) => getSignedPhotoUrl(s))).then((arr) => { if (alive) setSigned(arr); });
    return () => { alive = false; };
  }, [src.join('|')]);
  return signed;
}

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
  const signed = useSignedPhotos(photos);
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</div>
      <div className="flex flex-wrap gap-2">
        {signed.map((p, i) => (
          <div key={photos[i]} className="relative">
            <img src={p} alt={label} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => onRemove(photos[i])}
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
          } catch (err: unknown) {
            toast('error', errMsg(err, 'Não foi possível enviar a foto.'));
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
  const [payBusy, setPayBusy] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMonths, setReminderMonths] = useState(3);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState('');
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaBusy, setAgendaBusy] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);
  const [obs, setObs] = useState('');
  const [obsSaving, setObsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { preview, openPdf, close, download } = usePdfPreview();

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

  const { setField, toggleItem, saveSignature, markPaid } = useServiceOrderActions(order);

  useEffect(() => {
    if (payOpen && order?.paymentMethod) setPaymentMethod(order.paymentMethod);
  }, [payOpen, order?.paymentMethod]);

  if (!order) return null;
  const o = order;
  const customer = customers.find((c) => c.id === o.customerId);
  const eq = equipment.find((e) => e.id === o.equipmentId);
  const company = companies[0];

  async function setStatus(status: ServiceOrder['status']) {
    await setField({ status });
    toast('success', `Status atualizado: ${STATUS_LABEL[status as keyof typeof STATUS_LABEL] || status}`);
  }

  function handleSaveSignature() {
    const dataUrl = sigRef.current?.isEmpty() ? undefined : sigRef.current?.getTrimmedCanvas().toDataURL('image/png');
    if (!dataUrl) {
      toast('error', 'Desenhe a assinatura antes de salvar.');
      return;
    }
    saveSignature(dataUrl);
    setSignOpen(false);
    toast('success', 'Assinatura salva!');
  }

  async function handleMarkPaid() {
    if (!isAdmin) {
      toast('error', 'Somente o dono pode alterar o pagamento.');
      return;
    }
    setPayBusy(true);
    try {
      await markPaid(paymentMethod);
      setPayOpen(false);
      toast('success', 'Pagamento registrado como pago.');
    } finally {
      setPayBusy(false);
    }
  }

  async function handleChangeMethod() {
    if (!isAdmin) {
      toast('error', 'Somente o dono pode alterar o pagamento.');
      return;
    }
    setPayBusy(true);
    try {
      const method = normalizePaymentMethod(paymentMethod) as NonNullable<ServiceOrder['paymentMethod']>;
      await db.serviceOrders.update(o.id, { paymentMethod: method, paymentStatus: 'pago' });
      const pay = await db.payments.where('serviceOrderId').equals(o.id).first();
      if (pay) await db.payments.update(pay.id, { method, status: 'pago' as const });
      toast('success', `Método alterado para ${method}.`);
      setPayOpen(false);
    } catch {
      toast('error', 'Não foi possível alterar o método.');
    } finally {
      setPayBusy(false);
    }
  }

  async function handleUnpay() {
    if (!isAdmin) {
      toast('error', 'Somente o dono pode alterar o pagamento.');
      return;
    }
    setPayBusy(true);
    try {
      await db.serviceOrders.update(o.id, { paymentStatus: 'pendente' });
      const pay = await db.payments.where('serviceOrderId').equals(o.id).first();
      if (pay) await db.payments.update(pay.id, { status: 'pendente' as const });
      toast('info', 'Pagamento voltou para pendente.');
      setPayOpen(false);
    } finally {
      setPayBusy(false);
    }
  }

  async function generatePDF() {
    try {
      const { generateServiceOrderPdf } = await import('../lib/pdf/serviceOrderPdf');
      const doc = await generateServiceOrderPdf(o, customer, eq, company, user?.firstName);
      openPdf(doc, `OS-${o.osNumber}.pdf`, `OS ${o.osNumber} · ${customer?.name || 'Cliente'}`);
    } catch {
      toast('error', 'Não foi possível visualizar o PDF.');
    }
  }
  async function handleDelete() {
    try {
      await db.serviceOrders.delete(o.id);
      toast('success', 'Serviço excluído!');
      navigate('/app/servicos');
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    } finally {
      setConfirmDelete(false);
    }
  }

  const phone = customer?.whatsapp || customer?.phone;
  const waLink = phone ? `https://wa.me/${telToWhats(phone)}` : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl lg:max-w-4xl">
      <PageHeader
        title={`OS Nº ${o.osNumber}`}
        subtitle={`${customer?.name || 'Cliente'} · ${formatDate(o.date)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {waLink && <Button as="a" href={waLink} target="_blank" rel="noreferrer" variant="success" size="sm" className="flex-1 sm:flex-none"><MessageCircle size={17} strokeWidth={2.5} /> WhatsApp</Button>}
            <Button variant="outline" size="sm" onClick={generatePDF} className="flex-1 sm:flex-none"><FileDown size={16} /> PDF</Button>
            {o.date ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/app/agenda?date=${o.date}`)} title="Ver esta OS na Agenda" className="flex-1 sm:flex-none">
                  <CalendarDays size={16} /> Na agenda
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAgendaDate(o.date);
                    setAgendaTime(o.time || '09:00');
                    setAgendaOpen(true);
                  }}
                  title="Mudar data/hora"
                  aria-label="Reagendar"
                >
                  <Clock size={16} />
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAgendaDate(todayISO());
                  setAgendaTime(o.time || '09:00');
                  setAgendaOpen(true);
                }}
                title="Escolher data e colocar na agenda"
                className="flex-1 sm:flex-none"
              >
                <CalendarDays size={16} /> Agendar
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Excluir serviço" title="Excluir serviço"><Trash2 size={16} /></Button>
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
              {team.map((u: User) => (
                <option key={u.id} value={u.name}>
                  {u.role === 'admin' ? '👑 ' : '🔧 '}{u.name}
                </option>
              ))}
              {o.technician && !team.some((u: User) => u.name === o.technician) && (
                <option value={o.technician}>{o.technician} (antigo)</option>
              )}
            </select>
          ) : (
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {o.technician || 'Não atribuído'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-6 xl:gap-2">
          {STEP_OPTIONS.filter((s) => s.value !== 'cancelado').map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value as ServiceOrder['status'])}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition sm:text-xs ${
                o.status === s.value ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 dark:bg-neutral-700/60 dark:text-neutral-300 dark:hover:bg-primary-900/40'
              }`}
            >
              {s.value === 'concluido' ? <CheckCircle2 size={13} className="shrink-0" /> : <Clock size={13} className="shrink-0" />}
              <span className="truncate sm:whitespace-normal">{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-0 lg:h-full">
          <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800 sm:px-5">
            <div className="break-words text-base font-extrabold leading-tight text-neutral-800 dark:text-neutral-100 sm:text-lg">
              {customer?.name || 'Cliente'}
            </div>
            {(customer?.phone || customer?.whatsapp) && (
              <a
                href={`tel:${(customer?.phone || customer?.whatsapp || '').replace(/\D/g, '')}`}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
              >
                <Phone size={12} /> {customer?.phone || customer?.whatsapp}
              </a>
            )}
          </div>
          <div className="space-y-3 px-4 py-3.5 sm:px-5">
            <div className="flex items-start gap-2.5 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                <MapPin size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Endereço do atendimento</p>
                <p className="mt-0.5 break-words text-sm font-medium leading-relaxed text-neutral-800 dark:text-neutral-100">
                  {(o.address && o.address.trim()) || [
                    [customer?.street, customer?.number].filter(Boolean).join(', '),
                    customer?.complement,
                    customer?.district,
                    customer?.city,
                    customer?.zip,
                  ].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>
            {eq && (
              <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="text-xs font-semibold uppercase text-neutral-400">Equipamento</div>
                <div className="mt-1 break-words text-sm font-medium text-neutral-700 dark:text-neutral-200">{eq.brand} {eq.model} · {eq.btus} BTU</div>
                <div className="break-words text-xs text-neutral-500 dark:text-neutral-400">{eq.installLocation}</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-white via-white to-neutral-50 p-0 shadow-card dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-800">
          {(() => {
            const isPaid = o.paymentStatus === 'pago';
            const methodLabel = paymentLabel(o.paymentMethod);
            const dueDate = o.reminderMonths && o.date ? addMonths(o.date, o.reminderMonths) : null;
            return (
              <>
                <div className={`px-4 py-3.5 sm:px-5 ${isPaid ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                        {isPaid ? <Check size={20} /> : <Wallet size={20} />}
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{isPaid ? 'Recebido' : 'A receber'}</p>
                        <p className="text-xl font-black leading-none sm:text-2xl">{formatBRL(Number(o.value) || 0)}</p>
                      </div>
                    </div>
                    {isPaid ? (
                      isAdmin ? (
                        <Button size="sm" variant="light" onClick={() => setPayOpen(true)} className="shrink-0 shadow-lg">
                          <Pencil size={13} /> Editar
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
                          <CheckCircle2 size={14} /> Pago
                        </span>
                      )
                    ) : isAdmin ? (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="light" onClick={() => setPayOpen(true)} className="shadow-lg">
                          <Banknote size={16} /> Registrar
                        </Button>
                        <ChargeButton orderId={o.id} customerId={o.customerId} value={Number(o.value) || 0} osNumber={o.osNumber} />
                      </div>
                    ) : (
                      <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white/80">Somente dono altera</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${isPaid ? 'bg-white text-emerald-700' : 'bg-white/20 text-white backdrop-blur'}`}>
                      <CreditCard size={11} />
                      {isPaid ? (methodLabel ? `Pago via ${methodLabel}` : 'Pago') : 'Pagamento pendente'}
                    </span>
                    {o.status === 'concluido' && !isPaid && (
                      <span className="rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white shadow">Ação necessária</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-600 dark:bg-neutral-800">
                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-white">
                      <Repeat size={16} className="text-primary-600 dark:text-primary-400" /> Lembrete recorrente
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                      Transforme esta OS em receita previsível. Receba alerta quando for hora de revisitar o cliente.
                    </p>
                    {dueDate ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-300 bg-sky-100 px-3 py-2.5 dark:border-sky-500 dark:bg-sky-800/60">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-white">
                            <CalendarClock size={14} className="shrink-0" /> Próximo em {formatDate(dueDate)}
                          </span>
                          <span className="shrink-0 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-bold text-white">
                            a cada {o.reminderMonths} {o.reminderMonths === 1 ? 'mês' : 'meses'}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)} className="flex-1 dark:border-neutral-600 dark:text-white">
                            Alterar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setField({ reminderMonths: null as unknown as number })} className="text-danger dark:text-red-300 dark:hover:bg-red-950/30">
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {[3, 6, 12, 1].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={async () => {
                              const baseDate = o.date || todayISO();
                              const due = addMonths(baseDate, m);
                              await setField({ reminderMonths: m });
                              try {
                                const newId = crypto.randomUUID();
                                await db.serviceOrders.add({
                                  id: newId,
                                  osNumber: `OS-${String(Date.now()).slice(-5)}`,
                                  customerId: o.customerId,
                                  equipmentId: o.equipmentId,
                                  problem: `Manutenção preventiva (origem ${o.osNumber})`,
                                  service: o.service || 'Manutenção preventiva',
                                  value: o.value,
                                  date: due,
                                  time: o.time || '09:00',
                                  address: o.address,
                                  technician: o.technician,
                                  status: 'agendado',
                                  checklist: [],
                                  fotosAntes: [],
                                  fotosDurante: [],
                                  fotosDepois: [],
                                  observacoesTecnicas: '',
                                  paymentStatus: 'pendente',
                                  createdAt: new Date().toISOString().slice(0, 10),
                                });
                                toast('success', `Manutenção em ${formatDate(due)} agendada! Toque para ver na Agenda.`);
                                setTimeout(() => navigate(`/app/agenda?date=${due}`), 900);
                              } catch {
                                toast('success', m === 1 ? 'Lembrete mensal ativado!' : `Lembrete a cada ${m} meses!`);
                              }
                            }}
                            className="rounded-xl border border-neutral-300 bg-neutral-50 px-2 py-2.5 text-center transition hover:border-primary-300 hover:bg-primary-50 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/30"
                          >
                            <span className="block text-lg font-black text-neutral-900 dark:text-white">{m}</span>
                            <span className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-300">{m === 1 ? 'mês' : 'meses'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isPaid && (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      <Wallet size={14} className="shrink-0" />
                      <span>Este valor entra em <b>A receber</b> e na <b>Cobrança</b> até marcar como pago.</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
          rows={5}
          maxLength={900}
          onChange={(e) => setObs(e.target.value)}
        />
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-neutral-400 dark:text-neutral-500" aria-live="polite">
          <span>{obsSaving ? 'Salvando laudo...' : obs ? 'Laudo salvo nesta OS' : 'Nenhum laudo registrado'}</span>
          <span>{obs.length}/900</span>
        </div>
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

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={o.paymentStatus === 'pago' ? 'Editar pagamento' : 'Registrar pagamento'}>
        <div className="space-y-3">
          <Select label="Método de pagamento" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
          {o.paymentStatus === 'pago' && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 size={14} /> Já recebido via {paymentLabel(o.paymentMethod)} — altere o método ou volte para pendente.
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setPayOpen(false)}>Cancelar</Button>
            {o.paymentStatus === 'pago' ? (
              <>
                <Button variant="secondary" onClick={handleUnpay} disabled={payBusy}>Voltar p/ pendente</Button>
                <Button onClick={handleChangeMethod} disabled={payBusy}>{payBusy ? 'Salvando...' : 'Salvar método'}</Button>
              </>
            ) : (
              <Button onClick={handleMarkPaid} disabled={payBusy}>{payBusy ? 'Salvando...' : 'Marcar como pago'}</Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={reminderOpen} onClose={() => setReminderOpen(false)} title="Lembrete de manutenção">
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-300">Quando devemos te lembrar deste cliente?</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 1, label: '1 mês', desc: 'Filtro/Manut. leve' },
              { v: 3, label: '3 meses', desc: 'Padrão ClimaPro' },
              { v: 6, label: '6 meses', desc: 'Preventiva' },
              { v: 12, label: '12 meses', desc: 'Anual' },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setReminderMonths(o.v)}
                aria-pressed={reminderMonths === o.v}
                className={`rounded-2xl border-2 p-3 text-left transition ${reminderMonths === o.v ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/40' : 'border-neutral-200 bg-white hover:border-primary-300 dark:border-neutral-600 dark:bg-neutral-700 dark:hover:border-primary-500'}`}
              >
                <span className={`block text-sm font-black ${reminderMonths === o.v ? 'text-primary-800 dark:text-white' : 'text-neutral-800 dark:text-white'}`}>{o.label}</span>
                <span className={`text-[11px] ${reminderMonths === o.v ? 'text-primary-600 dark:text-primary-200' : 'text-neutral-500 dark:text-neutral-300'}`}>{o.desc}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setReminderOpen(false)} className="dark:border-neutral-600 dark:text-white">Cancelar</Button>
            <Button onClick={() => { setField({ reminderMonths }); setReminderOpen(false); toast('success', `Lembrete a cada ${reminderMonths} ${reminderMonths === 1 ? 'mês' : 'meses'} ativado!`); }}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={agendaOpen} onClose={() => setAgendaOpen(false)} title="Colocar na agenda">
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-300">
          {o.date ? `Atual: ${formatDate(o.date)}${o.time ? ` às ${o.time}` : ''}. Escolha a nova data.` : 'Escolha a data do atendimento.'}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Data</label>
              <input type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Hora</label>
              <input type="time" value={agendaTime} onChange={(e) => setAgendaTime(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            {(['+1', '+7', '+30'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const base = new Date(`${agendaDate || todayISO()}T00:00:00`);
                  base.setDate(base.getDate() + Number(s));
                  const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
                  setAgendaDate(iso);
                }}
                className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-bold text-neutral-600 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {s === '+1' ? 'Amanhã' : s === '+7' ? '+7 dias' : '+30 dias'}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setAgendaOpen(false)}>Cancelar</Button>
            <Button
              full
              disabled={agendaBusy || !agendaDate}
              onClick={async () => {
                if (!agendaDate) {
                  toast('error', 'Escolha a data.');
                  return;
                }
                setAgendaBusy(true);
                try {
                  await setField({ date: agendaDate, time: agendaTime || o.time || '09:00', status: o.status === 'agendado' || o.status === 'em_andamento' ? o.status : 'agendado' });
                  toast('success', `Na agenda em ${formatDate(agendaDate)}!`);
                  setAgendaOpen(false);
                  setTimeout(() => navigate(`/app/agenda?date=${agendaDate}`), 700);
                } catch {
                  toast('error', 'Não foi possível agendar.');
                } finally {
                  setAgendaBusy(false);
                }
              }}
            >
              <CalendarDays size={16} /> {agendaBusy ? 'Agendando...' : 'Colocar na agenda'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDelete} title={`Excluir ${o.osNumber}?`} message="Essa ação não pode ser desfeita." onConfirm={handleDelete} onClose={() => setConfirmDelete(false)} />
      <PdfPreviewModal preview={preview} onClose={close} onDownload={download} whatsappHref={waLink || undefined} />
      <Modal open={signOpen} onClose={() => setSignOpen(false)} title="Assinatura do cliente">
        <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800">
          <SignatureCanvas ref={sigRef} canvasProps={{ className: 'h-40 w-full' }} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" type="button" onClick={() => sigRef.current?.clear()}>Limpar</Button>
          <Button onClick={handleSaveSignature}>Salvar assinatura</Button>
        </div>
      </Modal>
    </div>
  );
}
