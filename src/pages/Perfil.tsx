import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Briefcase, Pencil, Building2, Phone, Mail, Globe, Instagram, Banknote, MapPin } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';

export default function Perfil() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const company = companies[0];

  const infos = company
    ? [
        { icon: <Building2 size={16} />, label: 'Empresa', value: company.name },
        { icon: <Phone size={16} />, label: 'Telefone', value: company.phone },
        { icon: <Mail size={16} />, label: 'E-mail', value: company.email },
        { icon: <MapPin size={16} />, label: 'Endereço', value: company.address },
        { icon: <Globe size={16} />, label: 'Site', value: company.site },
        { icon: <Instagram size={16} />, label: 'Instagram', value: company.instagram },
        { icon: <Banknote size={16} />, label: 'PIX', value: company.pix },
      ]
    : [];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Perfil da empresa" subtitle="Dados usados nos orçamentos e documentos" />
      <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Briefcase size={28} /></div>
          <div>
            <div className="text-lg font-extrabold">{company?.name || 'ClimaPro'}</div>
            <div className="text-sm text-primary-100">{user?.name}</div>
          </div>
        </div>
        <Button className="mt-4 bg-white text-primary-800 hover:bg-primary-50" onClick={() => navigate('/app/empresa')}>
          <Pencil size={16} /> Editar perfil
        </Button>
      </div>
      <Card className="mt-4">
        <h2 className="mb-3 text-base font-bold text-neutral-800 dark:text-neutral-100">Dados da empresa</h2>
        {infos.length === 0 ? (
          <p className="text-sm text-neutral-400">Complete os dados da sua empresa.</p>
        ) : (
          <div className="space-y-3">
            {infos.map((I, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400">{I.icon}</span>
                <div>
                  <div className="text-xs text-neutral-400">{I.label}</div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{I.value || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
