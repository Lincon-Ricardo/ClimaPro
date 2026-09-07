import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { BellRing, CalendarPlus, Clock, MessageCircle, Wrench, Plus, Trash2, RotateCcw } from 'lucide-react';
import { db } from '../lib/db';
import { Select } from '../components/Fields';
import { Modal } from '../components/Modal';
import { useMyOrders } from '../hooks/useTechOrders';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatBRL, formatDate, addMonths, todayISO, toISODate, telToWhats } from '../lib/utils';
import { isReminderDue, reminderDueDate, daysOverdue } from '../lib/reminders';

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'agendados', label: 'Agendados' },
  { key: 'manutencoes', label: 'Manutenções' },
  { key: 'concluidos', label: 'Concluídos' },
  { key: 'cancelados', label: 'Cancelados' },
] as const;

export default function Servicos() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const VALID = new Set(['todos', 'pendentes', 'agendados', 'manutencoes', 'concluidos', 'cancelados']);
  const raw = params.get('filter');
  const filter = raw && VALID.has(raw) ? raw : 'todos';

  function setFilterAndSync(next: string) {
    const sp = new URLSearchParams(params);
    if (next === 'todos') sp.delete('filter');
    else sp.set('filter', next);
    setParams(sp, { replace: true });
  }

  const [remindOpen, setRemindOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState<{ id: string; label: string } | null>(null);
  const [remindMonths, setRemindMonths] = useState(3);
  const [remindDate, setRemindDate] = useState(todayISO());
  const [scheduling, setScheduling] = useState(false);

  function openReminder(orderId: string, label: string, currentMonths?: number, currentDue?: string | null) {
    setRemindTarget({ id: orderId, label });
    setRemindMonths(currentMonths || 3);
    setRemindDate(currentDue || todayISO());
    setRemindOpen(true);
  }

  async function confirmReminder() {
    if (!remindTarget) return;
    setScheduling(true);
    try {
      const base = allOrders.find((o) => o.id === remindTarget.id);
      if (!base) throw new Error('OS não encontrada');
      await db.serviceOrders.update(remindTarget.id, { reminderMonths: remindMonths });
      await db.serviceOrders.add({
        id: crypto.randomUUID(),
        osNumber: `OS-${String(Date.now()).slice(-5)}`,
        customerId: base.customerId,
        equipmentId: base.equipmentId,
        problem: `Manutenção programada (origem ${base.osNumber})`,
        service: base.service,
        value: base.value,
        date: remindDate,
        time: base.time || '09:00',
        address: base.address,
        technician: base.technician,
        status: 'agendado',
        checklist: [],
        fotosAntes: [],
        fotosDurante: [],
        fotosDepois: [],
        observacoesTecnicas: '',
        paymentStatus: 'pendente',
        createdAt: new Date().toISOString().slice(0, 10),
      });
      toast('success', `Retorno agendado para ${formatDate(remindDate)}! Ver na Agenda.`);
      setRemindOpen(false);
      setRemindTarget(null);
      navigate(`/app/agenda?date=${remindDate}`);
    } catch {
      toast('error', 'Não foi possível agendar. Tente novamente.');
    } finally {
      setScheduling(false);
    }
  }
  const allOrders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const orders = useMyOrders(allOrders);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';
  const [pendingDelete, setPendingDelete] = useState<{ id: string; osNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await db.serviceOrders.delete(pendingDelete.id);
      toast('success', 'Serviço excluído!');
      setPendingDelete(null);
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  const maintenanceDue = useMemo(() => orders.filter((o) => isReminderDue(o)), [orders]);
  const maintenanceCount = maintenanceDue.length;

  const filtered = useMemo(() => {
    const list = orders.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (filter === 'pendentes') return list.filter((o) => !['concluido', 'cancelado'].includes(o.status));
    if (filter === 'agendados') return list.filter((o) => o.status === 'agendado' || o.status === 'em_andamento');
    if (filter === 'manutencoes') return list.filter((o) => isReminderDue(o)).sort((a, b) => (reminderDueDate(a) || '').localeCompare(reminderDueDate(b) || ''));
    if (filter === 'concluidos') return list.filter((o) => o.status === 'concluido');
    if (filter === 'cancelados') return list.filter((o) => o.status === 'cancelado');
    return list;
  }, [orders, filter]);

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${filtered.length} ${filter === 'pendentes' ? 'pendente(s)' : filter === 'todos' ? 'no total' : `em ${filter}`}`}
        action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo</Button>}
      />
      {maintenanceCount > 0 && filter !== 'manutencoes' && (
        <button
          type="button"
          onClick={() => setFilterAndSync('manutencoes')}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-3.5 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <BellRing size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-orange-800 dark:text-orange-200">
              {maintenanceCount} manutenção(ões) vencida(s)
            </span>
            <span className="text-xs text-orange-600 dark:text-orange-300">Toque para agendar o retorno em 1 clique</span>
          </span>
        </button>
      )}
      <div className="mb-4 flex gap-2 table-scroll pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilterAndSync(f.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key ? 'bg-primary-700 text-white' : 'bg-white text-neutral-600 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            {f.key === 'manutencoes' && <BellRing size={14} />}
            {f.label}
            {f.key === 'manutencoes' && maintenanceCount > 0 && (
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-black ${filter === 'manutencoes' ? 'bg-white text-primary-700' : 'bg-orange-500 text-white'}`}>
                {maintenanceCount}
              </span>
            )}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench size={26} />}
          title="Nenhum serviço encontrado"
          subtitle="Crie um novo serviço para começar."
          action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo serviço</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const due = reminderDueDate(o);
            const dueOverdue = isReminderDue(o);
            const c = customers.find((x) => x.id === o.customerId);
            const phone = c?.whatsapp || c?.phone;
            return (
              <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)} className={dueOverdue ? 'border-orange-300 bg-orange-50/40 dark:border-orange-900/50 dark:bg-orange-950/20' : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-neutral-800 dark:text-neutral-100">{custName(o.customerId)}</span>
                      <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">{o.osNumber}</span>
                      {dueOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-black text-white">
                          <BellRing size={11} /> vencida há {daysOverdue(due!)}d
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">❄️ {o.service}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {due && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${dueOverdue ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300'}`}>
                          <Clock size={11} /> retorno {formatDate(due)}
                        </span>
                      )}
                      {o.technician ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                          🧑‍🔧 {o.technician}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          ⚠️ Sem técnico
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                      {o.date ? formatDate(o.date) : 'Sem data'}
                      {o.time ? ` · ${o.time}` : ''} · {formatBRL(o.value)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {dueOverdue && (
                        <>
                          <Button size="sm" onClick={() => openReminder(o.id, `${custName(o.customerId)} · ${o.service}`, o.reminderMonths, due)}>
                            <CalendarPlus size={14} /> Agendar retorno
                          </Button>
                          {phone && (
                            <Button as="a" href={`https://wa.me/${telToWhats(phone)}?text=${encodeURIComponent(`Olá, ${custName(o.customerId)}! Sua manutenção de ${o.service} venceu em ${formatDate(due!)}. Quer agendar o retorno esta semana? ❄️`)}`} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                              <MessageCircle size={14} /> WhatsApp
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setRemindTarget({ id: o.id, label: '' }); setRemindDate(addMonths(o.date, 1)); setRemindMonths(1); setRemindOpen(true); }}>
                            <RotateCcw size={14} /> Adiar 30d
                          </Button>
                        </>
                      )}
                      {!dueOverdue && o.status === 'concluido' && (
                        <Button variant="ghost" size="sm" onClick={() => openReminder(o.id, `${custName(o.customerId)} · ${o.service}`, o.reminderMonths, due)}>
                          <BellRing size={14} /> Lembrete
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPendingDelete({ id: o.id, osNumber: o.osNumber }); }}
                      className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                      title="Excluir serviço"
                      aria-label={`Excluir ${o.osNumber}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Excluir ${pendingDelete?.osNumber || 'serviço'}?`}
        message="Essa ação não pode ser desfeita."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
      <Modal open={remindOpen} onClose={() => setRemindOpen(false)} title={remindTarget ? `Agendar retorno · ${remindTarget.label}` : 'Agendar retorno'}>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">Cria uma OS <b>agendada</b> vinculada ao cliente e atualiza o ciclo do lembrete.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 1, label: '1 mês' },
              { v: 3, label: '3 meses' },
              { v: 6, label: '6 meses' },
              { v: 12, label: '12 meses' },
            ] as const).map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => { setRemindMonths(r.v); const base = allOrders.find((o) => o.id === remindTarget?.id); if (base?.date) setRemindDate(addMonths(base.date, r.v)); }}
                className={`rounded-xl border-2 p-2.5 text-sm font-black transition ${remindMonths === r.v ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/40' : 'border-neutral-200 hover:border-primary-300 dark:border-neutral-700'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Data do retorno</label>
            <input type="date" value={remindDate} onChange={(e) => setRemindDate(e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800" />
          </div>
          <Select label="Repetir depois deste retorno" value={String(remindMonths)} onChange={(e) => setRemindMonths(Number(e.target.value))}>
            <option value="1">Todo mês</option>
            <option value="3">A cada 3 meses</option>
            <option value="6">A cada 6 meses</option>
            <option value="12">A cada 12 meses</option>
          </Select>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setRemindOpen(false)}>Cancelar</Button>
            <Button full disabled={scheduling} onClick={confirmReminder}>
              <CalendarPlus size={16} /> {scheduling ? 'Agendando...' : `Agendar ${formatDate(remindDate)}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
