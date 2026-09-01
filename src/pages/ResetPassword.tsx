import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { supabase } from '../lib/supabaseClient';

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
    // Verificar se há um token válido na URL
    const checkToken = async () => {
      const hash = window.location.hash;
      if (!hash.includes('type=recovery')) {
        setError('Link de recuperação inválido ou expirado');
        setCheckingToken(false);
        return;
      }

      // O Supabase automaticamente processa o token do hash
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Link de recuperação expirado. Solicite um novo e-mail.');
      }
      setCheckingToken(false);
    };

    checkToken();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Digite uma nova senha');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: password,
      });

      if (err) {
        setError(err.message || 'Erro ao atualizar senha');
      } else {
        setSuccess(true);
        toast('success', 'Senha atualizada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-800 to-primary-900">
        <Spinner />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-800 to-primary-900">
        <div className="flex items-center justify-center gap-2 pt-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Snowflake size={28} className="text-white" />
          </div>
          <div className="text-2xl font-extrabold text-white">ClimaPro</div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-md flex-1 px-4 pb-10 flex items-center justify-center">
          <div className="rounded-2xl bg-white p-6 shadow-xl w-full dark:bg-neutral-800">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 mx-auto">
              <Lock size={32} className="text-green-600 dark:text-green-300" />
            </div>
            <h1 className="mt-4 text-center text-xl font-extrabold text-neutral-800 dark:text-neutral-100">Senha atualizada!</h1>
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
              Sua senha foi redefinida com sucesso. Você será redirecionado para o login em breve.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <h1 className="text-xl font-extrabold text-neutral-800 dark:text-neutral-100">Redefinir senha</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Digite sua nova senha</p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <Input
                label="Nova senha"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Input
                label="Confirmar senha"
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" full size="lg" disabled={loading}>
              {loading ? <Spinner /> : <>Redefinir senha</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
