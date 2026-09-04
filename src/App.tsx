import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/Loading';

const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const ClienteDetail = lazy(() => import('./pages/ClienteDetail'));
const Equipamentos = lazy(() => import('./pages/Equipamentos'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const Servicos = lazy(() => import('./pages/Servicos'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Config = lazy(() => import('./pages/Config'));
const Mais = lazy(() => import('./pages/Mais'));
const Busca = lazy(() => import('./pages/Busca'));
const Empresa = lazy(() => import('./pages/Empresa'));
const NovoCliente = lazy(() => import('./pages/NovoCliente'));
const ClienteOrcamento = lazy(() => import('./pages/ClienteOrcamento'));
const Notificacoes = lazy(() => import('./pages/Notificacoes'));
const CalculadoraBtu = lazy(() => import('./pages/CalculadoraBtu'));
const Diagnostico = lazy(() => import('./pages/Diagnostico'));
const Administrativo = lazy(() => import('./pages/Administrativo'));
const Users = lazy(() => import('./pages/Users'));
const TechRota = lazy(() => import('./pages/TechRota'));
const TechPerformance = lazy(() => import('./pages/TechPerformance'));

const OrcamentoDetail = lazy(() => import('./pages/OrcamentoDetail'));
const NovoOrcamento = lazy(() => import('./pages/NovoOrcamento'));
const ServicoDetail = lazy(() => import('./pages/ServicoDetail'));
const NovaOS = lazy(() => import('./pages/NovaOS'));
const EditarCliente = lazy(() => import('./pages/EditarCliente'));

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
        <Route path="clientes/novo" element={<SuspenseWrap><NovoCliente /></SuspenseWrap>} />
        <Route path="clientes/:id" element={<SuspenseWrap><ClienteDetail /></SuspenseWrap>} />
        <Route path="clientes/:id/editar" element={<SuspenseWrap><EditarCliente /></SuspenseWrap>} />
        <Route path="equipamentos" element={<SuspenseWrap><Equipamentos /></SuspenseWrap>} />
        <Route path="agenda" element={<SuspenseWrap><Agenda /></SuspenseWrap>} />
        <Route path="orcamentos" element={<SuspenseWrap><AdminOnly><Orcamentos /></AdminOnly></SuspenseWrap>} />
        <Route path="orcamentos/novo" element={<SuspenseWrap><AdminOnly><NovoOrcamento /></AdminOnly></SuspenseWrap>} />
        <Route path="orcamentos/:id" element={<SuspenseWrap><AdminOnly><OrcamentoDetail /></AdminOnly></SuspenseWrap>} />
        <Route path="servicos" element={<SuspenseWrap><Servicos /></SuspenseWrap>} />
        <Route path="servicos/:id" element={<SuspenseWrap><ServicoDetail /></SuspenseWrap>} />
        <Route path="servicos/novo" element={<SuspenseWrap><NovaOS /></SuspenseWrap>} />
        <Route path="financeiro" element={<SuspenseWrap><AdminOnly><Financeiro /></AdminOnly></SuspenseWrap>} />
        <Route path="relatorios" element={<SuspenseWrap><AdminOnly><Relatorios /></AdminOnly></SuspenseWrap>} />
        <Route path="perfil" element={<SuspenseWrap><AdminOnly><Perfil /></AdminOnly></SuspenseWrap>} />
        <Route path="config" element={<SuspenseWrap><Config /></SuspenseWrap>} />
        <Route path="mais" element={<SuspenseWrap><Mais /></SuspenseWrap>} />
        <Route path="busca" element={<SuspenseWrap><Busca /></SuspenseWrap>} />
        <Route path="notificacoes" element={<SuspenseWrap><Notificacoes /></SuspenseWrap>} />
        <Route path="calculadora-btu" element={<SuspenseWrap><CalculadoraBtu /></SuspenseWrap>} />
        <Route path="diagnostico" element={<SuspenseWrap><Diagnostico /></SuspenseWrap>} />
        <Route path="administrativo" element={<SuspenseWrap><AdminOnly><Administrativo /></AdminOnly></SuspenseWrap>} />
        <Route path="users" element={<SuspenseWrap><AdminOnly><Users /></AdminOnly></SuspenseWrap>} />
        <Route path="empresa" element={<SuspenseWrap><AdminOnly><Empresa /></AdminOnly></SuspenseWrap>} />
      </Route>
      <Route path="/orcamento/:id" element={<SuspenseWrap><ClienteOrcamento /></SuspenseWrap>} />
      <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    </Routes>
  );
}
