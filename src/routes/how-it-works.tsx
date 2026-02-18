import { createFileRoute, Link } from '@tanstack/react-router'
import { SITE_NAME, absoluteUrl, toJsonLd } from '../lib/seo'
import BrandWordmark from '../components/BrandWordmark'

const HOW_TO_STEPS = [
  'Acesse a página de criação e informe o nome do evento.',
  'Selecione o tipo de ocasião e adicione os anfitriões.',
  'Inclua os presentes desejados com descrição, imagem e link de referência.',
  'Compartilhe o link com convidados por WhatsApp ou redes sociais para que eles reservem um presente.',
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Como criar uma lista de presentes no MyWish',
  description:
    'Passo a passo para criar, personalizar e compartilhar uma lista de presentes online no MyWish.',
  totalTime: 'PT10M',
  step: HOW_TO_STEPS.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    text: step,
  })),
}

export const Route = createFileRoute('/how-it-works')({
  head: () => ({
    meta: [
      {
        title: `Como funciona o ${SITE_NAME} | Lista de presentes online`,
      },
      {
        name: 'description',
        content:
          'Veja como criar sua lista de presentes no MyWish em poucos minutos e compartilhar com convidados.',
      },
      {
        property: 'og:title',
        content: `Como funciona o ${SITE_NAME}`,
      },
      {
        property: 'og:description',
        content:
          'Passo a passo para criar, personalizar e compartilhar lista de presentes online.',
      },
      {
        property: 'og:type',
        content: 'article',
      },
      {
        property: 'og:url',
        content: absoluteUrl('/how-it-works'),
      },
    ],
  }),
  component: HowItWorksPage,
})

function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(howToJsonLd) }}
      />

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">guia rápido</p>
        <h1 className="font-display italic text-4xl text-espresso">
          Como funciona o <BrandWordmark casing="title" />
        </h1>
        <p className="text-warm-gray leading-relaxed max-w-3xl">
          O MyWish permite criar uma lista de presentes online com link
          único de compartilhamento.
          Você organiza seu evento, adiciona os itens desejados e envia para convidados sem precisar
          de processo complicado.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-medium text-espresso">Como criar uma lista de presentes?</h2>
        <ol className="space-y-3 list-decimal pl-6 text-warm-gray leading-relaxed">
          {HOW_TO_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-border/50 bg-warm-white p-6">
        <h2 className="text-xl font-medium text-espresso">Quanto tempo leva para publicar?</h2>
        <p className="text-warm-gray mt-2 leading-relaxed">
          Na maioria dos casos, você publica sua lista em poucos minutos. O processo foi
          desenhado para ser rápido, objetivo e fácil de compartilhar.
        </p>
      </section>

      <Link to="/events/create" className="inline-flex text-sm text-muted-rose hover:underline">
        Começar minha lista
      </Link>
    </div>
  )
}
