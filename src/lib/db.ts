import { supabase } from './supabaseClient';
import { emitDataChanged } from './tableBus';
import type { Customer, Equipment, Budget, ServiceOrder, Company, Notification, Payment, Appointment, Material, User, Expense, Loss } from '../types';

type DbRow = Record<string, unknown>;
type EntityMap = {
  customers: Customer;
  service_orders: ServiceOrder;
  budgets: Budget;
  equipment: Equipment;
  companies: Company & { commissionEnabled?: boolean; commissionRate?: number };
  notifications: Notification;
  payments: Payment;
  profiles: User & Record<string, unknown>;
  appointments: Appointment;
  materials: Material;
  subscriptions: DbRow;
};

/**
 * Camada de dados compatível com a API usada pelas telas (padrão Dexie-like),
 * operando sobre o Supabase. Campos JS (camelCase) <-> colunas (snake_case).
 */

const FIELD_MAP: Record<string, Record<string, string>> = {
  customers: { createdAt: 'created_at', updatedAt: 'updated_at', savedAddresses: 'saved_addresses' },
  equipment: {
    customerId: 'customer_id',
    installLocation: 'install_location',
    installDate: 'install_date',
  },
  budgets: {
    customerId: 'customer_id',
    equipmentId: 'equipment_id',
    serviceType: 'service_type',
    createdAt: 'created_at',
    approvedAt: 'approved_at',
  },
  service_orders: {
    osNumber: 'os_number',
    budgetId: 'budget_id',
    customerId: 'customer_id',
    equipmentId: 'equipment_id',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    customerSignature: 'customer_signature',
    signatureDate: 'signature_date',
    reminderMonths: 'reminder_months',
    fotosAntes: 'fotos_antes',
    fotosDurante: 'fotos_durante',
    fotosDepois: 'fotos_depois',
    observacoesTecnicas: 'observacoes_tecnicas',
    createdAt: 'created_at',
  },
  notifications: { createdAt: 'created_at' },
  payments: {
    serviceOrderId: 'service_order_id',
    customerId: 'customer_id',
    paidAt: 'paid_at',
    createdAt: 'created_at',
  },
  companies: {
    paymentCondition: 'payment_condition',
    executionTerm: 'execution_term',
    defaultValidity: 'default_validity',
    commissionEnabled: 'commission_enabled',
    commissionRate: 'commission_rate',
    createdAt: 'created_at',
  },
  profiles: { firstName: 'first_name', companyId: 'company_id' },
  appointments: {
    serviceOrderId: 'service_order_id',
    customerId: 'customer_id',
    serviceType: 'service_type',
  },
  materials: {
    unitValue: 'unit_value',
    createdAt: 'created_at',
  },
  expenses: {
    companyId: 'company_id',
    category: 'category',
    description: 'description',
    value: 'value',
    date: 'date',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    notes: 'notes',
    createdAt: 'created_at',
    createdBy: 'created_by',
  },
  losses: {
    companyId: 'company_id',
    serviceOrderId: 'service_order_id',
    customerId: 'customer_id',
    decisionNotes: 'decision_notes',
    asaasPaymentId: 'asaas_payment_id',
    createdBy: 'created_by',
    createdAt: 'created_at',
  },
  subscriptions: {
    companyId: 'company_id',
    trialEndsAt: 'trial_ends_at',
    currentPeriodEnd: 'current_period_end',
    asaasCustomerId: 'asaas_customer_id',
    asaasSubscriptionId: 'asaas_subscription_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

const REV_MAP: Record<string, Record<string, string>> = {};
for (const [t, mp] of Object.entries(FIELD_MAP)) {
  REV_MAP[t] = {};
  for (const [k, v] of Object.entries(mp)) REV_MAP[t][v] = k;
}

function toDB(table: string, obj: Record<string, unknown>): DbRow {
  const map = FIELD_MAP[table];
  const out: DbRow = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map?.[k] || k] = v as unknown;
  }
  return out;
}

function fromDB(table: string, row: DbRow): DbRow {
  const rev = REV_MAP[table] || {};
  const out: DbRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[rev[k] || k] = v;
  }
  return out;
}

