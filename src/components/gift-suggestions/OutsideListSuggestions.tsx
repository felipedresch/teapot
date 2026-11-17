import { ArrowUpRight, Star } from 'lucide-react'
import { useState } from 'react'
import type { SuggestionIdeaView, SuggestionProduct } from './types'

// "Outras ideias", no fim da lista, só para o convidado: um produto por ideia
// mais pedida da ocasião (o "Mais escolhido" da curadoria). Fica claro que não
// é a lista dos anfitriões: é para quem não achou o que queria ou chegou
// quando tudo já estava reservado. docs/AFFILIATES.md.

const MAX_PRODUCTS = 8

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function pickProducts(ideas: SuggestionIdeaView[]) {
  const picks: Array<{ idea: SuggestionIdeaView; product: SuggestionProduct }> =
    []
  for (const idea of ideas) {
    const product =
      idea.products.find((candidate) => candidate.slot === 'popular') ??
      idea.products[0]
    if (product) picks.push({ idea, product })
    if (picks.length >= MAX_PRODUCTS) break
  }
  return picks
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <span className="block size-full bg-blush/20" />
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="size-full object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
    />
  )
}

export function OutsideListSuggestions({
  ideas,
  occasionLabel,
  hostNames,
  everythingReserved,
  onProductClick,
}: {
  ideas: SuggestionIdeaView[] | undefined
  // "chá de casa nova"
  occasionLabel: string
  // "Gabriel e Giovanna"
  hostNames: string
  // Nenhum presente disponível: o título muda.
  everythingReserved: boolean
  onProductClick: (product: SuggestionProduct, idea: SuggestionIdeaView) => void
}) {
  const picks = ideas ? pickProducts(ideas) : []
  if (picks.length < 2) return null

  return (
    <section
      aria-labelledby="outside-list-title"
      className="mx-auto mt-14 max-w-6xl px-4 sm:px-6"
    >
      <div className="rounded-[1.75rem] border border-muted-rose/20 bg-gradient-to-b from-blush/15 to-warm-white/60 px-4 py-7 sm:px-8 sm:py-9">
        <header className="max-w-xl">
          <p className="font-accent text-xl leading-none text-muted-rose">
            fora da lista
          </p>
          <h2
            id="outside-list-title"
            className="mt-2 font-display text-2xl italic leading-tight text-espresso sm:text-3xl"
          >
            {everythingReserved
              ? 'Os presentes da lista já foram escolhidos'
              : 'Quer dar outra coisa?'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-warm-gray">
            Estes produtos não fazem parte da lista de {hostNames}. São os mais
            pedidos em listas de {occasionLabel} no mywish, bem avaliados e
            fáceis de levar.
          </p>
        </header>

        <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {picks.map(({ idea, product }) => (
            <li
              key={product.itemId}
              className="w-[10.5rem] shrink-0 snap-start sm:w-auto"
            >
              <a
                href={product.productLink}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={() => onProductClick(product, idea)}
                className="group flex h-full flex-col rounded-2xl border border-border/80 bg-warm-white p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-muted-rose/40 hover:shadow-dreamy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-border/60">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                </span>
                <span className="mt-2.5 font-accent text-[15px] leading-none text-muted-rose">
                  {idea.label}
                </span>
                <span className="mt-1 line-clamp-2 min-h-[2.5em] text-[13px] leading-[1.25] text-espresso/90">
                  {product.name}
                </span>
                <span className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold tabular-nums text-espresso">
                    {priceFormatter.format(product.price)}
                  </span>
                  {product.rating ? (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-warm-gray/85">
                      <Star
                        aria-hidden
                        className="size-3 fill-soft-terracotta/80 text-soft-terracotta/80"
                      />
                      {product.rating.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  ) : null}
                </span>
                <span className="mt-auto pt-2.5">
                  <span className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-espresso/15 text-[12.5px] font-medium text-espresso transition-colors duration-200 group-hover:border-espresso/35 group-hover:bg-blush/20">
                    Ver na Shopee
                    <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
