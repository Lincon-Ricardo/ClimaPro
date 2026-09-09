import { useMemo, useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  FileText, TrendingUp, CheckCircle2, Users, Filter,
  FileDown, Trophy, Target, Wallet, Flame, AlertTriangle, Clock,
  BadgeDollarSign, UserRound, Quote, Wrench, Star,
} from 'lucide-react';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { formatBRL, telToWhats } from '../lib/utils';
import { PdfPreviewModal, usePdfPreview } from '../components/PdfPreview';
import { useToast } from '../components/Toast';
import {
  rangeBounds, filterOrdersByPeriod, filterBudgetsByPeriod,
  calcKpi, revenueSeries as buildSeries, techRanking as buildRanking,
  serviceMix as buildMix, topDebtors as buildDebtors, staleBudgets as buildStale,
} from '../lib/reports';
import type { RangeKey } from '../lib/reports';
import { errMsg } from '../lib/errors';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'ano', label: 'Ano' },
  { key: 'tudo', label: 'Tudo' },
];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700/60">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Relatorios() {
  const toast = useToast();
  const [range, setRange] = useState<RangeKey>('mes');
  const [techFilter, setTechFilter] = useState<string>('todos');
  const [generating, setGenerating] = useState(false);
  const { preview, openPdf, close, download } = usePdfPreview();

  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const company = companies[0];
  const { from, to, label } = useMemo(() => rangeBounds(range), [range]);

  const orders = useLiveQuery(
    () => db.serviceOrders.list({ pageSize: 1000, gte: { date: from }, lte: { date: to } }).then((r) => r.rows),
    [from, to],
  ) || [];
  const budgets = useLiveQuery(
    () => db.budgets.list({ pageSize: 1000 }).then((r) => r.rows),
    [],
  ) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const periodOrdersRaw = useMemo(() => filterOrdersByPeriod(orders, from, to), [orders, from, to]);
  const periodOrders = useMemo(() => {
    if (techFilter === 'todos') return periodOrdersRaw;
    return periodOrdersRaw.filter((o) => (o.technician || '') === techFilter);
  }, [periodOrdersRaw, techFilter]);
  const periodBudgets = useMemo(() => filterBudgetsByPeriod(budgets, from, to), [budgets, from, to]);

  const kpi = useMemo(() => calcKpi(periodOrders, periodBudgets), [periodOrders, periodBudgets]);
  const revenueSeries = useMemo(() => buildSeries(periodOrdersRaw, range), [periodOrdersRaw, range]);
  const maxSeries = Math.max(1, ...revenueSeries.map((p) => p.value));
  const techRanking = useMemo(() => buildRanking(periodOrdersRaw), [periodOrdersRaw]);
  const serviceMix = useMemo(() => buildMix(periodOrders), [periodOrders]);
  const maxServiceRevenue = Math.max(1, ...serviceMix.map((s) => s.revenue));
  const debtors = useMemo(() => buildDebtors(orders, customers), [orders, customers]);
  const staleBudgets = useMemo(() => buildStale(periodBudgets), [periodBudgets]);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  async function exportPDF() {
    setGenerating(true);
    try {
      const { exportReportPdf } = await import('../lib/pdf/reportPdf');
      const doc = await exportReportPdf({ company, label, from, to, techFilter, kpi, techRanking, serviceMix, debtors });
      openPdf(doc, `Relatorio-ClimaPro-${label.replace(/\s+/g, '-')}.pdf`, `Relatório · ${label}`);
    } catch (e: unknown) {
      toast('error', 'Não foi possível gerar o PDF: ' + errMsg(e, 'erro'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100 sm:text-xl">Relatórios gerenciais</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">Inteligência do negócio · {label}</p>
        <Button size="sm" onClick={exportPDF} disabled={generating} full className="mt-2.5 sm:mt-0 sm:w-auto">
          <FileDown size={16} /> {generating ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="-mx-1 flex items-center gap-2 table-scroll px-1 pb-1">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <Filter size={14} /> Período:
          </span>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${range === r.key ? 'bg-primary-700 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 dark:bg-neutral-700/60 dark:text-neutral-300'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <UserRound size={14} /> Técnico:
          </span>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-primary-500 dark:border-neutral-700"
          >
            <option value="todos">Todos os técnicos</option>
            {Array.from(new Set(periodOrdersRaw.map((o) => (o.technician || '').trim()).filter(Boolean))).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {techFilter !== 'todos' && (
            <button type="button" onClick={() => setTechFilter('todos')} className="text-xs font-semibold text-primary-600 hover:underline">
              Limpar filtro
            </button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BadgeDollarSign size={20} />} label="Receita concluída" value={formatBRL(kpi.revenue)} color="text-emerald-600" />
        <StatCard icon={<Wallet size={20} />} label="Ticket médio" value={formatBRL(kpi.ticket)} color="text-primary-600" />
        <StatCard icon={<CheckCircle2 size={20} />} label="OS concluídas" value={`${kpi.done.length}/${kpi.valid.length}`} color="text-sky-600" />
        <StatCard icon={<Target size={20} />} label="Conversão orçamentos" value={`${kpi.conversion.toFixed(0)}%`} color="text-violet-600" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Quote size={20} />} label="Pipeline em aberto" value={formatBRL(kpi.pipelineValue)} color="text-amber-600" />
        <StatCard icon={<Clock size={20} />} label="A receber (concluído)" value={formatBRL(kpi.pending)} color="text-orange-600" />
        <StatCard icon={<AlertTriangle size={20} />} label="Cancelamento" value={`${kpi.cancelRate.toFixed(1)}%`} color="text-red-500" />
        <StatCard icon={<Users size={20} />} label="Recorrência" value={`${kpi.recurring}/${kpi.totalCusts}`} color="text-teal-600" />
      </div>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <TrendingUp size={18} className="text-emerald-600" /> Evolução da receita
          </h2>
          <span className="text-xs text-neutral-400">Valores concluídos</span>
        </div>
        <div className="table-scroll mt-3 pb-1">
          <div className="flex h-36 min-w-[420px] items-end gap-1.5 sm:min-w-0">
            {revenueSeries.map((p, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="whitespace-nowrap text-[9px] font-bold text-neutral-500 dark:text-neutral-400">
                  {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value > 0 ? String(Math.round(p.value)) : ''}
                </span>
                <div className="flex h-24 w-full items-end">
                  <div
                    className={`w-full rounded-t-md ${i === revenueSeries.length - 1 ? 'bg-emerald-500' : 'bg-primary-300 dark:bg-primary-700'}`}
                    style={{ height: `${Math.max(3, (p.value / maxSeries) * 100)}%` }}
                    title={`${p.label}: ${formatBRL(p.value)}`}
                  />
                </div>
                <span className="whitespace-nowrap text-[9px] font-medium text-neutral-400">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Trophy size={18} className="text-amber-500" /> Ranking de técnicos
          </h2>
          <p className="text-xs text-neutral-400">Por receita concluída no período</p>
          <div className="mt-3 space-y-3">
            {techRanking.length === 0 && <p className="text-sm text-neutral-400">Sem dados no período.</p>}
            {techRanking.slice(0, 6).map((t, i) => (
              <div key={t.name}>
                <div className="mb-1 flex items-start justify-between gap-2 text-sm">
                  <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-neutral-700 dark:text-neutral-200">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-neutral-400' : i === 2 ? 'bg-orange-700' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{t.name}</span>
                      <span className="block text-[11px] font-normal text-neutral-400">{t.done} OS · {t.open} aberta(s)</span>
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatBRL(t.revenue)}</span>
                </div>
                <Bar value={t.revenue} max={Math.max(1, ...techRanking.map((x) => x.revenue))} color="bg-gradient-to-r from-amber-400 to-emerald-500" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Mix de serviços
          </h2>
          <p className="text-xs text-neutral-400">Onde está o lucro da operação</p>
          <div className="mt-3 space-y-3">
            {serviceMix.length === 0 && <p className="text-sm text-neutral-400">Sem serviços concluídos no período.</p>}
            {serviceMix.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words font-medium text-neutral-700 dark:text-neutral-200">
                    {s.name} <span className="whitespace-nowrap text-xs text-neutral-400">({s.count}x)</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-bold text-neutral-800 dark:text-neutral-100">{formatBRL(s.revenue)}</span>
                </div>
                <Bar value={s.revenue} max={maxServiceRevenue} color="bg-gradient-to-r from-primary-500 to-sky-400" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Flame size={18} className="text-danger" /> Cobrança prioritária
          </h2>
          <p className="text-xs text-neutral-400">Maiores saldos em aberto (todas as datas)</p>
          <div className="mt-3 space-y-2">
            {debtors.length === 0 && <p className="text-sm text-neutral-400">Nenhuma conta em aberto. 🎉</p>}
            {debtors.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">{d.name}</div>
                  <div className="text-xs text-neutral-400">{d.count} OS em aberto</div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="whitespace-nowrap text-sm font-black text-danger">{formatBRL(d.total)}</span>
                  {d.phone && (
                    <a
                      href={`https://wa.me/${telToWhats(d.phone)}?text=${encodeURIComponent(`Olá, ${d.name}! Aqui é da ${company?.name || 'ClimaPro'}. Passando para lembrar do saldo em aberto de ${formatBRL(d.total)}. Podemos acertar hoje? ❄️`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                    >
                      Cobrar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Star size={18} className="text-violet-600" /> Orçamentos pedindo follow-up
          </h2>
          <p className="text-xs text-neutral-400">Propostas paradas que podem virar receita</p>
          <div className="mt-3 space-y-2">
            {staleBudgets.length === 0 && <p className="text-sm text-neutral-400">Nenhum orçamento pendente.</p>}
            {staleBudgets.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">
                    {custName(b.customerId)}{' '}
                    <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{b.status}</span>
                  </div>
                  <div className="break-words text-xs text-neutral-400">{b.serviceType || b.description || 'Orçamento'}</div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm font-black text-primary-700 dark:text-primary-300">{formatBRL(Number(b.total) || 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
          <FileText size={18} className="text-sky-600" /> Funil comercial do período
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {[
            { label: 'Enviados', value: periodBudgets.length, color: 'bg-sky-500' },
            { label: 'Aprovados', value: kpi.approved, color: 'bg-emerald-500' },
            { label: 'Recusados', value: periodBudgets.filter((b) => b.status === 'recusado').length, color: 'bg-red-400' },
            { label: 'Em aberto', value: periodBudgets.filter((b) => !['aprovado', 'recusado'].includes(b.status)).length, color: 'bg-amber-400' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-neutral-50 p-3 text-center dark:bg-neutral-900/60">
              <div className={`mx-auto mb-1.5 h-1.5 w-10 rounded-full ${f.color}`} />
              <div className="text-xl font-black text-neutral-800 dark:text-neutral-100">{f.value}</div>
              <div className="text-[11px] font-medium text-neutral-500">{f.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Taxa de conversão: <b className="text-emerald-600">{kpi.conversion.toFixed(1)}%</b> · Valor parado no funil: <b className="text-amber-600">{formatBRL(kpi.pipelineValue)}</b>
        </p>
      </Card>
      <PdfPreviewModal preview={preview} onClose={close} onDownload={download} />
    </div>
  );
}
