import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { supabase } from '../lib/supabaseClient';
import { AuthLayout } from '../components/AuthLayout';

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const hash = window.location.hash;
      if (!hash.includes('type=recovery')) {
        setError('Link de recuperação inválido ou expirado');
        setCheckingToken(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) setError('Link de recuperação expirado. Solicite um novo e-mail.');
      setCheckingToken(false);
    };
    checkToken();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('Digite uma nova senha'); return; }
    if (password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) setError(err.message || 'Erro ao atualizar senha');
      else {
        setSuccess(true);
        toast('success', 'Senha atualizada com sucesso!');
      }
    } catch {
      setError('Erro ao processar sua solicitação');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate('/login'), 2000);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  if (checkingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071f4c]">
        <Spinner />
      </div>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Senha atualizada! ✅" subtitle="Você será redirecionado ao login.">
        <div className="cp-card rounded-[28px] p-6 text-center sm:p-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
            <CheckCircle2 size={30} />
          </div>
          <p className="mt-4 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Sua senha foi redefinida com sucesso.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova senha 🔑" subtitle="Escolha uma senha forte para sua conta.">
      <form onSubmit={handleSubmit} className="cp-card rounded-[28px] p-6 sm:p-7">
        <button type="button" onClick={() => navigate('/login')} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-600 hover:underline dark:text-primary-300">
          <ArrowLeft size={16} /> Voltar
        </button>
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
        )}
        <div className="space-y-4">
          <Input label="Nova senha" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <Input label="Confirmar senha" type="password" placeholder="••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
          <Button type="submit" full size="lg" disabled={loading}>
            {loading ? <Spinner /> : <><KeyRound size={17} /> Redefinir senha</>}
          </Button>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-neutral-400">
          <Lock size={12} /> Conexão criptografada de ponta a ponta
        </p>
      </form>
    </AuthLayout>
  );
}
