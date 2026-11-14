import { AnimatePresence, motion } from 'motion/react'
import { Check, Gift, Plus, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AffiliateDisclosureNote } from '../GiftReferenceLink'
import type { AffiliateDisclosure } from '../../lib/affiliate/disclosure'
import type {
  SuggestionIdeaView,
  SuggestionProduct,
  SuggestionSlot,
} from './types'

// Sugestões de produto da Shopee para o anfitrião, no topo de "Adicionar
// presente": chips com as ideias mais pedidas nas listas do mywish e, ao
// tocar num chip, 3 opções por faixa de preço. Os dados vêm do cache diário
// (convex/productSuggestions.ts). Sem sugestões (Shopee desligada), não
// aparece. docs/AFFILIATES.md.

const SLOT_LABELS: Record<SuggestionSlot, string> = {
  budget: 'Mais em conta',
  popular: 'Mais escolhido',
  gift: 'Para presentear',
}

const ease = [0.22, 1, 0.36, 1] as const

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatSales(sales: number) {
  if (sales >= 1000) {
    const thousands = sales / 1000
    return `${thousands.toLocaleString('pt-BR', { maximumFractionDigits: thousands < 10 ? 1 : 0 })} mil vendidos`
  }
  return `${sales} vendidos`
}

export function GiftSuggestions({
  occasionLabel,
  ideas,
  listShares,
  disclosure,
  addedItemIds,
  defaultIdeaId,
  onAdd,
  onIdeaViewed,
  className,
}: {
  // "chá de casa nova", "aniversário"…
  occasionLabel: string
  // undefined: carregando.
  ideas: SuggestionIdeaView[] | undefined
  // % das listas da ocasião com a ideia (giftInsights), pelo rótulo.
  listShares?: Record<string, number>
  disclosure: AffiliateDisclosure | undefined
  addedItemIds?: ReadonlySet<string>
  // Só para a página de dev mostrar um chip aberto.
  defaultIdeaId?: string
  onAdd: (product: SuggestionProduct, idea: SuggestionIdeaView) => void
  onIdeaViewed?: (idea: SuggestionIdeaView) => void
  className?: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultIdeaId ?? null,
  )
  const viewed = useRef(new Set<string>())
  const selected = ideas?.find((idea) => idea.ideaId === selectedId) ?? null

  useEffect(() => {
    if (!selected || viewed.current.has(selected.ideaId)) return
    viewed.current.add(selected.ideaId)
    onIdeaViewed?.(selected)
  }, [selected, onIdeaViewed])

  if (ideas && ideas.length === 0) return null

  const share = selected ? listShares?.[selected.label] : undefined

  return (
    <section
      aria-labelledby="gift-suggestions-title"
      className={cn(
        'relative rounded-2xl border border-muted-rose/20 bg-warm-white/80 p-4 sm:p-6 shadow-dreamy',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-blush/45 ring-1 ring-muted-rose/20"
        >
          <Sparkles className="size-4 text-muted-rose" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <h4
            id="gift-suggestions-title"
            className="font-display italic text-lg sm:text-xl text-espresso leading-tight"
          >
            Ideias para o seu {occasionLabel}
          </h4>
          <p className="mt-0.5 font-accent text-base sm:text-lg text-muted-rose/90 leading-none">
            o que mais aparece nas listas do mywish
          </p>
        </div>
      </header>

      {/* Chips: rolam de lado no celular, quebram linha no desktop. */}
      <div className="relative mt-4 -mx-4 sm:mx-0">
        <div
          role="tablist"
          aria-label="Ideias de presente"
          className="flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ideas
            ? ideas.map((idea) => {
                const isActive = idea.ideaId === selectedId
                return (
                  <button
                    key={idea.ideaId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() =>
                      setSelectedId((current) =>
                        current === idea.ideaId ? null : idea.ideaId,
                      )
                    }
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-muted-rose/70 bg-blush/50 font-medium text-espresso shadow-[0_2px_10px_rgba(196,154,148,0.22)]'
                        : 'border-muted-rose/30 bg-warm-white text-espresso/85 hover:border-muted-rose/60 hover:bg-blush/20',
                    )}
                  >
                    {idea.label}
                  </button>
                )
              })
            : [96, 128, 84, 112, 104].map((width, index) => (
                <span
                  key={index}
                  aria-hidden
                  style={{ width }}
                  className="h-8 shrink-0 rounded-full bg-blush/30 animate-pulse"
                />
              ))}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-warm-white to-transparent sm:hidden"
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!ideas ? (
          <motion.div
            key="loading"
            role="status"
            aria-label="Carregando sugestões"
            className="mt-5 grid gap-3 sm:grid-cols-3"
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((index) => (
              <SuggestionCardSkeleton key={index} />
            ))}
          </motion.div>
        ) : selected ? (
          <motion.div
            key={selected.ideaId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            className="mt-5"
          >
            {share ? (
              <p className="mb-3 text-[12px] text-warm-gray/80">
                <span className="font-medium text-espresso/80">
                  {selected.label}
                </span>{' '}
                aparece em {share}% das listas de {occasionLabel}.
              </p>
            ) : null}
            {selected.products.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {selected.products.map((product, index) => (
                  <motion.div
                    key={product.itemId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.35, ease, delay: index * 0.06 },
                    }}
                  >
                    <SuggestionCard
                      product={product}
                      isAdded={addedItemIds?.has(product.itemId) ?? false}
                      onAdd={() => onAdd(product, selected)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-muted-rose/30 bg-blush/10 px-4 py-6 text-center">
                <p className="font-display italic text-espresso/85">
                  Nada que valha a pena hoje
                </p>
                <p className="mt-1 text-xs text-warm-gray/80">
                  Não achamos opções bem avaliadas para essa ideia. Tente outra,
                  ou cole o link de uma loja abaixo.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-xs text-warm-gray/75"
          >
            Toque numa ideia para ver três opções da Shopee, em faixas de preço
            diferentes.
          </motion.p>
        )}
      </AnimatePresence>

      <AffiliateDisclosureNote
        disclosure={disclosure}
        className="mt-4 border-t border-dashed border-muted-rose/20 pt-3 text-[11px] leading-relaxed text-warm-gray/60"
      />
    </section>
  )
}

function SuggestionImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  // Se a foto falhou antes da hidratação, o onError não chega a rodar.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setBroken(true)
  }, [src])
  if (broken) {
    return (
      <div
        role="img"
        aria-label={`${alt} (sem foto)`}
        className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-blush/25 to-cream/40"
      >
        <Gift className="size-6 text-muted-rose/55" strokeWidth={1.4} />
        <span className="text-[10px] uppercase tracking-[0.16em] text-warm-gray/55">
          sem foto
        </span>
      </div>
    )
  }
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      // Sem lazy: são só 3 fotos, e a checagem de erro acima precisa delas
      // carregadas.
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="size-full object-contain p-1.5"
    />
  )
}

