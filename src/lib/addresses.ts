export interface SavedAddress {
  id: string;
  label: string;
  address: string;
}

export function formatCustomerAddress(c: any): string {
  if (!c) return '';
  return [c.street, c.number, c.complement, c.district, c.city, c.zip]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function getSavedAddresses(customer: any): SavedAddress[] {
  if (!customer) return [];
  const list: SavedAddress[] = [];
  const main = formatCustomerAddress(customer);
  if (main) list.push({ id: 'main', label: 'Principal (cadastro)', address: main });
  const saved = Array.isArray(customer.savedAddresses) ? customer.savedAddresses : [];
  saved.forEach((s: any, i: number) => {
    const addr = typeof s === 'string' ? s : s?.address;
    if (!addr || list.some((l) => l.address === addr)) return;
    list.push({
      id: typeof s === 'string' ? `saved-${i}` : s.id || `saved-${i}`,
      label: (typeof s === 'object' && s?.label) || `Endereço ${list.length + 1}`,
      address: addr,
    });
  });
  return list;
}

export function mergeSavedAddress(customer: any, label: string, address: string): any[] {
  const current = Array.isArray(customer?.savedAddresses) ? customer.savedAddresses : [];
  const clean = current
    .map((s: any) =>
      typeof s === 'string' ? { id: `saved-${s}`, label: '', address: s } : s
    )
    .filter((s: any) => s?.address && s.address !== address);
  clean.push({ id: `addr-${Date.now()}`, label: label.trim() || `Endereço ${clean.length + 2}`, address });
  return clean;
}
