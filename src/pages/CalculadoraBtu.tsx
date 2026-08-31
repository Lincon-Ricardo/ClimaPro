import { useMemo, useState } from 'react';
import { Snowflake, Home, Users, Sun, Building2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Input } from '../components/Fields';
import { Button } from '../components/Button';

interface Suggestion {
  btus: number;
  label: string;
}

const SIZES: Suggestion[] = [
  { btus: 7000, label: '7.000 BTUs' },
  { btus: 9000, label: '9.000 BTUs' },
  { btus: 12000, label: '12.000 BTUs' },
  { btus: 18000, label: '18.000 BTUs' },
  { btus: 24000, label: '24.000 BTUs' },
  { btus: 30000, label: '30.000 BTUs' },
  { btus: 36000, label: '36.000 BTUs' },
  { btus: 48000, label: '48.000 BTUs' },
  { btus: 60000, label: '60.000 BTUs' },
];

export default function CalculadoraBtu() {
  const [area, setArea] = useState<number>(15);
  const [people, setPeople] = useState<number>(1);
  const [sun, setSun] = useState(false);
  const [commercial, setCommercial] = useState(false);

  const result = useMemo(() => {
    let btus = (area || 0) * 600;
    btus += Math.max(0, (people || 1) - 1) * 600;
    if (sun) btus *= 1.15;
    if (commercial) btus *= 1.4;
    return Math.round(btus);
  }, [area, people, sun, commercial]);

  const suggestion =
    SIZES.find((s) => result <= s.btus) || SIZES[SIZES.length - 1];

  const pct = Math.min(100, Math.round((result / 60000) * 100));

  function reset() {
    setArea(15);
    setPeople(1);
    setSun(false);
    setCommercial(false);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Calculadora de BTUs" subtitle="Descubra a capacidade ideal do aparelho" />

      <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-6 text-white shadow-lg">
        <div className="text-sm text-primary-100">Capacidade recomendada</div>
        <div className="mt-1 text-4xl font-extrabold">
          {result.toLocaleString('pt-BR')} <span className="text-xl font-semibold">BTUs</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold">
          <Snowflake size={15} /> Sugestão: {suggestion.label}
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-300 to-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Home size={16} className="text-primary-600" /> Área do ambiente
          </div>
          <Input
            type="number"
            min={1}
            value={area}
            onChange={(e) => setArea(+e.target.value)}
          />
          <div className="mt-1 text-xs text-neutral-400">m² (largura × comprimento)</div>
        </Card>
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Users size={16} className="text-primary-600" /> Pessoas
          </div>
          <Input
            type="number"
            min={1}
            value={people}
            onChange={(e) => setPeople(+e.target.value)}
          />
          <div className="mt-1 text-xs text-neutral-400">Nº de pessoas no ambiente</div>
        </Card>
      </div>

      <Card className="mt-3 space-y-3">
        <div className="text-sm font-semibold text-neutral-700">Ajustes</div>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-neutral-700">
            <Sun size={16} className="text-warning" /> Incidência de sol forte
          </span>
          <input type="checkbox" checked={sun} onChange={(e) => setSun(e.target.checked)} className="h-5 w-5 accent-primary-700" />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-neutral-700">
            <Building2 size={16} className="text-primary-600" /> Ambiente comercial / público
          </span>
          <input type="checkbox" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} className="h-5 w-5 accent-primary-700" />
        </label>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={reset}><RefreshCw size={16} /> Limpar</Button>
        <div className="rounded-xl bg-primary-50 px-4 py-3 text-center">
          <div className="text-sm text-primary-700">Modelo recomendado</div>
          <div className="text-lg font-extrabold text-primary-800">{suggestion.label}</div>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
        * Cálculo estimado: ±600 BTUs por m², +600 por pessoa extra, +15% para sol forte e +40% para ambientes
        comerciais. Valores de referência — confirme as condições reais da instalação.
      </p>
    </div>
  );
}
