import { supabase } from './supabaseClient';
import type { Budget, Company, Customer } from '../types';

export interface PublicBudgetData {
  budget: Budget;
  customer: Customer | null;
  company: Company | null;
}

const EMPTY_CUSTOMER: Customer = {
  id: '', name: '', phone: '', whatsapp: '', email: '', document: '',
  street: '', number: '', complement: '', district: '', city: '', zip: '',
  notes: '', createdAt: '',
};

interface RpcBudget { id: string; number?: string; customer_id?: string; equipment_id?: string; service_type?: string; description?: string; items?: unknown; labor?: unknown; displacement?: unknown; discount?: unknown; total?: unknown; status?: Budget['status']; validity?: string; notes?: string; created_at?: string; approved_at?: string }
interface RpcCustomer { id: string; name?: string; phone?: string; whatsapp?: string; street?: string; number?: string; city?: string; created_at?: string }
interface RpcCompany { id: string; name?: string; cnpj?: string; phone?: string; whatsapp?: string; email?: string; address?: string; instagram?: string; site?: string; pix?: string; logo?: string; signature?: string; payment_condition?: string; execution_term?: string; warranty?: string; default_validity?: string }
interface RpcPublicBudget { found?: boolean; budget?: RpcBudget; customer?: RpcCustomer | null; company?: RpcCompany | null }

export async function fetchPublicBudget(id: string): Promise<PublicBudgetData | null> {
  const { data, error } = await supabase.rpc('get_public_budget', { p_id: id });
  const raw = (data || {}) as RpcPublicBudget;
  if (error || !raw.found) return null;
  const b = raw.budget || ({} as RpcBudget);
  const c = raw.customer || null;
  const co = raw.company || null;
  return {
    budget: {
      id: b.id,
      number: b.number || '',
      customerId: b.customer_id || '',
      equipmentId: b.equipment_id,
      serviceType: b.service_type || '',
      description: b.description || '',
      items: Array.isArray(b.items) ? b.items : [],
      labor: Number(b.labor) || 0,
      displacement: Number(b.displacement) || 0,
      discount: Number(b.discount) || 0,
      total: Number(b.total) || 0,
      status: b.status || 'rascunho',
      validity: b.validity || '',
      notes: b.notes || '',
      createdAt: b.created_at || '',
      approvedAt: b.approved_at,
    },
    customer: c
      ? {
          id: c.id, name: c.name || '', phone: c.phone || '', whatsapp: c.whatsapp || '',
          email: '', document: '', street: c.street || '', number: c.number || '',
          complement: '', district: '', city: c.city || '', zip: '', notes: '',
          createdAt: c.created_at || '',
        }
      : { ...EMPTY_CUSTOMER },
    company: co
      ? {
          id: co.id, name: co.name || '', cnpj: co.cnpj || '', phone: co.phone || '',
          whatsapp: co.whatsapp || '', email: co.email || '', address: co.address || '',
          instagram: co.instagram || '', site: co.site || '', pix: co.pix || '',
          logo: co.logo || '', signature: co.signature || '',
          paymentCondition: co.payment_condition || '', executionTerm: co.execution_term || '',
          warranty: co.warranty || '', defaultValidity: co.default_validity || '',
        }
      : null,
  };
}

export async function decidePublicBudget(id: string, decision: 'aprovado' | 'recusado') {
  const { data, error } = await supabase.rpc('decide_public_budget', { p_id: id, p_decision: decision });
  if (error) throw error;
  const res = (data || {}) as { ok?: boolean; error?: string; status?: 'aprovado' | 'recusado' };
  if (!res.ok) throw new Error(res.error || 'Não foi possível registrar.');
  return res.status as 'aprovado' | 'recusado';
}
