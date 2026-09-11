import { useMemo, useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Input, Select, Textarea } from '../components/Fields';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { formatBRL, formatDate, todayISO } from '../lib/utils';
import { errMsg } from '../lib/errors';
import { createCharge, chargeWhatsLink } from '../lib/charge';
import { LOSS_KINDS, LOSS_STATUS, calcDre, lossKindEmoji, lossKindLabel, lossStatusLabel, lossWhatsText } from '../lib/losses';
import type { Loss, LossKind, LossStatus } from '../types';
import {
  TrendingDown, Wallet, Flame, PiggyBank, Plus, Trash2, Pencil,
  MessageCircle, CheckCheck, ArrowUpRight, Siren, Search,
} from 'lucide-react';

const DECISIONS: { key: LossStatus; label: string; hint: string }[] = [
  { key: 'absorvida', label: '💸 Absorver', hint: 'Empresa banca. Vira lição.' },
  { key: 'descontada', label: '🧾 Descontar do técnico', hint: 'Abate da comissão.' },
  { key: 'cobrada', label: '📲 Cobrar cliente (Asaas)', hint: 'Gera link + WhatsApp.' },
  { key: 'recuperada', label: '✅ Recuperada', hint: 'Dinheiro voltou.' },
  { key: 'cancelada', label: '🚫 Cancelar', hint: 'Registro era indevido.' },
];

function LeakBar({ pct }: { pct: number }) {
  const color = pct >= 15 ? 'bg-red-500' : pct >= 7 ? 'bg-amber-400' : 'bg-emerald-500';
  const mood = pct >= 15 ? '🩸 Vazando muito' : pct >= 7 ? '⚠️ Vazando' : '💧 Sob controle';
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-neutral-500 dark:text-neutral-300">🌡️ Termômetro do vazamento</span>
        <span className={pct >= 7 ? 'text-red-500' : 'text-emerald-500'}>{mood} · {pct.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">% da receita do mês que virou perda. Meta saudável: abaixo de 7%.</p>
    </div>
  );
}

