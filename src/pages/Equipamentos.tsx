import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import { Snowflake, Users } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { Button } from '../components/Button';
import { formatDate } from '../lib/utils';
import { useState } from 'react';

export default function Equipamentos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const filtered = equipment.filter((e) =>
    (e.brand + e.model + e.serial + (custName(e.customerId) || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Equipamentos" subtitle={`${equipment.length} equipamentos`} />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por marca, modelo, serial ou cliente..."
        className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Snowflake size={26} />}
          title="Nenhum equipamento encontrado"
          subtitle="Cadastre equipamentos na ficha do cliente."
          action={<Button onClick={() => navigate('/app/clientes')}><Users size={18} /> Ir para clientes</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((eq) => (
            <Card key={eq.id} onClick={() => navigate(`/app/clientes/${eq.customerId}`)}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Snowflake size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-neutral-800">{eq.brand} {eq.model}</div>
                  <div className="text-sm text-neutral-500">{eq.type} · {eq.btus.toLocaleString('pt-BR')} BTUs</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Serial: {eq.serial || '—'} · Local: {eq.installLocation || '—'} · Inst. {formatDate(eq.installDate)}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                    <Users size={12} /> {custName(eq.customerId)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
