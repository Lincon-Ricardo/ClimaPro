import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Loading } from './components/Loading';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import ClienteDetail from './pages/ClienteDetail';
import Equipamentos from './pages/Equipamentos';
import Agenda from './pages/Agenda';
import Orcamentos from './pages/Orcamentos';
import Servicos from './pages/Servicos';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Perfil from './pages/Perfil';
import Config from './pages/Config';
import Mais from './pages/Mais';
import Busca from './pages/Busca';
import Empresa from './pages/Empresa';
import NovoCliente from './pages/NovoCliente';
import ClienteOrcamento from './pages/ClienteOrcamento';
import Notificacoes from './pages/Notificacoes';
import CalculadoraBtu from './pages/CalculadoraBtu';
import Diagnostico from './pages/Diagnostico';
import Administrativo from './pages/Administrativo';
import Users from './pages/Users';

const OrcamentoDetail = lazy(() => import('./pages/OrcamentoDetail'));
const NovoOrcamento = lazy(() => import('./pages/NovoOrcamento'));
const ServicoDetail = lazy(() => import('./pages/ServicoDetail'));
const NovaOS = lazy(() => import('./pages/NovaOS'));

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/app" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/novo" element={<NovoCliente />} />
        <Route path="clientes/:id" element={<ClienteDetail />} />
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="orcamentos/novo" element={<SuspenseWrap><NovoOrcamento /></SuspenseWrap>} />
        <Route path="orcamentos/:id" element={<SuspenseWrap><OrcamentoDetail /></SuspenseWrap>} />
        <Route path="servicos" element={<Servicos />} />
        <Route path="servicos/:id" element={<SuspenseWrap><ServicoDetail /></SuspenseWrap>} />
        <Route path="servicos/novo" element={<SuspenseWrap><NovaOS /></SuspenseWrap>} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="config" element={<Config />} />
        <Route path="mais" element={<Mais />} />
        <Route path="busca" element={<Busca />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="calculadora-btu" element={<CalculadoraBtu />} />
        <Route path="diagnostico" element={<Diagnostico />} />
        <Route path="administrativo" element={<Administrativo />} />
        <Route path="users" element={<Users />} />
        <Route path="empresa" element={<Empresa />} />
      </Route>
      <Route path="/orcamento/:id" element={<SuspenseWrap><ClienteOrcamento /></SuspenseWrap>} />
      <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    </Routes>
  );
}
