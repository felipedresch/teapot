// Artigos do blog: arquivos Markdown em src/content/blog, embutidos no build.
// Formato e regras de escrita em docs/BLOG.md.
import { PAYWALL_ENABLED } from '../../convex/lib/paywallSwitch'
import type { BlogOccasion } from '../components/BlogOccasionCta'

export type BlogFaq = { question: string; answer: string }

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  occasion: BlogOccasion | null
  keywords: string[]
  /** Corpo sem a seção de perguntas frequentes */
  markdown: string
  faq: BlogFaq[]
  readingMinutes: number
}

// Artigos antigos que foram juntados a outros. Viram 301 em src/lib/canonical.ts.
export const BLOG_REDIRECTS: Record<string, string> = {
  'como-atualizar-sua-lista-de-presentes-ao-longo-do-evento-sem-confusao':
    '/blog/como-funciona-a-reserva-de-presentes-em-listas-online',
  'como-deixar-sua-lista-de-presentes-mais-completa-e-utill':
    '/blog/como-escrever-descricoes-melhores-para-os-itens-da-sua-lista-de-presentes',
  'como-definir-um-link-bonito-e-facil-de-lembrar-para-sua-lista-de-presentes':
    '/blog/como-compartilhar-sua-lista-de-presentes-no-whatsapp-com-elegancia',
  'lista-de-presentes-online-ou-tradicional':
    '/como-escolher-site-de-lista-de-presentes',
  'presente-dinheiro-presente-fisico-escolher-lista':
    '/blog/presente-em-dinheiro-ou-presente-fisico',
}

const OCCASIONS: BlogOccasion[] = [
  'aniversario',
  'casamento',
  'cha-de-panela',
  'casa-nova',
  'cha-de-bebe',
]
const FAQ_HEADING = /^## Perguntas frequentes\s*$/im
const PAYWALL_MARKER = /<!--\s*(pago|gratis)\s*-->([\s\S]*?)<!--\s*\/\1\s*-->/g

/**
 * Trechos que dependem da cobrança: `<!-- pago -->...<!-- /pago -->` só
 * aparece com ela ligada, `<!-- gratis -->...<!-- /gratis -->` só com ela
 * desligada (convex/lib/paywallSwitch.ts, docs/BLOG.md).
 */
export function applyPaywallMarkers(text: string, paywallEnabled: boolean) {
  return text
    .replace(PAYWALL_MARKER, (_, mode: string, content: string) =>
      (mode === 'pago') === paywallEnabled ? content : '',
    )
    .replace(/\n{3,}/g, '\n\n')
}

export function parseBlogPost(
  slug: string,
  raw: string,
  paywallEnabled = PAYWALL_ENABLED,
): BlogPost {
  const text = applyPaywallMarkers(
    raw.replace(/\r\n?/g, '\n').replace(/^﻿/, ''),
    paywallEnabled,
  )
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!match) throw new Error(`Artigo ${slug}: falta o frontmatter`)
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const index = line.indexOf(':')
    if (index === -1) continue
    meta[line.slice(0, index).trim()] = line
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
  }
  for (const field of ['title', 'description', 'publishedAt', 'updatedAt'])
    if (!meta[field]) throw new Error(`Artigo ${slug}: falta "${field}"`)

  const body = text.slice(match[0].length).trim()
  const faqStart = body.search(FAQ_HEADING)
  const markdown = (faqStart === -1 ? body : body.slice(0, faqStart)).trim()
  const faq: BlogFaq[] = []
  if (faqStart !== -1) {
    const faqBody = body.slice(faqStart).replace(FAQ_HEADING, '')
    for (const block of faqBody.split(/^### /m).slice(1)) {
      const [question, ...rest] = block.split('\n')
      const answer = rest.join(' ').replace(/\s+/g, ' ').trim()
      if (question.trim() && answer)
        faq.push({ question: question.trim(), answer })
    }
  }

  const occasion = OCCASIONS.find((o) => o === meta.occasion) ?? null
  const words = (markdown.match(/\S+/g) ?? []).length
  return {
    slug,
    title: meta.title,
    description: meta.description,
    publishedAt: meta.publishedAt,
    updatedAt: meta.updatedAt,
    occasion,
    keywords: (meta.keywords ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    markdown,
    faq,
    readingMinutes: Math.max(1, Math.round(words / 200)),
  }
}

const files = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const posts: BlogPost[] = Object.entries(files)
  .map(([path, raw]) =>
    parseBlogPost(path.split('/').pop()!.replace(/\.md$/, ''), raw),
  )
  .sort(
    (a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title),
  )

export function getBlogPosts() {
  return posts
}

export function getBlogPost(slug: string) {
  return posts.find((post) => post.slug === slug)
}

/** Artigos relacionados: mesma ocasião primeiro, depois os mais recentes. */
export function getRelatedPosts(post: BlogPost, count = 3) {
  return posts
    .filter((other) => other.slug !== post.slug)
    .sort(
      (a, b) =>
        Number(b.occasion === post.occasion && post.occasion !== null) -
        Number(a.occasion === post.occasion && post.occasion !== null),
    )
    .slice(0, count)
}
