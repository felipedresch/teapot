import { createFileRoute, Link } from '@tanstack/react-router'
import { giftInsights } from '../content/giftInsights'
import { formatLongDatePtBr, pageDates } from '../content/pageDates'
import {
  SITE_NAME,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  pageMeta,
  toJsonLd,
} from '../lib/seo'
import { OccasionLinks } from '../components/OccasionLinks'
import { byPaywall } from '../lib/paywall'

const PATH = '/como-escolher-site-de-lista-de-presentes'
const PUBLISHED = '2026-11-14'
const TITLE = 'Site de lista de presentes: como escolher o melhor tipo'
const DESCRIPTION =
  'Comparativo dos tipos de lista de presentes online: lista de qualquer loja com reserva, lista que vira dinheiro, lista de uma loja só, lista de marketplace e planilha. Custos, prós e contras.'

// Comparamos tipos de solução, não marcas: preços e regras de cada empresa
// mudam e não temos como garantir que estejam atualizados aqui.
const OPTIONS = [
  {
    name: 'Lista de qualquer loja com reserva',
    example: `${SITE_NAME} e similares`,
    stores: 'Qualquer loja',
    repeated: 'Sim: o convidado reserva o presente',
    receives: 'O presente físico',
    cost: byPaywall(
      `Taxa única (no ${SITE_NAME}, R$ 9,90 ou R$ 29,90 por lista)`,
      `Taxa única ou grátis (no ${SITE_NAME}, grátis)`,
    ),
    goodFor:
      'Quem quer presentes de verdade, de lojas diferentes, sem presente repetido.',
    watch:
      'A compra e a entrega acontecem na loja escolhida pelo convidado, fora do site.',
  },
  {
    name: 'Lista que vira dinheiro (lista virtual ou de cotas)',
    example: 'Sites de casamento com presentes virtuais',
    stores: 'Não se aplica: o convidado paga no próprio site',
    repeated: 'Não se aplica',
    receives: 'Dinheiro, em geral descontada uma taxa por presente',
    cost: 'Normalmente uma porcentagem sobre cada presente recebido',
    goodFor:
      'Casais que preferem receber o valor para usar como quiserem, como na lua de mel.',
    watch:
      'Confira a taxa cobrada sobre cada presente e o prazo para sacar o dinheiro.',
  },
  {
    name: 'Lista de uma loja só',
    example: 'Listas de lojas de departamento e de casa',
    stores: 'Só a loja da lista',
    repeated: 'Sim, dentro da loja',
    receives: 'O presente físico ou crédito na loja',
    cost: 'Em geral gratuita',
    goodFor: 'Quem quer tudo de uma marca ou loja específica.',
    watch: 'O convidado fica preso ao catálogo e aos preços daquela loja.',
  },
  {
    name: 'Lista de desejos de marketplace',
    example: 'Listas de desejos de grandes marketplaces',
    stores: 'Só o marketplace',
    repeated: 'Depende do marketplace',
    receives: 'O presente físico',
    cost: 'Gratuita',
    goodFor: 'Listas simples com produtos de um único marketplace.',
    watch:
      'Pouco espaço para mensagem, data e informações do evento; não junta lojas diferentes.',
  },
  {
    name: 'Planilha, documento ou modelo para imprimir',
    example: 'Planilhas online, editores de design, bloco de notas',
    stores: 'Qualquer loja',
    repeated: 'Não: dois convidados podem comprar o mesmo item',
    receives: 'O presente físico',
    cost: 'Gratuita',
    goodFor: 'Listas pequenas, para poucas pessoas próximas.',
    watch:
      'Sem controle de reservas. Se a planilha for editável, qualquer um pode apagar ou alterar itens.',
  },
]

const CRITERIA = [
  {
    title: 'Você quer receber presentes ou dinheiro?',
    text: 'Essa é a primeira decisão. Listas que viram dinheiro cobram uma porcentagem de cada presente. Listas de presentes físicos não ficam com parte do valor, mas a compra acontece na loja.',
  },
  {
    title: 'Os presentes vêm de uma loja ou de várias?',
    text: `Quase ninguém monta a lista numa loja só. Nas listas do ${SITE_NAME}, os links de referência se dividem entre ${giftInsights.stores
      .slice(0, 3)
      .map((s) => `${s.name} (${s.share}%)`)
      .join(', ')} e outras lojas.`,
  },
  {
    title: 'Como evitar presente repetido?',
    text: 'Procure uma lista em que o convidado marca o presente como reservado e os outros veem isso na hora. Planilhas e listas impressas não fazem esse controle.',
  },
  {
    title: 'Quanto custa de verdade?',
    text: byPaywall(
      'Compare a taxa fixa (paga uma vez por quem cria a lista) com a porcentagem sobre presentes (descontada de cada presente). Numa lista com dezenas de itens, a diferença pode ser grande.',
      'Compare a lista grátis ou de taxa fixa (paga uma vez por quem cria a lista) com a porcentagem sobre presentes (descontada de cada presente). Numa lista com dezenas de itens, a diferença pode ser grande.',
    ),
  },
  {
    title: 'O convidado consegue usar pelo celular?',
    text: 'A maioria dos convidados abre a lista pelo link no WhatsApp. Teste o link no celular antes de enviar e veja se dá para reservar sem complicação.',
  },
]

