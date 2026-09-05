// =========================================================
// Ferramentas inteligentes de campo para o Técnico
// =========================================================

export const REFRIGERANT_SATURATION_TABLES: Record<string, Array<{ pressurePsi: number; satTempC: number }>> = {
  R410A: [
    { pressurePsi: 80, satTempC: -15.5 },
    { pressurePsi: 90, satTempC: -11.6 },
    { pressurePsi: 100, satTempC: -8.2 },
    { pressurePsi: 110, satTempC: -5.1 },
    { pressurePsi: 118, satTempC: -2.8 },
    { pressurePsi: 120, satTempC: -2.2 },
    { pressurePsi: 125, satTempC: -0.9 },
    { pressurePsi: 130, satTempC: 0.3 },
    { pressurePsi: 135, satTempC: 1.5 },
    { pressurePsi: 140, satTempC: 2.7 },
    { pressurePsi: 150, satTempC: 4.9 },
    { pressurePsi: 160, satTempC: 7 },
    { pressurePsi: 180, satTempC: 10.9 },
    { pressurePsi: 200, satTempC: 14.4 },
    { pressurePsi: 220, satTempC: 17.6 },
    { pressurePsi: 250, satTempC: 21.9 },
    { pressurePsi: 300, satTempC: 28.3 },
    { pressurePsi: 350, satTempC: 33.8 },
    { pressurePsi: 400, satTempC: 38.6 },
  ],
  R22: [
    { pressurePsi: 50, satTempC: -12.2 },
    { pressurePsi: 55, satTempC: -9 },
    { pressurePsi: 60, satTempC: -6.1 },
    { pressurePsi: 65, satTempC: -3.4 },
    { pressurePsi: 68, satTempC: -1.9 },
    { pressurePsi: 70, satTempC: -1 },
    { pressurePsi: 75, satTempC: 1.3 },
    { pressurePsi: 80, satTempC: 3.5 },
    { pressurePsi: 90, satTempC: 7.5 },
    { pressurePsi: 100, satTempC: 11.1 },
    { pressurePsi: 120, satTempC: 17.5 },
    { pressurePsi: 150, satTempC: 25.5 },
    { pressurePsi: 200, satTempC: 36.1 },
    { pressurePsi: 250, satTempC: 44.6 },
  ],
  R32: [
    { pressurePsi: 90, satTempC: -11.2 },
    { pressurePsi: 110, satTempC: -4.8 },
    { pressurePsi: 120, satTempC: -2.1 },
    { pressurePsi: 128, satTempC: 0.1 },
    { pressurePsi: 140, satTempC: 3 },
    { pressurePsi: 160, satTempC: 7.4 },
    { pressurePsi: 180, satTempC: 11.4 },
    { pressurePsi: 220, satTempC: 18.3 },
    { pressurePsi: 300, satTempC: 29.2 },
    { pressurePsi: 400, satTempC: 39.7 },
  ],
};

export function getSaturationTemp(refrigerant: string, pressurePsi: number): number | null {
  const table = REFRIGERANT_SATURATION_TABLES[refrigerant];
  if (!table || table.length === 0) return null;

  if (pressurePsi <= table[0].pressurePsi) return table[0].satTempC;
  for (let i = table.length - 1; i >= 0; i--) {
    if (pressurePsi >= table[i].pressurePsi) return table[i].satTempC;
  }
  // Interpolacao entre dois pontos
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (pressurePsi >= a.pressurePsi && pressurePsi <= b.pressurePsi) {
      const ratio = (pressurePsi - a.pressurePsi) / (b.pressurePsi - a.pressurePsi);
      return a.satTempC + ratio * (b.satTempC - a.satTempC);
    }
  }
  return null;
}

export interface SuperheatResult {
  satTempC: number;
  superheatC: number;
  status: 'ideal' | 'low' | 'high' | 'critical';
  message: string;
  verdictColor: 'green' | 'yellow' | 'red';
}