function SuggestionCard({
  product,
  isAdded,
  onAdd,
}: {
  product: SuggestionProduct
  isAdded: boolean
  onAdd: () => void
}) {
  return (
    <article
      className={cn(
        'group relative flex h-full gap-3 rounded-2xl border bg-warm-white p-2.5 transition-all duration-200',
        'sm:flex-col sm:gap-0 sm:p-3',
        isAdded
          ? 'border-sage/60 shadow-[0_0_0_3px_rgba(168,197,168,0.18)]'
          : 'border-border/80 hover:border-muted-rose/35 hover:shadow-dreamy',
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border/60 sm:aspect-square sm:size-auto sm:w-full">
        <SuggestionImage src={product.imageUrl} alt={product.name} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col sm:mt-3">
        <p className="font-accent text-[17px] leading-none text-muted-rose">
          {SLOT_LABELS[product.slot]}
        </p>
        <h5
          title={product.name}
          className="mt-1 line-clamp-2 text-[13px] leading-snug text-espresso/90"
        >
          {product.name}
        </h5>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
              {product.sales ? (
                <span className="text-warm-gray/65">
                  {' '}
                  · {formatSales(product.sales)}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            'mt-auto inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-lg border px-3 text-[12.5px] font-medium transition-all duration-200 sm:mt-3 sm:h-9 sm:w-full sm:self-auto',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isAdded
              ? 'border-sage/60 bg-sage/20 text-espresso'
              : 'border-espresso/15 bg-warm-white text-espresso hover:border-espresso/35 hover:bg-blush/20',
          )}
        >
          {isAdded ? (
            <>
              <Check className="size-3.5" strokeWidth={2} />
              No formulário
            </>
          ) : (
            <>
              <Plus className="size-3.5" strokeWidth={2} />
              Adicionar
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function SuggestionCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-warm-white p-2.5 sm:flex-col sm:gap-0 sm:p-3">
      <div className="size-24 shrink-0 rounded-xl bg-blush/25 animate-pulse sm:aspect-square sm:size-auto sm:w-full" />
      <div className="flex flex-1 flex-col gap-2 sm:mt-3">
        <span className="h-3.5 w-20 rounded bg-blush/30 animate-pulse" />
        <span className="h-3 w-full rounded bg-blush/20 animate-pulse" />
        <span className="h-3 w-2/3 rounded bg-blush/20 animate-pulse" />
        <span className="mt-auto h-8 w-24 rounded-lg bg-blush/20 animate-pulse sm:w-full" />
      </div>
    </div>
  )
}
