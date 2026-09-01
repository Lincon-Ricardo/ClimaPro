import { useState } from 'react';
import { AlertTriangle, CheckSquare, Lightbulb, ChevronLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { SYMPTOMS } from '../lib/diagnostics';
import { Button } from '../components/Button';

export default function Diagnostico() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const selected = SYMPTOMS.find((s) => s.id === selectedId) || null;

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function reset() {
    setChecked({});
    setSelectedId(null);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Guia de diagnóstico" subtitle="Checklist rápido para os sintomas mais comuns" />

      {!selected && (
        <>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Selecione o sintoma relatado pelo cliente e veja as causas prováveis, o que verificar e como orientar.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SYMPTOMS.map((s) => (
              <Card key={s.id} onClick={() => setSelectedId(s.id)} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl dark:bg-primary-900/40">{s.icon}</div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{s.symptom}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{s.short}</div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div>
          <button onClick={reset} className="mb-4 flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400">
            <ChevronLeft size={16} /> Todos os sintomas
          </button>

          <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">{selected.icon}</div>
              <div>
                <div className="text-lg font-extrabold">{selected.symptom}</div>
                <div className="text-sm text-primary-100">{selected.short}</div>
              </div>
            </div>
          </div>

          <Card className="mt-4">
            <div className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
              <AlertTriangle size={18} className="text-warning" /> Causas prováveis
            </div>
            <ul className="mt-3 space-y-2">
              {selected.causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" /> {c}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
                <CheckSquare size={18} className="text-primary-600" /> Checklist de verificação
              </div>
              <span className="text-xs text-neutral-400">
                {selected.checklist.filter((c) => checked[c]).length}/{selected.checklist.length}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {selected.checklist.map((item) => (
                <label key={item} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={!!checked[item]}
                    onChange={() => toggle(item)}
                    className="h-4 w-4 accent-primary-700"
                  />
                  {item}
                </label>
              ))}
            </div>
          </Card>

          <Card className="mt-3">
            <div className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
              <Lightbulb size={18} className="text-warning" /> Orientações
            </div>
            <ul className="mt-3 space-y-2">
              {selected.fix.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /> {f}
                </li>
              ))}
            </ul>
          </Card>

          {selected.checklist.some((c) => checked[c]) && (
            <Button full className="mt-4" onClick={reset}>Concluir diagnóstico</Button>
          )}
        </div>
      )}
    </div>
  );
}
