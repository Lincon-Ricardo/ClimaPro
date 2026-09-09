import { Link } from 'react-router-dom';
import { Snowflake, ArrowLeft } from 'lucide-react';

function Shell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-primary-700 dark:text-primary-300">
            <ArrowLeft size={16} /> Voltar ao login
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-800 text-white">
              <Snowflake size={18} />
            </span>
            <span className="font-extrabold text-neutral-800 dark:text-white">ClimaPro</span>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-card dark:bg-neutral-800 sm:p-8">
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-xs text-neutral-400">Atualizado em {updated}</p>
          <div className="prose-sm mt-5 space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-400">
          ClimaPro · CNPJ 00.000.000/0001-00 · contato@climapro.app · São Paulo/SP
        </p>
      </div>
    </div>
  );
}

export function Termos() {
  return (
    <Shell title="Termos de Uso" updated="09/09/2026">
      <p><b>1. O serviço.</b> O ClimaPro é um sistema de gestão para empresas de climatização: clientes, equipamentos, orçamentos, ordens de serviço, agenda, financeiro e relatórios.</p>
      <p><b>2. Teste grátis.</b> 14 dias grátis no plano Pro, sem cartão. O relógio começa na 1ª OS criada.</p>
      <p><b>3. Planos.</b> Gelo Fino R$47/mês (30 OS, 1 técnico), Clima Ideal R$97/mês (150 OS, 5 técnicos), Tempestade Polar R$197/mês (ilimitado). Anual com 20% de desconto.</p>
      <p><b>4. Pagamento.</b> Via Asaas (PIX, boleto, cartão). Atraso bloqueia criação de OS, mas leitura e PDFs continuam liberados. Nada é apagado.</p>
      <p><b>5. Reembolso.</b> 7 dias após a primeira cobrança, devolvemos 100%, sem perguntas.</p>
      <p><b>6. Seus dados.</b> São seus. Exporte quando quiser e cancele quando quiser em /app/planos.</p>
      <p><b>7. Uso justo.</b> Proibido revender acesso, tentar invadir ou sobrecarregar o serviço.</p>
      <p><b>8. Suporte.</b> WhatsApp em português, resposta em até 1 dia útil.</p>
    </Shell>
  );
}

export function Privacidade() {
  return (
    <Shell title="Política de Privacidade (LGPD)" updated="09/09/2026">
      <p><b>1. O que coletamos.</b> Conta (nome, e-mail), empresa (CNPJ, telefone, endereço) e os dados que você cadastra (clientes, OS, orçamentos). Pagamento é processado pelo Asaas — não guardamos cartão.</p>
      <p><b>2. Para que usamos.</b> Operar o app, cobrar a assinatura, suporte e melhorias. Nunca vendemos dados.</p>
      <p><b>3. Onde fica.</b> Supabase (banco) + Vercel (hospedagem), com criptografia em trânsito e repouso.</p>
      <p><b>4. Seus direitos.</b> Acesso, correção, portabilidade e exclusão: peça em contato@climapro.app. Excluímos em até 15 dias, salvo obrigação fiscal.</p>
      <p><b>5. Cookies.</b> Só sessão e preferência de tema. Sem rastreador de anúncio.</p>
      <p><b>6. Compartilhamento.</b> Asaas (cobrança) e provedores de infra. Nada além do necessário.</p>
      <p><b>7. Menores.</b> Serviço para empresas, não para menores de 18 anos.</p>
    </Shell>
  );
}

export function Reembolso() {
  return (
    <Shell title="Política de Reembolso" updated="09/09/2026">
      <p><b>1. Garantia de 7 dias.</b> Pagou e não gostou em até 7 dias da primeira cobrança? Devolvemos 100%.</p>
      <p><b>2. Como pedir.</b> No app em /app/planos ou em contato@climapro.app com o CNPJ da empresa.</p>
      <p><b>3. Prazo.</b> PIX em até 2 dias úteis, cartão conforme a fatura, boleto em até 10 dias.</p>
      <p><b>4. Depois de 7 dias.</b> Sem reembolso proporcional, mas você mantém até o fim do ciclo e seus dados ficam intactos.</p>
      <p><b>5. Trial.</b> Os 14 dias grátis não cobram nada e não pedem cartão.</p>
    </Shell>
  );
}
