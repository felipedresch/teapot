import { absoluteUrl } from './seo'
import { occasions } from '../content/occasions'
export type SitemapArticle = {
  slug: string
  updatedAt?: string
  publishedAt?: string
}
const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
export function buildSitemap(articles: SitemapArticle[]) {
  const urls = new Map<string, string | undefined>()
  for (const path of [
    '/',
    '/events/create',
    '/how-it-works',
    '/faq',
    '/precos',
    '/lista-de-presentes',
    '/blog',
    ...occasions.map((o) => `/lista-de-presentes/${o.slug}`),
  ])
    urls.set(absoluteUrl(path), undefined)
  for (const article of articles) {
    if (!article.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug))
      continue
    const rawDate = article.updatedAt || article.publishedAt
    const parsed = rawDate ? new Date(rawDate) : null
    urls.set(
      absoluteUrl(`/blog/${article.slug}`),
      parsed && Number.isFinite(parsed.getTime())
        ? parsed.toISOString()
        : undefined,
    )
  }
  const body = [...urls]
    .map(
      ([url, date]) =>
        `<url><loc>${escapeXml(url)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}
