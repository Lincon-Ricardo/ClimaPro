import { useState } from 'react';
import { Activity, Trash2, Copy, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { getRecentLogs, clearLogs } from '../lib/logger';
import { useToast } from '../components/Toast';
import { isSupabaseConfiguredSync } from '../lib/supabaseClient';

export default function SystemHealth() {
  const toast = useToast();
  const [logs, setLogs] = useState(getRecentLogs());
  const [copied, setCopied] = useState(false);

  function refresh() {
    setLogs(getRecentLogs());
  }

  function handleClear() {
    clearLogs();
    setLogs([]);
    toast('info', 'Logs locais limpos.');
  }

  function handleCopy() {
    const txt = logs.map((l) => `[${l.ts}] ${l.level.toUpperCase()} [${l.scope}] ${l.message} ${l.extra ? JSON.stringify(l.extra) : ''}`).join('\n');
    navigator.clipboard.writeText(txt || 'Sem logs registrados.').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('success', 'Logs copiados! Envie ao suporte.');
    });
  }

  const errors = logs.filter((l) => l.level === 'error').length;
  const warns = logs.filter((l) => l.level === 'warn').length;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Saúde do sistema" subtitle="Diagnóstico técnico para suporte" />

      <div className="grid grid-cols-3 gap-2.5">
        <Card className="p-3 text-center">
          <div className="text-xl font-black text-emerald-600">{isSupabaseConfiguredSync() ? '●' : '○'}</div>
          <div className="text-[11px] font-semibold text-neutral-500">Backend</div>
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
                {l.extra && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[10px] text-neutral-400">{JSON.stringify(l.extra, null, 1).slice(0, 500)}</pre>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
