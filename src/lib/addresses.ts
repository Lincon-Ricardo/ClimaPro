import type { Customer, SavedAddress } from '../types';

export type { SavedAddress };

type CustomerWithAddresses = Pick<Customer, 'street' | 'number' | 'complement' | 'district' | 'city' | 'zip'> & {
  savedAddresses?: unknown;
};

export function formatCustomerAddress(c: CustomerWithAddresses | null | undefined): string {
  if (!c) return '';
  return [c.street, c.number, c.complement, c.district, c.city, c.zip]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function getSavedAddresses(customer: CustomerWithAddresses | null | undefined): SavedAddress[] {
  if (!customer) return [];
  const list: SavedAddress[] = [];
  const main = formatCustomerAddress(customer);
  if (main) list.push({ id: 'main', label: 'Principal (cadastro)', address: main });
  const saved = Array.isArray(customer.savedAddresses) ? (customer.savedAddresses as unknown[]) : [];
  saved.forEach((s: unknown, i: number) => {
    const addr = typeof s === 'string' ? s : (s as SavedAddress | null)?.address;
    if (!addr || list.some((l) => l.address === addr)) return;
    list.push({
      id: typeof s === 'string' ? `saved-${i}` : (s as SavedAddress).id || `saved-${i}`,
      label: (typeof s === 'object' && (s as SavedAddress)?.label) || `Endereço ${list.length + 1}`,
      address: addr,
    });
  });
  return list;
}

export function mergeSavedAddress(customer: CustomerWithAddresses | null | undefined, label: string, address: string): SavedAddress[] {
  const current = Array.isArray(customer?.savedAddresses) ? (customer.savedAddresses as unknown[]) : [];
  const clean: SavedAddress[] = current
    .map((s: unknown): SavedAddress =>
      typeof s === 'string' ? { id: `saved-${s}`, label: '', address: s } : (s as SavedAddress)
    )
    .filter((s: SavedAddress) => s?.address && s.address !== address);
  clean.push({ id: `addr-${Date.now()}`, label: label.trim() || `Endereço ${clean.length + 2}`, address });
  return clean;
}
