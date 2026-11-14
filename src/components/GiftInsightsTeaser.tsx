import { Link } from '@tanstack/react-router'
import { giftInsights } from '../content/giftInsights'
import { formatLongDatePtBr } from '../content/pageDates'

// Chamada da home para o levantamento /dados/presentes-mais-pedidos: mostra
// números reais e a data da última atualização, que também servem de sinal de
// conteúdo vivo para buscadores e assistentes de IA.
export function GiftInsightsTeaser() {
  const casaNova = giftInsights.occasions.chaDeCasaNova
  return (
    <section
      aria-labelledby="dados-home-title"
      className="max-w-5xl mx-auto px-6 py-12"
    >
      <div className="rounded-3xl border border-muted-rose/25 p-6 md:p-10 space-y-6">
        <div className="max-w-2xl space-y-3">
          <p className="font-accent text-2xl text-muted-rose">
            o que as listas reais mostram
          </p>
          <h2
            id="dados-home-title"
            className="font-display text-3xl text-espresso"
          >
            Os presentes mais pedidos no chá de casa nova
          </h2>
          <p className="text-warm-gray leading-relaxed">
            Analisamos {giftInsights.lists} listas e{' '}
            {giftInsights.gifts.toLocaleString('pt-BR')} presentes criados no
            MyWish. Atualizado em {formatLongDatePtBr(giftInsights.generatedAt)}
            .
          </p>
        </div>
        <ol className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {casaNova.items.slice(0, 6).map((item, index) => (
            <li
              key={item.name}
              className="rounded-2xl bg-blush/20 p-4 flex items-baseline gap-3"
            >
              <span className="font-display text-2xl text-muted-rose">
                {index + 1}
              </span>
              <span className="text-espresso">
                {item.name}
                <span className="block text-sm text-warm-gray">
                  em {item.listShare}% das listas
                </span>
              </span>
            </li>
          ))}
        </ol>
        <Link
          to="/dados/presentes-mais-pedidos"
          className="inline-flex text-primary font-medium underline underline-offset-4"
        >
          Ver o levantamento completo
        </Link>
      </div>
    </section>
  )
}
