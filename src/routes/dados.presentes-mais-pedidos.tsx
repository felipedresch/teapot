import { createFileRoute, Link } from '@tanstack/react-router'
import { giftInsights } from '../content/giftInsights'
import type { GiftInsightItem } from '../content/giftInsights'
import {
  formatLongDatePtBr,
  formatMonthPtBr,
  pageDates,
} from '../content/pageDates'
import {
  SITE_NAME,
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  pageMeta,
  toJsonLd,
} from '../lib/seo'
import { OccasionLinks } from '../components/OccasionLinks'

const PATH = '/dados/presentes-mais-pedidos'
const PUBLISHED = '2026-11-14'
const data = giftInsights
const casaNova = data.occasions.chaDeCasaNova
const panela = data.occasions.chaDePanela
const year = data.generatedAt.slice(0, 4)
const period = `${formatMonthPtBr(data.period.from)} a ${formatMonthPtBr(data.period.to)}`
const updated = formatLongDatePtBr(pageDates[PATH])

const TITLE = `Presentes mais pedidos em chá de casa nova e chá de panela (${year})`
const DESCRIPTION = `Levantamento com ${data.lists} listas reais e ${data.gifts.toLocaleString('pt-BR')} presentes: os itens que mais aparecem nas listas de chá de casa nova e chá de panela e os que os convidados mais reservam.`

const top = (items: readonly GiftInsightItem[], n: number) => items.slice(0, n)
const mostReserved = [...casaNova.items]
  .filter((i) => i.reservedShare !== null)
  .sort((a, b) => (b.reservedShare ?? 0) - (a.reservedShare ?? 0))
const lowerCase = (name: string) => name.charAt(0).toLowerCase() + name.slice(1)

const [c1, c2, c3] = casaNova.items
const [p1, p2] = panela.items
const summary = `Nas ${casaNova.lists} listas de chá de casa nova analisadas, os itens mais frequentes foram ${lowerCase(c1.name)} (${c1.listShare}% das listas), ${lowerCase(c2.name)} (${c2.listShare}%) e ${lowerCase(c3.name)} (${c3.listShare}%). No chá de panela, ${lowerCase(p1.name)} aparece em ${p1.listShare}% das listas e ${lowerCase(p2.name)} em ${p2.listShare}%. Uma lista típica tem ${data.medianGifts} presentes.`

const FAQ = [
  {
    question: 'Quais são os presentes mais pedidos em chá de casa nova?',
    answer: `No levantamento do ${SITE_NAME} com ${casaNova.lists} listas, os itens que mais aparecem são ${top(
      casaNova.items,
      5,
    )
      .map((i) => `${lowerCase(i.name)} (${i.listShare}%)`)
      .join(', ')}.`,
  },
  {
    question: 'Quais são os presentes mais pedidos em chá de panela?',
    answer: `Nas ${panela.lists} listas de chá de panela analisadas, lideram ${top(
      panela.items,
      5,
    )
      .map((i) => `${lowerCase(i.name)} (${i.listShare}%)`)
      .join(', ')}.`,
  },
  {
    question: 'Quantos presentes colocar numa lista de chá de casa nova?',
    answer: `A lista típica de chá de casa nova no ${SITE_NAME} tem ${casaNova.medianGifts} presentes (mediana); no chá de panela, ${panela.medianGifts}. Nas listas já compartilhadas, os convidados reservaram em média ${casaNova.reservedShare}% dos itens do chá de casa nova.`,
  },
  {
    question: 'Quais presentes os convidados mais escolhem?',
    answer: `Nas listas de chá de casa nova já compartilhadas, os itens mais reservados proporcionalmente foram ${top(
      mostReserved,
      4,
    )
      .map((i) => `${lowerCase(i.name)} (${i.reservedShare}% reservados)`)
      .join(', ')}.`,
  },
]

export const Route = createFileRoute('/dados/presentes-mais-pedidos')({
  head: () => ({ meta: pageMeta(TITLE, DESCRIPTION) }),
  component: GiftDataPage,
})

function Percent({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-warm-gray/70">—</span>
  ) : (
    <>{value}%</>
  )
}

