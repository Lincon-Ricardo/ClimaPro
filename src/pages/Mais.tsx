import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, TrendingUp, Snowflake, FileText, Briefcase, Settings,
  Users, Bell, MessageCircle, Building2, Calculator, Stethoscope, LayoutDashboard,
} from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { addMonths, formatDate, telToWhats, toISODate } from '../lib/utils';
import { format } from 'date-fns';

export default function Mais() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const unread = useLiveQuery(() => db.notifications.filter((n) => n.read === false).count(), []) ?? 0;

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const dueReminders = orders
    .filter((o) => o.status === 'concluido' && o.reminderMonths)
    .map((o) => {
      const due = addMonths(o.date, o.reminderMonths!);
      return { order: o, due };
    })
    .filter((r) => r.due <= toISODate(new Date()))
    .sort((a, b) => a.due.localeCompare(b.due));

  const sections = [
    { to: '/app/servicos', icon: <Wrench size={20} />, label: 'Serviços', sub: `${orders.length} ordens de serviço` },
    { to: '/app/financeiro', icon: <TrendingUp size={20} />, label: 'Financeiro', sub: 'Receitas e valores' },
    { to: '/app/equipamentos', icon: <Snowflake size={20} />, label: 'Equipamentos', sub: 'Cadastro de aparelhos' },
    { to: '/app/relatorios', icon: <FileText size={20} />, label: 'Relatórios', sub: 'Indicadores do negócio' },
    { to: '/app/notificacoes', icon: <Bell size={20} />, label: 'Notificações', sub: `${unread} não lida(s)` },
  ];

  const account = [
    { to: '/app/perfil', icon: <Briefcase size={20} />, label: 'Perfil da empresa', sub: 'Dados da sua empresa' },
    { to: '/app/empresa', icon: <Building2 size={20} />, label: 'Editar empresa', sub: 'Logo e contatos' },
    { to: '/app/config', icon: <Settings size={20} />, label: 'Configurações', sub: 'Conta e dados' },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Olá, ${user?.firstName}!`} subtitle="Acesse as ferramentas de gestão" />

      {dueReminders.length > 0 && (
        <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/30">
          <div className="flex items-center gap-2 font-bold text-orange-800 dark:text-orange-200"><Bell size={18} /> Manutenção recomendada</div>
          {dueReminders.slice(0, 3).map((r) => (
            <div key={r.order.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="text-orange-700 dark:text-orange-300">
                Está na hora de contactar <b>{custName(r.order.customerId)}</b> ({format(new Date(r.due + 'T00:00:00'), 'dd/MM/yyyy')}).
              </span>
              <Button as="a" href={`https://wa.me/${customers.find((c) => c.id === r.order.customerId) ? telToWhats(customers.find((c) => c.id === r.order.customerId)!.phone) : ''}`} target="_blank" rel="noreferrer" variant="secondary" size="sm"><MessageCircle size={14} /> Contactar</Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.label} onClick={() => navigate(s.to)} className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/60 dark:text-primary-200">{s.icon}</div>
            <div>
              <div className="font-bold text-neutral-800 dark:text-neutral-100">{s.label}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-base font-bold text-neutral-800 dark:text-neutral-100">Ferramentas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card onClick={() => navigate('/app/calculadora-btu')} className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300">
            <Calculator size={20} />
          </div>
          <div>
            <div className="font-bold text-neutral-800 dark:text-neutral-100">Calculadora de BTUs</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Capacidade ideal do aparelho</div>
          </div>
        </Card>
        <Card onClick={() => navigate('/app/diagnostico')} className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="font-bold text-neutral-800 dark:text-neutral-100">Guia de diagnóstico</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Checklist por sintoma relatado</div>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 text-base font-bold text-neutral-800 dark:text-neutral-100">Gestão</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card onClick={() => navigate('/app/administrativo')} className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <div className="font-bold text-neutral-800 dark:text-neutral-100">Painel administrativo</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Visão do dono e desempenho da equipe</div>
          </div>
        </Card>
        <Card onClick={() => navigate('/app/users')} className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
            <Users size={20} />
          </div>
          <div>
            <div className="font-bold text-neutral-800 dark:text-neutral-100">Técnicos</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Gerenciar equipe e acessos</div>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 text-base font-bold text-neutral-800 dark:text-neutral-100">Conta e empresa</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {account.map((s) => (
          <Card key={s.label} onClick={() => navigate(s.to)} className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300">{s.icon}</div>
            <div>
              <div className="font-bold text-neutral-800 dark:text-neutral-100">{s.label}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
