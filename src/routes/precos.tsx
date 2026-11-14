import { createFileRoute, Link } from '@tanstack/react-router'
import { SITE_NAME, SITE_URL, pageMeta, toJsonLd } from '../lib/seo'
import { formatLongDatePtBr, pageDates } from '../content/pageDates'

// Valores precisam acompanhar getPrices em convex/payments.ts.
const OFFERS = [
  [
    'Lista única: aniversário, chá de bebê, chá de panela, casa nova e outras ocasiões',
    '9.90',
  ],
  ['Acesso vitalício a partir de uma ocasião comum', '29.90'],
  ['Lista única: casamento, noivado e bodas', '29.90'],
  ['Acesso vitalício a partir de casamento, noivado ou bodas', '59.90'],
] as const

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: `${SITE_NAME}: lista de presentes online`,
  serviceType: 'Lista de presentes online',
  areaServed: 'BR',
  provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  description:
    'Montagem gratuita da lista de presentes. Pagamento único via Pix para liberar o compartilhamento, sem mensalidade e sem porcentagem sobre os presentes.',
  offers: OFFERS.map(([name, price]) => ({
    '@type': 'Offer',
    name,
    price,
    priceCurrency: 'BRL',
    url: `${SITE_URL}/precos`,
  })),
}
export const Route = createFileRoute('/precos')({
  head: () => ({
    meta: pageMeta(
      'Preços da lista de presentes: a partir de R$ 9,90',
      'Monte sua lista gratuitamente. Libere o compartilhamento por pagamento único via Pix, a partir de R$ 9,90. Confira os preços por ocasião e o acesso vitalício.',
    ),
  }),
  component: PricingPage,
})
function PricingPage() {
  return (
    <article className="max-w-4xl mx-auto px-6 py-14 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(serviceJsonLd) }}
      />
      <header className="space-y-4">
        <p className="font-accent text-3xl text-muted-rose">
          simples, desde o começo
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-espresso">
          Quanto custa uma lista no MyWish?
        </h1>
        <p className="text-lg text-warm-gray leading-relaxed">
          Montar e editar a lista é gratuito. Quando estiver pronta, você faz um
          pagamento único via Pix para liberar o compartilhamento. Não há
          mensalidade e o MyWish não fica com nenhuma porcentagem dos presentes.
        </p>
        <p className="text-sm text-warm-gray">
          Preços atualizados em{' '}
          <time dateTime={pageDates['/precos']}>
            {formatLongDatePtBr(pageDates['/precos'])}
          </time>
        </p>
      </header>
      <div className="overflow-x-auto rounded-2xl border border-muted-rose/30">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Preços por categoria de evento</caption>
          <thead className="bg-blush/20">
            <tr>
              <th className="p-4" scope="col">
                Ocasião
              </th>
              <th className="p-4" scope="col">
                Uma lista
              </th>
              <th className="p-4" scope="col">
                Acesso vitalício
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-muted-rose/20">
              <th scope="row" className="p-4 font-normal">
                Aniversário, chá de bebê, chá de panela, casa nova, formatura e
                outras ocasiões comuns
              </th>
              <td className="p-4 whitespace-nowrap">R$ 9,90</td>
              <td className="p-4 whitespace-nowrap">R$ 29,90</td>
            </tr>
            <tr className="border-t border-muted-rose/20">
              <th scope="row" className="p-4 font-normal">
                Casamento, noivado e bodas
              </th>
              <td className="p-4 whitespace-nowrap">R$ 29,90</td>
              <td className="p-4 whitespace-nowrap">R$ 59,90</td>
            </tr>
          </tbody>
        </table>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-espresso">
          Qual é a diferença entre os planos?
        </h2>
        <p className="text-warm-gray leading-relaxed">
          O pagamento por lista libera o compartilhamento daquele evento. O
          acesso vitalício fica vinculado à conta que fez o pagamento e libera
          as listas dessa conta, incluindo novas listas. O valor da compra é
          definido pela categoria do evento em que você contrata o plano e
          aparece antes de gerar o Pix.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-espresso">
          O que está incluído?
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-warm-gray">
          <li>Presentes com descrição, imagem e link de referência.</li>
          <li>Uma página para compartilhar com os convidados.</li>
          <li>Reserva de presentes e acompanhamento dos itens recebidos.</li>
          <li>Convite para outro anfitrião ajudar na organização.</li>
          <li>Escolha entre evento público e não listado após a liberação.</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-espresso">
          Os convidados precisam pagar ao MyWish?
        </h2>
        <p className="text-warm-gray leading-relaxed">
          Não. Os convidados visualizam a lista e entram com Google para
          reservar um presente. A compra do produto é feita diretamente na loja
          escolhida. O Pix do MyWish paga a liberação da lista, não os
          presentes, e não converte presentes em dinheiro.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-espresso">
          Taxa única ou porcentagem sobre os presentes?
        </h2>
        <p className="text-warm-gray leading-relaxed">
          Listas que transformam presentes em dinheiro costumam descontar uma
          porcentagem de cada presente recebido. No MyWish, o valor é fixo e
          pago uma vez por quem cria a lista: o convidado compra o presente na
          loja e nada é descontado.{' '}
          <Link
            to="/como-escolher-site-de-lista-de-presentes"
            className="underline"
          >
            Compare os tipos de lista de presentes
          </Link>
          .
        </p>
      </section>
      <Link
        to="/events/create"
        className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium"
      >
        Montar minha lista gratuitamente
      </Link>
      <p className="text-sm text-warm-gray">
        Mais detalhes nas{' '}
        <Link to="/faq" className="underline">
          perguntas frequentes
        </Link>
        .
      </p>
    </article>
  )
}
