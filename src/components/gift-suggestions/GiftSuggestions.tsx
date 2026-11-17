import { AnimatePresence, motion } from 'motion/react'
import { Check, Gift, Loader2, Plus, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type {
  SuggestionIdeaView,
  SuggestionProduct,
  SuggestionSlot,
} from './types'

// Sugestões de produto da Shopee para o anfitrião, no topo de "Adicionar
// presente" (página da lista) e do passo de presentes da criação: chips com as
// ideias mais pedidas nas listas do mywish e até 3 opções por faixa de preço.
// A primeira ideia já vem aberta: um bloco fechado esconde os produtos atrás
// de um toque. "Adicionar à lista" põe o presente na lista de uma vez. Os
// dados vêm de convex/productSuggestions.ts. Sem sugestões, não aparece.
// docs/AFFILIATES.md.

const SLOT_LABELS: Record<SuggestionSlot, string> = {
  budget: 'Mais em conta',
  popular: 'Mais escolhido',
  gift: 'Para presentear',
}

const ease = [0.22, 1, 0.36, 1] as const

// No desktop os chips quebram linha: até aqui aparecem direto, o resto num
// "+N ideias". No celular eles rolam de lado e aparecem todos.
const DESKTOP_VISIBLE_IDEAS = 6

// Cards em carrossel horizontal no celular (cabe 2 e a ponta do terceiro, como
// nas lojas) e em 3 colunas a partir do sm. O bloco é uma sugestão rápida: não
// pode tomar a tela inteira.
const CARD_TRACK_CLASS =
  'flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0'
const CARD_SLOT_CLASS = 'w-[8.5rem] shrink-0 snap-start sm:w-auto'

function CardRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative -mx-4 sm:mx-0', className)}>
      <div className={CARD_TRACK_CLASS}>{children}</div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-warm-white to-transparent sm:hidden"
      />
    </div>
  )
}

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
  addedItemIds,
  addingItemId,
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
  addedItemIds?: ReadonlySet<string>
  // Produto sendo adicionado agora (mostra "Adicionando…").
  addingItemId?: string | null
  // Ideia aberta de início; sem ela, a primeira.
  defaultIdeaId?: string
  onAdd: (product: SuggestionProduct, idea: SuggestionIdeaView) => void
  onIdeaViewed?: (idea: SuggestionIdeaView) => void
  className?: string
}) {
  // undefined: a pessoa ainda não tocou em nada (abre a primeira ideia);
  // null: fechou de propósito.
  const [pickedId, setPickedId] = useState<string | null | undefined>(
    defaultIdeaId,
  )
  const selectedId =
    pickedId === undefined ? (ideas?.[0]?.ideaId ?? null) : pickedId
  const [showAllIdeas, setShowAllIdeas] = useState(false)
  const viewed = useRef(new Set<string>())
  const selected = ideas?.find((idea) => idea.ideaId === selectedId) ?? null

  useEffect(() => {
    if (!selected || viewed.current.has(selected.ideaId)) return
    viewed.current.add(selected.ideaId)
    onIdeaViewed?.(selected)
  }, [selected, onIdeaViewed])

  if (ideas && ideas.length === 0) return null

  const share = selected ? listShares?.[selected.label] : undefined
  const foldedCount = showAllIdeas
    ? 0
    : (ideas ?? [])
        .slice(DESKTOP_VISIBLE_IDEAS)
        .filter((idea) => idea.ideaId !== selectedId).length

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
            ? ideas.map((idea, index) => {
                const isActive = idea.ideaId === selectedId
                const isFolded =
                  !showAllIdeas && !isActive && index >= DESKTOP_VISIBLE_IDEAS
                return (
                  <button
                    key={idea.ideaId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setPickedId(isActive ? null : idea.ideaId)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-200',
                      isFolded && 'sm:hidden',
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
          {foldedCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllIdeas(true)}
              className="hidden shrink-0 rounded-full border border-dashed border-muted-rose/40 px-3.5 py-1.5 text-[13px] text-warm-gray transition-colors hover:border-muted-rose/70 hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              +{foldedCount} ideias
            </button>
          ) : null}
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
            exit={{ opacity: 0 }}
          >
            <CardRow className="mt-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className={CARD_SLOT_CLASS}>
                  <SuggestionCardSkeleton />
                </div>
              ))}
            </CardRow>
          </motion.div>
        ) : selected ? (
          <motion.div
            key={selected.ideaId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            className="mt-4"
          >
            {share ? (
              <p className="mb-2.5 text-[11.5px] text-warm-gray/80">
                Está em {share}% das listas de {occasionLabel}.
              </p>
            ) : null}
            {selected.products.length > 0 ? (
              <CardRow>
                {selected.products.map((product, index) => (
                  <motion.div
                    key={product.itemId}
                    className={CARD_SLOT_CLASS}
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
                      isAdding={addingItemId === product.itemId}
                      onAdd={() => onAdd(product, selected)}
                    />
                  </motion.div>
                ))}
              </CardRow>
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
            Toque numa ideia para ver opções bem avaliadas, em faixas de preço
            diferentes.
          </motion.p>
        )}
      </AnimatePresence>
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
  isAdding,
  onAdd,
}: {
  product: SuggestionProduct
  isAdded: boolean
  isAdding: boolean
  onAdd: () => void
}) {
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border bg-warm-white p-2 transition-all duration-200 sm:p-2.5',
        isAdded
          ? 'border-sage/60 shadow-[0_0_0_3px_rgba(168,197,168,0.18)]'
          : 'border-border/80 hover:border-muted-rose/35 hover:shadow-dreamy',
      )}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border/60 sm:aspect-auto sm:h-36">
        <SuggestionImage src={product.imageUrl} alt={product.name} />
      </div>
      <p className="mt-2 font-accent text-[15px] leading-none text-muted-rose sm:text-[17px]">
        {SLOT_LABELS[product.slot]}
      </p>
      <h5
        title={product.name}
        className="mt-1 line-clamp-2 min-h-[2.5em] text-[12px] leading-[1.25] text-espresso/90 sm:text-[13px]"
      >
        {product.name}
      </h5>
      <p className="mt-1 text-[14px] font-semibold tabular-nums text-espresso sm:text-[15px]">
        {priceFormatter.format(product.price)}
      </p>
      {product.rating ? (
        <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10.5px] text-warm-gray/85 sm:text-[11px]">
          <Star
            aria-hidden
            className="size-3 fill-soft-terracotta/80 text-soft-terracotta/80"
          />
          {product.rating.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          {product.sales ? (
            <span className="truncate text-warm-gray/65">
              {' '}
              · {formatSales(product.sales)}
            </span>
          ) : null}
        </p>
      ) : null}
      <div aria-hidden className="min-h-2 flex-1" />
      <button
        type="button"
        onClick={onAdd}
        disabled={isAdded || isAdding}
        aria-live="polite"
        className={cn(
          'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-all duration-200 sm:text-[12.5px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isAdded
            ? 'cursor-default border-sage/60 bg-sage/20 text-espresso'
            : isAdding
              ? 'cursor-wait border-muted-rose/40 bg-blush/25 text-espresso/80'
              : 'border-transparent bg-primary text-primary-foreground hover:brightness-[1.04] active:scale-[0.98]',
        )}
      >
        {isAdded ? (
          <>
            <Check className="size-3.5" strokeWidth={2} />
            Na lista
          </>
        ) : isAdding ? (
          <>
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
            Adicionando…
          </>
        ) : (
          <>
            <Plus className="size-3.5" strokeWidth={2} />
            Adicionar à lista
          </>
        )}
      </button>
    </article>
  )
}

function SuggestionCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-warm-white p-2 sm:p-2.5">
      <div className="aspect-square w-full rounded-xl bg-blush/25 animate-pulse sm:aspect-auto sm:h-36" />
      <span className="mt-2.5 h-3.5 w-20 rounded bg-blush/30 animate-pulse" />
      <span className="mt-2 h-3 w-full rounded bg-blush/20 animate-pulse" />
      <span className="mt-1.5 h-3 w-2/3 rounded bg-blush/20 animate-pulse" />
      <span className="mt-3 h-8 w-full rounded-lg bg-blush/20 animate-pulse" />
    </div>
  )
}
