import { giftInsights } from './giftInsights'

// Data da última revisão real do conteúdo de cada página pública. Aparece como
// "Atualizado em" na página, no JSON-LD (dateModified) e no lastmod do
// sitemap. Atualize aqui só quando o texto da página mudar de verdade: o
// Google e os buscadores de IA desconfiam de datas que mudam sem conteúdo novo.
export const pageDates: Record<string, string> = {
  '/': '2026-11-14',
  '/how-it-works': '2026-09-29',
  '/faq': '2026-11-14',
  '/precos': '2026-11-16',
  '/lista-de-presentes': '2026-11-14',
  '/lista-de-presentes/casamento': '2026-11-14',
  '/lista-de-presentes/aniversario': '2026-11-14',
  '/lista-de-presentes/cha-de-bebe': '2026-11-14',
  '/lista-de-presentes/cha-de-panela': '2026-11-14',
  '/lista-de-presentes/casa-nova': '2026-11-14',
  '/como-escolher-site-de-lista-de-presentes': '2026-11-14',
  // Página de dados: acompanha a última geração do levantamento.
  '/dados/presentes-mais-pedidos': giftInsights.generatedAt,
}

export function formatLongDatePtBr(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatMonthPtBr(yearMonth: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${yearMonth}-15T12:00:00Z`))
}
