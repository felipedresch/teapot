// Endereço do redirecionamento com rastreio de um presente. Puro: vale no
// navegador e no servidor.
export type GiftLinkSource = 'guest' | 'host'

export const GIFT_LINK_SOURCE_PARAM = 'o'
export const GIFT_LINK_DISTINCT_ID_PARAM = 'd'

export function giftLinkHref(
  giftId: string,
  source: GiftLinkSource,
  distinctId?: string | null,
) {
  const params = new URLSearchParams({ [GIFT_LINK_SOURCE_PARAM]: source })
  if (distinctId) params.set(GIFT_LINK_DISTINCT_ID_PARAM, distinctId)
  return `/r/${encodeURIComponent(giftId)}?${params.toString()}`
}

export function parseGiftLinkSource(
  value: string | null,
): GiftLinkSource | 'unknown' {
  return value === 'guest' || value === 'host' ? value : 'unknown'
}

// Robôs (buscadores, prévias de link) não contam como clique.
const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python-requests|headless/i

export function isBotUserAgent(userAgent: string | null) {
  return !userAgent || BOT_USER_AGENT.test(userAgent)
}
