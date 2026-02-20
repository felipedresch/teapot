import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect } from 'react'
import { SITE_NAME, absoluteUrl } from '../lib/seo'
import { fetchSlopMachineList } from '../lib/slopMachine'

const getBlogList = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchSlopMachineList()
})

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    return getBlogList()
  },
  head: () => ({
    meta: [
      {
        title: `Blog | ${SITE_NAME}`,
      },
      {
        name: 'description',
        content:
          'Conteúdos e guias sobre lista de presentes para casamento, aniversário, chá de bebê e outras celebrações.',
      },
      {
        property: 'og:title',
        content: `Blog | ${SITE_NAME}`,
      },
      {
        property: 'og:description',
        content:
          'Artigos atualizados com dicas práticas para montar e compartilhar listas de presentes online.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: absoluteUrl('/blog'),
      },
    ],
  }),
  component: BlogListPage,
})

function BlogListPage() {
  const contents = Route.useLoaderData()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-14 space-y-8">
      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">conteúdo</p>
        <h1 className="font-display italic text-4xl text-espresso">Blog MyWish</h1>
        <p className="text-warm-gray leading-relaxed max-w-3xl">
          Guias práticos para criar, organizar e compartilhar lista de presentes online em qualquer
          ocasião.
        </p>
      </header>

      {contents.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-warm-white p-6 text-warm-gray">
          Ainda não há artigos publicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contents.map((item) => (
            <article
              key={item.slug}
              className="rounded-2xl border border-border/50 bg-warm-white p-6 shadow-dreamy"
            >
              <p className="text-xs uppercase tracking-wide text-muted-rose">
                {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
              </p>
              <h2 className="text-2xl mt-2 text-espresso">{item.title}</h2>
              <p className="text-warm-gray mt-3 leading-relaxed">{item.description}</p>
              <Link
                to="/blog/$slug"
                params={{ slug: item.slug }}
                className="inline-flex mt-4 text-sm text-muted-rose hover:underline"
              >
                Ler artigo
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
