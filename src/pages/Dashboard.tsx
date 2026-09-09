import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Wrench, Wallet, FileText, Users, Plus, ArrowRight } from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { formatBRL, greetings, todayISO } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const today = todayISO();
  const todaysServiceOrders = orders.filter((o) => o.date === today);
  const pending = orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado').length;
  const receberTotal = orders
    .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado')
    .reduce((s, o) => s + (Number(o.value) || 0), 0);
  const budgetsWaiting = budgets.filter((b) => b.status === 'enviado').length;
  const totalCustomers = customers.length;

  const nextServices = orders
    .filter((o) => o.status === 'agendado' && o.date >= today)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 4);

  const doneToday = todaysServiceOrders.filter((o) => o.status === 'concluido').length;
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const hasCompany = companies.some((c) => (c.name || '').trim() && c.name !== 'Minha empresa');
  const hasCustomer = totalCustomers > 0;
  const hasOrder = orders.length > 0;
  const hasBudget = budgets.length > 0;
  const steps = [
    { done: hasCompany, label: 'Sua empresa', to: '/app/empresa' },
    { done: hasCustomer, label: '1º cliente', to: '/app/clientes/importar' },
    { done: hasOrder, label: '1ª OS', to: '/app/servicos/novo' },
    { done: hasBudget, label: '1º orçamento', to: '/app/orcamentos/novo' },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const showChecklist = stepsDone < 4;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      {/* Saudação */}
      <div className="auth-shell relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071f4c] via-[#0b3d91] to-[#1e7fc0] p-5 text-white shadow-[0_24px_70px_-24px_rgba(11,61,145,.7)] sm:p-7 dark:from-[#0a1330] dark:via-[#0b2a63] dark:to-[#123f86]">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-100 backdrop-blur">
            ❄️ {todaysServiceOrders.length > 0 ? `${todaysServiceOrders.length} hoje` : 'climapro'}
          </span>
          <h1 className="font-display mt-2 break-words text-[26px] font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            {greetings()}, {user?.firstName}! 👋
          </h1>
          <p className="mt-1.5 break-words text-[13px] font-medium text-sky-100/90 sm:text-[15px]">
            {todaysServiceOrders.length > 0
              ? `Você possui ${todaysServiceOrders.length} serviço${todaysServiceOrders.length > 1 ? 's' : ''} hoje · ${doneToday} concluído${doneToday === 1 ? '' : 's'}.`
              : 'Nenhum serviço agendado para hoje. Que tal criar um agora?'}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button size="md" variant="light" full className="sm:w-auto" onClick={() => navigate('/app/servicos/novo')}><Plus size={16} /> Nova OS</Button>
            <Button size="md" full className="sm:w-auto !border-white/25 !bg-white/10 !text-white backdrop-blur hover:!bg-white/20" onClick={() => navigate('/app/orcamentos/novo')}><Plus size={16} /> Novo orçamento</Button>
          </div>
        </div>
      </div>

      {showChecklist && (
        <div className="cp-card mt-4 p-4 sm:mt-5 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-extrabold text-neutral-900 dark:text-white">🚀 Comece em 2 minutos ({stepsDone}/4)</h2>
            <span className="rounded-full bg-primary-600 px-2.5 py-1 text-[11px] font-black text-white">{Math.round((stepsDone / 4) * 100)}%</span>
          </div>
          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-700 via-sky-500 to-cyan-300 transition-all" style={{ width: `${(stepsDone / 4) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => navigate(s.to)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-extrabold transition-all duration-200 active:scale-[.98] ${
                  s.done
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:border-sky-400/50'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${s.done ? 'bg-emerald-500 text-white' : 'bg-neutral-200 text-neutral-500 dark:bg-white/15 dark:text-white'}`}>
                  {s.done ? '✓' : '→'}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* StatCards clicáveis */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
        <StatCard tone="blue" icon={<CalendarDays size={19} />} label="Serviços hoje →" value={String(todaysServiceOrders.length)} onClick={() => navigate('/app/agenda')} />
        <StatCard tone="amber" icon={<Wrench size={19} />} label="Pendentes →" value={String(pending)} onClick={() => navigate('/app/servicos?filter=pendentes')} />
        <StatCard tone="emerald" icon={<Wallet size={19} />} label="A receber →" value={formatBRL(receberTotal)} onClick={() => navigate('/app/financeiro')} />
        <StatCard tone="violet" icon={<FileText size={19} />} label="Aguardando →" value={String(budgetsWaiting)} onClick={() => navigate('/app/orcamentos')} />
      </div>

      {/* Ações rápidas */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        <Button full onClick={() => navigate('/app/servicos/novo')}><Plus size={16} className="mr-1" /> Novo serviço</Button>
        <Button full variant="secondary" onClick={() => navigate('/app/orcamentos/novo')}><Plus size={16} className="mr-1" /> Novo orçamento</Button>
        <Button full variant="secondary" onClick={() => navigate('/app/clientes/novo')}><Plus size={16} className="mr-1" /> Novo cliente</Button>
        <Button full variant="outline" onClick={() => navigate('/app/agenda')}>Ver agenda <ArrowRight size={16} /></Button>
      </div>

      {/* Seu dia */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-card dark:border-neutral-700 dark:bg-neutral-800 sm:mt-6 sm:p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Seu dia</h2>
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {doneToday}/{todaysServiceOrders.length} concluídos
          </span>
        </div>
        {todaysServiceOrders.length > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700/60">
            <div
              className={`h-full rounded-full ${todaysServiceOrders.every((o) => o.status === 'concluido') ? 'bg-success' : 'bg-primary-600 dark:bg-primary-500'}`}
              style={{ width: `${todaysServiceOrders.length ? (doneToday / todaysServiceOrders.length) * 100 : 0}%` }}
            />
          </div>
        )}
        <div className="mt-4 space-y-1">
          {todaysServiceOrders
            .slice()
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            .map((o) => {
              const done = o.status === 'concluido';
              return (
                <button
                  key={o.id}
                  onClick={() => navigate(`/app/servicos/${o.id}`)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-700/40 ${!done && o.status !== 'cancelado' ? 'border border-primary-200 bg-primary-50/50 dark:bg-primary-900/40' : 'border border-transparent'}`}
                >
                  <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-extrabold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    {o.time || '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${done ? 'text-neutral-400 line-through' : 'text-neutral-800 dark:text-neutral-100'}`}>
                      {customerName(o.customerId)}
                    </div>
                    <div className="truncate text-xs text-neutral-400">❄️ {o.service}</div>
                  </div>
                  {done && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">OK</span>}
                </button>
              );
            })}
        </div>
        {todaysServiceOrders.length === 0 && (
          <p className="mt-3 text-sm text-neutral-400">Nenhum serviço hoje. Aproveite para organizar orçamentos! 😉</p>
        )}
      </div>

      {/* Próximos serviços */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Próximos serviços</h2>
        <Link to="/app/agenda" className="text-sm font-semibold text-primary-600 dark:text-primary-400">Ver agenda</Link>
      </div>

      <div className="mt-3 space-y-3">
        {nextServices.length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Você ainda não possui serviços agendados.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/servicos/novo')}>
              <Plus size={16} className="mr-1" /> Agendar serviço
            </Button>
          </Card>
        )}
        {nextServices.map((o) => (
          <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <span className="text-sm font-extrabold leading-none">{o.time}</span>
                </div>
                <div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{customerName(o.customerId)}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">❄️ {o.service}</div>
                  <div className="text-xs text-neutral-400">📍 {o.address}</div>
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>
          </Card>
        ))}
      </div>

      {/* Clientes recentes */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Clientes</h2>
        <Link to="/app/clientes" className="text-sm font-semibold text-primary-600 dark:text-primary-400">Ver todos</Link>
      </div>
      <Card className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"><Users size={18} /></span>
          <div>
            <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Total de clientes</div>
            <div className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">{totalCustomers}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/clientes')}>
          Gerenciar <ArrowRight size={14} />
        </Button>
      </Card>
    </div>
  );
}