export default function Perdas() {
  const { user } = useAuth();
  const toast = useToast();
  const orders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 1000 }).then((r) => r.rows), []) || [];
  const expenses = useLiveQuery(() => db.expenses.list({ pageSize: 1000 }).then((r) => r.rows), [], 'expenses') || [];
  const losses = (useLiveQuery(() => db.losses.list({ pageSize: 1000, order: { column: 'date', ascending: false } }).then((r) => r.rows), [], 'losses') || []) as Loss[];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  const monthKey = todayISO().slice(0, 7);
  const [filter, setFilter] = useState<'todas' | LossStatus>('todas');
  const [kindFilter, setKindFilter] = useState<'todos' | LossKind>('todos');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ kind: 'retrabalho' as LossKind, description: '', value: '', date: todayISO(), technician: '', serviceOrderId: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Loss | null>(null);
  const [deleting, setDeleting] = useState<Loss | null>(null);
  const [deciding, setDeciding] = useState<Loss | null>(null);
  const [decision, setDecision] = useState<LossStatus>('absorvida');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [busyId, setBusyId] = useState('');

  const dre = useMemo(() => calcDre({ orders, expenses, losses, monthKey }), [orders, expenses, losses, monthKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return losses.filter((l) => {
      if (filter !== 'todas' && l.status !== filter) return false;
      if (kindFilter !== 'todos' && l.kind !== kindFilter) return false;
      if (q && !`${l.description} ${l.technician} ${lossKindLabel(l.kind)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [losses, filter, kindFilter, search]);

  const custName = (id?: string) => customers.find((c) => c.id === id)?.name || '—';

  async function saveLoss() {
    if (saving) return;
    if (!form.description.trim()) { toast('error', 'Descreva o que se perdeu.'); return; }
    const val = Number(String(form.value).replace(/\./g, '').replace(',', '.'));
    if (!val || val <= 0) { toast('error', 'Informe um valor maior que zero.'); return; }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        description: form.description.trim(),
        value: Math.round(val * 100) / 100,
        date: form.date || todayISO(),
        technician: form.technician.trim() || user?.name || '',
        serviceOrderId: form.serviceOrderId || undefined,
        createdBy: user?.id || user?.email || '',
        companyId: user?.companyId || companies[0]?.id || '',
      };
      if (editing) {
        await db.losses.update(editing.id, payload);
        toast('success', 'Perda atualizada!');
        setEditing(null);
      } else {
        await db.losses.add({ id: crypto.randomUUID(), status: 'aberta' as LossStatus, ...payload } as Loss);
        toast('success', 'Perda registrada! O dono decide o destino.');
      }
      setForm({ kind: 'retrabalho', description: '', value: '', date: todayISO(), technician: '', serviceOrderId: '' });
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await db.losses.delete(deleting.id);
      toast('success', 'Perda removida.');
      setDeleting(null);
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível remover.'));
    }
  }

  async function applyDecision(charge = false) {
    if (!deciding || busyId) return;
    setBusyId(deciding.id);
    try {
      if (charge) {
        const order = orders.find((o) => o.id === deciding.serviceOrderId);
        const customerId = deciding.customerId || order?.customerId;
        if (!customerId) { toast('error', 'Vincule a OS/cliente antes de cobrar.'); return; }
        const res = await createCharge({
          customerId,
          orderId: deciding.serviceOrderId,
          value: Number(deciding.value) || 0,
          description: `Perda: ${deciding.description}`.slice(0, 200),
          dueInDays: 3,
        });
        const cust = customers.find((c) => c.id === customerId);
        const msg = lossWhatsText({ description: deciding.description, value: Number(deciding.value) || 0, osNumber: order?.osNumber, company: companies[0]?.name });
        const link = chargeWhatsLink(cust?.whatsapp || cust?.phone, `${msg}${res.payUrl ? `\nPague aqui: ${res.payUrl}` : ''}`);
        if (link) window.open(link, '_blank');
        await db.losses.update(deciding.id, { status: 'cobrada', decisionNotes: decisionNotes.trim(), asaasPaymentId: res.paymentId });
        toast('success', 'Cobrança Asaas gerada + WhatsApp aberto!');
      } else {
        await db.losses.update(deciding.id, { status: decision, decisionNotes: decisionNotes.trim() });
        toast('success', `Perda marcada como "${lossStatusLabel(decision)}".`);
      }
      setDeciding(null);
      setDecisionNotes('');
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível aplicar a decisão.'));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <PageHeader title="Perdas em valores" subtitle="DRE do vazamento · gasto previsto x dinheiro que evaporou" />

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-red-950 to-neutral-900 p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-200">
              <Siren size={12} /> Raio-X do mês
            </span>
            <div className="mt-2 text-3xl font-black">{formatBRL(dre.lossesOpen + dre.lossesResolved - dre.recovered)}</div>
            <p className="text-xs text-red-200/80">vazaram este mês · {formatBRL(dre.recovered)} recuperados</p>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-white">Lucro real: {formatBRL(dre.netReal)}</div>
            <div className="text-emerald-300">Sem perdas seria: {formatBRL(dre.netIfZeroLoss)}</div>
            <div className="mt-1 text-red-200/80">Receita {formatBRL(dre.revenue)} · Gastos {formatBRL(dre.expenses)}</div>
          </div>
        </div>
        <div className="mt-3">
          <LeakBar pct={dre.leakPct} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Flame size={20} />} label="Em aberto (dói agora)" value={formatBRL(dre.lossesOpen)} tone="amber" />
        <StatCard icon={<TrendingDown size={20} />} label="Resolvidas sem volta" value={formatBRL(dre.lossesResolved)} tone="violet" />
        <StatCard icon={<CheckCheck size={20} />} label="Recuperado via Asaas" value={formatBRL(dre.recovered)} tone="emerald" />
        <StatCard icon={<PiggyBank size={20} />} label="Lucro protegido?" value={dre.leakPct < 7 ? 'Sim 🎉' : 'Não 🩸'} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">🕳️ Onde o dinheiro some</h2>
          {dre.byKind.length === 0 && <p className="mt-2 text-sm text-neutral-400">Nenhuma perda no mês. Que continue assim.</p>}
          <div className="mt-3 space-y-2.5">
            {dre.byKind.map((k) => {
              const max = Math.max(1, ...dre.byKind.map((x) => x.total));
              return (
                <div key={k.kind}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{k.emoji} {k.label} <span className="text-xs text-neutral-400">({k.count}x)</span></span>
                    <span className="font-black text-red-600 dark:text-red-300">{formatBRL(k.total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700/60">
                    <div className="h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${(k.total / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">👷 Por responsável</h2>
          <p className="text-xs text-neutral-400">Sem caça às bruxas: é para treinar, não punir.</p>
          <div className="mt-3 space-y-2">
            {dre.byTech.length === 0 && <p className="text-sm text-neutral-400">Sem dados.</p>}
            {dre.byTech.slice(0, 6).map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900/60">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{t.name} <span className="text-xs text-neutral-400">· {t.count}x</span></span>
                <span className="text-sm font-black text-neutral-800 dark:text-neutral-100">{formatBRL(t.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-neutral-800 dark:text-neutral-100">
          <Plus size={18} className="text-red-500" /> {editing ? 'Editar perda' : 'Registrar perda'}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {LOSS_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setForm({ ...form, kind: k.key })}
              title={k.hint}
              className={`rounded-2xl border p-2.5 text-center transition ${form.kind === k.key ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-neutral-200 hover:border-red-300 dark:border-neutral-700'}`}
            >
              <div className="text-xl">{k.emoji}</div>
              <div className="mt-1 text-[11px] font-bold leading-tight text-neutral-700 dark:text-neutral-200">{k.label}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Input label="Valor perdido (R$)" inputMode="decimal" placeholder="0,00" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="sm:col-span-1">
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Input label="Técnico / responsável" placeholder="Quem estava na OS?" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
          </div>
          <div className="sm:col-span-4">
            <Input label="O que aconteceu?" placeholder="Ex: placa queimada na instalação — retrabalho" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Select label="OS vinculada (opcional)" value={form.serviceOrderId} onChange={(e) => setForm({ ...form, serviceOrderId: e.target.value })}>
              <option value="">Sem OS</option>
              {orders.slice(0, 200).map((o) => (
                <option key={o.id} value={o.id}>{o.osNumber} · {formatBRL(Number(o.value) || 0)}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={saveLoss} disabled={saving} className="flex-1 sm:flex-none">
            <Plus size={15} /> {saving ? 'Salvando…' : editing ? 'Salvar edição' : 'Lançar perda'}
          </Button>
          {editing && <Button variant="outline" onClick={() => { setEditing(null); setForm({ kind: 'retrabalho', description: '', value: '', date: todayISO(), technician: '', serviceOrderId: '' }); }}>Cancelar</Button>}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar perda..." className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as LossStatus | 'todas')} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <option value="todas">Todos os status</option>
            {LOSS_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as LossKind | 'todos')} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
            <option value="todos">Todos os tipos</option>
            {LOSS_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </div>
        <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.length === 0 && <p className="py-4 text-sm text-neutral-400">Nenhuma perda encontrada.</p>}
          {visible.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">{lossKindEmoji(l.kind)}</span>
                  <span className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">{l.description}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${l.status === 'aberta' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' : l.status === 'recuperada' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                    {lossStatusLabel(l.status)}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-400">
                  {lossKindLabel(l.kind)} · {formatDate(l.date)} · {l.technician || 'sem técnico'}
                  {l.serviceOrderId ? ` · OS ${orders.find((o) => o.id === l.serviceOrderId)?.osNumber || ''}` : ''}
                  {l.customerId ? ` · ${custName(l.customerId)}` : ''}
                  {l.decisionNotes ? ` · “${l.decisionNotes}”` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-black text-red-600 dark:text-red-300">- {formatBRL(Number(l.value) || 0)}</span>
                <Button size="sm" variant="secondary" onClick={() => { setDeciding(l); setDecision(l.status === 'aberta' ? 'absorvida' : l.status); setDecisionNotes(l.decisionNotes || ''); }}>
                  <Wallet size={13} /> Decidir
                </Button>
                <button onClick={() => { setEditing(l); setForm({ kind: l.kind, description: l.description, value: String(l.value), date: l.date, technician: l.technician || '', serviceOrderId: l.serviceOrderId || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-primary-600" title="Editar">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDeleting(l)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500" title="Excluir (só dono)">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!deciding} onClose={() => setDeciding(null)} title={`Destino da perda · ${formatBRL(Number(deciding?.value) || 0)}`}>
        <p className="text-sm text-neutral-500 dark:text-neutral-300">
          “{deciding?.description}” — o que o dono decide? Absorver vira lição, descontar abate comissão, cobrar gera Asaas + WhatsApp.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DECISIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDecision(d.key)}
              className={`rounded-2xl border p-3 text-left transition ${decision === d.key ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40' : 'border-neutral-200 hover:border-primary-300 dark:border-neutral-700'}`}
            >
              <div className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{d.label}</div>
              <div className="text-[11px] text-neutral-400">{d.hint}</div>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Textarea label="Nota da decisão (opcional)" rows={2} placeholder="Ex: absorvido — treinar equipe sobre torque" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {decision === 'cobrada' ? (
            <Button onClick={() => applyDecision(true)} disabled={!!busyId} className="flex-1">
              <MessageCircle size={15} /> {busyId ? 'Gerando…' : 'Gerar Asaas + WhatsApp'}
            </Button>
          ) : (
            <Button onClick={() => applyDecision(false)} disabled={!!busyId} className="flex-1">
              <CheckCheck size={15} /> {busyId ? 'Salvando…' : `Marcar como ${lossStatusLabel(decision).toLowerCase()}`}
            </Button>
          )}
          <Button variant="outline" onClick={() => setDeciding(null)}>Fechar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Excluir perda?"
        message="Somente o dono pode excluir. Essa ação não pode ser desfeita."
        busy={false}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="text-sm text-neutral-500 dark:text-neutral-300">
          Quer ver o impacto no lucro? Abra o Financeiro com as perdas abatidas.
        </div>
        <Button size="sm" variant="secondary" onClick={() => { window.location.hash = '#dre'; }}>
          <ArrowUpRight size={14} /> Ver DRE
        </Button>
      </Card>
    </div>
  );
}
