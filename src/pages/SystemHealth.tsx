import { useCallback, useEffect, useState } from 'react';
import { Activity, Trash2, Copy, CheckCircle2, AlertTriangle, Info, RefreshCw, Radio } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { getRecentLogs, clearLogs } from '../lib/logger';
import { getAudit, clearAudit } from '../lib/audit';
import { useToast } from '../components/Toast';
import { runHealthChecks, realtimeResult, type HealthResult } from '../lib/health';
import { subscribeRealtimeStatus } from '../lib/realtime';

const STATE_STYLE: Record<string, string> = {
  ok: 'text-emerald-600',
  warn: 'text-amber-500',
  error: 'text-red-500',
  checking: 'text-sky-500',
};

const STATE_DOT: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-400',
  error: 'bg-red-500',
  checking: 'bg-sky-500 animate-pulse',
};

function FunnelBlock({ tick }: { tick: number }) {
  const [stats, setStats] = useState({ signup: 0, firstOs: 0, checkout: 0, paid: 0, activation: 0, checkoutRate: 0, paidRate: 0, events: [] as any[] });
  useEffect(() => {
    import('../lib/analytics').then((m) => setStats(m.funnelStats() as any));
  }, [tick]);
  const cells = [
    { label: 'Cadastros', value: stats.signup },
    { label: '1ª OS', value: stats.firstOs },
    { label: 'Checkout', value: stats.checkout },
    { label: 'Pagos', value: stats.paid },
    { label: 'Ativação', value: `${stats.activation}%` },
    { label: 'Checkout/OS', value: `${stats.checkoutRate}%` },
    { label: 'Pago/Checkout', value: `${stats.paidRate}%` },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl bg-neutral-50 p-3 text-center dark:bg-neutral-900/60">
            <div className="text-xl font-black text-neutral-900 dark:text-white">{c.value}</div>
            <div className="text-[11px] font-semibold text-neutral-500">{c.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">Meta sênior: ativação ≥60% · checkout/OS ≥25% · pago/checkout ≥70%.</p>
    </div>
  );
}

export default function SystemHealth() {
  const toast = useToast();
  const [logs, setLogs] = useState(getRecentLogs());
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState<HealthResult[]>([]);
  const [checking, setChecking] = useState(true);
  const [funnelTick, setFunnelTick] = useState(0);

  const refresh = useCallback(() => setLogs(getRecentLogs()), []);
  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      setChecks(await runHealthChecks());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
    return subscribeRealtimeStatus((s) => {
      setChecks((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((c) => (c.key === 'realtime' ? realtimeResult(s) : c));
      });
    });
  }, [runChecks]);

  function handleClear() {
    clearLogs();
    clearAudit();
    setLogs([]);
    toast('info', 'Logs locais limpos.');
  }

  function handleCopy() {
    const audit = getAudit();
    const txt = [
      '== HEALTH ==',
      ...checks.map((c) => `${c.label}: ${c.state.toUpperCase()} ${c.ms ? `(${c.ms}ms)` : ''} — ${c.detail}`),
      '== LOGS ==',
      ...logs.map((l) => `[${l.ts}] ${l.level.toUpperCase()} [${l.scope}] ${l.message} ${l.extra ? JSON.stringify(l.extra) : ''}`),
      '== AUDIT ==',
      ...audit.map((a) => `[${a.ts}] ${a.actor} ${a.action} ${a.entity}:${a.entityId} ${a.detail || ''}`),
    ].join('\n');
    navigator.clipboard.writeText(txt || 'Sem logs registrados.').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('success', 'Diagnóstico copiado! Envie ao suporte.');
    }).catch(() => toast('error', 'Não foi possível copiar.'));
  }

  const errors = logs.filter((l) => l.level === 'error').length;
  const warns = logs.filter((l) => l.level === 'warn').length;
  const worst = checks.some((c) => c.state === 'error') ? 'error' : checks.some((c) => c.state === 'warn') ? 'warn' : 'ok';

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-4">
      <PageHeader
        title="Saúde do sistema"
        subtitle="Sincronizado com Supabase, banco, fotos e tempo real"
        action={<Button size="sm" variant="outline" onClick={runChecks} disabled={checking}><RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> {checking ? 'Testando...' : 'Testar agora'}</Button>}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {checks.map((c) => (
          <Card key={c.key} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${STATE_DOT[c.state]}`} />
              {c.key === 'realtime' && <Radio size={13} className="text-neutral-400" />}
            </div>
            <div className={`mt-1 text-sm font-black ${STATE_STYLE[c.state]}`}>
              {c.state === 'ok' ? 'OK' : c.state === 'warn' ? 'Atenção' : c.state === 'error' ? 'Falha' : '...'}
              {c.ms !== undefined && <span className="ml-1 text-[11px] font-semibold text-neutral-400">{c.ms}ms</span>}
            </div>
            <div className="text-[11px] font-semibold text-neutral-500">{c.label}</div>
            <div className="mt-0.5 break-words text-[10px] leading-tight text-neutral-400">{c.detail}</div>
          </Card>
        ))}
        {checks.length === 0 && (
          <Card className="col-span-2 p-3 text-center sm:col-span-4"><p className="text-xs text-neutral-400">Testando conexão...</p></Card>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card className="p-3 text-center">
          <div className={`text-xl font-black ${worst === 'ok' ? 'text-emerald-600' : worst === 'warn' ? 'text-amber-500' : 'text-red-500'}`}>
            {worst === 'ok' ? '●' : worst === 'warn' ? '◐' : '○'}
          </div>
          <div className="text-[11px] font-semibold text-neutral-500">Geral</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-red-500">{errors}</div>
          <div className="text-[11px] font-semibold text-neutral-500">Erros</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-amber-500">{warns}</div>
          <div className="text-[11px] font-semibold text-neutral-500">Avisos</div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Activity size={16} className="text-primary-600" /> Funil de vendas (neste navegador)
          </h2>
          <Button size="sm" variant="outline" onClick={() => setFunnelTick((t) => t + 1)}>Atualizar</Button>
        </div>
        <FunnelBlock tick={funnelTick} />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Activity size={16} className="text-primary-600" /> Últimos eventos
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh}>Atualizar</Button>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">Nenhum evento registrado. O app está saudável. ✅</p>
        ) : (
          <div className="max-h-96 space-y-1.5 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i} className="rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900/60">
                <div className="flex items-center gap-1.5">
                  {l.level === 'error' ? <AlertTriangle size={12} className="shrink-0 text-red-500" /> : l.level === 'warn' ? <AlertTriangle size={12} className="shrink-0 text-amber-500" /> : <Info size={12} className="shrink-0 text-sky-500" />}
                  <span className="font-mono font-bold text-neutral-700 dark:text-neutral-200">[{l.scope}]</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-400">{new Date(l.ts).toLocaleString('pt-BR')}</span>
                </div>
                <p className="mt-0.5 break-words text-neutral-600 dark:text-neutral-300">{l.message}</p>
                {l.extra && <pre className="mt-1 table-scroll whitespace-pre-wrap break-words font-mono text-[10px] text-neutral-400">{JSON.stringify(l.extra, null, 1).slice(0, 500)}</pre>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
