import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SITE_NAME, absoluteUrl, toJsonLd } from '../lib/seo'
import {
  fetchSlopMachineArticle,
  fetchSlopMachineList,
  getSafeFaqSchema,
} from '../lib/slopMachine'

const getBlogArticle = createServerFn({ method: 'GET' })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    return fetchSlopMachineArticle(data.slug)
  })

const getBlogList = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchSlopMachineList()
})

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    try {
      const [article, allPosts] = await Promise.all([
        getBlogArticle({ data: { slug: params.slug } }),
        getBlogList(),
      ])

      const relatedPosts = allPosts
        .filter((post) => post.slug !== params.slug)
        .slice(0, 3)

      return {
        article,
        relatedPosts,
      }
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData, params }) => {
    const article = loaderData?.article
    const title = article?.title || `Blog | ${SITE_NAME}`
    const description =
      article?.description ||
      'Conteúdo sobre lista de presentes online para ocasiões especiais.'
    const publishedAt = article?.publishedAt || ''
    const updatedAt = article?.updatedAt || ''

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
  const { article, relatedPosts } = Route.useLoaderData()
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

      <section className="pt-8 space-y-4">
        <h2 className="text-3xl text-espresso">Artigos relacionados</h2>
        {relatedPosts.length === 0 ? (
          <p className="text-warm-gray">Em breve, mais conteúdos relacionados por aqui.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedPosts.map((post) => (
              <article
                key={post.slug}
                className="rounded-2xl border border-border/50 bg-warm-white p-5 shadow-dreamy"
              >
                <p className="text-xs uppercase tracking-wide text-muted-rose">
                  {new Date(post.updatedAt).toLocaleDateString('pt-BR')}
                </p>
                <h3 className="text-xl mt-2 text-espresso leading-snug">{post.title}</h3>
                <p className="text-sm text-warm-gray mt-2 line-clamp-3">{post.description}</p>
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
        )}
      </section>

      <section className="rounded-2xl border border-border/50 bg-warm-white p-6 shadow-dreamy">
        <h2 className="text-3xl text-espresso">Crie sua lista de presentes</h2>
        <p className="text-warm-gray mt-2 leading-relaxed">
          Monte sua lista em poucos minutos, compartilhe com convidados e organize tudo em um só
          lugar.
        </p>
        <Link
          to="/events/create"
          className="inline-flex mt-4 text-sm text-muted-rose hover:underline"
        >
          Começar agora
        </Link>
      </section>
    </article>
  )
}
