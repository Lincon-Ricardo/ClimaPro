import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingDown, ArrowUpRight, Trash2, Wallet, Sparkles } from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { formatBRL, formatDate, todayISO } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type { ExpenseCategory, Expense } from '../types';

const CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: 'material', label: 'Material' },
  { key: 'ferramenta', label: 'Ferramenta' },
  { key: 'combustivel', label: 'Combustível' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'escritorio', label: 'Escritório' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'outros', label: 'Outros' },
];

export default function Gastos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const expenses = (useLiveQuery(() => db.expenses.list({ pageSize: 500, order: { column: 'date', ascending: false } }).then((r) => r.rows), []) || []) as Expense[];

  const [form, setForm] = useState({
    date: todayISO(),
    category: 'material' as ExpenseCategory,
    description: '',
    value: '',
    notes: '',
  });

  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + Number(e.value || 0), 0), [expenses]);
  const thisMonth = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return expenses.filter((e) => (e.date || '').startsWith(m));
  }, [expenses]);
  const totalMes = useMemo(() => thisMonth.reduce((s, e) => s + Number(e.value || 0), 0), [thisMonth]);

  async function addExpense() {
    if (!form.description.trim()) {
      toast('error', 'Preencha a descrição do gasto.');
      return;
    }
    const val = Number(form.value);
    if (!val || val <= 0) {
      toast('error', 'Informe um valor válido maior que zero.');
      return;
    }
    await db.expenses.add({
      companyId: user?.companyId || '',
      category: form.category,
      description: form.description.trim(),
      value: val,
      date: form.date,
      paymentStatus: 'pago',
      notes: form.notes.trim(),
      createdBy: user?.email || '',
    } as Expense);
    setForm({ date: form.date, category: form.category, description: '', value: '', notes: '' });
    toast('success', 'Gasto registrado!');
  }

  async function removeExpense(id: string) {
    await db.expenses.delete(id);
    toast('success', 'Gasto removido.');
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Controle de Gastos</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Registre despesas para subtrair do orçamento automaticamente.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/app/administrativo')}>
          <ArrowUpRight size={15} /> Voltar ao administrativo
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<TrendingDown size={20} />} label="Total de gastos" value={formatBRL(totalGastos)} tone="amber" />
        <StatCard icon={<Wallet size={20} />} label="Este mês" value={formatBRL(totalMes)} tone="violet" />
        <StatCard icon={<Sparkles size={20} />} label="Registros" value={String(expenses.length)} tone="blue" />
      </div>

      {/* Formulário */}
      <Card className="p-5">
        <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Novo gasto</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
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
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-primary-500"
            />
          </div>
          <div className="sm:col-span-1 flex items-end">
            <Button className="w-full" size="sm" onClick={addExpense}>
              <Plus size={14} /> Adicionar
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

      {/* Lista */}
      <Card className="p-5">
        <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Histórico</h2>
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
                <div className="text-[11px] text-neutral-400">{e.date} {e.notes ? `· ${e.notes}` : ''}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-extrabold text-red-600 dark:text-red-400">- {formatBRL(e.value)}</span>
                <button onClick={() => removeExpense(e.id)} className="text-neutral-400 hover:text-red-500 transition" title="Remover">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
