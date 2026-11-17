import posthog from 'posthog-js'
import { useEffect, useState, type ReactNode } from 'react'
import { giftLinkHref, type GiftLinkSource } from '../lib/affiliate/links'

// Link "ver referência" de um presente salvo. Passa por /r/<giftId>, que
// registra o clique e troca pelo link de afiliado quando a loja está ligada
// (docs/AFFILIATES.md).
export function GiftReferenceLink({
  giftId,
  source,
  view,
  className,
  onClick,
  children,
}: {
  giftId: string
  source: GiftLinkSource
  // 'shopee': botão "Ver opções na Shopee" de um presente sem link.
  view?: 'shopee'
  className?: string
  onClick?: () => void
  children: ReactNode
}) {
  // O distinct_id só existe no navegador: entra depois da hidratação para o
  // clique do servidor cair no mesmo funil do PostHog.
  const [distinctId, setDistinctId] = useState<string | null>(null)
  useEffect(() => {
    try {
      if (posthog.__loaded) setDistinctId(posthog.get_distinct_id() || null)
    } catch {
      // sem PostHog o link funciona igual
    }
  }, [])

  return (
    <a
      href={giftLinkHref(giftId, source, distinctId, view)}
      target="_blank"
      rel="nofollow sponsored noopener"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  )
}