function mapRows<T>(table: string, rows: DbRow[]): T[] {
  return rows.map((r) => fromDB(table, r) as unknown as T);
}

export interface RowSet<T> {
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  get(key: string): Promise<T | undefined>;
  first(): Promise<T | undefined>;
  single(): Promise<T | undefined>;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  columns?: string;
  order?: { column: string; ascending?: boolean };
  ilike?: { column: string; term: string };
  orIlike?: { columns: string[]; term: string };
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  notIn?: Record<string, unknown[]>;
  gte?: Record<string, string>;
  lte?: Record<string, string>;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  hasMore: boolean;
}

const PAGE_SIZE = 1000;

const TABLES_WITH_CREATED_AT = new Set([
  'companies', 'customers', 'budgets', 'service_orders', 'payments', 'notifications', 'materials', 'profiles',
  'expenses', 'losses',
]);

const LIGHT_COLUMNS: Record<string, string> = {
  customers: 'id,company_id,name,phone,whatsapp,email,document,street,number,complement,district,city,zip,notes,created_at,updated_at,saved_addresses',
  equipment: 'id,company_id,customer_id,brand,model,type,btus,serial,install_location,install_date,warranty,notes',
  budgets: 'id,company_id,number,customer_id,equipment_id,service_type,description,items,labor,displacement,discount,total,status,validity,notes,created_at,approved_at',
  service_orders: 'id,company_id,os_number,budget_id,customer_id,equipment_id,problem,service,value,date,time,address,technician,status,checklist,payment_method,payment_status,signature_date,reminder_months,created_at',
  companies: 'id,name,cnpj,phone,whatsapp,email,address,instagram,site,pix,payment_condition,execution_term,warranty,default_validity,commission_enabled,commission_rate,created_at',
  notifications: 'id,company_id,title,message,type,read,created_at',
  payments: 'id,company_id,service_order_id,customer_id,value,method,status,paid_at,created_at',
  appointments: 'id,company_id,service_order_id,customer_id,date,time,title,service_type,address,value,status,notes',
  materials: 'id,company_id,name,unit_value,created_at',
  expenses: 'id,company_id,category,description,value,date,payment_method,payment_status,notes,created_at,created_by',
  losses: 'id,company_id,kind,description,value,date,service_order_id,customer_id,technician,status,decision_notes,asaas_payment_id,created_by,created_at',
  profiles: 'id,name,first_name,email,role,company_id,created_at',
};

export const EXPORT_CUSTOMER_COLUMNS = 'name,phone,whatsapp,email,document,street,number,complement,district,city,zip,notes';

export async function getBrandCompany<T>(): Promise<T | undefined> {
  const cols = 'id,name,cnpj,phone,whatsapp,email,address,instagram,site,pix,payment_condition,execution_term,warranty,default_validity,commission_enabled,commission_rate,created_at';
  const { data, error } = await supabase.from('companies').select(cols).limit(1).maybeSingle();
  if (error || !data) return undefined;
  return fromDB('companies', data as DbRow) as unknown as T;
}

export async function getCompanyFull(): Promise<(Company & { logo?: string; signature?: string }) | undefined> {
  const { data, error } = await supabase.from('companies').select('*').limit(1).maybeSingle();
  if (error || !data) return undefined;
  return fromDB('companies', data as DbRow) as unknown as Company & { logo?: string; signature?: string };
}

