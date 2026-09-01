import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  MessageCircle, FileDown, Check, X, Pencil, Wrench, Camera, StickyNote,
  Sun, CheckCircle2, Clock, Trash2,
} from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Input, Select } from '../components/Fields';
import {
  STATUS_LABEL, STATUS_STYLE, STATUS_DOT, formatBRL, formatDate, telToWhats,
  toggleChecklistItem, todayISO,
} from '../lib/utils';
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
  className = '',
}: {
  label: string;
  photos: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p} className="relative">
            <img src={p} alt={label} className="h-20 w-20 rounded-lg object-cover" />
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
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-primary-400 hover:text-primary-500 dark:border-neutral-600"
        >
          <Camera size={20} />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const urls = files.map((f) => URL.createObjectURL(f));
          onAdd(urls);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function ServicoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const order = useLiveQuery(() => db.serviceOrders.get(id!), [id]);
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];

  const [signOpen, setSignOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMonths, setReminderMonths] = useState(3);
  const sigRef = useRef<SignatureCanvas>(null);
  const [obs, setObs] = useState('');

  useEffect(() => {
    setObs(order?.observacoesTecnicas || '');
  }, [order?.observacoesTecnicas]);

  useEffect(() => {
    if (!order || obs === order.observacoesTecnicas) return;
    const t = setTimeout(() => {
      db.serviceOrders.update(order.id, { observacoesTecnicas: obs }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [obs, order]);

  if (!order) return null;
  const o = order;
  const customer = customers.find((c) => c.id === o.customerId);
  const eq = equipment.find((e) => e.id === o.equipmentId);

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
    setPayOpen(false);
    toast('success', 'Pagamento registrado como pago.');
  }

  function generatePDF() {
    const doc = new jsPDF();
    doc.setFillColor(9, 46, 110);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEM DE SERVIÇO', 14, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`OS Nº ${o.osNumber}`, 14, 20);
    doc.text(`Data atendimento: ${formatDate(o.date)}`, 14, 25);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${customer?.name || ''}`, 14, 46);
    doc.text(`${customer?.phone || ''} · ${customer?.email || ''}`, 14, 52);
    doc.text(`${customer ? [customer.street, customer.number, customer.city].filter(Boolean).join(', ') : ''}`, 14, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('Serviço', 14, 70);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: 74,
      head: [['Problema relatado', 'Serviço', 'Valor']],
      body: [[o.problem || '-', o.service || '-', formatBRL(Number(o.value) || 0)]],
      theme: 'striped',
    });
    const after = (doc as any).lastAutoTable.finalY || 90;
    doc.text(`Status: ${STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] || o.status}`, 14, after + 10);
    if (o.observacoesTecnicas) doc.text(`Observações técnicas: ${o.observacoesTecnicas}`, 14, after + 16);
    if (o.customerSignature) {
      doc.addImage(o.customerSignature, 'PNG', 14, after + 22, 60, 30);
      doc.setFontSize(8);
      doc.text('Assinatura do cliente', 14, after + 55);
    }
    doc.save(`OS-${o.osNumber}.pdf`);
  }

  const phone = customer?.phone;
  const waLink = phone ? `https://wa.me/${telToWhats(phone)}` : '#';

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`OS Nº ${o.osNumber}`}
        subtitle={`${customer?.name || 'Cliente'} · ${formatDate(o.date)}`}
        action={
          <div className="flex gap-2">
            <Button as="a" href={waLink} target="_blank" rel="noreferrer" variant="secondary" size="sm"><MessageCircle size={16} /> WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={generatePDF}><FileDown size={16} /> PDF</Button>
          </div>
        }
      />

      <Card className="mb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Status
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[o.status as keyof typeof STATUS_STYLE] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300'}`}>
            {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] || o.status}
          </span>
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
            <label key={it.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${it.done ? 'border-green-200 bg-green-50 text-neutral-500 line-through dark:text-neutral-400' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'}`}>
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
              onAdd={(urls) => setField({ [s.key]: [...(o[s.key] || []), ...urls] })}
              onRemove={(url) => setField({ [s.key]: ((o[s.key] as string[]) || []).filter((x: string) => x !== url) })}
            />
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="mb-2 flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
          <StickyNote size={18} className="text-primary-600" /> Observações técnicas
        </div>
        <Input
          value={obs}
          placeholder="Anote o que foi feito..."
          onChange={(e) => setObs(e.target.value)}
        />
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
