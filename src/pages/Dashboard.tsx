import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Wrench, Wallet, FileText } from 'lucide-react';
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
  const payments = useLiveQuery(() => db.payments.toArray(), []) || [];

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const today = todayISO();
  const todaysServiceOrders = orders.filter((o) => o.date === today);
  const pending = orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado').length;
  const receberTotal = orders
    .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado')
    .reduce((s, o) => s + (Number(o.value) || 0), 0);
  const budgetsWaiting = budgets.filter((b) => b.status === 'enviado').length;

  const nextServices = orders
    .filter((o) => o.status === 'agendado' && o.date >= today)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 5);

  return (
    <div className="max-w-5xl">
      <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-extrabold">
          {greetings()}, {user?.firstName}! 👋
        </h1>
        <p className="mt-1 text-primary-100">
          {todaysServiceOrders.length > 0
            ? `Você possui ${todaysServiceOrders.length} serviço${todaysServiceOrders.length > 1 ? 's' : ''} hoje.`
            : 'Nenhum serviço agendado para hoje.'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<CalendarDays size={20} />} label="Serviços hoje" value={String(todaysServiceOrders.length)} />
        <StatCard icon={<Wrench size={20} />} label="Pendentes" value={String(pending)} />
        <StatCard icon={<Wallet size={20} />} label="A receber" value={formatBRL(receberTotal)} />
        <StatCard icon={<FileText size={20} />} label="Orçamentos aguardando" value={String(budgetsWaiting)} />
      </div>

      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100">Seu dia</h2>
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {todaysServiceOrders.filter((o) => o.status === 'concluido').length}/{todaysServiceOrders.length} concluídos
          </span>
        </div>
        {todaysServiceOrders.length > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700/60">
            <div
              className={`h-full rounded-full ${
                todaysServiceOrders.every((o) => o.status === 'concluido') ? 'bg-success' : 'bg-primary-600'
              }`}
              style={{
                width: `${(todaysServiceOrders.filter((o) => o.status === 'concluido').length / todaysServiceOrders.length) * 100}%`,
              }}
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-700/40 ${
                    !done && o.status !== 'cancelado' ? 'border border-primary-200 bg-primary-50/50 dark:bg-primary-900/40' : 'border border-transparent'
                  }`}
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
                  {done && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">OK</span>}
                </button>
              );
            })}
        </div>
        {todaysServiceOrders.length === 0 && (
          <p className="mt-3 text-sm text-neutral-400">Nenhum serviço hoje. Aproveite para organizar orçamentos! 😉</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <Button size="lg" onClick={() => navigate('/app/servicos/novo')}>➕ Novo serviço</Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => navigate('/app/orcamentos/novo')}>💰 Novo orçamento</Button>
          <Button variant="secondary" onClick={() => navigate('/app/clientes/novo')}>👤 Novo cliente</Button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Próximos serviços</h2>
        <Link to="/app/agenda" className="text-sm font-semibold text-primary-600 dark:text-primary-400">Ver agenda</Link>
      </div>

      <div className="mt-3 space-y-3">
        {nextServices.length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Você ainda não possui serviços agendados.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/servicos/novo')}>
              ➕ Agendar serviço
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
    </div>
  );
}
