import type { FetchLike } from './resolve'

// Shopee Afiliados: a API aberta (GraphQL) gera um link curto
// s.shopee.com.br para qualquer URL da loja. O App ID e a senha saem do painel
// de afiliados, em "Open API" (docs/AFFILIATES.md).
//
// Autenticação: Authorization: SHA256 Credential=<appId>, Timestamp=<ts>,
// Signature=<sha256(appId + ts + corpo + senha)>, com o timestamp em
// segundos e o corpo exatamente como vai no POST.
export const SHOPEE_GRAPHQL_URL =
  'https://open-api.affiliate.shopee.com.br/graphql'
export const SHOPEE_TIMEOUT_MS = 2500

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// subIds aceitam até 5 valores e aparecem nos relatórios da Shopee: dá para
// separar os cliques do mywish dos de outros canais.
function sanitizeSubId(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50)
}

export async function buildShopeeRequest(
  originUrl: string,
  config: { appId: string; secret: string },
  subIds: string[],
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  // JSON.stringify escapa aspas e barras: a string vale como literal GraphQL.
  const ids = subIds.map(sanitizeSubId).filter(Boolean).slice(0, 5)
  const query = `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(originUrl)}, subIds: ${JSON.stringify(ids)} }) { shortLink } }`
  const body = JSON.stringify({ query })
  const signature = await sha256Hex(
    `${config.appId}${nowSeconds}${body}${config.secret}`,
  )
  return {
    body,
    headers: {
      'content-type': 'application/json',
      authorization: `SHA256 Credential=${config.appId}, Timestamp=${nowSeconds}, Signature=${signature}`,
    },
  }
}

// Devolve o link curto de afiliado, ou null se a API falhar ou demorar.
export async function shopeeAffiliateUrl(
  url: URL,
  config: { appId: string; secret: string },
  fetchImpl: FetchLike,
  subIds: string[] = ['mywish'],
  timeoutMs = SHOPEE_TIMEOUT_MS,
): Promise<URL | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const request = await buildShopeeRequest(url.toString(), config, subIds)
    const response = await fetchImpl(SHOPEE_GRAPHQL_URL, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      data?: { generateShortLink?: { shortLink?: string } }
    }
    const shortLink = payload.data?.generateShortLink?.shortLink
    if (!shortLink) return null
    const parsed = new URL(shortLink)
    return parsed.protocol === 'https:' ? parsed : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
