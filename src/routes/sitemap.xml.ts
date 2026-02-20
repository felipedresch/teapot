import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL, absoluteUrl } from '../lib/seo'
import { fetchSlopMachineSitemapEntries } from '../lib/slopMachine'

type SitemapUrl = {
  loc: string
  lastmod: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: string
}

function toIsoDate(input: string | number | Date) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildSitemapXml(urls: SitemapUrl[]) {
  const items = urls
    .map((url) => {
      const changefreq = url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''
      const priority = url.priority ? `<priority>${url.priority}</priority>` : ''

      return [
        '<url>',
        `<loc>${escapeXml(url.loc)}</loc>`,
        `<lastmod>${url.lastmod}</lastmod>`,
        changefreq,
        priority,
        '</url>',
      ]
        .filter(Boolean)
        .join('')
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`
}

export const Route = createFileRoute('/sitemap/xml')({
  server: {
    handlers: {
      GET: async () => {
        const today = toIsoDate(new Date())
        const staticUrls: SitemapUrl[] = [
          { loc: absoluteUrl('/'), lastmod: today, changefreq: 'weekly', priority: '1.0' },
          {
            loc: absoluteUrl('/events/create'),
            lastmod: today,
            changefreq: 'weekly',
            priority: '0.9',
          },
          {
            loc: absoluteUrl('/how-it-works'),
            lastmod: today,
            changefreq: 'weekly',
            priority: '0.8',
          },
          { loc: absoluteUrl('/faq'), lastmod: today, changefreq: 'weekly', priority: '0.8' },
          { loc: absoluteUrl('/blog'), lastmod: today, changefreq: 'daily', priority: '0.9' },
        ]

        let contentUrls: SitemapUrl[] = []
        try {
          const entries = await fetchSlopMachineSitemapEntries()
          contentUrls = entries
            .filter((entry) => entry.url.startsWith(SITE_URL))
            .map((entry) => ({
              loc: entry.url,
              lastmod: toIsoDate(entry.lastmod),
              changefreq: 'weekly' as const,
              priority: '0.8',
            }))
        } catch {
          contentUrls = []
        }

        const xml = buildSitemapXml([...staticUrls, ...contentUrls])

        return new Response(xml, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=600, stale-while-revalidate=3600',
          },
        })
      },
    },
  },
})
