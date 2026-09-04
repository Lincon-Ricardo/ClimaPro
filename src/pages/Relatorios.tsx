import { useMemo, useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  FileText, TrendingUp, CheckCircle2, Users, Filter, Calendar,
  FileDown, Trophy, Target, Wallet, Flame, AlertTriangle, Clock,
  BadgeDollarSign, UserRound, Quote, Wrench, ChevronRight, Star,
} from 'lucide-react';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, formatDate, toISODate, todayISO, telToWhats } from '../lib/utils';
import { useToast } from '../components/Toast';

type RangeKey = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'tudo';

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

  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const technicians = useLiveQuery(() => db.users.toArray(), []) || [];

  const company = companies[0];

  const { from, to, label } = useMemo(() => {
    const t = new Date();
    const today = todayISO();
    if (range === 'hoje') return { from: today, to: today, label: 'Hoje' };
    if (range === 'semana') {
      const s = new Date(t);
      s.setDate(s.getDate() - 6);
      return { from: toISODate(s), to: today, label: 'Últimos 7 dias' };
    }
    if (range === 'mes') {
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return { from: toISODate(s), to: today, label: t.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
    }
    if (range === 'trimestre') {
      const s = new Date(t.getFullYear(), t.getMonth() - 2, 1);
      return { from: toISODate(s), to: today, label: 'Últimos 3 meses' };
    }
    if (range === 'ano') {
      const s = new Date(t.getFullYear(), 0, 1);
      return { from: toISODate(s), to: today, label: `Ano de ${t.getFullYear()}` };
    }
    return { from: '0000-01-01', to: '9999-12-31', label: 'Todo o histórico' };
  }, [range]);

  const periodOrdersRaw = useMemo(() => {
    return orders.filter((o) => (o.date || '') >= from && (o.date || '') <= to);
  }, [orders, from, to]);

  const periodOrders = useMemo(() => {
    if (techFilter === 'todos') return periodOrdersRaw;
    return periodOrdersRaw.filter((o) => (o.technician || '') === techFilter);
  }, [periodOrdersRaw, techFilter]);

  const periodBudgets = useMemo(() => {
    let list = budgets.filter((b) => {
      const d = (b.createdAt || '').slice(0, 10);
      return !d || (d >= from && d <= to);
    });
    return list;
  }, [budgets, from, to]);

  const kpi = useMemo(() => {
    const valid = periodOrders.filter((o) => o.status !== 'cancelado');
    const done = valid.filter((o) => o.status === 'concluido');
    const revenue = done.reduce((s, o) => s + (Number(o.value) || 0), 0);
    const ticket = done.length > 0 ? revenue / done.length : 0;

    const paid = valid.filter((o) => o.paymentStatus === 'pago').reduce((s, o) => s + (Number(o.value) || 0), 0);
    const pending = revenue - valid.filter((o) => o.paymentStatus === 'pago' && o.status === 'concluido').reduce((s, o) => s + (Number(o.value) || 0), 0);

    const cancelled = periodOrders.filter((o) => o.status === 'cancelado').length;
    const cancelRate = periodOrders.length > 0 ? (cancelled / periodOrders.length) * 100 : 0;

    // Funil de orçamentos
    const totalBud = periodBudgets.length;
    const approved = periodBudgets.filter((b) => b.status === 'aprovado');
    const conversion = totalBud > 0 ? (approved.length / totalBud) * 100 : 0;
    const pipelineValue = periodBudgets
      .filter((b) => !['aprovado', 'recusado'].includes(b.status))
      .reduce((s, b) => s + (Number(b.total) || 0), 0);

    // Recompra
    const custCount = new Map<string, number>();
    valid.forEach((o) => custCount.set(o.customerId, (custCount.get(o.customerId) || 0) + 1));
    const recurring = Array.from(custCount.values()).filter((n) => n > 1).length;
    const totalCusts = custCount.size;

    return { valid, done, revenue, ticket, paid, pending, cancelled, cancelRate, totalBud, approved: approved.length, conversion, pipelineValue, recurring, totalCusts };
  }, [periodOrders, periodBudgets]);

  // Evolução semanal/mensal da receita (últimos 8 pontos)
  const revenueSeries = useMemo(() => {
    const pts: { label: string; value: number }[] = [];
    const now = new Date();
    if (range === 'ano' || range === 'tudo') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const v = orders
          .filter((o) => o.status === 'concluido' && (o.date || '').startsWith(key))
          .reduce((s, o) => s + (Number(o.value) || 0), 0);
        pts.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value: v });
      }
    } else {
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * (range === 'hoje' ? 0 : range === 'semana' ? 1 : 4));
        const iso = toISODate(d);
        const v = orders
          .filter((o) => o.status === 'concluido' && (o.date || '') === iso)
          .reduce((s, o) => s + (Number(o.value) || 0), 0);
        pts.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: v });
      }
    }
    return pts;
  }, [orders, range]);

  const maxSeries = Math.max(1, ...revenueSeries.map((p) => p.value));

  // Ranking de técnicos
  const techRanking = useMemo(() => {
    const map = new Map<string, { name: string; done: number; revenue: number; open: number }>();
    periodOrdersRaw.filter((o) => o.status !== 'cancelado').forEach((o) => {
      const name = (o.technician || 'Sem técnico').trim() || 'Sem técnico';
      const e = map.get(name) || { name, done: 0, revenue: 0, open: 0 };
      if (o.status === 'concluido') {
        e.done += 1;
        e.revenue += Number(o.value) || 0;
      } else {
        e.open += 1;
      }
      map.set(name, e);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodOrdersRaw]);

  // Mix de serviços mais lucrativos
  const serviceMix = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    periodOrders.filter((o) => o.status === 'concluido').forEach((o) => {
      const name = (o.service || 'Serviço').trim() || 'Serviço';
      const e = map.get(name) || { count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += Number(o.value) || 0;
      map.set(name, e);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [periodOrders]);

  const maxServiceRevenue = Math.max(1, ...serviceMix.map((s) => s.revenue));

  // Cobrança: maiores devedores
  const debtors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; total: number; count: number }>();
    orders
      .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado' && Number(o.value) > 0)
      .forEach((o) => {
        const c = customers.find((x) => x.id === o.customerId);
        const e = map.get(o.customerId) || { id: o.customerId, name: c?.name || 'Cliente', phone: c?.whatsapp || c?.phone || '', total: 0, count: 0 };
        e.total += Number(o.value) || 0;
        e.count += 1;
        map.set(o.customerId, e);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [orders, customers]);

  // Orçamentos parados (follow-up)
  const staleBudgets = useMemo(() => {
    return periodBudgets
      .filter((b) => !['aprovado', 'recusado'].includes(b.status))
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 6);
  }, [periodBudgets]);

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  async function exportPDF() {
    setGenerating(true);
    try {
      const pdfTheme = await import('../lib/pdf/theme');
      const { createPdf, drawBrandHeader, drawBrandFooter, sectionLabel, divider, text, stampFooters, newBrandedPage } = pdfTheme;
      const ctx = createPdf(company);
      const { doc, c, ML, MR, CW, PH } = ctx;
      const headerArgs = {
        company,
        title: 'RELATÓRIO GERENCIAL',
        docName: label,
        rightLines: [
          `Período: ${from === '0000-01-01' ? 'Todo histórico' : `${formatDate(from)} a ${formatDate(to)}`}`,
          `Técnico: ${techFilter === 'todos' ? 'Todos' : techFilter}`,
          `Gerado em: ${formatDate(todayISO())}`,
        ],
      };
      const header = () => { drawBrandHeader(ctx, headerArgs); drawBrandFooter(ctx, company); };
      header();
      const FOOTER = 26;
      let y = 56;

      const need = (h: number) => {
        if (y + h > PH - FOOTER) { y = newBrandedPage(ctx, headerArgs); }
      };

      // KPIs
      const kpiRows: Array<[string, string]> = [
        ['Receita concluída', formatBRL(kpi.revenue)],
        ['Ticket médio', formatBRL(kpi.ticket)],
        ['OS concluídas', `${kpi.done.length} de ${kpi.valid.length}`],
        ['Taxa de cancelamento', `${kpi.cancelRate.toFixed(1)}%`],
        ['Conversão de orçamentos', `${kpi.conversion.toFixed(1)}% (${kpi.approved}/${kpi.totalBud})`],
        ['Pipeline em aberto', formatBRL(kpi.pipelineValue)],
        ['Clientes recorrentes', `${kpi.recurring} de ${kpi.totalCusts}`],
      ];
      sectionLabel(doc, 'Indicadores do período', ML, y, c.brand);
      y += 7;
      kpiRows.forEach(([k, v]) => {
        need(7);
        text(doc, { x: ML, y, str: k, size: 9, weight: 'normal', color: c.muted });
        text(doc, { x: MR, y, str: v, size: 9, weight: 'semibold', color: c.ink, align: 'right' });
        y += 6;
      });

      // Ranking técnicos
      if (techRanking.length > 0) {
        y += 5; divider(doc, c, y - 2, ML, MR);
        sectionLabel(doc, 'Ranking de técnicos (receita)', ML, y, c.brand);
        y += 7;
        techRanking.slice(0, 10).forEach((t, i) => {
          need(7);
          text(doc, { x: ML, y, str: `${i + 1}. ${t.name}`, size: 9, weight: 'semibold', color: c.ink, w: CW - 60 });
          text(doc, { x: MR, y, str: `${t.done} OS · ${formatBRL(t.revenue)}`, size: 9, weight: 'normal', color: c.muted, align: 'right' });
          y += 6;
        });
      }

      // Mix de serviços
      if (serviceMix.length > 0) {
        y += 5; divider(doc, c, y - 2, ML, MR);
        sectionLabel(doc, 'Serviços mais lucrativos', ML, y, c.brand);
        y += 7;
        serviceMix.forEach((s) => {
          need(7);
          text(doc, { x: ML, y, str: s.name, size: 9, weight: 'normal', color: c.ink, w: CW - 60 });
          text(doc, { x: MR, y, str: `${s.count}x · ${formatBRL(s.revenue)}`, size: 9, weight: 'semibold', color: c.muted, align: 'right' });
          y += 6;
        });
      }

      // Devedores
      if (debtors.length > 0) {
        y += 5; divider(doc, c, y - 2, ML, MR);
        sectionLabel(doc, 'Contas a receber (maiores saldos)', ML, y, c.brand);
        y += 7;
        debtors.forEach((d) => {
          need(7);
          text(doc, { x: ML, y, str: d.name, size: 9, weight: 'semibold', color: c.ink, w: CW - 60 });
          text(doc, { x: MR, y, str: `${d.count} OS · ${formatBRL(d.total)}`, size: 9, weight: 'normal', color: c.muted, align: 'right' });
          y += 6;
        });
      }

      stampFooters(ctx, company);
      doc.save(`Relatorio-ClimaPro-${todayISO()}.pdf`);
      toast('success', 'Relatório em PDF gerado!');
    } catch (e: any) {
      toast('error', 'Não foi possível gerar o PDF: ' + (e?.message || 'erro'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title="Relatórios gerenciais"
        subtitle={`Inteligência do negócio · ${label}`}
        action={
          <Button size="sm" onClick={exportPDF} disabled={generating}>
            <FileDown size={16} /> {generating ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <Filter size={14} /> Período:
          </span>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${range === r.key ? 'bg-primary-700 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 dark:bg-neutral-700/60 dark:text-neutral-300'}`}
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

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BadgeDollarSign size={20} />} label="Receita concluída" value={formatBRL(kpi.revenue)} color="text-emerald-600" />
        <StatCard icon={<Wallet size={20} />} label="Ticket médio" value={formatBRL(kpi.ticket)} color="text-primary-600" />
        <StatCard icon={<CheckCircle2 size={20} />} label="OS concluídas" value={`${kpi.done.length}/${kpi.valid.length}`} color="text-sky-600" />
        <StatCard icon={<Target size={20} />} label="Conversão orçamentos" value={`${kpi.conversion.toFixed(0)}%`} color="text-violet-600" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Quote size={20} />} label="Pipeline em aberto" value={formatBRL(kpi.pipelineValue)} color="text-amber-600" />
        <StatCard icon={<Clock size={20} />} label="A receber (concluído)" value={formatBRL(kpi.pending)} color="text-orange-600" />
        <StatCard icon={<AlertTriangle size={20} />} label="Cancelamento" value={`${kpi.cancelRate.toFixed(1)}%`} color="text-red-500" />
        <StatCard icon={<Users size={20} />} label="Recorrência" value={`${kpi.recurring}/${kpi.totalCusts}`} color="text-teal-600" />
      </div>

      {/* Evolução da receita */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <TrendingUp size={18} className="text-emerald-600" /> Evolução da receita
          </h2>
          <span className="text-xs text-neutral-400">Valores concluídos</span>
        </div>
        <div className="mt-3 flex h-36 items-end gap-1.5">
          {revenueSeries.map((p, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400">
                {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value > 0 ? String(Math.round(p.value)) : ''}
              </span>
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full rounded-t-md ${i === revenueSeries.length - 1 ? 'bg-emerald-500' : 'bg-primary-300 dark:bg-primary-700'}`}
                  style={{ height: `${Math.max(3, (p.value / maxSeries) * 100)}%` }}
                  title={`${p.label}: ${formatBRL(p.value)}`}
                />
              </div>
              <span className="text-[9px] font-medium text-neutral-400">{p.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Ranking de técnicos */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Trophy size={18} className="text-amber-500" /> Ranking de técnicos
          </h2>
          <p className="text-xs text-neutral-400">Por receita concluída no período</p>
          <div className="mt-3 space-y-3">
            {techRanking.length === 0 && <p className="text-sm text-neutral-400">Sem dados no período.</p>}
            {techRanking.slice(0, 6).map((t, i) => (
              <div key={t.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-neutral-700 dark:text-neutral-200">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-neutral-400' : i === 2 ? 'bg-orange-700' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                      {i + 1}
                    </span>
                    {t.name}
                    <span className="text-xs font-normal text-neutral-400">{t.done} OS · {t.open} aberta(s)</span>
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatBRL(t.revenue)}</span>
                </div>
                <Bar value={t.revenue} max={Math.max(1, ...techRanking.map((x) => x.revenue))} color="bg-gradient-to-r from-amber-400 to-emerald-500" />
              </div>
            ))}
          </div>
        </Card>

        {/* Mix de serviços */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Mix de serviços
          </h2>
          <p className="text-xs text-neutral-400">Onde está o lucro da operação</p>
          <div className="mt-3 space-y-3">
            {serviceMix.length === 0 && <p className="text-sm text-neutral-400">Sem serviços concluídos no período.</p>}
            {serviceMix.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">
                    {s.name} <span className="text-xs text-neutral-400">({s.count}x)</span>
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100">{formatBRL(s.revenue)}</span>
                </div>
                <Bar value={s.revenue} max={maxServiceRevenue} color="bg-gradient-to-r from-primary-500 to-sky-400" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cobrança */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Flame size={18} className="text-danger" /> Cobrança prioritária
          </h2>
          <p className="text-xs text-neutral-400">Maiores saldos em aberto (todas as datas)</p>
          <div className="mt-3 space-y-2">
            {debtors.length === 0 && <p className="text-sm text-neutral-400">Nenhuma conta em aberto. 🎉</p>}
            {debtors.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">{d.name}</div>
                  <div className="text-xs text-neutral-400">{d.count} OS em aberto</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-black text-danger">{formatBRL(d.total)}</span>
                  {d.phone && (
                    <a
                      href={`https://wa.me/${telToWhats(d.phone)}?text=${encodeURIComponent(`Olá, ${d.name}! Aqui é da ${company?.name || 'ClimaPro'}. Passando para lembrar do saldo em aberto de ${formatBRL(d.total)}. Podemos acertar hoje? ❄️`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
                    >
                      Cobrar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Follow-up de orçamentos */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Star size={18} className="text-violet-600" /> Orçamentos pedindo follow-up
          </h2>
          <p className="text-xs text-neutral-400">Propostas paradas que podem virar receita</p>
          <div className="mt-3 space-y-2">
            {staleBudgets.length === 0 && <p className="text-sm text-neutral-400">Nenhum orçamento pendente.</p>}
            {staleBudgets.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
                    {custName(b.customerId)} <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{b.status}</span>
                  </div>
                  <div className="truncate text-xs text-neutral-400">{b.serviceType || b.description || 'Orçamento'}</div>
                </div>
                <span className="shrink-0 text-sm font-black text-primary-700 dark:text-primary-300">{formatBRL(Number(b.total) || 0)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Funil comercial */}
      <Card>
        <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
          <FileText size={18} className="text-sky-600" /> Funil comercial do período
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
    </div>
  );
}
