import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSubscription } from './hooks/useSubscription';
import { Layout } from './components/Layout';
import { Loading } from './components/Loading';

function lazyRetry<T>(factory: () => Promise<T>, retries = 2): Promise<T> {
  return factory().catch((err: unknown) => {
    const msg = String((err as { message?: string } | null)?.message || '');
    if (retries > 0 && (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Loading chunk'))) {
      return new Promise<T>((resolve, reject) => {
        setTimeout(() => lazyRetry(factory, retries - 1).then(resolve, reject), 800);
      });
    }
    throw err;
  });
}

const Login = lazy(() => lazyRetry(() => import('./pages/Login')));
const ForgotPassword = lazy(() => lazyRetry(() => import('./pages/ForgotPassword')));
const ResetPassword = lazy(() => lazyRetry(() => import('./pages/ResetPassword')));
const Onboarding = lazy(() => lazyRetry(() => import('./pages/Onboarding')));
const TermosPage = lazy(() => lazyRetry(() => import('./pages/Legal').then((m) => ({ default: m.Termos }))));
const PrivacidadePage = lazy(() => lazyRetry(() => import('./pages/Legal').then((m) => ({ default: m.Privacidade }))));
const ReembolsoPage = lazy(() => lazyRetry(() => import('./pages/Legal').then((m) => ({ default: m.Reembolso }))));
const ImportarClientes = lazy(() => lazyRetry(() => import('./pages/ImportarClientes')));
const Dashboard = lazy(() => lazyRetry(() => import('./pages/Dashboard')));
const Clientes = lazy(() => lazyRetry(() => import('./pages/Clientes')));
const ClienteDetail = lazy(() => lazyRetry(() => import('./pages/ClienteDetail')));
const Equipamentos = lazy(() => lazyRetry(() => import('./pages/Equipamentos')));
const Agenda = lazy(() => lazyRetry(() => import('./pages/Agenda')));
const Orcamentos = lazy(() => lazyRetry(() => import('./pages/Orcamentos')));
const Servicos = lazy(() => lazyRetry(() => import('./pages/Servicos')));
const Financeiro = lazy(() => lazyRetry(() => import('./pages/Financeiro')));
const Relatorios = lazy(() => lazyRetry(() => import('./pages/Relatorios')));
const Perfil = lazy(() => lazyRetry(() => import('./pages/Perfil')));
const Config = lazy(() => lazyRetry(() => import('./pages/Config')));
const Mais = lazy(() => lazyRetry(() => import('./pages/Mais')));
const Busca = lazy(() => lazyRetry(() => import('./pages/Busca')));
const Empresa = lazy(() => lazyRetry(() => import('./pages/Empresa')));
const NovoCliente = lazy(() => lazyRetry(() => import('./pages/NovoCliente')));
const ClienteOrcamento = lazy(() => lazyRetry(() => import('./pages/ClienteOrcamento')));
const Notificacoes = lazy(() => lazyRetry(() => import('./pages/Notificacoes')));
const CalculadoraBtu = lazy(() => lazyRetry(() => import('./pages/CalculadoraBtu')));
const Diagnostico = lazy(() => lazyRetry(() => import('./pages/Diagnostico')));
const Administrativo = lazy(() => lazyRetry(() => import('./pages/Administrativo')));
const Gastos = lazy(() => lazyRetry(() => import('./pages/Gastos')));
const Users = lazy(() => lazyRetry(() => import('./pages/Users')));
const TechRota = lazy(() => lazyRetry(() => import('./pages/TechRota')));
const TechPerformance = lazy(() => lazyRetry(() => import('./pages/TechPerformance')));
const SystemHealth = lazy(() => lazyRetry(() => import('./pages/SystemHealth')));
const Planos = lazy(() => lazyRetry(() => import('./pages/Planos')));
const Expirado = lazy(() => lazyRetry(() => import('./pages/Expirado')));

const OrcamentoDetail = lazy(() => lazyRetry(() => import('./pages/OrcamentoDetail')));
const NovoOrcamento = lazy(() => lazyRetry(() => import('./pages/NovoOrcamento')));
const ServicoDetail = lazy(() => lazyRetry(() => import('./pages/ServicoDetail')));
const NovaOS = lazy(() => lazyRetry(() => import('./pages/NovaOS')));
const EditarCliente = lazy(() => lazyRetry(() => import('./pages/EditarCliente')));

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardOrRota() {
  const { user } = useAuth();
  if (user?.role === 'tech') {
    return <Navigate to="/app/rota" replace />;
  }
  return <Dashboard />;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'tech') {
    return <Navigate to="/app/rota" replace />;
  }
  return <>{children}</>;
}

function BillingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { locked } = useSubscription();
  if (loading) return <Loading />;
  // Perfil exempto: dns_wil@yahoo.com.br — liberação permanente
  if (user?.email === 'dns_wil@yahoo.com.br') return <>{children}</>;
  if (locked && user?.role === 'admin') {
    return <Navigate to="/app/expirado" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export { BillingGuard };

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <SuspenseWrap><Login /></SuspenseWrap>} />
      <Route path="/forgot-password" element={user ? <Navigate to="/app" replace /> : <SuspenseWrap><ForgotPassword /></SuspenseWrap>} />
      <Route path="/reset-password" element={<SuspenseWrap><ResetPassword /></SuspenseWrap>} />
      <Route path="/onboarding" element={<SuspenseWrap><Onboarding /></SuspenseWrap>} />
      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<SuspenseWrap><DashboardOrRota /></SuspenseWrap>} />
        <Route path="rota" element={<SuspenseWrap><TechRota /></SuspenseWrap>} />
        <Route path="desempenho" element={<SuspenseWrap><TechPerformance /></SuspenseWrap>} />
        <Route path="clientes" element={<SuspenseWrap><Clientes /></SuspenseWrap>} />
        <Route path="clientes/importar" element={<SuspenseWrap><BillingGuard><AdminOnly><ImportarClientes /></AdminOnly></BillingGuard></SuspenseWrap>} />
        <Route path="clientes/novo" element={<SuspenseWrap><BillingGuard><NovoCliente /></BillingGuard></SuspenseWrap>} />
        <Route path="clientes/:id" element={<SuspenseWrap><ClienteDetail /></SuspenseWrap>} />
        <Route path="clientes/:id/editar" element={<SuspenseWrap><BillingGuard><EditarCliente /></BillingGuard></SuspenseWrap>} />
        <Route path="equipamentos" element={<SuspenseWrap><Equipamentos /></SuspenseWrap>} />
        <Route path="agenda" element={<SuspenseWrap><Agenda /></SuspenseWrap>} />
        <Route path="orcamentos" element={<SuspenseWrap><AdminOnly><Orcamentos /></AdminOnly></SuspenseWrap>} />
        <Route path="orcamentos/novo" element={<SuspenseWrap><AdminOnly><BillingGuard><NovoOrcamento /></BillingGuard></AdminOnly></SuspenseWrap>} />
        <Route path="orcamentos/:id" element={<SuspenseWrap><AdminOnly><OrcamentoDetail /></AdminOnly></SuspenseWrap>} />
        <Route path="servicos" element={<SuspenseWrap><Servicos /></SuspenseWrap>} />
        <Route path="servicos/:id" element={<SuspenseWrap><ServicoDetail /></SuspenseWrap>} />
        <Route path="servicos/novo" element={<SuspenseWrap><BillingGuard><NovaOS /></BillingGuard></SuspenseWrap>} />
        <Route path="financeiro" element={<SuspenseWrap><AdminOnly><Financeiro /></AdminOnly></SuspenseWrap>} />
        <Route path="relatorios" element={<SuspenseWrap><AdminOnly><Relatorios /></AdminOnly></SuspenseWrap>} />
        <Route path="perfil" element={<SuspenseWrap><AdminOnly><Perfil /></AdminOnly></SuspenseWrap>} />
        <Route path="config" element={<SuspenseWrap><Config /></SuspenseWrap>} />
        <Route path="mais" element={<SuspenseWrap><Mais /></SuspenseWrap>} />
        <Route path="busca" element={<SuspenseWrap><Busca /></SuspenseWrap>} />
        <Route path="notificacoes" element={<SuspenseWrap><Notificacoes /></SuspenseWrap>} />
        <Route path="calculadora-btu" element={<SuspenseWrap><CalculadoraBtu /></SuspenseWrap>} />
        <Route path="diagnostico" element={<SuspenseWrap><Diagnostico /></SuspenseWrap>} />
        <Route path="saude" element={<SuspenseWrap><AdminOnly><SystemHealth /></AdminOnly></SuspenseWrap>} />
        <Route path="planos" element={<SuspenseWrap><AdminOnly><Planos /></AdminOnly></SuspenseWrap>} />
        <Route path="expirado" element={<SuspenseWrap><Expirado /></SuspenseWrap>} />
        <Route path="administrativo" element={<SuspenseWrap><AdminOnly><Administrativo /></AdminOnly></SuspenseWrap>} />
<Route path="gastos" element={<SuspenseWrap><Gastos /></SuspenseWrap>} />
        <Route path="users" element={<SuspenseWrap><AdminOnly><Users /></AdminOnly></SuspenseWrap>} />
        <Route path="empresa" element={<SuspenseWrap><AdminOnly><Empresa /></AdminOnly></SuspenseWrap>} />
      </Route>
      <Route path="/orcamento/:id" element={<SuspenseWrap><ClienteOrcamento /></SuspenseWrap>} />
      <Route path="/termos" element={<SuspenseWrap><TermosPage /></SuspenseWrap>} />
      <Route path="/privacidade" element={<SuspenseWrap><PrivacidadePage /></SuspenseWrap>} />
      <Route path="/reembolso" element={<SuspenseWrap><ReembolsoPage /></SuspenseWrap>} />
      <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    </Routes>
  );
}