export function calculateSuperheat(
  refrigerant: string,
  suctionPsi: number,
  lineTempC: number,
): SuperheatResult | null {
  const sat = getSaturationTemp(refrigerant, suctionPsi);
  if (sat === null || isNaN(lineTempC)) return null;

  const sh = lineTempC - sat;

  let status: SuperheatResult['status'] = 'ideal';
  let message = '';
  let verdictColor: SuperheatResult['verdictColor'] = 'green';

  if (sh < 0) {
    status = 'critical';
    verdictColor = 'red';
    message = 'Retorno de líquido ao compressor! Recolha refrigerante imediatamente, risco de calço hidráulico.';
  } else if (sh < 4) {
    status = 'low';
    verdictColor = 'yellow';
    message = 'Superaquecimento baixo: sistema com excesso de fluido. Remova carga aos poucos e observe.';
  } else if (sh <= 8) {
    status = 'ideal';
    verdictColor = 'green';
    message = 'Carga perfeita! Eficiência máxima do evaporador, compressor protegido e consumo otimizado.';
  } else if (sh <= 12) {
    status = 'high';
    verdictColor = 'yellow';
    message = 'Superaquecimento alto: sistema com falta de fluido. Adicione carga lentamente e verifique vazamentos.';
  } else {
    status = 'critical';
    verdictColor = 'red';
    message = 'Carga crítica baixa! Compressor superaquecendo. Verifique vazamento urgente e complete a carga.';
  }

  return { satTempC: sat, superheatC: sh, status, message, verdictColor };
}

// =========================================================
// Normalizador de laudo tecnico ditado por voz
// Corrige termos tecnicos comuns de refrigeracao
// =========================================================

const TERM_FIXES: Array<[RegExp, string]> = [
  [/\b(sem gas|sem gás)\b/gi, 'sem fluido refrigerante'],
  [/\b(carga de gas|carga de gás)\b/gi, 'carga de fluido refrigerante'],
  [/\b(capacitor|capacitador)\s*(de)?\s*(\d+)\s*(micro|uf|mf)?\b/gi, 'capacitor de $3 µF'],
  [/\br\s*410\s*a?\b/gi, 'R410A'],
  [/\br\s*22\b/gi, 'R22'],
  [/\br\s*32\b/gi, 'R32'],
  [/\bsplit\b/gi, 'aparelho split'],
  [/\bcondensadora\b/gi, 'unidade condensadora'],
  [/\bevaporadora\b/gi, 'unidade evaporadora'],
  [/\bvazamento de gas\b/gi, 'vazamento de fluido refrigerante'],
  [/\btroca de gas\b/gi, 'substituição do fluido refrigerante'],
  [/\blimpeza\b/gi, 'higienização completa'],
  [/\bmanutencao preventiva\b/gi, 'manutenção preventiva'],
  [/\bplaca\b/gi, 'placa eletrônica principal'],
];

const MAX_REPORT_LENGTH = 900;

function formatSpokenPunctuation(value: string): string {
  return value
    .replace(/\b(virgula|vírgula)\b/gi, ',')
    .replace(/\b(ponto final|ponto finalizando|ponto)\b/gi, '.')
    .replace(/\b(dois pontos)\b/gi, ':')
    .replace(/\b(nova linha|quebra de linha)\b/gi, '. ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=\S)/g, '$1 ')
    .replace(/,{2,}/g, ',')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTechnicalUnits(value: string): string {
  return value
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(graus?|°)\s*c(?:elsius)?\b/gi, '$1 °C')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(psi|libras?)\b/gi, '$1 PSI')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(btu)\b/gi, '$1 BTU')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(amp[eè]res?|a)\b/gi, '$1 A')
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(volts?|v)\b/gi, '$1 V')
    .replace(/\s+([°])/g, ' $1');
}

function removeRepeatedWords(value: string): string {
  return value.replace(/\b([\p{L}\d]+)(\s+\1\b)+/giu, '$1');
}

export function normalizeTechReport(raw: string): string {
  let text = formatSpokenPunctuation(raw || '');
  if (!text) return text;

  for (const [rx, fix] of TERM_FIXES) {
    text = text.replace(rx, fix);
  }

  text = normalizeTechnicalUnits(removeRepeatedWords(formatSpokenPunctuation(text)))
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/(^|[.!?]\s+)([a-záàâãéêíóôõúç])/g, (_, prefix, letter) => prefix + letter.toUpperCase());

  if (!/[.!?]$/.test(text)) text += '.';

  // Mantem o laudo legivel no PDF sem permitir um texto excessivamente longo.
  if (text.length > MAX_REPORT_LENGTH) {
    const cut = text.slice(0, MAX_REPORT_LENGTH - 3);
    const safeCut = cut.slice(0, Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' ')));
    text = `${(safeCut || cut).replace(/[\s,;:]+$/, '')}...`;
  }

  return text;
}

export function getMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function buildArrivalMessage(techName: string, companyName: string, osNumber: string): string {
  return `Olá! Aqui é o técnico ${techName} da ${companyName}. Estou a caminho para o atendimento da OS ${osNumber} e devo chegar em breve! ❄️`;
}
