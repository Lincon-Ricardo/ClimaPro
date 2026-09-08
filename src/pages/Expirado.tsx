import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, Lock, Download, Eye, FileDown, ArrowRight, MessageCircle, RefreshCw } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabaseClient';

export default function Expirado() {
  const navigate = useNavigate();
  const toast = useToast();
  const { osThisMonth, techCount } = useSubscription();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const response = await fetch('/api/billing/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Falha na sincronização.');
      if (body.synced) {
        toast('success', 'Pagamento confirmado! Seu plano foi liberado.');
        window.location.assign('/app');
      } else {
        toast('info', body.message || 'Pagamento ainda pendente no Asaas.');
      }
    } catch (error: any) {
      toast('error', error?.message || 'Não foi possível sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-700 to-sky-500 text-white shadow-xl">
        <Snowflake size={38} />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
          Seu teste grátis terminou ❄️
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          Que bom que você chegou até aqui — você criou <b>{osThisMonth} OS</b> e cadastrou{' '}
          <b>{techCount} técnico(s)</b>. Escolha um plano para continuar gelando sem parar.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-200">
          <Lock size={15} /> Seus dados estão seguros
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-emerald-700 dark:text-emerald-300">
          <li className="flex items-center gap-1.5"><Eye size={13} /> Visualizar tudo continua liberado</li>
          <li className="flex items-center gap-1.5"><FileDown size={13} /> Exportar PDFs e relatórios funciona</li>
          <li className="flex items-center gap-1.5"><Download size={13} /> Nada é apagado — reative quando quiser</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Button full onClick={() => navigate('/app/planos')}>
          Ver planos a partir de R$ 47/mês <ArrowRight size={16} />
        </Button>
        <Button full variant="outline" disabled={syncing} onClick={handleSync}>
          <RefreshCw size={16} /> {syncing ? 'Verificando pagamento...' : 'Já paguei — liberar meu acesso'}
        </Button>
        <Button
          full
          variant="outline"
          onClick={() => window.open('https://wa.me/5511999999999?text=' + encodeURIComponent('Olá! Meu teste do ClimaPro terminou e quero continuar. Pode me ajudar? ❄️'), '_blank')}
        >
          <MessageCircle size={16} /> Falar com vendas
        </Button>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-600 hover:underline"
        >
          Continuar só visualizando
        </button>
      </div>
    </div>
  );
}
