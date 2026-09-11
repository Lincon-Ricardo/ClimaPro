import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingDown, ArrowUpRight, Trash2, Wallet, Sparkles, TrendingUp, Flame, PiggyBank } from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { formatBRL, formatDate, todayISO } from '../lib/utils';
import { errMsg } from '../lib/errors';
import { useAuth } from '../context/AuthContext';
import type { ExpenseCategory, Expense, Loss } from '../types';

const CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: 'material', label: 'Material', emoji: '🧱' },
  { key: 'ferramenta', label: 'Ferramenta', emoji: '🔨' },
  { key: 'combustivel', label: 'Combustível', emoji: '⛽' },
  { key: 'transporte', label: 'Transporte', emoji: '🛻' },
  { key: 'marketing', label: 'Marketing', emoji: '📣' },
  { key: 'escritorio', label: 'Escritório', emoji: '🗂️' },
  { key: 'manutencao', label: 'Manutenção', emoji: '🛠️' },
  { key: 'outros', label: 'Outros', emoji: '📦' },
];

export default function Gastos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const expenses = (useLiveQuery(() => db.expenses.list({ pageSize: 500, order: { column: 'date', ascending: false } }).then((r) => r.rows), [], 'expenses') || []) as Expense[];
  const orders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 1000 }).then((r) => r.rows), [], 'service_orders') || [];
  const losses = (useLiveQuery(() => db.losses.list({ pageSize: 1000 }).then((r) => r.rows), [], 'losses') || []) as Loss[];

  const [form, setForm] = useState({
    date: todayISO(),
    category: 'material' as ExpenseCategory,
    description: '',
    value: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const monthKey = todayISO().slice(0, 7);
  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + Number(e.value || 0), 0), [expenses]);
  const thisMonth = useMemo(() => expenses.filter((e) => (e.date || '').startsWith(monthKey)), [expenses, monthKey]);
  const totalMes = useMemo(() => thisMonth.reduce((s, e) => s + Number(e.value || 0), 0), [thisMonth]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    thisMonth.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + Number(e.value || 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [thisMonth]);

  const dre = useMemo(() => {
    const revenue = orders
      .filter((o) => o.status === 'concluido' && (o.date || '').startsWith(monthKey))
      .reduce((s, o) => s + (Number(o.value) || 0), 0);
    const loss = losses
      .filter((l) => (l.date || '').startsWith(monthKey) && l.status !== 'cancelada')
      .reduce((s, l) => s + (Number(l.value) || 0), 0);
    const recovered = losses
      .filter((l) => (l.date || '').startsWith(monthKey) && l.status === 'recuperada')
      .reduce((s, l) => s + (Number(l.value) || 0), 0);
    return { revenue, loss, recovered, net: revenue - totalMes - loss + recovered };
  }, [orders, losses, totalMes, monthKey]);

  async function addExpense() {
    if (saving) return;
    if (!form.description.trim()) {
      toast('error', 'Preencha a descrição do gasto.');
      return;
    }
    const val = Number(String(form.value).replace(/\./g, '').replace(',', '.'));
    if (!val || val <= 0) {
      toast('error', 'Informe um valor válido maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        companyId: user?.companyId || '',
        category: form.category,
        description: form.description.trim(),
        value: Math.round(val * 100) / 100,
        date: form.date || todayISO(),
        paymentStatus: 'pago',
        notes: form.notes.trim(),
        createdBy: user?.id || user?.email || '',
      } as Expense);
      setForm({ date: form.date, category: form.category, description: '', value: '', notes: '' });
      toast('success', 'Gasto registrado e abatido do lucro!');
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível salvar. Rode o schema.sql novo.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    try {
      await db.expenses.delete(deleting.id);
      toast('success', 'Gasto apagado e lucro recalculado.');
      setDeleting(null);
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não apagou. Verifique sua permissão (só dono apaga).'));
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Controle de Gastos</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Cada gasto aqui abate o lucro no Financeiro + Perdas em tempo real.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/app/administrativo')}>
          <ArrowUpRight size={15} /> Voltar ao administrativo
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-primary-950 to-neutral-900 p-4 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">🧾 DRE viva do mês</div>
          <div className="flex gap-2 text-[11px] font-bold">
            <button type="button" onClick={() => navigate('/app/financeiro')} className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">Financeiro →</button>
            <button type="button" onClick={() => navigate('/app/perdas')} className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">Perdas →</button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          <div className="rounded-2xl bg-white/10 p-2.5"><div className="text-[10px] uppercase text-white/60">Receita</div><div className="font-black">{formatBRL(dre.revenue)}</div></div>
          <div className="rounded-2xl bg-amber-500/20 p-2.5 ring-1 ring-amber-300/40"><div className="text-[10px] uppercase text-amber-200">Gastos</div><div className="font-black text-amber-200">- {formatBRL(totalMes)}</div></div>
          <div className="rounded-2xl bg-white/10 p-2.5"><div className="text-[10px] uppercase text-white/60">Perdas</div><div className="font-black text-red-300">- {formatBRL(dre.loss)}</div></div>
          <div className="rounded-2xl bg-white/10 p-2.5"><div className="text-[10px] uppercase text-white/60">Recuperado</div><div className="font-black text-emerald-300">+ {formatBRL(dre.recovered)}</div></div>
          <div className="rounded-2xl bg-emerald-500/20 p-2.5 ring-1 ring-emerald-300/40"><div className="text-[10px] uppercase text-emerald-200">Lucro real</div><div className="font-black text-emerald-300">{formatBRL(dre.net)}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<TrendingDown size={20} />} label="Total de gastos" value={formatBRL(totalGastos)} tone="amber" />
        <StatCard icon={<Wallet size={20} />} label="Este mês (abate lucro)" value={formatBRL(totalMes)} tone="violet" />
        <StatCard icon={<Sparkles size={20} />} label="Registros" value={String(expenses.length)} tone="blue" />
      </div>

      {byCategory.length > 0 && (
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
            <Flame size={16} className="text-orange-500" /> Para onde o dinheiro vai
          </h2>
          <div className="mt-2 space-y-2">
            {byCategory.map(([cat, val]) => {
              const max = Math.max(1, ...byCategory.map((x) => x[1]));
              const meta = CATEGORIES.find((c) => c.key === cat);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300">
                    <span>{meta?.emoji} {meta?.label || cat}</span>
                    <span>{formatBRL(val)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Novo gasto</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setForm({ ...form, category: c.key })}
              className={`rounded-2xl border p-2 text-center transition ${form.category === c.key ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-neutral-200 hover:border-amber-300 dark:border-neutral-700'}`}
            >
              <div className="text-lg">{c.emoji}</div>
              <div className="mt-0.5 text-[10px] font-bold leading-tight text-neutral-600 dark:text-neutral-300">{c.label}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Descrição</label>
            <input
              type="text"
              placeholder="Ex: compra de material"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <Button className="w-full" size="sm" onClick={addExpense} disabled={saving}>
              <Plus size={14} /> {saving ? 'Salvando…' : 'Adicionar'}
            </Button>
          </div>
        </div>
        <textarea
          rows={2}
          placeholder="Observações (opcional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-primary-500"
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Histórico</h2>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
            <TrendingUp size={13} /> sincronizado no lucro
          </span>
        </div>
        <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {expenses.length === 0 && <p className="py-4 text-sm text-neutral-400">Nenhum gasto registrado ainda.</p>}
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">{e.description}</span>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {CATEGORIES.find((c) => c.key === e.category)?.label || e.category}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">{formatDate(e.date)} {e.notes ? `· ${e.notes}` : ''}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-extrabold text-red-600 dark:text-red-400">- {formatBRL(Number(e.value) || 0)}</span>
                <button onClick={() => setDeleting(e)} className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40" title="Apagar gasto">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-300">
          <PiggyBank size={18} className="text-emerald-500" />
          Apagou errado? O lucro recalcula sozinho no Financeiro.
        </div>
        <Button size="sm" variant="secondary" onClick={() => navigate('/app/financeiro')}>
          Ver lucro real
        </Button>
      </Card>

      <ConfirmDialog
        open={!!deleting}
        title={`Apagar "${deleting?.description || 'gasto'}"?`}
        message={`Remove ${formatBRL(Number(deleting?.value) || 0)} e devolve ao lucro do mês.`}
        busy={deletingBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
