import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
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
  Sun,
  Moon,
  Navigation,
  Trophy,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { BillingBanner } from './BillingBanner';
import { useTheme } from '../context/ThemeContext';
import { NavItem } from './NavItem';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { generateNotifications } from '../lib/notifications';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { resolved, setTheme } = useTheme();
  const unreadCount = useLiveQuery(
    () => db.notifications.where('read').equals(false).count(),
    []
  ) ?? 0;

  const isTech = user?.role === 'tech';
  const location = useLocation();
  const { locked } = useSubscription();
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  useEffect(() => {
    if (locked && user?.role === 'admin' && !location.pathname.startsWith('/app/expirado') && !location.pathname.startsWith('/app/planos') && !location.pathname.startsWith('/app/config')) {
      navigate('/app/expirado');
    }
  }, [locked, location.pathname]);
  const commissionOn = (companies[0] as any)?.commissionEnabled !== false;

  // Navegação do Técnico (Cockpit de Campo) — rótulo muda conforme regra da empresa
  const perfItem = commissionOn
    ? { to: '/app/desempenho', icon: DollarSign, label: 'Comissão' }
    : { to: '/app/desempenho', icon: Trophy, label: 'Desempenho' };
  const techBottomItems = [
    { to: '/app/rota', icon: Navigation, label: 'Minha Rota' },
    { to: '/app/servicos', icon: Wrench, label: 'Serviços' },
    { to: '/app/agenda', icon: CalendarDays, label: 'Agenda' },
    perfItem,
    { to: '/app/mais', icon: MoreHorizontal, label: 'Mais' },
  ];

  // Navegação do Dono (Torre de Controle)
  const adminBottomItems = [
    { to: '/app', icon: Home, label: 'Início' },
    { to: '/app/agenda', icon: CalendarDays, label: 'Agenda' },
    { to: '/app/clientes', icon: Users, label: 'Clientes' },
    { to: '/app/orcamentos', icon: Wallet, label: 'Orçamentos' },
    { to: '/app/mais', icon: MoreHorizontal, label: 'Mais' },
  ];

  const currentBottomItems = isTech ? techBottomItems : adminBottomItems;

  const techMoreItems = [
    { to: '/app/rota', icon: Navigation, label: 'Cockpit de Rota' },
    { to: '/app/desempenho', icon: commissionOn ? DollarSign : Trophy, label: commissionOn ? 'Minhas Comissões' : 'Meu Desempenho' },
    { to: '/app/servicos', icon: Wrench, label: 'Minhas OS' },
    { to: '/app/equipamentos', icon: Snowflake, label: 'Equipamentos' },
    { to: '/app/config', icon: Settings, label: 'Minha Conta' },
  ];

  const currentMoreItems = isTech ? techMoreItems : moreItems;

  useEffect(() => {
    generateNotifications();
  }, []);

  function handleLogout() {
    logout();
    toast('info', 'Você saiu da sua conta.');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="hidden md:flex">
        <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-primary-800 text-white xl:w-64">
          <div className="px-5 py-6">
            <Logo light />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {isTech ? (
              <>
                <NavItem to="/app/rota" icon={Navigation} label="Minha Rota" light />
                <NavItem to="/app/servicos" icon={Wrench} label="Minhas OS" light />
                <NavItem to="/app/agenda" icon={CalendarDays} label="Agenda" light />
                <NavItem to="/app/desempenho" icon={commissionOn ? DollarSign : Trophy} label={commissionOn ? 'Minhas Comissões' : 'Meu Desempenho'} light />
                <div className="my-3 border-t border-white/15 pt-3 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
                  Ferramentas
                </div>
                {currentMoreItems.map((it) => (
                  <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} light />
                ))}
              </>
            ) : (
              <>
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
              </>
            )}
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
        <main className="ml-60 flex min-w-0 flex-1 justify-center px-4 py-6 xl:ml-64 xl:px-6">
          <div className="w-full max-w-6xl">
            {!isTech && <BillingBanner />}
            <Outlet />
          </div>
        </main>
      </div>

      <div className="md:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-primary-800 px-4 py-3 text-white">
          <Logo light />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/notificacoes')}
              aria-label="Notificações"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
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
              aria-label="Buscar"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setTheme(resolved ? 'light' : 'dark')}
              aria-label="Alternar tema"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            >
              {resolved ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-3 pb-28 pt-4 sm:px-4">
          {!isTech && <BillingBanner />}
          <Outlet />
        </main>
        {!locked && (
          <button
            type="button"
            aria-label="Nova OS"
            onClick={() => navigate('/app/servicos/novo')}
            className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-xl font-black text-white shadow-2xl transition hover:bg-primary-800 active:scale-95 md:bottom-8 md:right-8"
          >
            +
          </button>
        )}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-700 dark:bg-neutral-900">
          {currentBottomItems.map((it) => (
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
