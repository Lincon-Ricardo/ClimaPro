import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, toISODate, todayISO, formatDate } from '../lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Agenda() {
  const navigate = useNavigate();
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [anchor, setAnchor] = useState(new Date());

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const weekDays = useMemo(() => {
    const start = new Date(anchor);
    const dow = (start.getDay() + 6) % 7;
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
    if (view === 'dia') n.setDate(n.getDate() + dir);
    else if (view === 'semana') n.setDate(n.getDate() + dir * 7);
    else n.setMonth(n.getMonth() + dir);
    setAnchor(n);
  }

  const scheduled = orders.filter((o) => o.status === 'agendado' || o.status === 'em_andamento');

  const countFor = (iso: string) => scheduled.filter((o) => o.date === iso).length;
  const heatColor = (count: number) =>
    count === 0 ? 'bg-neutral-100 text-neutral-500'
    : count === 1 ? 'bg-primary-100 text-primary-800'
    : count === 2 ? 'bg-primary-300 text-primary-900'
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
    return (
      <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <span className="text-sm font-extrabold leading-none">{o.time}</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-neutral-800">{custName(o.customerId)}</div>
              <div className="text-sm text-neutral-500">❄️ {o.service}</div>
              <div className="text-xs text-neutral-400">📍 {o.address}</div>
              <div className="mt-1 text-xs font-semibold text-neutral-500">{formatBRL(o.value)}</div>
            </div>
          </div>
          <StatusBadge status={o.status} />
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Agenda"
        action={<Button onClick={() => navigate('/app/servicos/novo')}><Plus size={18} /> Novo serviço</Button>}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex rounded-xl border border-neutral-200 bg-white p-1">
          {(['dia', 'semana', 'mes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${view === v ? 'bg-primary-700 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
            >
              {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-lg border border-neutral-200 bg-white p-2 hover:bg-neutral-100"><ChevronLeft size={18} /></button>
          <span className="min-w-[150px] text-center text-sm font-bold text-neutral-700">
            {view === 'semana' ? `${formatDate(orderDate(weekDays[0]))} — ${formatDate(orderDate(weekDays[6]))}` : formatDate(orderDate(anchor))}
          </span>
          <button onClick={() => move(1)} className="rounded-lg border border-neutral-200 bg-white p-2 hover:bg-neutral-100"><ChevronRight size={18} /></button>
        </div>
      </div>

      {view === 'mes' && (
        <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-neutral-700">Ocupação do mês</span>
            <span className="text-xs text-neutral-400">{scheduled.length} serviço(s) no mês</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[10px] font-semibold uppercase text-neutral-400">{w}</div>
            ))}
            {buildMonthCells(anchor).map((cell, i) =>
              cell === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  onClick={() => { setAnchor(cell); setView('dia'); }}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-bold transition ${
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
        <div className="mb-4 grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const active = orderDate(d) === todayISO();
            return (
              <button
                key={i}
                onClick={() => setAnchor(d)}
                className={`rounded-xl border p-2 text-center ${active ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-white'}`}
              >
                <div className="text-[10px] font-semibold uppercase text-neutral-400">{WEEKDAYS[i]}</div>
                <div className={`text-base font-bold ${active ? 'text-primary-700' : 'text-neutral-700'}`}>{d.getDate()}</div>
                <div className={`mt-0.5 h-1.5 w-1.5 rounded-full mx-auto ${scheduled.some((o) => o.date === orderDate(d)) ? 'bg-success' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {scheduled
          .filter((o) => (view === 'mes' ? o.date.startsWith((anchor.getFullYear()) + '-' + String(anchor.getMonth() + 1).padStart(2, '0')) : o.date === orderDate(anchor)))
          .sort((a, b) => a.time.localeCompare(b.time))
          .map(renderDetail)}
        {scheduled.filter((o) => (view === 'mes' ? o.date.startsWith(anchor.getFullYear() + '-' + String(anchor.getMonth() + 1).padStart(2, '0')) : o.date === orderDate(anchor))).length === 0 && (
          <Card>
            <p className="text-sm text-neutral-500">Nenhum serviço agendado neste período.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/servicos/novo')}><Plus size={16} /> Agendar</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