async function fetchPaged(table: string, build?: (q: unknown) => unknown): Promise<DbRow[]> {
  const out: DbRow[] = [];
  const cols = LIGHT_COLUMNS[table] || '*';
  for (let page = 0; ; page++) {
    let q: unknown = supabase.from(table).select(cols);
    if (TABLES_WITH_CREATED_AT.has(table)) {
      q = (q as { order: (col: string, opts: unknown) => unknown }).order('created_at', { ascending: false, nullsFirst: false });
    }
    q = (q as { range: (a: number, b: number) => unknown }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (build) q = build(q);
    const { data, error } = await (q as { then: unknown } & Promise<{ data: DbRow[] | null; error: { message: string } | null }>);
    if (error) throw error;
    const rows = (data as DbRow[]) || [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

function queryRows<T>(table: string, filters?: Record<string, unknown>): RowSet<T> {
  const build = filters
    ? (q: unknown) => {
        let cur: unknown = q;
        for (const [k, v] of Object.entries(filters)) cur = (cur as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
        return cur;
      }
    : undefined;
  async function run() {
    return mapRows<T>(table, await fetchPaged(table, build));
  }
  return {
    toArray: run,
    count: async () => {
      let q: unknown = supabase.from(table).select('id', { count: 'exact', head: true });
      if (filters) for (const [k, v] of Object.entries(filters)) q = (q as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
      const { count, error } = await (q as Promise<{ count: number | null; error: unknown }>);
      if (error) throw error as Error;
      return count ?? 0;
    },
    get: async (key: string) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', key).maybeSingle();
      if (error) throw error;
      return data ? (fromDB(table, data as DbRow) as unknown as T) : undefined;
    },
    first: async () => {
      let q: unknown = supabase.from(table).select('*').limit(1);
      if (filters) for (const [k, v] of Object.entries(filters)) q = (q as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
      const { data, error } = await (q as { maybeSingle: () => Promise<{ data: DbRow | null; error: unknown }> }).maybeSingle();
      if (error) throw error as Error;
      return data ? (fromDB(table, data as DbRow) as unknown as T) : undefined;
    },
    single: async () => {
      let q: unknown = supabase.from(table).select('*').limit(1);
      if (filters) for (const [k, v] of Object.entries(filters)) q = (q as { eq: (k: string, v: unknown) => unknown }).eq(k, v);
      const { data, error } = await (q as { maybeSingle: () => Promise<{ data: DbRow | null; error: unknown }> }).maybeSingle();
      if (error) throw error as Error;
      return data ? (fromDB(table, data as DbRow) as unknown as T) : undefined;
    },
  };
}

type QueryLike = {
  eq: (c: string, v: unknown) => QueryLike;
  ilike: (c: string, v: string) => QueryLike;
  or: (s: string) => QueryLike;
  in: (c: string, v: unknown[]) => QueryLike;
  gte: (c: string, v: string) => QueryLike;
  lte: (c: string, v: string) => QueryLike;
  order: (c: string, o: unknown) => QueryLike;
  range: (a: number, b: number) => QueryLike;
  limit: (n: number) => QueryLike;
};

export interface Table<T> {
  toArray(): Promise<T[]>;
  count(): Promise<number>;
  get(key: string): Promise<T | undefined>;
  list(params?: ListParams): Promise<ListResult<T>>;
  add(obj: T | DbRow): Promise<void>;
  bulkAdd(objs: Array<T | DbRow>): Promise<void>;
  update(key: string, changes: Partial<T> | DbRow): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  where(field: string): {
    equals(value: unknown): RowSet<T>;
    anyOf(value: unknown[]): RowSet<T> & { toArray(): Promise<T[]> };
  };
  filter(fn: (row: T) => boolean): RowSet<T>;
}

function makeTable<T>(table: string): Table<T> {
  return {
    toArray: () => queryRows<T>(table).toArray(),
    count: () => queryRows<T>(table).count(),
    get: (key: string) => queryRows<T>(table).get(key),
    list: async (params: ListParams = {}) => {
      const { page = 0, pageSize = 25, columns, order, ilike, orIlike, eq, in: inFilter, gte, lte } = params;
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const colOf = (camel: string, fallback: string) => FIELD_MAP[table]?.[camel] || fallback;
      let q = supabase.from(table).select(columns || LIGHT_COLUMNS[table] || '*', { count: 'exact' }) as unknown as QueryLike;
      if (eq) for (const [k, v] of Object.entries(eq)) q = q.eq(colOf(k, k), v);
      if (inFilter) for (const [k, v] of Object.entries(inFilter)) q = q.in(colOf(k, k), v);
      if (gte) for (const [k, v] of Object.entries(gte)) q = q.gte(colOf(k, k), v);
      if (lte) for (const [k, v] of Object.entries(lte)) q = q.lte(colOf(k, k), v);
      if (ilike && ilike.term.trim()) q = q.ilike(colOf(ilike.column, ilike.column), `%${ilike.term.trim()}%`);
      if (orIlike && orIlike.term.trim()) {
        const esc = orIlike.term.trim().replace(/[,()]/g, '');
        q = q.or(orIlike.columns.map((c) => `${colOf(c, c)}.ilike.%${esc}%`).join(','));
      }
      const hasCreatedAt = TABLES_WITH_CREATED_AT.has(table);
      const orderCol = order?.column ? colOf(order.column, order.column) : hasCreatedAt ? 'created_at' : 'id';
      const { data, error, count } = await (q
        .order(orderCol, { ascending: order?.ascending ?? false, nullsFirst: false })
        .range(from, to) as unknown as Promise<{ data: DbRow[] | null; error: { message: string } | null; count: number | null }>);
      if (error) throw error;
      const total = count ?? 0;
      return { rows: mapRows<T>(table, (data as DbRow[]) || []), total, hasMore: from + pageSize < total };
    },
    add: async (obj) => {
      const { error } = await supabase.from(table).insert(toDB(table, obj as Record<string, unknown>));
      if (error) throw error;
      emitDataChanged(table);
    },
    bulkAdd: async (objs) => {
      const { error } = await supabase.from(table).insert(objs.map((o) => toDB(table, o as Record<string, unknown>)));
      if (error) throw error;
      emitDataChanged(table);
    },
    update: async (key, changes) => {
      const { error } = await supabase.from(table).update(toDB(table, changes as Record<string, unknown>)).eq('id', key);
      if (error) throw error;
      emitDataChanged(table);
    },
    delete: async (key) => {
      const { error } = await supabase.from(table).delete().eq('id', key);
      if (error) throw error;
      emitDataChanged(table);
    },
    clear: async () => {
      const { error } = await supabase.from(table).delete().not('id', 'is', null);
      if (error) throw error;
      emitDataChanged(table);
    },
    where: (field) => ({
      equals: (value) => queryRows<T>(table, { [FIELD_MAP[table]?.[field] || field]: value }),
      anyOf: (values: unknown[]) => {
        const base = queryRows<T>(table, undefined);
        const col = FIELD_MAP[table]?.[field] || field;
        return {
          ...base,
          toArray: async () => {
            if (!values.length) return [];
            return mapRows<T>(
              table,
              await fetchPaged(table, (q: unknown) => (q as { in: (c: string, v: unknown[]) => unknown }).in(col, values as unknown[])),
            );
          },
          count: async () => {
            if (!values.length) return 0;
            const { count, error } = await supabase
              .from(table)
              .select('id', { count: 'exact', head: true })
              .in(col, values as unknown[]);
            if (error) throw error;
            return count ?? 0;
          },
        };
      },
    }),
    filter: (fn) => {
      const all = queryRows<T>(table);
      return {
        toArray: async () => (await all.toArray()).filter(fn),
        count: async () => (await all.toArray()).filter(fn).length,
        get: async (key: string) => {
          const row = await all.get(key).catch(() => undefined);
          return row && fn(row) ? row : undefined;
        },
        first: async () => (await all.toArray()).filter(fn)[0],
        single: async () => (await all.toArray()).filter(fn)[0],
      };
    },
  };
}

export const db = {
  customers: makeTable<Customer>('customers'),
  serviceOrders: makeTable<ServiceOrder>('service_orders'),
  budgets: makeTable<Budget>('budgets'),
  equipment: makeTable<Equipment>('equipment'),
  companies: makeTable<Company & { commissionEnabled?: boolean; commissionRate?: number }>('companies'),
  notifications: makeTable<Notification>('notifications'),
  payments: makeTable<Payment>('payments'),
  profiles: makeTable<EntityMap['profiles']>('profiles'),
  users: makeTable<EntityMap['profiles']>('profiles'),
  appointments: makeTable<Appointment>('appointments'),
  materials: makeTable<Material>('materials'),
  expenses: makeTable<Expense>('expenses'),
  losses: makeTable<Loss>('losses'),
  subscriptions: makeTable<DbRow>('subscriptions'),
};

export async function seedIfEmpty() {
  return;
}
