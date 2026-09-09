import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserPlus, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { useFormValidation } from '../hooks/useFormValidation';
import { loginSchema } from '../lib/schemas';
import { AuthLayout } from '../components/AuthLayout';

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
    if (!validate({ email, password })) return;
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
    <AuthLayout title="Bem-vindo de volta 👋" subtitle="Acesse e continue gelando sem parar.">
      <form onSubmit={handleLogin} className="cp-card rounded-[28px] p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700 to-sky-500 text-white">
            <Lock size={17} />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-neutral-900 dark:text-white">Entrar</h2>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Acesse sua conta para continuar</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
        )}

        <div className="mt-5 space-y-4">
          <div className="relative">
            <Input label="E-mail" type="email" placeholder="voce@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Mail size={15} className="pointer-events-none absolute right-4 top-[38px] text-neutral-400" />
            {hasError('email') && <p className="mt-1 text-[13px] font-medium text-red-600 dark:text-red-300">{getError('email')}</p>}
          </div>
          <div className="relative">
            <Input label="Senha" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <KeyRound size={15} className="pointer-events-none absolute right-4 top-[38px] text-neutral-400" />
            {hasError('password') && <p className="mt-1 text-[13px] font-medium text-red-600 dark:text-red-300">{getError('password')}</p>}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-[13px] font-bold text-primary-600 hover:underline dark:text-primary-300">
              Esqueci minha senha
            </button>
            <span className="text-[11px] font-semibold text-neutral-400">🔒 Dados protegidos</span>
          </div>
          <Button type="submit" full size="lg" disabled={busy}>
            {busy ? <Spinner /> : <><Lock size={17} /> Entrar no ClimaPro</>}
          </Button>
        </div>
      </form>

      <button
        onClick={() => navigate('/onboarding')}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[.99]"
      >
        <UserPlus size={17} /> Criar conta grátis · 14 dias Pro
      </button>
    </AuthLayout>
  );
}
