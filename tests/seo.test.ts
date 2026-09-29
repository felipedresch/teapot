import { describe, expect, it } from 'vitest'
import { absoluteUrl, toJsonLd } from '../src/lib/seo'
import { buildSitemap } from '../src/lib/sitemap'

describe('public SEO URLs', () => {
  it('uses the production canonical host and removes query strings and trailing slashes', () => {
    expect(absoluteUrl('/blog/example/?utm_source=google')).toBe(
      'https://mywish.com.br/blog/example',
    )
    expect(absoluteUrl('/')).toBe('https://mywish.com.br/')
  })
  it('escapes user content in inline structured data without changing the parsed value', () => {
    const value = { name: '</script><script>alert(1)</script>' }
    expect(toJsonLd(value)).not.toContain('<')
    expect(JSON.parse(toJsonLd(value))).toEqual(value)
  })
  it('includes articles and occasion pages once, preserves real dates, and excludes invalid slugs', () => {
    const xml = buildSitemap([
      { slug: 'guia-de-presentes', updatedAt: '2026-06-01T12:00:00Z' },
      { slug: 'guia-de-presentes', updatedAt: '2026-06-01T12:00:00Z' },
      { slug: '../../private' },
      { slug: 'sem-data', updatedAt: 'invalid' },
    ])
    expect(
      xml.match(
        /<loc>https:\/\/mywish.com.br\/blog\/guia-de-presentes<\/loc>/g,
      ),
    ).toHaveLength(1)
    expect(xml).toContain('<lastmod>2026-06-01T12:00:00.000Z</lastmod>')
    expect(xml).toContain('/lista-de-presentes/casamento</loc>')
    expect(xml).not.toContain('https://www.mywish.com.br')
    expect(xml).not.toContain('private')
    expect(xml).not.toContain('Invalid Date')
    expect(xml.match(/<lastmod>/g)).toHaveLength(1)
  })
})
