import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  TrendingUp, Users, Target, Wallet, Wrench, ChevronRight, UserRound,
  Siren, Flame, Clock, Quote, BadgeDollarSign, Crosshair, Rocket,
  CalendarCheck, MessageCircle, ArrowUpRight, Gauge, Zap, ShieldCheck,
} from 'lucide-react';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { formatBRL, formatDate, todayISO } from '../lib/utils';
import { calcAdminData, calcFunnel, calcTeam, getMetaMensal, setMetaMensal, parseMetaInput } from '../lib/reports';

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (circ * Math.min(100, Math.max(0, score))) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-xl font-black leading-none">{score}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70">saúde</span>
      </div>
    </div>
  );
}

export default function Administrativo() {
  const navigate = useNavigate();
  const toast = useToast();
  const orders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 1000, order: { column: 'createdAt' } }).then((r) => r.rows), []) || [];
  const budgets = useLiveQuery(() => db.budgets.list({ pageSize: 1000, order: { column: 'createdAt' } }).then((r) => r.rows), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  const company = companies[0];
  const today = todayISO();
  const monthKey = today.slice(0, 7);

  const [meta, setMeta] = useState<number>(() => getMetaMensal());
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaText, setMetaText] = useState(String(meta));

  function saveMeta() {
    const v = parseMetaInput(metaText);
    if (!v) {
      toast('error', 'Informe um valor de meta válido.');
      return;
    }
    setMeta(v);
    setMetaMensal(v);
    setEditingMeta(false);
    toast('success', 'Meta do mês atualizada!');
  }

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const data = useMemo(() => calcAdminData(orders, budgets, monthKey, today), [orders, budgets, monthKey, today]);
  const funnel = useMemo(() => calcFunnel(orders, budgets), [orders, budgets]);
  const team = useMemo(() => calcTeam(orders, today), [orders, today]);

  const alerts = useMemo(() => {
    const list: Array<{ level: 'crit' | 'warn' | 'info'; title: string; desc: string; action: string; to: string }> = [];
    if (data.overdue.length > 0) {
      list.push({
        level: 'crit',
        title: `${data.overdue.length} OS atrasada(s)`,
        desc: `Há serviços com data anterior a hoje parados. Cada dia parado queima a reputação.`,
        action: 'Ver agenda',
        to: '/app/agenda',
      });
    }
    if (data.noTech.length > 0) {
      list.push({
        level: 'crit',
        title: `${data.noTech.length} OS sem técnico`,
        desc: 'Serviços abertos sem responsável definido. Atribua agora para não perder o dia.',
        action: 'Distribuir',
        to: '/app/servicos',
      });
    }
    if (data.stale.length > 0) {
      list.push({
        level: 'warn',
        title: `${formatBRL(data.pipelineValue)} parado em orçamentos`,
        desc: `${data.stale.length} proposta(s) aguardando resposta. Follow-up hoje vira receita.`,
        action: 'Atacar funil',
        to: '/app/orcamentos',
      });
    }
    if (data.toReceive > 0) {
      list.push({
        level: 'warn',
        title: `${formatBRL(data.toReceive)} a receber`,
        desc: 'Dinheiro já trabalhado esperando cobrança. Dispare o WhatsApp de cobrança.',
        action: 'Cobrar agora',
        to: '/app/relatorios',
      });
    }
    if (data.noDate.length > 0) {
      list.push({
        level: 'info',
        title: `${data.noDate.length} OS sem data`,
        desc: 'Serviços no limbo do calendário. Agende para ocupar a semana.',
        action: 'Agendar',
        to: '/app/agenda',
      });
    }
    return list;
  }, [data]);

  const metaPct = meta > 0 ? Math.min(100, Math.round((data.revenueMonth / meta) * 100)) : 0;

  function cobraGeral() {
    const debtors = orders.filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado' && Number(o.value) > 0);
    if (debtors.length === 0) {
      toast('success', 'Nada a cobrar. Caixa limpo!');
      return;
    }
    navigate('/app/relatorios');
    toast('info', `${debtors.length} conta(s) em aberto — use a Cobrança prioritária.`);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      {/* ── Centro de Comando ── */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-primary-950 to-primary-800 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-200">
              <Gauge size={12} /> Centro de comando
            </span>
            <h1 className="mt-2 truncate text-2xl font-black tracking-tight">
              {company?.name || 'Minha empresa'}
            </h1>
            <p className="text-xs text-primary-200">
              {formatDate(today)} · {data.todayList.length} atendimento(s) hoje · {data.open.length} OS em aberto
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate('/app/servicos/novo')}>
                <Rocket size={15} /> Nova OS
              </Button>
              <Button size="sm" variant="secondary" onClick={cobraGeral}>
                <MessageCircle size={15} /> Cobrança
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/app/relatorios')}>
                <ArrowUpRight size={15} /> BI completo
              </Button>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <ScoreRing score={data.score} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-200">
              {data.score >= 80 ? 'Operação saudável' : data.score >= 60 ? 'Atenção necessária' : 'Modo guerra'}
            </span>
          </div>
        </div>

        {/* Meta do mês */}
        <div className="mt-4 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Crosshair size={14} className="text-amber-300" /> Meta de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
            </span>
            {!editingMeta ? (
              <button type="button" onClick={() => { setMetaText(String(meta)); setEditingMeta(true); }} className="font-semibold text-primary-200 hover:text-white hover:underline">
                Ajustar meta ({formatBRL(meta)})
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                <input
                  value={metaText}
                  onChange={(e) => setMetaText(e.target.value)}
                  inputMode="numeric"
                  className="w-24 rounded-lg bg-white/15 px-2 py-1 text-xs font-bold text-white outline-none"
                />
                <button type="button" onClick={saveMeta} className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold">OK</button>
              </span>
            )}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-black">{formatBRL(data.revenueMonth)}</span>
            <span className="text-xs font-bold text-primary-200">{metaPct}% da meta</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all ${metaPct >= 100 ? 'bg-emerald-400' : metaPct >= 60 ? 'bg-amber-300' : 'bg-sky-300'}`}
              style={{ width: `${metaPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-primary-200">
            {data.revenueMonth >= meta
              ? '🔥 Meta batida! Hora de acelerar o próximo nível.'
              : `Faltam ${formatBRL(Math.max(0, meta - data.revenueMonth))} — o funil tem ${formatBRL(data.pipelineValue)} para converter.`}
          </p>
        </div>
      </div>

      {/* ── Alertas inteligentes ── */}
      {alerts.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold text-neutral-800 dark:text-neutral-100">
            <Siren size={18} className="text-danger" /> Exige ação agora
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`rounded-2xl border-l-4 p-3.5 shadow-card ${
                  a.level === 'crit'
                    ? 'border-danger bg-red-50 dark:border-red-400 dark:bg-red-950/30'
                    : a.level === 'warn'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-sky-400 bg-sky-50 dark:bg-sky-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-neutral-900 dark:text-white">{a.title}</div>
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">{a.desc}</p>
                  </div>
                </div>
                <Button size="sm" variant={a.level === 'crit' ? 'danger' : 'secondary'} className="mt-2.5" onClick={() => navigate(a.to)}>
                  {a.action} <ChevronRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pulso financeiro ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BadgeDollarSign size={20} />} label="Receita no mês" value={formatBRL(data.revenueMonth)} color="text-emerald-600" />
        <StatCard icon={<Wallet size={20} />} label="Recebido no mês" value={formatBRL(data.receivedMonth)} color="text-primary-600" />
        <StatCard icon={<Clock size={20} />} label="A receber total" value={formatBRL(data.toReceive)} color="text-orange-600" />
        <StatCard icon={<Quote size={20} />} label="Funil a converter" value={formatBRL(data.pipelineValue)} color="text-violet-600" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Target size={20} />} label="Aprovação orç." value={`${data.approvalRate}%`} color="text-success" bg="bg-green-50 dark:bg-green-900/30" />
        <StatCard icon={<CalendarCheck size={20} />} label="Atendimentos hoje" value={String(data.todayList.length)} color="text-sky-600" />
        <StatCard icon={<Flame size={20} />} label="OS atrasadas" value={String(data.overdue.length)} color="text-danger" />
        <StatCard icon={<TrendingUp size={20} />} label="Ticket médio" value={formatBRL(data.ticket)} />
      </div>

      {/* ── Funil operacional ── */}
      <Card>
        <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
          <Zap size={18} className="text-amber-500" /> Funil da operação
        </h2>
        <p className="text-xs text-neutral-400">Onde cada OS está travada agora</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {funnel.stages.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate('/app/servicos')}
              className="rounded-xl bg-neutral-50 p-2.5 text-center transition hover:bg-primary-50 dark:bg-neutral-900/60 dark:hover:bg-primary-950/40"
            >
              <div className="text-xl font-black text-neutral-800 dark:text-white">{funnel.counts[s.key] || 0}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{s.label}</div>
              <div className="mx-auto mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-600 to-sky-400"
                  style={{ width: `${((funnel.counts[s.key] || 0) / funnel.max) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Time em campo ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-neutral-800 dark:text-neutral-100">
            <UserRound size={18} className="text-primary-600" /> Time em campo
          </h2>
          <button type="button" onClick={() => navigate('/app/users')} className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline">
            <Users size={13} /> Gerenciar equipe <ChevronRight size={13} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {team.length === 0 && (
            <Card><p className="text-sm text-neutral-500">Nenhum serviço vinculado a técnico ainda.</p></Card>
          )}
          {team.map((t) => (
            <Card key={t.name}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 font-black text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-neutral-800 dark:text-neutral-100">{t.name}</div>
                    <div className="text-xs text-neutral-500">
                      {t.today > 0 ? (
                        <span className="font-bold text-sky-600">📍 {t.today} hoje</span>
                      ) : (
                        <span>Eficiência {t.efficiency}%</span>
                      )}
                      {' · '}ticket {formatBRL(t.ticket)}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-black text-primary-700 dark:text-primary-300">{formatBRL(t.revenue)}</div>
                  <div className="text-[10px] text-neutral-400">{t.done}/{t.total} concluídas</div>
                </div>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                <div
                  className={`h-full rounded-full ${t.efficiency >= 70 ? 'bg-emerald-500' : t.efficiency >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${t.efficiency}%` }}
                />
              </div>
              {t.open > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                  <ShieldCheck size={12} className="text-emerald-500" /> {t.open} OS em aberto sob responsabilidade
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* ── Atividade de hoje ── */}
      {data.todayList.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Acontecendo hoje
          </h2>
          <div className="mt-3 space-y-2">
            {data.todayList.slice(0, 5).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => navigate(`/app/servicos/${o.id}`)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 text-left transition hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-800 dark:hover:bg-primary-950/20"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
                    {o.time ? `${o.time} · ` : ''}{custName(o.customerId)}
                  </span>
                  <span className="block truncate text-xs text-neutral-400">{o.service} · {o.technician || 'sem técnico'}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-neutral-400" />
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
