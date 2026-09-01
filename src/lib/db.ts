import { supabase } from './supabaseClient';
import { emitDataChanged } from './tableBus';

/**
 * Camada de dados compatível com a API usada pelas telas (padrão Dexie-like),
 * operando sobre o Supabase. Campos JS (camelCase) <-> colunas (snake_case).
 */

type TableName = 'customers' | 'service_orders' | 'budgets' | 'equipment' | 'companies' | 'notifications' | 'payments' | 'profiles' | 'appointments' | 'materials';

const FIELD_MAP: Record<string, Record<string, string>> = {
  customers: { createdAt: 'created_at' },
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
  companies: {},
  profiles: {},
  appointments: {
    serviceOrderId: 'service_order_id',
    customerId: 'customer_id',
    serviceType: 'service_type',
  },
  materials: {
    unitValue: 'unit_value',
    createdAt: 'created_at',
  },
};

const REV_MAP: Record<string, Record<string, string>> = {};
for (const [t, mp] of Object.entries(FIELD_MAP)) {
  REV_MAP[t] = {};
  for (const [k, v] of Object.entries(mp)) REV_MAP[t][v] = k;
}

function toDB(table: string, obj: Record<string, any>): Record<string, any> {
  const map = FIELD_MAP[table];
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map?.[k] || k] = v;
  }
  return out;
}

function fromDB(table: string, row: Record<string, any>): Record<string, any> {
  const rev = REV_MAP[table] || {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[rev[k] || k] = v;
  }
  return out;
}

function mapRows(table: string, rows: any[]): any[] {
  return rows.map((r) => fromDB(table, r));
}

export interface RowSet {
  toArray(): Promise<any[]>;
  count(): Promise<number>;
  get(key: string): Promise<any | undefined>;
  first(): Promise<any | undefined>;
  single(): Promise<any | undefined>;
}

function queryRows(table: string, filters?: Record<string, any>): RowSet {
  async function run() {
    let q = supabase.from(table).select('*');
    if (filters) for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data } = await q;
    return mapRows(table, (data as any[]) || []);
  }
  return {
    toArray: run,
    count: async () => (await run()).length,
    get: async (key: string) => (await run()).find((r) => r.id === key),
    first: async () => (await run())[0],
    single: async () => (await run())[0],
  };
}

export interface Table {
  toArray(): Promise<any[]>;
  count(): Promise<number>;
  get(key: string): Promise<any | undefined>;
  add(obj: Record<string, any>): Promise<void>;
  bulkAdd(objs: Record<string, any>[]): Promise<void>;
  update(key: string, changes: Record<string, any>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  where(field: string): {
    equals(value: any): RowSet;
    anyOf(value: any[]): RowSet & { toArray(): Promise<any[]> };
  };
  filter(fn: (row: any) => boolean): RowSet;
}

function makeTable(table: string): Table {
  return {
    toArray: () => queryRows(table).toArray(),
    count: () => queryRows(table).count(),
    get: (key: string) => queryRows(table).get(key),
    add: async (obj) => {
      const { error } = await supabase.from(table).insert(toDB(table, obj));
      if (error) throw error;
      emitDataChanged(table);
    },
    bulkAdd: async (objs) => {
      const { error } = await supabase.from(table).insert(objs.map((o) => toDB(table, o)));
      if (error) throw error;
      emitDataChanged(table);
    },
    update: async (key, changes) => {
      const { error } = await supabase.from(table).update(toDB(table, changes)).eq('id', key);
      if (error) throw error;
      emitDataChanged(table);
    },
    delete: async (key) => {
      const { error } = await supabase.from(table).delete().eq('id', key);
      if (error) throw error;
      emitDataChanged(table);
    },
    clear: async () => {
      const { error } = await supabase.from(table).delete().neq('id', '');
      if (error) throw error;
      emitDataChanged(table);
    },
    where: (field) => ({
      equals: (value) => queryRows(table, { [FIELD_MAP[table]?.[field] || field]: value }),
      anyOf: (value) => ({
        ...queryRows(table),
        toArray: async () => {
          const { data } = await supabase
            .from(table)
            .select('*')
            .in(FIELD_MAP[table]?.[field] || field, value);
          return mapRows(table, (data as any[]) || []);
        },
      }),
    }),
    filter: (fn) => {
      const all = queryRows(table);
      return {
        toArray: async () => (await all.toArray()).filter(fn),
        count: async () => (await all.toArray()).filter(fn).length,
        get: async (key: string) => (await all.toArray()).find((r) => r.id === key && fn(r)),
        first: async () => (await all.toArray()).filter(fn)[0],
        single: async () => (await all.toArray()).filter(fn)[0],
      };
    },
  };
}

export const db = {
  customers: makeTable('customers'),
  serviceOrders: makeTable('service_orders'),
  budgets: makeTable('budgets'),
  equipment: makeTable('equipment'),
  companies: makeTable('companies'),
  notifications: makeTable('notifications'),
  payments: makeTable('payments'),
  profiles: makeTable('profiles'),
  users: makeTable('profiles'),
  appointments: makeTable('appointments'),
  materials: makeTable('materials'),
};

export async function seedIfEmpty() {
  return;
}
