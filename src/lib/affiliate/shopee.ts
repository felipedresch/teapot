import {
  parseShortLink,
  shopeeGraphql,
  shortLinkQuery,
  type FetchLike,
  type ShopeeCredentials,
} from '../../../convex/lib/shopeeAffiliateApi'

// Shopee Afiliados: a Open API gera um link curto s.shopee.com.br para
// qualquer URL da loja. O App ID e a senha saem do painel de afiliados, em
// "Open API" (docs/AFFILIATES.md). O cliente da API (assinatura, consultas)
// fica em convex/lib/shopeeAffiliateApi.ts, junto com o do cron do Convex.
export {
  SHOPEE_GRAPHQL_URL,
  buildShopeeGraphqlRequest,
} from '../../../convex/lib/shopeeAffiliateApi'

export const SHOPEE_TIMEOUT_MS = 2500

// Devolve o link curto de afiliado, ou null se a API falhar ou demorar.
export async function shopeeAffiliateUrl(
  url: URL,
  config: ShopeeCredentials,
  fetchImpl: FetchLike,
  subIds: string[] = ['mywish'],
  timeoutMs = SHOPEE_TIMEOUT_MS,
): Promise<URL | null> {
  const payload = await shopeeGraphql(
    shortLinkQuery(url.toString(), subIds),
    config,
    fetchImpl,
    timeoutMs,
  )
  return parseShortLink(payload)
}
