import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getOccasion } from '../content/occasions'
import { giftInsights } from '../content/giftInsights'
import { formatLongDatePtBr, pageDates } from '../content/pageDates'
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  pageMeta,
  toJsonLd,
} from '../lib/seo'
import { OccasionLinks } from '../components/OccasionLinks'
import { byPaywall } from '../lib/paywall'

// Ocasiões com dados próprios suficientes para o bloco "o que as listas reais
// mostram" (ver scripts/dados-presentes.mjs).
const INSIGHTS = {
  'casa-nova': giftInsights.occasions.chaDeCasaNova,
  'cha-de-panela': giftInsights.occasions.chaDePanela,
} as const

export const Route = createFileRoute('/lista-de-presentes/$occasion')({
  loader: ({ params }) => {
    const page = getOccasion(params.occasion)
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? pageMeta(loaderData.title, loaderData.description)
      : [{ name: 'robots', content: 'noindex, follow' }],
  }),
  component: OccasionPage,
})

function OccasionPage() {
  const page = Route.useLoaderData()
  const path = `/lista-de-presentes/${page.slug}`
  const updated = pageDates[path] as string | undefined
  const insights =
    page.slug in INSIGHTS
      ? INSIGHTS[page.slug as keyof typeof INSIGHTS]
      : undefined
  return (
    <>
      <article className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-10">
        {[
          breadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Listas de presentes', path: '/lista-de-presentes' },
            { name: page.name, path },
          ]),
          faqJsonLd(page.faq),
          ...(updated
            ? [
                articleJsonLd({
                  path,
                  headline: page.title,
                  description: page.description,
                  datePublished: '2026-09-29',
                  dateModified: updated,
                }),
              ]
            : []),
        ].map((value, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toJsonLd(value) }}
          />
        ))}
        <nav
          aria-label="Você está aqui"
          className="text-sm text-warm-gray flex flex-wrap gap-2"
        >
          <Link to="/">Início</Link>
          <span aria-hidden="true">/</span>
          <Link to="/lista-de-presentes">Listas de presentes</Link>
          <span aria-hidden="true">/</span>
          <span>{page.name}</span>
        </nav>
        <header className="space-y-5 border-b border-muted-rose/25 pb-10">
          <p className="font-accent text-3xl text-muted-rose">
            para celebrar do seu jeito
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-tight text-espresso">
            {page.title}
          </h1>
          {updated && (
            <p className="text-sm text-warm-gray">
              Atualizado em{' '}
              <time dateTime={updated}>{formatLongDatePtBr(updated)}</time>
            </p>
          )}
          <p className="text-lg text-warm-gray leading-relaxed max-w-3xl">
            {page.intro}
          </p>
          <Link
            to="/events/create"
            className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
          >
            Montar minha lista
          </Link>
          <p className="text-sm text-warm-gray">
            {byPaywall(
              <>
                Monte gratuitamente. Libere o compartilhamento desta lista por
                R$ {page.price}, sem mensalidade.{' '}
                <Link to="/precos" className="underline">
                  Ver planos
                </Link>
                .
              </>,
              <>
                Montar e compartilhar é grátis, sem mensalidade e sem limite de
                presentes.
              </>,
            )}
          </p>
        </header>
        {page.sections.map((section, index) => (
          <section key={section.title} className="space-y-4">
            <p
              aria-hidden="true"
              className="font-accent text-2xl text-muted-rose"
            >
              0{index + 1}
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-espresso">
              {section.title}
            </h2>
            <p className="text-warm-gray leading-relaxed">{section.text}</p>
            {section.items && (
              <ul className="list-disc pl-5 space-y-3 text-warm-gray leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {insights && (
          <section
            aria-labelledby="dados-reais"
            className="space-y-4 rounded-3xl border border-muted-rose/25 p-6 md:p-8"
          >
            <p className="font-accent text-2xl text-muted-rose">
              o que as listas reais mostram
            </p>
            <h2
              id="dados-reais"
              className="font-display text-2xl md:text-3xl text-espresso"
            >
              Os 10 presentes mais pedidos em listas de{' '}
              {page.name.toLowerCase()}
            </h2>
            <p className="text-warm-gray leading-relaxed">
              Levantamento com {insights.lists} listas de{' '}
              {page.name.toLowerCase()} criadas no MyWish. A lista típica tem{' '}
              {insights.medianGifts} presentes. O percentual indica quantas
              listas incluem o item.
            </p>
            <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-2 list-decimal pl-5 text-warm-gray">
              {insights.items.slice(0, 10).map((item) => (
                <li key={item.name}>
                  <span className="text-espresso">{item.name}</span>:{' '}
                  {item.listShare}%
                </li>
              ))}
            </ol>
            <Link
              to="/dados/presentes-mais-pedidos"
              className="inline-flex text-primary font-medium underline underline-offset-4"
            >
              Ver o levantamento completo e os presentes mais reservados
            </Link>
          </section>
        )}
        {page.slug === 'aniversario' && <BirthdayInsights />}
        <section className="space-y-5 border-t border-muted-rose/25 pt-8">
          <h2 className="font-display text-3xl text-espresso">
            Dúvidas sobre a lista
          </h2>
          {page.faq.map((item) => (
            <div key={item.question} className="space-y-2">
              <h3 className="font-medium text-espresso">{item.question}</h3>
              <p className="text-warm-gray leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </section>
        <aside className="rounded-3xl bg-blush/20 p-6 md:p-8 space-y-4">
          <h2 className="font-display text-2xl text-espresso">
            Sua lista começa com uma ideia
          </h2>
          <p className="text-warm-gray">
            Adicione o primeiro presente e organize o restante no seu tempo.
          </p>
          <Link
            to="/events/create"
            className="inline-flex text-primary font-medium underline underline-offset-4"
          >
            Criar lista de presentes
          </Link>
          <p className="text-sm text-warm-gray">
            <Link to="/how-it-works" className="underline">
              Conheça o passo a passo
            </Link>{' '}
            ou veja as{' '}
            <Link to="/faq" className="underline">
              perguntas frequentes
            </Link>
            .
          </p>
        </aside>
      </article>
      <OccasionLinks />
    </>
  )
}

// Aniversário tem poucos itens repetidos entre listas, então o bloco mostra a
// divisão por categoria.
function BirthdayInsights() {
  const data = giftInsights.birthday
  return (
    <section
      aria-labelledby="dados-aniversario"
      className="space-y-5 rounded-3xl border border-muted-rose/25 p-6 md:p-8"
    >
      <p className="font-accent text-2xl text-muted-rose">
        o que as listas reais mostram
      </p>
      <h2
        id="dados-aniversario"
        className="font-display text-2xl md:text-3xl text-espresso"
      >
        O que as pessoas pedem nas listas de aniversário
      </h2>
      <p className="text-warm-gray leading-relaxed">
        Nas listas de aniversário criadas no MyWish, a lista típica tem{' '}
        {data.medianGifts} itens e {data.linkShare}% dos presentes têm link de
        loja. Veja como os pedidos se dividem:
      </p>
      <ul className="space-y-3">
        {data.categories.map((category) => (
          <li key={category.name} className="space-y-1">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-espresso">{category.name}</span>
              <span className="text-warm-gray whitespace-nowrap">
                {category.giftShare}% dos presentes
              </span>
            </div>
            <div className="h-2 rounded-full bg-blush/30" role="presentation">
              <div
                className="h-2 rounded-full bg-muted-rose"
                style={{ width: `${Math.max(category.giftShare, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-warm-gray">
        O restante são pedidos variados que não se encaixam numa categoria
        (experiências, itens personalizados e outros).
      </p>
      <p className="text-warm-gray leading-relaxed">
        Procurando ideias por idade? Veja{' '}
        <Link
          to="/blog/$slug"
          params={{ slug: 'presentes-aniversario-50-ideias-idades' }}
          className="text-primary underline underline-offset-4"
        >
          50 ideias de presentes de aniversário para todas as idades
        </Link>
        .
      </p>
    </section>
  )
}
