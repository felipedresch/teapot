import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SITE_NAME, absoluteUrl, toJsonLd } from '../lib/seo'
import { fetchSlopMachineArticle, getSafeFaqSchema } from '../lib/slopMachine'

const getBlogArticle = createServerFn({ method: 'GET' })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    return fetchSlopMachineArticle(data.slug)
  })

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    try {
      return await getBlogArticle({ data: { slug: params.slug } })
    } catch {
      throw notFound()
    }
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
  const faqSchema = getSafeFaqSchema(article.faqSchema)

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
      {faqSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
      ) : null}

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">blog</p>
        <h1 className="font-display italic text-5xl md:text-6xl leading-tight text-espresso">
          {article.title}
        </h1>
        <p className="text-warm-gray leading-relaxed">{article.description}</p>
        <p className="text-sm text-warm-gray/80">
          Atualizado em {new Date(article.updatedAt).toLocaleDateString('pt-BR')}
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
    </article>
  )
}
