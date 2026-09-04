import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Sparkles, Thermometer, FlaskConical } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { normalizeTechReport, calculateSuperheat } from '../lib/fieldTools';
import { useToast } from './Toast';

// =========================================================
// Laudo Tecnico por Voz
// Usa Web Speech API (portugues) + normalizacao de termos
// =========================================================

export function VoiceReport({ onApply }: { onApply: (text: string) => void }) {
  const toast = useToast();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [draft, setDraft] = useState('');
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: any) => {
      let finalTxt = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalTxt += r[0].transcript + ' ';
      }
      if (finalTxt) setDraft((d) => (d ? d + ' ' : '') + finalTxt.trim());
    };
    rec.onerror = () => {
      setListening(false);
      toast('error', 'Microfone indisponível. Verifique a permissão do navegador.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* noop */ }
    };
  }, [toast]);

  function toggle() {
    if (!supported) {
      toast('warning', 'Reconhecimento de voz não suportado neste navegador. Use o Chrome no celular.');
      return;
    }
    if (listening) {
      try { recRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
    } else {
      setDraft('');
      try {
        recRef.current?.start();
        setListening(true);
      } catch {
        toast('error', 'Não foi possível iniciar o microfone.');
      }
    }
  }

  function apply() {
    const normalized = normalizeTechReport(draft);
    if (!normalized) {
      toast('error', 'Fale primeiro ou digite o laudo.');
      return;
    }
    onApply(normalized);
    setDraft('');
    toast('success', 'Laudo aplicado às observações técnicas!');
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-800 dark:text-violet-200">
          <Sparkles size={16} /> Laudo por voz
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white shadow-sm transition ${
            listening ? 'animate-pulse bg-danger' : 'bg-violet-700 hover:bg-violet-800'
          }`}
        >
          {listening ? <Square size={13} /> : <Mic size={14} />}
          {listening ? 'Parar' : 'Falar laudo'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-violet-600 dark:text-violet-300">
        Com a mão suja? Fale o serviço executado e o ClimaPro formata o laudo profissional.
      </p>
      {listening && (
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-danger">
          <Loader2 size={13} className="animate-spin" /> Ouvindo... fale agora
        </div>
      )}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ex.: aparelho sem gás, capacitor estourado, feito carga R410A..."
        rows={2}
        className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-violet-900/60 dark:bg-neutral-900"
      />
      {draft.trim() && (
        <Button size="sm" className="mt-2" onClick={apply}>
          Aplicar laudo formatado
        </Button>
      )}
    </div>
  );
}

// =========================================================
// Calculadora Termodinamica (Superaquecimento)
// =========================================================

export function SuperheatCalc({ onApply }: { onApply: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [refrigerant, setRefrigerant] = useState('R410A');
  const [psi, setPsi] = useState('');
  const [lineTemp, setLineTemp] = useState('');

  const res = (() => {
    const p = Number((psi || '').replace(',', '.'));
    const t = Number((lineTemp || '').replace(',', '.'));
    if (!p || isNaN(t)) return null;
    return calculateSuperheat(refrigerant, p, t);
  })();

  function applyToReport() {
    if (!res) return;
    const txt = `Diagnóstico termodinâmico: fluido ${refrigerant}, pressão de sucção ${psi} PSI, temperatura da linha ${lineTemp}°C, temperatura de saturação ${res.satTempC.toFixed(1)}°C, superaquecimento ${res.superheatC.toFixed(1)}K. ${res.message}`;
    onApply(txt);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200"
      >
        <Thermometer size={16} /> Calculadora de carga (superaquecimento)
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Superaquecimento">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Fluido</label>
              <select
                value={refrigerant}
                onChange={(e) => setRefrigerant(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
              >
                <option value="R410A">R410A</option>
                <option value="R22">R22</option>
                <option value="R32">R32</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Sucção (PSI)</label>
              <input
                value={psi}
                inputMode="decimal"
                onChange={(e) => setPsi(e.target.value)}
                placeholder="Ex.: 118"
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Linha (°C)</label>
              <input
                value={lineTemp}
                inputMode="decimal"
                onChange={(e) => setLineTemp(e.target.value)}
                placeholder="Ex.: 4.5"
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
              />
            </div>
          </div>

          {res && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                res.verdictColor === 'green'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : res.verdictColor === 'yellow'
                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                  : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <FlaskConical size={15} />
                SH = {res.superheatC.toFixed(1)}K (sat {res.satTempC.toFixed(1)}°C)
              </div>
              <p className="mt-1 text-xs">{res.message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Fechar</Button>
            <Button full disabled={!res} onClick={applyToReport}>Registrar no laudo</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
