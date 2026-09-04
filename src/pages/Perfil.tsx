import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  Briefcase, Pencil, Building2, Phone, Mail, Globe, Instagram, Banknote, MapPin, PenLine, Image as ImageIcon,
} from 'lucide-react';
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
        { icon: <Building2 size={16} />, label: 'CNPJ/CPF', value: company.cnpj },
        { icon: <Phone size={16} />, label: 'Telefone', value: company.phone },
        { icon: <Mail size={16} />, label: 'E-mail', value: company.email },
        { icon: <MapPin size={16} />, label: 'Endereço', value: company.address },
        { icon: <Globe size={16} />, label: 'Site', value: company.site },
        { icon: <Instagram size={16} />, label: 'Instagram', value: company.instagram },
        { icon: <Banknote size={16} />, label: 'PIX', value: company.pix },
      ].filter((i) => i.value)
    : [];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Perfil da empresa" subtitle="Dados usados nos orçamentos e documentos" />

      <div className="rounded-3xl bg-gradient-to-r from-primary-800 to-primary-600 p-6 text-white">
        <div className="flex items-center gap-4">
          {company?.logo ? (
            <img src={company.logo} alt="Logo" className="h-16 w-16 rounded-2xl bg-white/10 p-1 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10"><Briefcase size={30} /></div>
          )}
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold">{company?.name || user?.name || 'Minha empresa'}</div>
            <div className="text-sm text-primary-100">{company?.cnpj ? `CNPJ: ${company.cnpj}` : user?.email}</div>
          </div>
        </div>
        <Button variant="light" className="mt-4" onClick={() => navigate('/app/empresa')}>
          <Pencil size={16} /> Editar perfil
        </Button>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 text-base font-bold text-neutral-800 dark:text-neutral-100">Dados da empresa</h2>
        {infos.length === 0 && !(company?.name || company?.email) ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Nenhum dado cadastrado ainda. Clique em <b>Editar perfil</b> para preencher.
          </p>
        ) : (
          <div className="space-y-3">
            {infos.length === 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400"><Building2 size={16} /></span>
                <div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">Empresa</div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{company?.name || '—'}</div>
                </div>
              </div>
            )}
            {infos.map((I, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400">{I.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">{I.label}</div>
                  <div className="truncate font-medium text-neutral-800 dark:text-neutral-100">{I.value}</div>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-700">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400"><ImageIcon size={16} /></span>
                <div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">Logo</div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{company?.logo ? 'Configurada' : '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-700/60 dark:text-neutral-400"><PenLine size={16} /></span>
                <div>
                  <div className="text-xs text-neutral-400 dark:text-neutral-500">Assinatura</div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-100">{company?.signature ? 'Configurada' : '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
