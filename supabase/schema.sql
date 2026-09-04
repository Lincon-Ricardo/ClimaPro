-- =============================================================
-- ClimaPro - Schema do banco (rode no SQL Editor do Supabase)
-- Suporte multi-empresa via company_id + Row Level Security
-- =============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ---------- PROFILES (usuários/técnicos) ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  first_name text not null,
  email text default '',
  role text not null default 'admin' check (role in ('admin','tech')),
  company_id uuid not null,
  created_at timestamptz default now()
);
-- Migração para bancos já criados
alter table profiles add column if not exists email text default '';

-- ---------- EMPRESAS ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text default '',
  phone text default '',
  whatsapp text default '',
  email text default '',
  address text default '',
  instagram text default '',
  site text default '',
  pix text default '',
  logo text default '',
  signature text default '',
  payment_condition text default '',
  execution_term text default '',
  warranty text default '',
  default_validity text default '',
  created_at timestamptz default now()
);

-- ---------- CLIENTES ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  name text not null,
  phone text default '',
  whatsapp text default '',
  email text default '',
  document text default '',
  street text default '',
  number text default '',
  complement text default '',
  district text default '',
  city text default '',
  zip text default '',
  notes text default '',
  created_at text default '',
  updated_at timestamptz default now()
);

-- ---------- EQUIPAMENTOS ----------
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  brand text default '',
  model text default '',
  type text default '',
  btus int default 0,
  serial text default '',
  install_location text default '',
  install_date text default '',
  warranty text default '',
  notes text default '',
  photos jsonb default '[]'::jsonb
);

-- ---------- ORÇAMENTOS ----------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  number text default '',
  customer_id uuid references customers on delete cascade,
  equipment_id uuid default null,
  service_type text default '',
  description text default '',
  items jsonb default '[]'::jsonb,
  labor numeric default 0,
  displacement numeric default 0,
  discount numeric default 0,
  total numeric default 0,
  status text default 'rascunho' check (status in ('rascunho','enviado','aprovado','recusado')),
  validity text default '',
  notes text default '',
  created_at text default '',
  approved_at text default null
);

-- ---------- ORDENS DE SERVIÇO ----------
create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  os_number text default '',
  budget_id uuid default null,
  customer_id uuid references customers on delete cascade,
  equipment_id uuid default null,
  problem text default '',
  service text default '',
  value numeric default 0,
  date text default '',
  time text default '',
  address text default '',
  technician text default '',
  status text default 'solicitacao',
  checklist jsonb default '[]'::jsonb,
  fotos_antes jsonb default '[]'::jsonb,
  fotos_durante jsonb default '[]'::jsonb,
  fotos_depois jsonb default '[]'::jsonb,
  observacoes_tecnicas text default '',
  payment_method text default null,
  payment_status text default 'pendente' check (payment_status in ('pendente','pago')),
  customer_signature text default null,
  signature_date text default null,
  reminder_months int default null,
  created_at text default ''
);

-- ---------- PAGAMENTOS ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  service_order_id uuid references service_orders on delete cascade,
  customer_id uuid references customers on delete cascade,
  value numeric default 0,
  method text default '',
  status text default 'pendente' check (status in ('pendente','pago')),
  paid_at text default null,
  created_at text default ''
);

-- ---------- NOTIFICAÇÕES ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  title text default '',
  message text default '',
  type text default 'info' check (type in ('info','success','warning','danger')),
  read boolean default false,
  created_at text default ''
);

-- ---------- MATERIAIS (catálogo para orçamentos) ----------
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  name text not null,
  unit_value numeric default 0,
  created_at text default ''
);

-- ---------- COMPROMISSOS ----------
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies on delete cascade,
  service_order_id uuid default null,
  customer_id uuid references customers on delete cascade,
  date text default '',
  time text default '',
  title text default '',
  service_type text default '',
  address text default '',
  value numeric default 0,
  status text default 'solicitacao',
  notes text default ''
);

-- =============================================================
-- ROW LEVEL SECURITY: cada empresa só enxerga os próprios dados
-- =============================================================

alter table companies enable row level security;
alter table customers enable row level security;
alter table equipment enable row level security;
alter table budgets enable row level security;
alter table service_orders enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table appointments enable row level security;
alter table profiles enable row level security;
alter table materials enable row level security;

-- Função auxiliar: company_id do usuário logado
create or replace function auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Empresas: quem cria tem acesso
drop policy if exists "empresa owner" on companies;
drop policy if exists "empresa owner update" on companies;
drop policy if exists "empresa owner insert" on companies;
create policy "empresa owner" on companies
  for select using (id = auth_company_id());
create policy "empresa owner update" on companies
  for update using (id = auth_company_id()) with check (id = auth_company_id());
-- Insert restrito a autenticados (anti-spam anon). A criação inicial é feita
-- pelo trigger SECURITY DEFINER, que bypassa RLS.
create policy "empresa owner insert" on companies
  for insert with check (auth.uid() is not null);

-- Demais tabelas: somente dados da própria empresa
drop policy if exists "dados empresa" on customers;
drop policy if exists "dados empresa" on equipment;
drop policy if exists "dados empresa" on budgets;
drop policy if exists "dados empresa" on service_orders;
drop policy if exists "dados empresa" on payments;
drop policy if exists "dados empresa" on notifications;
drop policy if exists "dados empresa" on appointments;
drop policy if exists "dados empresa" on materials;
create policy "dados empresa" on customers
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on equipment
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on budgets
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on service_orders
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on payments
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on notifications
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on appointments
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());
create policy "dados empresa" on materials
  for all using (company_id = auth_company_id()) with check (company_id = auth_company_id());

