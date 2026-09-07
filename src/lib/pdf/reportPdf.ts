import { formatBRL, formatDate, todayISO } from '../utils';
import type { Company } from '../../types';
import type { Kpi, TechRank, ServiceMixItem, Debtor } from '../reports';

export async function exportReportPdf(opts: {
  company?: Company | null;
  label: string;
  from: string;
  to: string;
  techFilter: string;
  kpi: Kpi;
  techRanking: TechRank[];
  serviceMix: ServiceMixItem[];
  debtors: Debtor[];
}) {
  const pdfTheme = await import('./theme');
  const { createPdf, drawBrandHeader, drawBrandFooter, sectionLabel, divider, text, stampFooters, newBrandedPage } = pdfTheme;
  const ctx = createPdf(opts.company);
  const { doc, c, ML, MR, CW, PH } = ctx;
  const headerArgs = {
    company: opts.company,
    title: 'RELATÓRIO GERENCIAL',
    docName: opts.label,
    rightLines: [
      `Período: ${opts.from === '0000-01-01' ? 'Todo histórico' : `${formatDate(opts.from)} a ${formatDate(opts.to)}`}`,
      `Técnico: ${opts.techFilter === 'todos' ? 'Todos' : opts.techFilter}`,
      `Gerado em: ${formatDate(todayISO())}`,
    ],
  };
  const header = () => { drawBrandHeader(ctx, headerArgs); drawBrandFooter(ctx, opts.company); };
  header();
  const FOOTER = 26;
  let y = 56;
  const need = (h: number) => { if (y + h > PH - FOOTER) y = newBrandedPage(ctx, headerArgs); };

  const kpiRows: Array<[string, string]> = [
    ['Receita concluída', formatBRL(opts.kpi.revenue)],
    ['Ticket médio', formatBRL(opts.kpi.ticket)],
    ['OS concluídas', `${opts.kpi.done.length} de ${opts.kpi.valid.length}`],
    ['Taxa de cancelamento', `${opts.kpi.cancelRate.toFixed(1)}%`],
    ['Conversão de orçamentos', `${opts.kpi.conversion.toFixed(1)}% (${opts.kpi.approved}/${opts.kpi.totalBud})`],
    ['Pipeline em aberto', formatBRL(opts.kpi.pipelineValue)],
    ['Clientes recorrentes', `${opts.kpi.recurring} de ${opts.kpi.totalCusts}`],
  ];
  sectionLabel(doc, 'Indicadores do período', ML, y, c.brand);
  y += 7;
  kpiRows.forEach(([k, v]) => {
    need(7);
    text(doc, { x: ML, y, str: k, size: 9, weight: 'normal', color: c.muted });
    text(doc, { x: MR, y, str: v, size: 9, weight: 'semibold', color: c.ink, align: 'right' });
    y += 6;
  });

  if (opts.techRanking.length > 0) {
    y += 5; divider(doc, c, y - 2, ML, MR);
    sectionLabel(doc, 'Ranking de técnicos (receita)', ML, y, c.brand);
    y += 7;
    opts.techRanking.slice(0, 10).forEach((t, i) => {
      need(7);
      text(doc, { x: ML, y, str: `${i + 1}. ${t.name}`, size: 9, weight: 'semibold', color: c.ink, w: CW - 60 });
      text(doc, { x: MR, y, str: `${t.done} OS · ${formatBRL(t.revenue)}`, size: 9, weight: 'normal', color: c.muted, align: 'right' });
      y += 6;
    });
  }

  if (opts.serviceMix.length > 0) {
    y += 5; divider(doc, c, y - 2, ML, MR);
    sectionLabel(doc, 'Serviços mais lucrativos', ML, y, c.brand);
    y += 7;
    opts.serviceMix.forEach((s) => {
      need(7);
      text(doc, { x: ML, y, str: s.name, size: 9, weight: 'normal', color: c.ink, w: CW - 60 });
      text(doc, { x: MR, y, str: `${s.count}x · ${formatBRL(s.revenue)}`, size: 9, weight: 'semibold', color: c.muted, align: 'right' });
      y += 6;
    });
  }

  if (opts.debtors.length > 0) {
    y += 5; divider(doc, c, y - 2, ML, MR);
    sectionLabel(doc, 'Contas a receber (maiores saldos)', ML, y, c.brand);
    y += 7;
    opts.debtors.forEach((d) => {
      need(7);
      text(doc, { x: ML, y, str: d.name, size: 9, weight: 'semibold', color: c.ink, w: CW - 60 });
      text(doc, { x: MR, y, str: `${d.count} OS · ${formatBRL(d.total)}`, size: 9, weight: 'normal', color: c.muted, align: 'right' });
      y += 6;
    });
  }

  stampFooters(ctx, opts.company);
  if ((opts as unknown as { save?: boolean }).save) doc.save(`Relatorio-ClimaPro-${todayISO()}.pdf`);
  return doc;
}
