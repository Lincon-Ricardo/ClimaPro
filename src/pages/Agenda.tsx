import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, toISODate, todayISO, formatDate } from '../lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Agenda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const allOrders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [anchor, setAnchor] = useState(new Date());

  const isTech = user?.role === 'tech';
  const techName = (user?.name || '').trim().toLowerCase();
  const techFirstName = (user?.firstName || '').trim().toLowerCase();

  // Técnico: agenda isolada nas próprias atribuições
  const orders = useMemo(() => {
    if (!isTech) return allOrders;
    return allOrders.filter((o) => {
      const t = (o.technician || '').trim().toLowerCase();
      if (!t) return false;
      return t === techName || t === techFirstName || t.includes(techFirstName);
    });
  }, [allOrders, isTech, techName, techFirstName]);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const weekDays = useMemo(() => {
    const start = new Date(anchor);
    const dow = start.getDay();
    start.setDate(start.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const orderDate = (d: Date) => toISODate(d);

  function move(dir: number) {
    const n = new Date(anchor);
    if (view === 'dia') n.setDate(n.getDate() + dir * 7);
    else if (view === 'semana') n.setDate(n.getDate() + dir * 7);
    else n.setMonth(n.getMonth() + dir);
    setAnchor(n);
  }

  function goToday() {
    setAnchor(new Date());
  }

  const scheduled = orders.filter((o) => o.status === 'agendado' || o.status === 'em_andamento');
  const finished = orders.filter((o) => o.status === 'concluido' || o.status === 'cancelado');
  const noDate = scheduled.filter((o) => !o.date);

  const anchorISO = orderDate(anchor);
  const weekISOs = useMemo(() => new Set(weekDays.map(orderDate)), [weekDays]);
  const monthStr = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;

  function matchesPeriod(o: any): boolean {
    if (!o.date) return false;
    if (view === 'dia') return o.date === anchorISO;
    if (view === 'semana') return weekISOs.has(o.date);
    return o.date.startsWith(monthStr);
  }

  const active = scheduled.filter(matchesPeriod).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const done = finished.filter(matchesPeriod).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const inProgress = active.filter((o) => o.status === 'em_andamento').length;

  const countFor = (iso: string) => scheduled.filter((o) => o.date === iso).length;
  const heatColor = (count: number) =>
    count === 0 ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400'
    : count === 1 ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-200'
    : count === 2 ? 'bg-primary-300 text-primary-900 dark:bg-primary-400/60 dark:text-neutral-900'
    : 'bg-primary-600 text-white';

  function buildMonthCells(d: Date) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: start }, () => null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }


  function renderDetail(o: any) {
    const showDate = view !== 'dia';
    const customer = customers.find((c) => c.id === o.customerId);
    const fullAddress = o.address || [customer?.street, customer?.number, customer?.district, customer?.city].filter(Boolean).join(', ');
    return (
      <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)} className="p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              <span className="text-sm font-extrabold leading-none">{o.time || '--:--'}</span>
              {showDate && o.date ? <span className="mt-0.5 text-[10px] font-semibold leading-none opacity-80">{o.date.slice(8, 10)}/{o.date.slice(5, 7)}</span> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="break-words text-sm font-bold leading-snug text-neutral-800 dark:text-neutral-100 sm:text-base">{custName(o.customerId)}</div>
              <div className="mt-0.5 break-words text-xs leading-snug text-neutral-500 dark:text-neutral-400 sm:text-sm">❄️ {o.service}</div>
              {fullAddress ? (
                <div className="mt-1 break-words text-xs leading-snug text-neutral-500 dark:text-neutral-400">📍 {fullAddress}</div>
              ) : null}
              {o.technician ? (
                <div className="mt-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">🧑‍🔧 {o.technician}</div>
              ) : null}
              <div className="mt-1 text-xs font-bold text-primary-700 dark:text-primary-300">{formatBRL(o.value)}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pl-[66px] sm:pl-0">
            <StatusBadge status={o.status} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100 sm:text-xl">Agenda</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
          {scheduled.length} agendado(s) · {done.length} encerrado(s) neste período
        </p>
        <Button onClick={() => navigate('/app/servicos/novo')} full className="mt-2.5 sm:mt-0 sm:w-auto"><Plus size={18} /> Novo serviço</Button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-800">
          {(['dia', 'semana', 'mes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize touch-manipulation ${view === v ? 'bg-primary-700 text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/60'}`}
            >
              {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => move(-1)} aria-label={view === 'dia' ? 'Semana anterior' : view === 'semana' ? 'Semana anterior' : 'Mês anterior'} title={view === 'mes' ? 'Mês anterior' : 'Semana anterior (7 dias)'} className="rounded-lg border border-neutral-200 bg-white p-2.5 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700/60"><ChevronLeft size={18} /></button>
          <span className="min-w-0 flex-1 break-words text-center text-xs font-bold text-neutral-700 dark:text-neutral-200 sm:text-sm">
            {view === 'semana' ? `${formatDate(orderDate(weekDays[0]))} — ${formatDate(orderDate(weekDays[6]))}` : formatDate(orderDate(anchor))}
          </span>
          <button onClick={() => move(1)} aria-label={view === 'dia' ? 'Próxima semana' : view === 'semana' ? 'Próxima semana' : 'Próximo mês'} title={view === 'mes' ? 'Próximo mês' : 'Próxima semana (7 dias)'} className="rounded-lg border border-neutral-200 bg-white p-2.5 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700/60"><ChevronRight size={18} /></button>
          {orderDate(anchor) !== todayISO() && (
            <button onClick={goToday} className="shrink-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-2.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-primary-300 dark:hover:bg-primary-900/40">Hoje</button>
          )}
        </div>
      </div>

      {view === 'mes' && (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-card dark:border-neutral-700 dark:bg-neutral-800 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 sm:text-sm">Ocupação do mês</span>
            <span className="whitespace-nowrap text-[11px] text-neutral-400 sm:text-xs">{scheduled.filter((o) => o.date && o.date.startsWith(anchor.getFullYear() + '-' + String(anchor.getMonth() + 1).padStart(2, '0'))).length} no mês</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[9px] font-semibold uppercase text-neutral-400 sm:text-[10px]">{w}</div>
            ))}
            {buildMonthCells(anchor).map((cell, i) =>
              cell === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  onClick={() => { setAnchor(cell); setView('dia'); }}
                  className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg text-sm font-bold transition touch-manipulation ${
                    heatColor(countFor(orderDate(cell)))
                  } ${orderDate(cell) === todayISO() ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                >
                  {cell.getDate()}
                  {countFor(orderDate(cell)) > 0 && (
                    <span className="text-[9px] font-semibold opacity-80">{countFor(orderDate(cell))}</span>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {view !== 'mes' && (
        <div className="mb-4 grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((d, i) => {
            const activeDay = orderDate(d) === anchorISO;
            return (
              <button
                key={i}
                onClick={() => setAnchor(d)}
                className={`min-h-[52px] rounded-xl border p-1 text-center touch-manipulation sm:min-h-[44px] sm:p-2 ${activeDay ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
              >
                <div className="text-[9px] font-semibold uppercase text-neutral-400 sm:text-[10px]">{WEEKDAYS[d.getDay()]}</div>
                <div className={`text-sm font-bold sm:text-base ${activeDay ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-200'}`}>{d.getDate()}</div>
                <div className={`mt-0.5 h-1.5 w-1.5 rounded-full mx-auto ${scheduled.some((o) => o.date === orderDate(d)) ? 'bg-success' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      )}

      {view === 'dia' && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">{active.length} agendado(s)</span>
          {inProgress > 0 && <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{inProgress} em andamento</span>}
          {done.length > 0 && <span className="rounded-full bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900/40 dark:text-green-200">{done.length} concluído(s)/cancelado(s)</span>}
        </div>
      )}

      {view !== 'dia' && (
        <div className="mb-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          {active.length} serviço(s) {view === 'semana' ? 'nesta semana' : 'neste mês'}
        </div>
      )}

      <div className="space-y-2.5 sm:space-y-3">
        {active.map(renderDetail)}
        {done.length > 0 && (
          <>
            <div className="rounded-xl bg-green-50 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-green-700 dark:bg-green-950/40 dark:text-green-300 sm:text-left">
              ✓ Encerrados neste período ({done.length})
            </div>
            {done.map(renderDetail)}
          </>
        )}
        {active.length === 0 && done.length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum serviço agendado neste período.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/servicos/novo')}><Plus size={16} /> Agendar</Button>
          </Card>
        )}
        {noDate.length > 0 && (
          <>
            <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Sem data definida</div>
            {noDate.map(renderDetail)}
          </>
        )}
      </div>
    </div>
  );
}
