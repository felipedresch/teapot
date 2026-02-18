import { createFileRoute, Link } from '@tanstack/react-router'
import { Fragment } from 'react'
import { SITE_NAME, absoluteUrl, toJsonLd } from '../lib/seo'
import BrandWordmark from '../components/BrandWordmark'

const FAQ_ITEMS = [
  {
    question: 'Como criar uma lista de presentes online gratuita?',
    answer:
      'No MyWish, você cria sua lista em minutos: acesse a página de criação, escolha o tipo de evento, adicione os presentes e compartilhe o link com seus convidados.',
  },
  {
    question: 'Quais tipos de evento o MyWish suporta?',
    answer:
      'O MyWish suporta aniversários, casamentos, chá de bebê, chá de panela, chá de casa nova, formatura e ocasiões personalizadas.',
  },
  {
    question: 'Posso deixar meu evento privado?',
    answer:
      'Sim. Você pode definir a visibilidade do evento e compartilhar somente com quem quiser.',
  },
  {
    question: 'Preciso pagar para usar o MyWish?',
    answer: 'Não. O MyWish oferece criação e compartilhamento de listas de presentes gratuitamente.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

export const Route = createFileRoute('/faq')({
  head: () => ({
    meta: [
      {
        title: `FAQ: lista de presentes online | ${SITE_NAME}`,
      },
      {
        name: 'description',
        content:
          'Dúvidas frequentes sobre como criar, compartilhar e organizar lista de presentes online no MyWish.',
      },
      {
        property: 'og:title',
        content: `FAQ: lista de presentes online | ${SITE_NAME}`,
      },
      {
        property: 'og:description',
        content:
          'Respostas diretas sobre criação de listas de presentes para casamento, aniversário e outras ocasiões.',
      },
      {
        property: 'og:type',
        content: 'article',
      },
      {
        property: 'og:url',
        content: absoluteUrl('/faq'),
      },
    ],
  }),
  component: FaqPage,
})

function FaqPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
      />

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">faq</p>
        <h1 className="font-display italic text-4xl text-espresso">Perguntas frequentes</h1>
        <p className="text-warm-gray leading-relaxed max-w-3xl">
          O <BrandWordmark casing="title" /> é uma plataforma para criar e compartilhar lista de
          presentes online de forma
          simples. Abaixo estão respostas diretas para as dúvidas mais comuns sobre cadastro,
          privacidade, tipos de evento e compartilhamento.
        </p>
      </header>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="rounded-2xl border border-border/50 bg-warm-white p-6">
            <h2 className="text-lg font-medium text-espresso">{item.question}</h2>
            <p className="text-warm-gray mt-2 leading-relaxed">{item.answer}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-warm-white p-6">
        <h2 className="text-xl font-medium text-espresso">Não encontrou sua dúvida?</h2>
        <p className="text-warm-gray mt-2">
          Crie seu evento em poucos minutos e teste na prática o fluxo de lista de presentes.
        </p>
        <Link to="/events/create" className="inline-flex mt-4 text-sm text-muted-rose hover:underline">
          Criar minha lista agora
        </Link>
      </div>
    </div>
  )
}
