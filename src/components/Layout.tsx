import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Home,
  CalendarDays,
  Users,
  Wallet,
  MoreHorizontal,
  Snowflake,
  LogOut,
  TrendingUp,
  Settings,
  Search,
  Wrench,
  Briefcase,
  FileText,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { NavItem } from './NavItem';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { generateNotifications } from '../lib/notifications';

const bottomItems = [
  { to: '/app', icon: Home, label: 'Início' },
  { to: '/app/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/app/clientes', icon: Users, label: 'Clientes' },
  { to: '/app/orcamentos', icon: Wallet, label: 'Orçamentos' },
  { to: '/app/mais', icon: MoreHorizontal, label: 'Mais' },
];

const moreItems = [
  { to: '/app/servicos', icon: Wrench, label: 'Serviços' },
  { to: '/app/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { to: '/app/equipamentos', icon: Snowflake, label: 'Equipamentos' },
  { to: '/app/relatorios', icon: FileText, label: 'Relatórios' },
  { to: '/app/config', icon: Settings, label: 'Configurações' },
  { to: '/app/perfil', icon: Briefcase, label: 'Perfil da empresa' },
];

function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
        <Snowflake size={22} className="text-white" />
      </div>
      <div className="leading-tight">
        <div className={`text-lg font-extrabold ${light ? 'text-white' : 'text-primary-800'}`}>ClimaPro</div>
        <div className={`text-[10px] ${light ? 'text-primary-200' : 'text-neutral-400'}`}>Gestão em climatização</div>
      </div>
    </div>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const unreadCount = useLiveQuery(
    () => db.notifications.filter((n) => n.read === false).count(),
    []
  ) ?? 0;

  useEffect(() => {
    generateNotifications();
  }, []);

  function handleLogout() {
    logout();
    toast('info', 'Você saiu da sua conta.');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="hidden lg:flex">
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-primary-800 text-white">
          <div className="px-5 py-6">
            <Logo light />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            <NavItem to="/app" icon={Home} label="Início" light />
            <NavItem to="/app/agenda" icon={CalendarDays} label="Agenda" light />
            <NavItem to="/app/clientes" icon={Users} label="Clientes" light />
            <NavItem to="/app/orcamentos" icon={Wallet} label="Orçamentos" light />
            <div className="my-3 border-t border-white/15 pt-3 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
              Gestão
            </div>
            {moreItems.map((it) => (
              <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} light />
            ))}
            <div className="relative">
              <NavItem to="/app/notificacoes" icon={Bell} label="Notificações" light />
              {unreadCount > 0 && (
                <span className="absolute -right-2 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </nav>
          <div className="border-t border-white/15 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary-200 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </aside>
        <main className="ml-64 flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>

      <div className="lg:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-primary-800 px-4 py-3 text-white">
          <Logo light />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/notificacoes')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/app/busca')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"
            >
              <Search size={18} />
            </button>
          </div>
        </header>
        <main className="px-4 pb-24 pt-4">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
          {bottomItems.map((it) => (
            <NavItem
              key={it.to}
              to={it.to}
              icon={it.icon}
              label={it.label}
              mobile
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

export { Logo };