const FAQ = [
  {
    question: 'Qual o melhor site para fazer lista de presentes?',
    answer: `Depende do que você quer receber. Para presentes físicos de várias lojas, sem repetição, use uma lista com reserva, como o ${SITE_NAME}. Se a ideia é receber dinheiro, uma lista virtual de cotas faz mais sentido, mas costuma cobrar uma porcentagem de cada presente.`,
  },
  {
    question: 'Existe lista de presentes online grátis?',
    answer: `Sim: planilhas, listas de uma loja só e listas de desejos de marketplace costumam ser gratuitas, mas não juntam lojas diferentes ou não controlam reservas. ${byPaywall(
      ` No ${SITE_NAME}, montar a lista é grátis e o compartilhamento custa um valor único a partir de R$ 9,90, sem porcentagem sobre os presentes.`,
      ` O ${SITE_NAME} junta as duas coisas de graça: presentes de qualquer loja, reserva para não repetir e compartilhamento sem custo, sem porcentagem sobre os presentes.`,
    )}`,
  },
  {
    question: 'Como fazer uma lista de presentes com produtos de várias lojas?',
    answer: `Use um site que aceite links de qualquer loja. No ${SITE_NAME}, você cola o link do produto (Shopee, Mercado Livre, Amazon ou outra loja), a imagem é preenchida e o convidado compra onde preferir depois de reservar.`,
  },
  {
    question: 'Como evitar que dois convidados deem o mesmo presente?',
    answer:
      'Escolha uma lista com reserva: quando um convidado reserva um item, ele aparece como escolhido para os demais. Em planilhas e listas impressas isso depende de combinação manual.',
  },
]

export const Route = createFileRoute(
  '/como-escolher-site-de-lista-de-presentes',
)({
  head: () => ({ meta: pageMeta(TITLE, DESCRIPTION) }),
  component: ComparisonPage,
})

