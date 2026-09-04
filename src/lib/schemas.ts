import { z } from 'zod';

// Login
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Register/Onboarding
export const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(50, 'Senha deve ter no máximo 50 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Customer
export const customerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp inválido').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  document: z.string().min(11, 'CPF/CNPJ inválido').optional().or(z.literal('')),
  street: z.string().min(3, 'Rua inválida'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  district: z.string().min(2, 'Bairro inválido'),
  city: z.string().min(2, 'Cidade inválida'),
  zip: z.string().min(8, 'CEP inválido').optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// Equipment
export const equipmentSchema = z.object({
  brand: z.string().min(2, 'Marca obrigatória'),
  model: z.string().min(2, 'Modelo obrigatório'),
  type: z.string().min(2, 'Tipo obrigatório'),
  btus: z.number().positive('BTU deve ser positivo'),
  serial: z.string().optional().or(z.literal('')),
  installLocation: z.string().min(2, 'Local de instalação obrigatório'),
  installDate: z.string().min(1, 'Data de instalação obrigatória'),
  warranty: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;

// Budget
export const budgetItemSchema = z.object({
  description: z.string().min(3, 'Descrição obrigatória'),
  qty: z.number().positive('Quantidade deve ser positiva'),
  unitValue: z.number().nonnegative('Valor não pode ser negativo'),
  total: z.number().nonnegative('Total não pode ser negativo'),
});

export const budgetSchema = z.object({
  customerId: z.string().min(1, 'Cliente obrigatório'),
  equipmentId: z.string().optional(),
  serviceType: z.string().min(3, 'Tipo de serviço obrigatório'),
  description: z.string().optional().or(z.literal('')),
  items: z.array(budgetItemSchema).min(1, 'Adicione pelo menos um item'),
  labor: z.number().nonnegative('Mão de obra não pode ser negativa'),
  displacement: z.number().nonnegative('Deslocamento não pode ser negativo'),
  discount: z.number().nonnegative('Desconto não pode ser negativo'),
  validity: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

// Company
export const companySchema = z.object({
  name: z.string().min(3, 'Nome da empresa obrigatório'),
  cnpj: z.string().min(14, 'CNPJ inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone inválido'),
  whatsapp: z.string().min(10, 'WhatsApp inválido').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido'),
  address: z.string().min(5, 'Endereço obrigatório'),
  instagram: z.string().optional().or(z.literal('')),
  site: z.string().url('Site deve ser uma URL válida').optional().or(z.literal('')),
  pix: z.string().optional().or(z.literal('')),
});

export type CompanyInput = z.infer<typeof companySchema>;

// Validation helper
export function parseFormData<T>(schema: z.Schema<T>, data: unknown): { valid: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((err) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
    return { valid: false, errors };
  }
  return { valid: true, data: result.data };
}
