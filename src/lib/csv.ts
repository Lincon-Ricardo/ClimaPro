export interface CustomerRow {
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
}

export const CSV_HEADERS = ['name', 'phone', 'whatsapp', 'email', 'document', 'street', 'number', 'complement', 'district', 'city', 'zip', 'notes'] as const;

export const CSV_EXAMPLE = `name,phone,whatsapp,email,document,street,number,complement,district,city,zip,notes
Maria Silva,(11) 99999-1111,(11) 99999-1111,maria@email.com,123.456.789-00,Rua das Flores,123,,Centro,São Paulo,01001-000,Cliente VIP
João Souza,(11) 98888-2222,(11) 98888-2222,,,Av Paulista,1000,conj 51,Bela Vista,São Paulo,01310-100,`;

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quote = false;
      } else cur += ch;
    } else if (ch === '"') quote = true;
    else if (ch === ';' || ch === ',') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseCustomersCsv(text: string): { rows: CustomerRow[]; errors: string[]; delimiter: string } {
  const errors: string[] = [];
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return { rows: [], errors: ['Arquivo vazio.'], delimiter: ',' };
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['Cabeçalho + ao menos 1 linha. Baixe o modelo.'], delimiter: ',' };
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const header = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  if (!header.includes('name') && !header.includes('nome')) {
    return { rows: [], errors: ['Cabeçalho inválido. Use o modelo (coluna name/nome).'], delimiter };
  }
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    name: idx(['name', 'nome']), phone: idx(['phone', 'telefone', 'tel']), whatsapp: idx(['whatsapp', 'zap']),
    email: idx(['email', 'e-mail']), document: idx(['document', 'documento', 'cpf', 'cnpj', 'cpf/cnpj']),
    street: idx(['street', 'rua', 'endereco', 'endereço']), number: idx(['number', 'numero', 'número', 'nº']),
    complement: idx(['complement', 'complemento']), district: idx(['district', 'bairro']),
    city: idx(['city', 'cidade']), zip: idx(['zip', 'cep']), notes: idx(['notes', 'observacoes', 'observações', 'obs']),
  };
  const rows: CustomerRow[] = [];
  lines.slice(1, 2001).forEach((line, li) => {
    const cells = splitLine(line);
    const get = (i: number) => (i >= 0 ? (cells[i] || '').trim() : '');
    const name = get(col.name);
    if (!name) {
      errors.push(`Linha ${li + 2}: sem nome — pulada.`);
      return;
    }
    rows.push({
      name, phone: get(col.phone), whatsapp: get(col.whatsapp), email: get(col.email),
      document: get(col.document), street: get(col.street), number: get(col.number),
      complement: get(col.complement), district: get(col.district), city: get(col.city),
      zip: get(col.zip), notes: get(col.notes),
    });
  });
  if (lines.length > 2001) errors.push('Limite de 2000 linhas por importação.');
  return { rows, errors, delimiter };
}

export function downloadCsvExample() {
  const blob = new Blob(['\uFEFF' + CSV_EXAMPLE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-clientes-climapro.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
