# Configuração do Asaas

A integração usa Functions da Vercel. A chave do Asaas nunca deve ficar em `VITE_*`, no frontend ou no GitHub.

## 1. Criar a conta

No Asaas, crie uma conta e use primeiro o ambiente **Sandbox** para testar:

- Gere uma API Key no painel do Asaas.
- Crie um token de autenticação para o webhook.
- O Sandbox usa `https://api-sandbox.asaas.com/v3`.
- Produção usa `https://api.asaas.com/v3`.

## 2. Variáveis na Vercel

No projeto `clima-pro`, em **Settings > Environment Variables**, adicione para `Production` e `Preview`:

```text
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=<chave-do-sandbox>
ASAAS_WEBHOOK_TOKEN=<token-secreto-do-webhook>
SUPABASE_URL=https://cigryksmbtneqysvmuur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-do-supabase>
```

A `SUPABASE_SERVICE_ROLE_KEY` e a `ASAAS_API_KEY` são secretas. Nunca use prefixo `VITE_` nelas.

Para produção, troque `ASAAS_API_URL` e `ASAAS_API_KEY` pelas credenciais de produção.

## 3. Aplicar o banco

Execute o `supabase/schema.sql` atualizado no SQL Editor do Supabase. Ele cria:

- campos de ciclo e webhook em `subscriptions`;
- tabela `billing_events` para evitar eventos duplicados;
- políticas que permitem leitura do plano, mas impedem alteração direta pelo frontend.

## 4. Cadastrar webhook no Asaas

Cadastre esta URL no painel do Asaas:

```text
https://clima-pro-link-3d04.vercel.app/api/billing/webhook
```

Use o mesmo valor de `ASAAS_WEBHOOK_TOKEN` no campo de autenticação do webhook.

Eventos principais:

- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `SUBSCRIPTION_ACTIVATED`
- `SUBSCRIPTION_DELETED`
- `SUBSCRIPTION_INACTIVE`

## Fluxo

1. O administrador escolhe um plano em `/app/planos`.
2. A Vercel valida a sessão e cria a assinatura no Asaas.
3. O cliente é enviado para a primeira cobrança.
4. O Asaas chama o webhook após cada mudança.
5. Somente o webhook altera o status da assinatura no Supabase.
