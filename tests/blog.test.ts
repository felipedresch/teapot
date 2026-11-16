import { describe, expect, it } from 'vitest'
import {
  BLOG_REDIRECTS,
  applyPaywallMarkers,
  getBlogPosts,
  parseBlogPost,
} from '../src/lib/blog'
import { canonicalRedirect } from '../src/lib/canonical'

const sample = `---
title: Título
description: Descrição curta.
publishedAt: 2026-02-20
updatedAt: 2026-11-14
occasion: aniversario
keywords: um, dois
---

Resposta direta.

## Seção

Texto.

## Perguntas frequentes

### Primeira pergunta?

Primeira resposta
em duas linhas.

### Segunda pergunta?

Segunda resposta.
`

describe('blog', () => {
  it('lê frontmatter, corpo e perguntas frequentes', () => {
    const post = parseBlogPost('exemplo', sample)
    expect(post.title).toBe('Título')
    expect(post.occasion).toBe('aniversario')
    expect(post.keywords).toEqual(['um', 'dois'])
    expect(post.markdown).not.toContain('Perguntas frequentes')
    expect(post.faq).toEqual([
      {
        question: 'Primeira pergunta?',
        answer: 'Primeira resposta em duas linhas.',
      },
      { question: 'Segunda pergunta?', answer: 'Segunda resposta.' },
    ])
  })
  it('recusa artigo sem campo obrigatório', () => {
    expect(() => parseBlogPost('x', '---\ntitle: T\n---\ncorpo')).toThrow(
      /description/,
    )
  })
  it('todos os artigos do repositório são válidos e completos', () => {
    const posts = getBlogPosts()
    expect(posts.length).toBeGreaterThan(0)
    for (const post of posts) {
      expect(post.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(post.description.length, post.slug).toBeGreaterThanOrEqual(110)
      expect(post.description.length, post.slug).toBeLessThanOrEqual(170)
      expect(post.updatedAt >= post.publishedAt, post.slug).toBe(true)
      expect(post.faq.length, post.slug).toBeGreaterThanOrEqual(2)
      expect(post.markdown, post.slug).not.toMatch(/^# /m)
      expect(BLOG_REDIRECTS[post.slug], post.slug).toBeUndefined()
    }
  })
  it('redireciona artigos antigos com 301 e não redireciona os atuais', () => {
    const response = canonicalRedirect(
      new Request(
        'https://mywish.com.br/blog/lista-de-presentes-online-ou-tradicional',
      ),
    )
    expect(response?.status).toBe(301)
    expect(response?.headers.get('location')).toBe(
      '/como-escolher-site-de-lista-de-presentes',
    )
    const slug = getBlogPosts()[0].slug
    expect(
      canonicalRedirect(new Request(`https://mywish.com.br/blog/${slug}`)),
    ).toBeUndefined()
  })
  it('links internos dos artigos apontam para páginas que existem', () => {
    const slugs = new Set(getBlogPosts().map((p) => p.slug))
    const pages = [
      '/',
      '/events/create',
      '/precos',
      '/faq',
      '/how-it-works',
      '/blog',
      '/lista-de-presentes',
      '/dados/presentes-mais-pedidos',
      '/como-escolher-site-de-lista-de-presentes',
      '/lista-de-presentes/casamento',
      '/lista-de-presentes/aniversario',
      '/lista-de-presentes/cha-de-bebe',
      '/lista-de-presentes/cha-de-panela',
      '/lista-de-presentes/casa-nova',
    ]
    for (const post of getBlogPosts()) {
      for (const [, href] of post.markdown.matchAll(/\]\((\/[^)#\s]*)/g)) {
        const ok =
          pages.includes(href) ||
          (href.startsWith('/blog/') && slugs.has(href.slice(6)))
        expect(ok, `${post.slug} → ${href}`).toBe(true)
      }
    }
  })
})

describe('marcadores da cobrança', () => {
  const text =
    'Antes. <!-- pago -->Custa R$ 9,90.<!-- /pago --><!-- gratis -->É grátis.<!-- /gratis --> Depois.'

  it('mostra só a versão da cobrança ligada ou desligada', () => {
    expect(applyPaywallMarkers(text, true)).toBe(
      'Antes. Custa R$ 9,90. Depois.',
    )
    expect(applyPaywallMarkers(text, false)).toBe('Antes. É grátis. Depois.')
  })

  const files = Object.entries(
    import.meta.glob('../src/content/blog/*.md', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )

  it.each(files)('%s: nada de preço com a cobrança desligada', (path, raw) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    for (const enabled of [true, false]) {
      const post = parseBlogPost(slug, raw, enabled)
      const all = [post.markdown, ...post.faq.map((f) => f.answer)].join('\n')
      expect(all).not.toMatch(/<!--\s*\/?(pago|gratis)/)
      if (!enabled) {
        expect(all).not.toMatch(/R\$ ?(9|29|59),90|\/precos|vitalíci/)
      }
    }
  })
})