-- Profiles: cada usuário vê apenas o próprio e os da mesma empresa
drop policy if exists "profiles empresa" on profiles;
create policy "profiles empresa" on profiles
  for select using (company_id = auth_company_id());
-- Edição de perfil: próprio usuário ou admin da mesma empresa atualiza nome/função.
-- (Sem policy de update, a tela de Perfil/Users falhava silenciosamente.)
drop policy if exists "profiles update" on profiles;
create policy "profiles update" on profiles
  for update using (
    id = auth.uid()
    or (
      company_id = auth_company_id()
      and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
    )
  ) with check (
    company_id = auth_company_id()
  );
-- Remoção de membro pelo admin da empresa (não remove o auth.users, só o vínculo).
drop policy if exists "profiles delete" on profiles;
create policy "profiles delete" on profiles
  for delete using (
    company_id = auth_company_id()
    and id <> auth.uid()
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'admin')
  );

-- Preenchimento automático de company_id nos inserts (RLS exige)
create or replace function set_company_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.company_id := auth_company_id();
  return new;
end;
$$;

drop trigger if exists trg_set_company_customers on customers;
create trigger trg_set_company_customers before insert on customers for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_equipment on equipment;
create trigger trg_set_company_equipment before insert on equipment for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_budgets on budgets;
create trigger trg_set_company_budgets before insert on budgets for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_service_orders on service_orders;
create trigger trg_set_company_service_orders before insert on service_orders for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_payments on payments;
create trigger trg_set_company_payments before insert on payments for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_notifications on notifications;
create trigger trg_set_company_notifications before insert on notifications for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_appointments on appointments;
create trigger trg_set_company_appointments before insert on appointments for each row execute procedure set_company_id();
drop trigger if exists trg_set_company_materials on materials;
create trigger trg_set_company_materials before insert on materials for each row execute procedure set_company_id();

-- Trigger: ao criar usuário, cria a própria empresa e o perfil admin.
-- Se o signup vier com metadata { company_id, role } (convite feito pelo dono
-- na tela de Usuários), o novo usuário entra na empresa existente em vez de
-- criar outra.
create or replace function create_company_and_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  comp_id uuid;
  disp_name text;
  invited_role text;
begin
  disp_name := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
  disp_name := coalesce(disp_name, split_part(new.email, '@', 1), 'Dono');

  if (new.raw_user_meta_data ? 'company_id')
     and (new.raw_user_meta_data->>'company_id') ~ '^[0-9a-fA-F-]{36}$' then
    comp_id := (new.raw_user_meta_data->>'company_id')::uuid;
    perform 1 from companies where id = comp_id;
    if found then
      invited_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'tech');
      if invited_role not in ('admin', 'tech') then
        invited_role := 'tech';
      end if;
      insert into profiles (id, name, first_name, email, role, company_id)
        values (new.id, disp_name, split_part(disp_name, ' ', 1), new.email, invited_role, comp_id)
        on conflict (id) do update set
          email = excluded.email,
          name = excluded.name,
          first_name = excluded.first_name,
          role = excluded.role,
          company_id = excluded.company_id;
      return new;
    end if;
  end if;

  insert into companies (name, email) values ('Minha Empresa', new.email)
    returning id into comp_id;
  insert into profiles (id, name, first_name, email, role, company_id)
    values (
      new.id,
      disp_name,
      split_part(disp_name, ' ', 1),
      new.email,
      'admin',
      comp_id
    )
    on conflict (id) do update set
      email = excluded.email,
      name = case when profiles.name in ('', 'Dono') then excluded.name else profiles.name end,
      first_name = case when profiles.first_name in ('', 'Dono') then excluded.first_name else profiles.first_name end;
  return new;
end;
$$;

-- Authorization: fire trigger on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_company_and_profile();

-- =============================================================
-- ACESSO PÚBLICO AO ORÇAMENTO (link compartilhado /orcamento/:id)
-- A rota pública não tem login (anon), mas o RLS exige auth.uid().
-- Em vez de abrir SELECT anon nas tabelas (vazaria tudo), expomos
-- 2 RPCs SECURITY DEFINER com grant para anon:
--   get_public_budget(p_id) -> budget + customer + company
--   decide_public_budget(p_id, decision) -> aprova/recusa
-- O UUID é imprevisível, funcionando como token do link.
-- =============================================================
create or replace function get_public_budget(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b budgets%rowtype;
  c customers%rowtype;
  co companies%rowtype;
begin
  select * into b from budgets where id = p_id;
  if not found then
    return jsonb_build_object('found', false);
  end if;
  select * into c from customers where id = b.customer_id;
  select * into co from companies where id = b.company_id;
  return jsonb_build_object(
    'found', true,
    'budget', to_jsonb(b),
    'customer', case when c.id is null then null else to_jsonb(c) end,
    'company', case when co.id is null then null else to_jsonb(co) end
  );
end;
$$;

create or replace function decide_public_budget(p_id uuid, p_decision text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b budgets%rowtype;
  new_status text;
begin
  if p_decision not in ('aprovado', 'recusado') then
    return jsonb_build_object('ok', false, 'error', 'Decisão inválida.');
  end if;
  select * into b from budgets where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Orçamento não encontrado.');
  end if;
  if b.status in ('aprovado', 'recusado') then
    return jsonb_build_object('ok', true, 'status', b.status, 'already', true);
  end if;
  new_status := p_decision;
  update budgets
    set status = new_status,
        approved_at = case when new_status = 'aprovado' then current_date::text else approved_at end
    where id = p_id;
  return jsonb_build_object('ok', true, 'status', new_status, 'already', false);
end;
$$;

grant execute on function get_public_budget(uuid) to anon, authenticated;
grant execute on function decide_public_budget(uuid, text) to anon, authenticated;