function ItemsTable({
  caption,
  items,
}: {
  caption: string
  items: readonly GiftInsightItem[]
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-muted-rose/30">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-blush/20 text-espresso">
          <tr>
            <th scope="col" className="p-3 md:p-4 w-10">
              #
            </th>
            <th scope="col" className="p-3 md:p-4">
              Presente
            </th>
            <th scope="col" className="p-3 md:p-4">
              Listas que incluem
            </th>
            <th scope="col" className="p-3 md:p-4">
              Reservados pelos convidados
            </th>
          </tr>
        </thead>
        <tbody className="text-warm-gray">
          {items.map((item, index) => (
            <tr key={item.name} className="border-t border-muted-rose/15">
              <td className="p-3 md:p-4">{index + 1}</td>
              <th scope="row" className="p-3 md:p-4 font-medium text-espresso">
                {item.name}
              </th>
              <td className="p-3 md:p-4">{item.listShare}%</td>
              <td className="p-3 md:p-4">
                <Percent value={item.reservedShare} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GiftDataPage() {
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    inLanguage: 'pt-BR',
    creator: { '@type': 'Organization', name: SITE_NAME },
    dateModified: pageDates[PATH],
    temporalCoverage: `${data.period.from}/${data.period.to}`,
    spatialCoverage: 'Brasil',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    variableMeasured: [
      'Percentual de listas que incluem o presente',
      'Percentual dos presentes reservados por convidados',
    ],
  }

  return (
    <>
      <article className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-12">
        {[
          articleJsonLd({
            path: PATH,
            headline: TITLE,
            description: DESCRIPTION,
            datePublished: PUBLISHED,
            dateModified: pageDates[PATH],
          }),
          datasetJsonLd,
          faqJsonLd(FAQ),
          breadcrumbJsonLd([
            { name: 'Início', path: '/' },
            { name: 'Dados', path: PATH },
          ]),
        ].map((value, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toJsonLd(value) }}
          />
        ))}
        <header className="space-y-5 border-b border-muted-rose/25 pb-10">
          <p className="font-accent text-3xl text-muted-rose">
            o que as listas reais mostram
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight text-espresso">
            {TITLE}
          </h1>
          <p className="text-sm text-warm-gray">
            Levantamento do {SITE_NAME} · {period} · Atualizado em{' '}
            <time dateTime={pageDates[PATH]}>{updated}</time>
          </p>
          <p className="text-lg text-warm-gray leading-relaxed">{summary}</p>
        </header>

        <section aria-labelledby="numeros" className="space-y-5">
          <h2 id="numeros" className="font-display text-3xl text-espresso">
            O levantamento em números
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              [data.lists.toLocaleString('pt-BR'), 'listas analisadas'],
              [data.gifts.toLocaleString('pt-BR'), 'presentes cadastrados'],
              [String(data.medianGifts), 'presentes numa lista típica'],
              [`${data.linkShare}%`, 'dos presentes têm link de loja'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-blush/20 p-4">
                <dt className="text-sm text-warm-gray">{label}</dt>
                <dd className="font-display text-3xl text-espresso">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="casa-nova" className="space-y-4">
          <h2 id="casa-nova" className="font-display text-3xl text-espresso">
            Os {casaNova.items.length} presentes mais pedidos no chá de casa
            nova
          </h2>
          <p className="text-warm-gray leading-relaxed">
            Base: {casaNova.lists} listas de chá de casa nova com pelo menos
            cinco presentes. A lista típica tem {casaNova.medianGifts} itens. A
            coluna de reservas considera só as listas que já foram
            compartilhadas com convidados.
          </p>
          <ItemsTable
            caption="Presentes mais pedidos em listas de chá de casa nova"
            items={casaNova.items}
          />
          <p className="text-sm">
            <Link
              to="/lista-de-presentes/$occasion"
              params={{ occasion: 'casa-nova' }}
              className="text-primary underline underline-offset-4"
            >
              Guia da lista de chá de casa nova
            </Link>
          </p>
        </section>

        <section aria-labelledby="cha-de-panela" className="space-y-4">
          <h2
            id="cha-de-panela"
            className="font-display text-3xl text-espresso"
          >
            Os {panela.items.length} presentes mais pedidos no chá de panela
          </h2>
          <p className="text-warm-gray leading-relaxed">
            Base: {panela.lists} listas de chá de panela (também chamado de chá
            de cozinha) com pelo menos cinco presentes. A lista típica tem{' '}
            {panela.medianGifts} itens.
          </p>
          <ItemsTable
            caption="Presentes mais pedidos em listas de chá de panela"
            items={panela.items}
          />
          <p className="text-sm">
            <Link
              to="/lista-de-presentes/$occasion"
              params={{ occasion: 'cha-de-panela' }}
              className="text-primary underline underline-offset-4"
            >
              Guia da lista de chá de panela
            </Link>
          </p>
        </section>

        <section aria-labelledby="mais-escolhidos" className="space-y-4">
          <h2
            id="mais-escolhidos"
            className="font-display text-3xl text-espresso"
          >
            Os presentes que os convidados mais escolhem
          </h2>
          <p className="text-warm-gray leading-relaxed">
            Estar na lista não é o mesmo que ser escolhido. Nas listas de chá de
            casa nova já compartilhadas, estes itens tiveram a maior proporção
            de reservas:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-warm-gray">
            {top(mostReserved, 6).map((item) => (
              <li key={item.name}>
                <span className="text-espresso font-medium">{item.name}</span>:{' '}
                {item.reservedShare}% reservados
              </li>
            ))}
          </ol>
          <p className="text-warm-gray leading-relaxed">
            No outro extremo, {lowerCase(mostReserved.at(-1)?.name ?? '')} (
            {mostReserved.at(-1)?.reservedShare}%),{' '}
            {lowerCase(mostReserved.at(-2)?.name ?? '')} (
            {mostReserved.at(-2)?.reservedShare}%) e{' '}
            {lowerCase(mostReserved.at(-3)?.name ?? '')} (
            {mostReserved.at(-3)?.reservedShare}%) ficaram mais tempo
            disponíveis. Para itens assim, uma descrição com medida, cor e link
            de referência ajuda o convidado a decidir.
          </p>
        </section>

        <section aria-labelledby="aniversario" className="space-y-4">
          <h2 id="aniversario" className="font-display text-3xl text-espresso">
            E no aniversário?
          </h2>
          <p className="text-warm-gray leading-relaxed">
            Listas de aniversário são mais pessoais e quase não repetem itens,
            então mostramos a divisão por categoria. A lista típica tem{' '}
            {data.birthday.medianGifts} itens.
          </p>
          <ul className="space-y-2 text-warm-gray">
            {data.birthday.categories.map((category) => (
              <li key={category.name}>
                <span className="text-espresso font-medium">
                  {category.name}
                </span>
                : {category.giftShare}% dos presentes
              </li>
            ))}
          </ul>
          <p className="text-sm">
            <Link
              to="/lista-de-presentes/$occasion"
              params={{ occasion: 'aniversario' }}
              className="text-primary underline underline-offset-4"
            >
              Guia da lista de aniversário
            </Link>
          </p>
        </section>

        <section aria-labelledby="lojas" className="space-y-4">
          <h2 id="lojas" className="font-display text-3xl text-espresso">
            De quais lojas vêm os links
          </h2>
          <p className="text-warm-gray leading-relaxed">
            {data.linkShare}% dos presentes têm um link de referência. Entre
            eles, a divisão por loja é:
          </p>
          <ul className="space-y-2 text-warm-gray">
            {data.stores.map((store) => (
              <li key={store.name}>
                <span className="text-espresso font-medium">{store.name}</span>:{' '}
                {store.share}% dos links
              </li>
            ))}
          </ul>
          <p className="text-warm-gray leading-relaxed">
            As listas misturam lojas: o anfitrião escolhe o produto de
            referência e o convidado compra onde preferir.
          </p>
        </section>

        <section aria-labelledby="como-usar" className="space-y-4">
          <h2 id="como-usar" className="font-display text-3xl text-espresso">
            Como usar esses dados na sua lista
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-warm-gray leading-relaxed">
            <li>
              Comece pelo básico de cozinha e mesa: pratos, copos, talheres,
              potes e formas aparecem em mais de 70% das listas.
            </li>
            <li>
              Para itens de gosto pessoal, como tapete, roupa de cama e edredom,
              informe medida, cor e um link de referência. Assim o convidado
              escolhe com segurança.
            </li>
            <li>
              Ofereça faixas de preço diferentes. Uma lista com cerca de{' '}
              {data.medianGifts} itens dá opções para todos os convidados sem
              pesar no orçamento de ninguém.
            </li>
            <li>
              Inclua os campeões de reserva, como{' '}
              {lowerCase(mostReserved[0].name)} e{' '}
              {lowerCase(mostReserved[1].name)}: são os itens que os convidados
              mais escolhem.
            </li>
          </ul>
        </section>

        <section aria-labelledby="metodologia" className="space-y-4">
          <h2 id="metodologia" className="font-display text-3xl text-espresso">
            Metodologia
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-warm-gray leading-relaxed">
            <li>
              Fonte: listas criadas no {SITE_NAME} entre {period}, com pelo
              menos cinco presentes cadastrados ({data.lists} listas,{' '}
              {data.gifts.toLocaleString('pt-BR')} presentes).
            </li>
            <li>
              Os nomes dos presentes foram agrupados em categorias por palavras-
              chave (por exemplo, "faqueiro" e "jogo de talheres" contam como o
              mesmo item). Um item só aparece quando está em pelo menos cinco
              listas diferentes.
            </li>
            <li>
              "Listas que incluem" é o percentual de listas da ocasião com ao
              menos um presente da categoria. "Reservados" é o percentual desses
              presentes que algum convidado reservou, considerando só as listas
              já compartilhadas.
            </li>
            <li>
              Os dados são agregados e anônimos: nenhum nome, evento, mensagem
              ou link individual é publicado.
            </li>
            <li>
              Atualizamos este levantamento periodicamente. Pode citar à
              vontade, com link para esta página: "{SITE_NAME}, {TITLE}".
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="perguntas"
          className="space-y-5 border-t border-muted-rose/25 pt-8"
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

        <aside className="rounded-3xl bg-blush/20 p-6 md:p-8 space-y-4">
          <h2 className="font-display text-2xl text-espresso">
            Monte a sua lista a partir do que funciona
          </h2>
          <p className="text-warm-gray">
            No {SITE_NAME} você junta presentes de qualquer loja numa lista só,
            e os convidados reservam o que vão dar para não repetir presente.
          </p>
          <Link
            to="/events/create"
            className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
          >
            Criar minha lista
          </Link>
        </aside>
      </article>
      <OccasionLinks />
    </>
  )
}
