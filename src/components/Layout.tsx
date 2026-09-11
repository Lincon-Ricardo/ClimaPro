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
  Sun,
  Moon,
  Navigation,
  Trophy,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { BillingBanner } from './BillingBanner';
import { useSubscription } from '../hooks/useSubscription';
import { isLifetimeSub, isVitalicioUser } from '../lib/lifetime';
import { useTheme } from '../context/ThemeContext';
import { NavItem } from './NavItem';
import type { LucideIcon } from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { generateNotifications } from '../lib/notifications';

interface NavEntry {
  to: string;
  icon: LucideIcon;
  label: string;
}

const ADMIN_SIDEBAR_MAIN: NavEntry[] = [
  { to: '/app', icon: Home, label: 'Início' },
  { to: '/app/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/app/clientes', icon: Users, label: 'Clientes' },
  { to: '/app/orcamentos', icon: Wallet, label: 'Orçamentos' },
];

const ADMIN_MORE: NavEntry[] = [
  { to: '/app/servicos', icon: Wrench, label: 'Serviços' },
  { to: '/app/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { to: '/app/gastos', icon: Wallet, label: 'Gastos' },
  { to: '/app/perdas', icon: TrendingDown, label: 'Perdas' },
  { to: '/app/equipamentos', icon: Snowflake, label: 'Equipamentos' },
  { to: '/app/relatorios', icon: FileText, label: 'Relatórios' },
  { to: '/app/config', icon: Settings, label: 'Configurações' },
  { to: '/app/perfil', icon: Briefcase, label: 'Perfil da empresa' },
];

const ADMIN_BOTTOM: NavEntry[] = [
  ...ADMIN_SIDEBAR_MAIN,
  { to: '/app/mais', icon: MoreHorizontal, label: 'Mais' },
];

function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-[0_10px_24px_-8px_rgba(59,130,246,.8)] ring-1 ring-white/25">
        <Snowflake size={22} strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className={`font-display text-[19px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-primary-900 dark:text-white'}`}>ClimaPro</div>
        <div className={`text-[10px] font-semibold uppercase tracking-[.14em] ${light ? 'text-sky-200/80' : 'text-neutral-400'}`}>Climatização</div>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, logout, online } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { resolved, setTheme } = useTheme();
  const unreadCount = useLiveQuery(
    () => db.notifications.where('read').equals(false).count(),
    []
  ) ?? 0;

  const isTech = user?.role === 'tech';
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const commissionOn = companies[0]?.commissionEnabled !== false;
  const { sub } = useSubscription();
  const lifetime = isLifetimeSub(sub) || isVitalicioUser(user);

  // Navegação do Técnico (Cockpit de Campo) — rótulo muda conforme regra da empresa
  const perfItem: NavEntry = commissionOn
    ? { to: '/app/desempenho', icon: DollarSign, label: 'Comissão' }
    : { to: '/app/desempenho', icon: Trophy, label: 'Desempenho' };
  const techBottomItems: NavEntry[] = [
    { to: '/app/rota', icon: Navigation, label: 'Minha Rota' },
    { to: '/app/servicos', icon: Wrench, label: 'Serviços' },
    { to: '/app/agenda', icon: CalendarDays, label: 'Agenda' },
    perfItem,
    { to: '/app/mais', icon: MoreHorizontal, label: 'Mais' },
  ];

  const techMoreItems: NavEntry[] = [
    { to: '/app/rota', icon: Navigation, label: 'Cockpit de Rota' },
    { to: '/app/desempenho', icon: commissionOn ? DollarSign : Trophy, label: commissionOn ? 'Minhas Comissões' : 'Meu Desempenho' },
    { to: '/app/servicos', icon: Wrench, label: 'Minhas OS' },
    { to: '/app/equipamentos', icon: Snowflake, label: 'Equipamentos' },
    { to: '/app/config', icon: Settings, label: 'Minha Conta' },
  ];

  const currentBottomItems: NavEntry[] = isTech ? techBottomItems : ADMIN_BOTTOM;
  const currentMoreItems: NavEntry[] = isTech ? techMoreItems : ADMIN_MORE;

  useEffect(() => {
    generateNotifications();
  }, []);

  function handleLogout() {
    logout();
    toast('info', 'Você saiu da sua conta.');
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      {!online && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-center text-xs font-black text-white shadow-lg">
          ⚠️ Sem internet — você pode ver, mas mudanças sincronizam ao voltar.
        </div>
      )}
      <div className="hidden lg:flex">
        <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col overflow-hidden bg-gradient-to-b from-[#071f4c] via-[#0b3d91] to-[#0a2a63] text-white shadow-2xl xl:w-64">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="relative px-5 py-6">
            <Logo light />
          </div>
          <nav className="relative flex-1 space-y-1 overflow-y-auto px-3">
            {isTech ? (
              <>
                {techBottomItems.slice(0, 4).map((it) => (
                  <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} light />
                ))}
                <div className="my-3 border-t border-white/15 pt-3 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
                  Ferramentas
                </div>
                {currentMoreItems.map((it) => (
                  <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} light />
                ))}
              </>
            ) : (
              <>
                {ADMIN_SIDEBAR_MAIN.map((it) => (
                  <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} light />
                ))}
                <div className="my-3 border-t border-white/15 pt-3 text-[11px] font-semibold uppercase tracking-wide text-primary-300">
                  Gestão
                </div>
                {ADMIN_MORE.map((it) => (
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
          <div className="relative border-t border-white/15 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-black text-white">
                {(user?.firstName || user?.name || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-white">{user?.name || 'Usuário'}</span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-sky-200/70">
                  {lifetime ? '👑 Pioneiro Vitalício' : user?.role === 'admin' ? 'Dono' : 'Técnico'}
                </span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-sky-100/80 transition hover:bg-white/10 hover:text-white active:scale-[.99]"
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

      <div className="lg:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-gradient-to-r from-[#071f4c] via-[#0b3d91] to-[#123f86] px-4 py-3 text-white shadow-lg">
          <Logo light />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/notificacoes')}
              aria-label="Notificações"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition active:scale-95"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 px-1 text-[10px] font-black text-white shadow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/app/busca')}
              aria-label="Buscar"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition active:scale-95"
            >
              <Search size={18} />
            </button>
            <button
              onClick={() => setTheme(resolved ? 'light' : 'dark')}
              aria-label="Alternar tema"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition active:scale-95"
            >
              {resolved ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-3 pb-28 pt-4 sm:px-4">
          {!isTech && <BillingBanner />}
          <Outlet />
        </main>
        <button
          type="button"
          aria-label="Nova OS"
          onClick={() => navigate('/app/servicos/novo')}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-xl font-black text-white shadow-2xl transition hover:bg-primary-800 active:scale-95 md:bottom-8 md:right-8"
        >
          +
        </button>
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
