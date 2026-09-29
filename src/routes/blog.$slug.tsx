import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SITE_NAME, absoluteUrl, toJsonLd, breadcrumbJsonLd } from '../lib/seo'
import { fetchSlopMachineArticle, ContentFetchError } from '../lib/slopMachine'

const getBlogArticle = createServerFn({ method: 'GET' })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    try {
      return await fetchSlopMachineArticle(data.slug)
    } catch (error) {
      if (error instanceof ContentFetchError && error.status === 404)
        return null
      throw error
    }
  })

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const article = await getBlogArticle({ data: { slug: params.slug } })
    if (!article) throw notFound()
    return article
  },
  head: ({ loaderData, params }) => {
    const title = loaderData?.title || `Blog | ${SITE_NAME}`
    const description =
      loaderData?.description ||
      'Conteúdo sobre lista de presentes online para ocasiões especiais.'
    const publishedAt = loaderData?.publishedAt || ''
    const updatedAt = loaderData?.updatedAt || ''

    return {
      meta: [
        {
          title: `${title} | ${SITE_NAME}`,
        },
        { name: 'twitter:title', content: `${title} | ${SITE_NAME}` },
        { name: 'twitter:description', content: description },
        {
          name: 'robots',
          content: loaderData
            ? 'index, follow, max-image-preview:large'
            : 'noindex, follow',
        },
        {
          name: 'description',
          content: description,
        },
        {
          property: 'og:title',
          content: `${title} | ${SITE_NAME}`,
        },
        {
          property: 'og:description',
          content: description,
        },
        {
          property: 'og:type',
          content: 'article',
        },
        {
          property: 'og:url',
          content: absoluteUrl(`/blog/${params.slug}`),
        },
        {
          property: 'article:published_time',
          content: publishedAt,
        },
        {
          property: 'article:modified_time',
          content: updatedAt,
        },
      ],
    }
  },
  component: BlogPostPage,
})

function BlogPostPage() {
  const article = Route.useLoaderData()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [article.slug])

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: 'pt-BR',
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    keywords: article.keywords,
  }

  return (
    <article className="max-w-3xl mx-auto px-6 py-14 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            breadcrumbJsonLd([
              { name: 'Início', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: article.title, path: `/blog/${article.slug}` },
            ]),
          ),
        }}
      />
      <nav aria-label="Você está aqui" className="text-sm text-warm-gray">
        <Link to="/">Início</Link> / <Link to="/blog">Blog</Link>
      </nav>

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">blog</p>
        <h1 className="font-display italic text-5xl md:text-6xl leading-tight text-espresso">
          {article.title}
        </h1>
        <p className="text-warm-gray leading-relaxed">{article.description}</p>
        <p className="text-sm text-warm-gray/80">
          Atualizado em{' '}
          {new Date(article.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </header>

      <div className="blog-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: () => null,
            a: ({ node: _node, ...props }) => {
              const href = props.href ?? ''
              const isInternal = href.startsWith('/')

              if (isInternal) {
                return <Link to={href}>{props.children}</Link>
              }

              return <a {...props} rel="noopener noreferrer" target="_blank" />
            },
          }}
        >
          {article.markdown}
        </ReactMarkdown>
      </div>
      <aside className="rounded-2xl bg-blush/20 p-6 space-y-3">
        <h2 className="font-display text-2xl text-espresso">
          Coloque sua lista em prática
        </h2>
        <p className="text-warm-gray">
          Monte sua lista gratuitamente e libere o compartilhamento por
          pagamento único, a partir de R$ 9,90.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link to="/events/create" className="text-primary underline">
            Criar lista
          </Link>
          <Link to="/lista-de-presentes" className="text-primary underline">
            Guias por ocasião
          </Link>
          <Link to="/precos" className="text-primary underline">
            Ver preços
          </Link>
        </div>
      </aside>
    </article>
  )
}
