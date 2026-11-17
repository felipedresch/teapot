import { ArrowUpRight, Link2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GiftReferenceLink } from '../GiftReferenceLink'

// Produto da curadoria que combina com um presente sem link
// (convex/lib/suggestionMatch.ts), dentro do card do presente:
// - convidado: "Onde comprar", vai para a loja por /r/<giftId>?v=shopee, que
//   registra o clique e manda para o mesmo produto com link de afiliado;
// - anfitrião: "Link sugerido", com "Usar este link" para salvar no presente.
// docs/AFFILIATES.md.

export type GiftShoppingMatchProduct = {
  itemId: string
  name: string
  imageUrl: string
  price: number
  productLink: string
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-border/70">
      {broken ? null : (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="size-full object-contain p-0.5"
        />
      )}
    </span>
  )
}

function ProductText({
  kicker,
  product,
}: {
  kicker: string
  product: GiftShoppingMatchProduct
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-rose">
        {kicker}
      </span>
      <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-espresso/90">
        {product.name}
      </span>
      <span className="block text-[12.5px] font-semibold tabular-nums text-espresso">
        {priceFormatter.format(product.price)}
        <span className="font-normal text-warm-gray/80"> na Shopee</span>
      </span>
    </span>
  )
}

export function GuestShoppingMatch({
  giftId,
  product,
  onClick,
  className,
}: {
  giftId: string
  product: GiftShoppingMatchProduct
  onClick?: () => void
  className?: string
}) {
  return (
    <GiftReferenceLink
      giftId={giftId}
      source="guest"
      view="shopee"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-muted-rose/25 bg-blush/10 p-2 pr-3 transition-colors duration-200',
        'hover:border-muted-rose/50 hover:bg-blush/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Thumb src={product.imageUrl} />
      <ProductText kicker="Onde comprar" product={product} />
      <ArrowUpRight
        aria-hidden
        className="size-4 shrink-0 text-muted-rose transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={1.8}
      />
    </GiftReferenceLink>
  )
}

export function HostShoppingMatch({
  product,
  isSaving,
  onUse,
  className,
}: {
  product: GiftShoppingMatchProduct
  isSaving: boolean
  onUse: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-muted-rose/35 bg-warm-white p-2',
        className,
      )}
    >
      <a
        href={product.productLink}
        target="_blank"
        rel="nofollow sponsored noopener"
        className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Thumb src={product.imageUrl} />
        <ProductText kicker="Link sugerido" product={product} />
      </a>
      <button
        type="button"
        onClick={onUse}
        disabled={isSaving}
        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-espresso/15 text-[12px] font-medium text-espresso transition-colors duration-200 hover:border-espresso/35 hover:bg-blush/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
      >
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <Link2 className="size-3.5" strokeWidth={2} />
        )}
        Usar este link no presente
      </button>
    </div>
  )
}
