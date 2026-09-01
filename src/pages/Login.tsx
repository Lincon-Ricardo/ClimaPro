import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { useFormValidation } from '../hooks/useFormValidation';
import { loginSchema } from '../lib/schemas';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasError, getError, validate, clearErrors } = useFormValidation(loginSchema);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    clearErrors();

    if (!validate({ email, password })) {
      return;
    }

    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      toast('success', 'Bem-vindo de volta!');
      navigate('/app');
    } else {
      setError(res.error || 'Erro ao entrar.');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-800 to-primary-900">
      <div className="flex items-center justify-center gap-2 pt-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Snowflake size={28} className="text-white" />
        </div>
        <div className="text-2xl font-extrabold text-white">ClimaPro</div>
      </div>
      <p className="mt-1 text-center text-sm text-primary-200">Gestão profissional para climatização</p>

      <div className="mx-auto mt-8 w-full max-w-md flex-1 px-4 pb-10">
        <form onSubmit={handleLogin} className="rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
          <h1 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100">Entrar</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Acesse sua conta para continuar.</p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <Input
                label="E-mail"
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {hasError('email') && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError('email')}</p>}
            </div>
            <div>
              <Input
                label="Senha"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {hasError('password') && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getError('password')}</p>}
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Esqueci minha senha
            </button>
            <Button type="submit" full size="lg" disabled={busy}>
              {busy ? <Spinner /> : <><Lock size={18} /> Entrar</>}
            </Button>
          </div>
        </form>

        <button
          onClick={() => navigate('/onboarding')}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <UserPlus size={18} /> Criar conta nova
        </button>
      </div>
    </div>
  );
}
