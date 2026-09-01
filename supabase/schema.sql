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
  role text not null default 'admin' check (role in ('admin','tech')),
  company_id uuid not null,
  created_at timestamptz default now()
);

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
create policy "empresa owner" on companies
  for select using (id = auth_company_id());

-- Demais tabelas: somente dados da própria empresa
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
create policy "profiles empresa" on profiles
  for select using (company_id = auth_company_id());

-- Preenchimento automático de company_id nos inserts (RLS exige)
create or replace function set_company_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.company_id := auth_company_id();
  return new;
end;
$$;

create trigger trg_set_company_customers before insert on customers for each row execute procedure set_company_id();
create trigger trg_set_company_equipment before insert on equipment for each row execute procedure set_company_id();
create trigger trg_set_company_budgets before insert on budgets for each row execute procedure set_company_id();
create trigger trg_set_company_service_orders before insert on service_orders for each row execute procedure set_company_id();
create trigger trg_set_company_payments before insert on payments for each row execute procedure set_company_id();
create trigger trg_set_company_notifications before insert on notifications for each row execute procedure set_company_id();
create trigger trg_set_company_appointments before insert on appointments for each row execute procedure set_company_id();
create trigger trg_set_company_materials before insert on materials for each row execute procedure set_company_id();

-- Trigger: ao criar usuário, cria a própria empresa e o perfil admin
create or replace function create_company_and_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  comp_id uuid;
begin
  insert into companies (name, email) values ('Minha Empresa', new.email)
    returning id into comp_id;
  insert into profiles (id, name, first_name, role, company_id)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'Dono', 'admin', comp_id);
  return new;
end;
$$;

-- Authorization: fire trigger on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_company_and_profile();
