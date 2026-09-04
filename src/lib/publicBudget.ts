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

export async function fetchPublicBudget(id: string): Promise<PublicBudgetData | null> {
  const { data, error } = await supabase.rpc('get_public_budget', { p_id: id });
  if (error || !data || !(data as any).found) return null;
  const raw = data as any;
  const b = raw.budget || {};
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
  if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Não foi possível registrar.');
  return (data as any).status as 'aprovado' | 'recusado';
}
