import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { MessageCircle, FileDown, Check, X, CalendarPlus, Pencil, Save, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Fields';
import { BudgetItemsEditor } from '../components/BudgetItemsEditor';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { audit } from '../lib/audit';
import { useAuth } from '../context/AuthContext';
import { PdfPreviewModal, usePdfPreview } from '../components/PdfPreview';
import { formatBRL, formatDate, telToWhats, budgetTotal, parseMoney, numberToBRLInput } from '../lib/utils';
import { Loading } from '../components/Loading';
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const budget = useLiveQuery(() => db.budgets.get(id!), [id]);
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Budget | null>(null);
  const [moneyText, setMoneyText] = useState({ labor: '', displacement: '', discount: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { preview, openPdf, close, download } = usePdfPreview();

  if (!budget) return <Loading />;
  const b = budget;

  async function handleDelete() {
    if (!isAdmin) {
      toast('error', 'Somente o dono pode apagar orçamentos.');
      return;
    }
    setDeleting(true);
    try {
      await db.budgets.delete(b.id);
      try { audit({ actor: user?.email || 'admin', action: 'delete_budget', entity: 'budgets', entityId: b.id, detail: b.number }); } catch { /* noop */ }
      toast('success', 'Orçamento excluído!');
      navigate('/app/orcamentos');
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }
  const customer = customers.find((c) => c.id === b.customerId);
  const whatsappLink = () => {
    if (!customer) return undefined;
    const base = (() => {
      const msg = [`Olá, ${customer.name}!`, `Orçamento ${b.number} no valor de ${formatBRL(b.total)}`].join('\n');
      return encodeURIComponent(msg);
    })();
    const num = telToWhats(customer.whatsapp || customer.phone);
    return num ? `https://wa.me/${num}?text=${base}` : undefined;
  };
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

  async function visualizarPDF() {
    try {
      const { generateBudgetPdf } = await import('../lib/pdf/budgetPdf');
      const doc: jsPDF = await generateBudgetPdf(b, customer, company);
      openPdf(doc, `orcamento-${b.number}.pdf`, `Orçamento ${b.number}`);
    } catch {
      toast('error', 'Não foi possível visualizar o PDF. Tente novamente.');
    }
  }

  function baixarPDF() {
    visualizarPDF();
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
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400">← Voltar</button>
      <PageHeader
        title={`Orçamento #${b.number}`}
        action={
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[b.status] || ''}`}>{STATUS_LABEL[b.status]}</span>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}><Pencil size={15} /> Editar</Button>
            )}
            {isAdmin && <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Excluir orçamento" title="Excluir orçamento (dono)"><Trash2 size={15} /></Button>}
            <ConfirmDialog
              open={confirmDelete}
              title={`Excluir orçamento ${b.number}?`}
              message="Essa ação não pode ser desfeita."
              busy={deleting}
              onConfirm={handleDelete}
              onClose={() => setConfirmDelete(false)}
            />
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      <PdfPreviewModal preview={preview} onClose={close} onDownload={download} whatsappHref={whatsappLink()} />
    </div>
  );
}