function ComparisonPage() {
  const updated = pageDates[PATH]
  return (
    <>
      <article className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12">
        {[
          articleJsonLd({
            path: PATH,
            headline: TITLE,
            description: DESCRIPTION,
            datePublished: PUBLISHED,
            dateModified: updated,
          }),
          faqJsonLd(FAQ),
          breadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Listas de presentes', path: '/lista-de-presentes' },
            { name: 'Como escolher', path: PATH },
          ]),
        ].map((value, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toJsonLd(value) }}
          />
        ))}
        <header className="space-y-5 border-b border-muted-rose/25 pb-10 max-w-3xl">
          <p className="font-accent text-3xl text-muted-rose">
            antes de escolher
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight text-espresso">
            {TITLE}
          </h1>
          <p className="text-sm text-warm-gray">
            Atualizado em{' '}
            <time dateTime={updated}>{formatLongDatePtBr(updated)}</time>
          </p>
          <p className="text-lg text-warm-gray leading-relaxed">
            Existem cinco tipos de lista de presentes online: lista de qualquer
            loja com reserva, lista que vira dinheiro, lista de uma loja só,
            lista de desejos de marketplace e planilha. A escolha depende de
            duas perguntas: você quer receber o presente ou o dinheiro, e os
            presentes vêm de uma loja ou de várias?
          </p>
        </header>

        <section aria-labelledby="comparativo" className="space-y-4">
          <h2 id="comparativo" className="font-display text-3xl text-espresso">
            Comparativo dos tipos de lista de presentes
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-muted-rose/30">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">
                Comparativo dos tipos de lista de presentes online
              </caption>
              <thead className="bg-blush/20 text-espresso">
                <tr>
                  <th scope="col" className="p-3 md:p-4">
                    Tipo
                  </th>
                  <th scope="col" className="p-3 md:p-4">
                    Lojas
                  </th>
                  <th scope="col" className="p-3 md:p-4">
                    Evita presente repetido?
                  </th>
                  <th scope="col" className="p-3 md:p-4">
                    O anfitrião recebe
                  </th>
                  <th scope="col" className="p-3 md:p-4">
                    Custo
                  </th>
                </tr>
              </thead>
              <tbody className="text-warm-gray align-top">
                {OPTIONS.map((option) => (
                  <tr
                    key={option.name}
                    className="border-t border-muted-rose/15"
                  >
                    <th
                      scope="row"
                      className="p-3 md:p-4 font-medium text-espresso"
                    >
                      {option.name}
                      <span className="block text-xs font-normal text-warm-gray">
                        {option.example}
                      </span>
                    </th>
                    <td className="p-3 md:p-4">{option.stores}</td>
                    <td className="p-3 md:p-4">{option.repeated}</td>
                    <td className="p-3 md:p-4">{option.receives}</td>
                    <td className="p-3 md:p-4">{option.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="tipos" className="space-y-8">
          <h2 id="tipos" className="font-display text-3xl text-espresso">
            Para quem serve cada tipo
          </h2>
          {OPTIONS.map((option) => (
            <div key={option.name} className="space-y-2">
              <h3 className="font-display text-2xl text-espresso">
                {option.name}
              </h3>
              <p className="text-warm-gray leading-relaxed">
                <strong className="text-espresso font-medium">Bom para:</strong>{' '}
                {option.goodFor}
              </p>
              <p className="text-warm-gray leading-relaxed">
                <strong className="text-espresso font-medium">Atenção:</strong>{' '}
                {option.watch}
              </p>
            </div>
          ))}
        </section>

        <section aria-labelledby="criterios" className="space-y-6">
          <h2 id="criterios" className="font-display text-3xl text-espresso">
            5 perguntas para escolher sua lista
          </h2>
          <ol className="space-y-5">
            {CRITERIA.map((item, index) => (
              <li key={item.title} className="space-y-1">
                <h3 className="font-medium text-espresso">
                  {index + 1}. {item.title}
                </h3>
                <p className="text-warm-gray leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="mywish" className="space-y-4 max-w-3xl">
          <h2 id="mywish" className="font-display text-3xl text-espresso">
            Onde o {SITE_NAME} se encaixa
          </h2>
          <p className="text-warm-gray leading-relaxed">
            O {SITE_NAME} é uma lista de qualquer loja com reserva.{' '}
            {byPaywall(
              'Você monta a lista de graça, cola links de qualquer loja e libera o compartilhamento com um Pix único: R$ 9,90 para aniversário, chá de bebê, chá de panela e casa nova; R$ 29,90 para casamento, noivado e bodas.',
              'Você monta e compartilha a lista de graça, com links de qualquer loja.',
            )}{' '}
            Não há mensalidade nem porcentagem sobre os presentes.
          </p>
          <p className="text-warm-gray leading-relaxed">
            O {SITE_NAME} não é a melhor opção se você quer receber os presentes
            em dinheiro: ele não converte presentes em valor nem faz a entrega.
          </p>
          <p className="text-sm">
            <Link
              to="/precos"
              className="text-primary underline underline-offset-4"
            >
              {byPaywall('Ver preços', 'Por que é grátis')}
            </Link>{' '}
            ·{' '}
            <Link
              to="/dados/presentes-mais-pedidos"
              className="text-primary underline underline-offset-4"
            >
              Presentes mais pedidos nas listas
            </Link>
          </p>
        </section>

        <section
          aria-labelledby="perguntas"
          className="space-y-5 border-t border-muted-rose/25 pt-8 max-w-3xl"
        >
          <h2 id="perguntas" className="font-display text-3xl text-espresso">
            Perguntas frequentes
          </h2>
          {FAQ.map((item) => (
            <div key={item.question} className="space-y-2">
              <h3 className="font-medium text-espresso">{item.question}</h3>
              <p className="text-warm-gray leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </section>

        <aside className="rounded-3xl bg-blush/20 p-6 md:p-8 space-y-4 max-w-3xl">
          <h2 className="font-display text-2xl text-espresso">
            Quer testar antes de decidir?
          </h2>
          <p className="text-warm-gray">
            {byPaywall(
              `Monte sua lista no ${SITE_NAME} sem pagar nada. Você só paga se quiser compartilhar.`,
              `Monte e compartilhe sua lista no ${SITE_NAME} sem pagar nada.`,
            )}
          </p>
          <Link
            to="/events/create"
            className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
          >
            Montar minha lista grátis
          </Link>
        </aside>
      </article>
      <OccasionLinks />
    </>
  )
}
