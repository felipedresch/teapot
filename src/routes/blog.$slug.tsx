import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  SITE_NAME,
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  toJsonLd,
} from '../lib/seo'
import { getBlogPost, getRelatedPosts } from '../lib/blog'
import { formatLongDatePtBr } from '../content/pageDates'
import { BlogOccasionCta } from '../components/BlogOccasionCta'

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => {
    const article = getBlogPost(params.slug)
    if (!article) throw notFound()
    return { article, relatedPosts: getRelatedPosts(article) }
  },
  head: ({ loaderData, params }) => {
    const article = loaderData?.article
    if (!article)
      return { meta: [{ name: 'robots', content: 'noindex, follow' }] }
    const title = `${article.title} | ${SITE_NAME}`
    return {
      meta: [
        { title },
        { name: 'description', content: article.description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: article.description },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: absoluteUrl(`/blog/${params.slug}`) },
        { property: 'article:published_time', content: article.publishedAt },
        { property: 'article:modified_time', content: article.updatedAt },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: article.description },
      ],
    }
  },
  component: BlogPostPage,
})

const markdownComponents = {
  h1: () => null,
  a: ({
    node: _node,
    ...props
  }: React.ComponentProps<'a'> & { node?: unknown }) => {
    const href = props.href ?? ''
    if (href.startsWith('/')) return <Link to={href}>{props.children}</Link>
    return <a {...props} rel="noopener noreferrer" target="_blank" />
  },
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="blog-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

function BlogPostPage() {
  const { article, relatedPosts } = Route.useLoaderData()
  const path = `/blog/${article.slug}`

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [article.slug])

  // A chamada do meio entra depois da primeira seção (introdução + primeiro
  // H2), quando o leitor já viu o conteúdo que veio buscar.
  const sections = article.markdown.split(/\n(?=## )/)
  const markdownParts =
    sections.length >= 3
      ? [sections.slice(0, 2).join('\n'), sections.slice(2).join('\n')]
      : [article.markdown]

  const structuredData = [
    {
      ...articleJsonLd({
        path,
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
      }),
      keywords: article.keywords.join(', ') || undefined,
    },
    breadcrumbJsonLd([
      { name: 'Início', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: article.title, path },
    ]),
    ...(article.faq.length ? [faqJsonLd(article.faq)] : []),
  ]

  return (
    <article className="max-w-3xl mx-auto px-6 py-14 space-y-6">
      {structuredData.map((value, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(value) }}
        />
      ))}
      <nav aria-label="Você está aqui" className="text-sm text-warm-gray">
        <Link to="/">Início</Link> / <Link to="/blog">Blog</Link>
      </nav>

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">blog</p>
        <h1 className="font-display italic text-4xl md:text-6xl leading-tight text-espresso">
          {article.title}
        </h1>
        <p className="text-warm-gray leading-relaxed">{article.description}</p>
        <p className="text-sm text-warm-gray/80">
          Atualizado em{' '}
          <time dateTime={article.updatedAt}>
            {formatLongDatePtBr(article.updatedAt)}
          </time>{' '}
          · {article.readingMinutes} min de leitura
        </p>
      </header>

      {markdownParts.map((part, index) => (
        <div key={index}>
          <Markdown>{part}</Markdown>
          {index === 0 && markdownParts.length > 1 && (
            <BlogOccasionCta
              occasion={article.occasion}
              slug={article.slug}
              position="meio"
            />
          )}
        </div>
      ))}

      {article.faq.length > 0 && (
        <section className="space-y-5 border-t border-muted-rose/25 pt-8">
          <h2 className="font-display text-3xl text-espresso">
            Perguntas frequentes
          </h2>
          {article.faq.map((item) => (
            <div key={item.question} className="space-y-2">
              <h3 className="font-medium text-espresso">{item.question}</h3>
              <p className="text-warm-gray leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </section>
      )}

      <section className="pt-8 space-y-4">
        <h2 className="text-3xl text-espresso">Artigos relacionados</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-2xl border border-border/50 bg-warm-white p-5 shadow-dreamy"
            >
              <h3 className="text-xl text-espresso leading-snug">
                {post.title}
              </h3>
              <p className="text-sm text-warm-gray mt-2 line-clamp-3">
                {post.description}
              </p>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="inline-flex mt-3 text-sm text-muted-rose hover:underline"
              >
                Ler artigo
              </Link>
            </article>
          ))}
        </div>
      </section>

      <BlogOccasionCta
        occasion={article.occasion}
        slug={article.slug}
        position="fim"
      />
    </article>
  )
}
