// Botão "Ver opções na Shopee" de um presente sem link: leva o convidado à
// busca da Shopee pelo nome do presente, com link de afiliado.
//
// Não está confirmado se o generateShortLink aceita URL de busca. A ordem é:
// 1. link curto da busca;
// 2. se a API recusar, o produto em cache (sugestões) que combina com o nome,
//    com link curto;
// 3. se nada combinar, a busca sem afiliado (o convidado ainda acha o
//    presente; só não há comissão).
// O `reason` do clique no PostHog mostra qual caminho valeu.
import type { AffiliateConfig, AffiliateResult } from './index'
import type { FetchLike } from './resolve'
import { shopeeAffiliateUrl } from './shopee'

function isShopeeShortLink(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 's.shopee.com.br'
  } catch {
    return false
  }
}

export function shopeeSearchUrl(giftName: string) {
  const url = new URL('https://shopee.com.br/search')
  url.searchParams.set('keyword', giftName.trim().slice(0, 120))
  return url
}

export async function shopeeOptionsUrl(
  giftName: string,
  config: AffiliateConfig,
  deps: {
    fetch?: FetchLike
    // Produto em cache que combina com o nome (convex/productSuggestions.ts).
    findMatch: (name: string) => Promise<string | null>
    subIds?: string[]
  },
): Promise<AffiliateResult> {
  const searchUrl = shopeeSearchUrl(giftName)
  const passthrough = (url: string): AffiliateResult => ({
    url,
    store: 'shopee',
    rewritten: false,
    reason: config.shopee ? 'generator_failed' : 'store_disabled',
  })
  if (!config.shopee) {
    // Sem a Open API, só a curadoria: o link salvo já é o curto de afiliado
    // gerado no painel (s.shopee.com.br, docs/AFFILIATES.md).
    const curated = await deps.findMatch(giftName).catch(() => null)
    if (curated && isShopeeShortLink(curated)) {
      return {
        url: curated,
        store: 'shopee',
        rewritten: false,
        reason: 'own_affiliate',
      }
    }
    return passthrough(searchUrl.toString())
  }

  const fetchImpl = deps.fetch ?? fetch
  const subIds = deps.subIds ?? ['mywish', 'options']
  const rewritten = (url: URL): AffiliateResult => ({
    url: url.toString(),
    store: 'shopee',
    rewritten: true,
    reason: 'rewritten',
  })

  const searchShortLink = await shopeeAffiliateUrl(
    searchUrl,
    config.shopee,
    fetchImpl,
    subIds,
  )
  if (searchShortLink) return rewritten(searchShortLink)

  const match = await deps.findMatch(giftName).catch(() => null)
  if (match) {
    const productShortLink = await shopeeAffiliateUrl(
      new URL(match),
      config.shopee,
      fetchImpl,
      subIds,
    )
    return productShortLink ? rewritten(productShortLink) : passthrough(match)
  }
  return passthrough(searchUrl.toString())
}
