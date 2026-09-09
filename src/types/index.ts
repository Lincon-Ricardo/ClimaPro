export type ServiceStatus =
  | 'solicitacao'
  | 'orcamento_enviado'
  | 'aguardando_aprovacao'
  | 'agendado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'
  | 'boleto'
  | 'outro';
export type PaymentStatus = 'pendente' | 'pago';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'tech';
  companyName?: string;
  companyId?: string;
  firstName: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  site: string;
  pix: string;
  logo?: string;
  signature?: string;
  paymentCondition?: string;
  executionTerm?: string;
  warranty?: string;
  defaultValidity?: string;
  companyId?: string;
  commissionEnabled?: boolean;
  commissionRate?: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  document: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  zip: string;
  notes: string;
  createdAt: string;
  savedAddresses?: SavedAddress[];
}

export interface Equipment {
  id: string;
  customerId: string;
  brand: string;
  model: string;
  type: string;
  btus: number;
  serial: string;
  installLocation: string;
  installDate: string;
  warranty: string;
  notes: string;
  photos: string[];
}

export interface BudgetItem {
  id: string;
  description: string;
  qty: number;
  unitValue: number;
  total: number;
}

export interface Material {
  id: string;
  name: string;
  unitValue: number;
  createdAt?: string;
}

export interface Budget {
  id: string;
  number: string;
  customerId: string;
  equipmentId?: string;
  companyId?: string;
  serviceType: string;
  description: string;
  items: BudgetItem[];
  labor: number;
  displacement: number;
  discount: number;
  total: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado';
  validity: string;
  notes: string;
  createdAt: string;
  approvedAt?: string;
  customerSignature?: string;
  signatureDate?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ServiceOrder {
  id: string;
  osNumber: string;
  budgetId?: string;
  companyId?: string;
  customerId: string;
  equipmentId?: string;
  problem: string;
  service: string;
  value: number;
  date: string;
  time: string;
  address: string;
  technician: string;
  status: ServiceStatus;
  checklist: ChecklistItem[];
  fotosAntes: string[];
  fotosDurante: string[];
  fotosDepois: string[];
  observacoesTecnicas: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerSignature?: string;
  signatureDate?: string;
  reminderMonths?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  serviceOrderId: string;
  customerId: string;
  value: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  serviceOrderId: string;
  customerId: string;
  date: string;
  time: string;
  title: string;
  serviceType: string;
  address: string;
  value: number;
  status: ServiceStatus;
  notes: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  createdAt: string;
  companyId?: string;
}
