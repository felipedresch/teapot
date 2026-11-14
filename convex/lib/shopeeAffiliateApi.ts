// Cliente da Open API de afiliados da Shopee (GraphQL), usado pelo Worker
// (generateShortLink, src/lib/affiliate/shopee.ts) e pelo cron do Convex
// (productOfferV2, convex/productSuggestions.ts). Puro, sem variável de
// ambiente: quem chama passa as credenciais e o fetch.
//
// Autenticação: Authorization: SHA256 Credential=<appId>, Timestamp=<ts>,
// Signature=<sha256(appId + ts + corpo + senha)>, com o timestamp em segundos
// e o corpo exatamente como vai no POST. O formato saiu de clientes da
// comunidade, não da documentação oficial (docs/AFFILIATES.md).

export const SHOPEE_GRAPHQL_URL =
  'https://open-api.affiliate.shopee.com.br/graphql'

export type ShopeeCredentials = { appId: string; secret: string }

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildShopeeGraphqlRequest(
  query: string,
  credentials: ShopeeCredentials,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const body = JSON.stringify({ query })
  const signature = await sha256Hex(
    `${credentials.appId}${nowSeconds}${body}${credentials.secret}`,
  )
  return {
    body,
    headers: {
      'content-type': 'application/json',
      authorization: `SHA256 Credential=${credentials.appId}, Timestamp=${nowSeconds}, Signature=${signature}`,
    },
  }
}

type GraphqlResponse = {
  data?: Record<string, unknown> | null
  errors?: Array<{ message?: string }>
}

// POST assinado com timeout. Devolve o JSON (com data e/ou errors) ou null se
// a rede falhar, demorar ou a resposta não for JSON.
export async function shopeeGraphql(
  query: string,
  credentials: ShopeeCredentials,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<GraphqlResponse | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const request = await buildShopeeGraphqlRequest(query, credentials)
    const response = await fetchImpl(SHOPEE_GRAPHQL_URL, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    })
    if (!response.ok) return null
    return (await response.json()) as GraphqlResponse
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// JSON.stringify escapa aspas e barras: a string vale como literal GraphQL.
const gqlString = (value: string) => JSON.stringify(value)

// ── generateShortLink ──

// subIds aceitam até 5 valores e aparecem nos relatórios da Shopee.
function sanitizeSubId(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50)
}

export function shortLinkQuery(originUrl: string, subIds: string[]) {
  const ids = subIds.map(sanitizeSubId).filter(Boolean).slice(0, 5)
  return `mutation { generateShortLink(input: { originUrl: ${gqlString(originUrl)}, subIds: ${JSON.stringify(ids)} }) { shortLink } }`
}

export function parseShortLink(payload: GraphqlResponse | null) {
  const node = payload?.data?.generateShortLink as
    | { shortLink?: unknown }
    | undefined
  const shortLink = typeof node?.shortLink === 'string' ? node.shortLink : null
  if (!shortLink) return null
  try {
    const parsed = new URL(shortLink)
    return parsed.protocol === 'https:' ? parsed : null
  } catch {
    return null
  }
}

// ── productOfferV2 ──

// sortType da Shopee: 1 relevância, 2 mais vendidos, 3 maior preço,
// 4 menor preço, 5 maior comissão (fontes de terceiros).
export const SHOPEE_SORT_RELEVANCE = 1

// Campos pedidos. Se a API recusar algum (nome diferente), a busca tenta de
// novo com o mínimo.
export const PRODUCT_FIELDS_FULL = [
  'itemId',
  'productName',
  'imageUrl',
  'priceMin',
  'priceMax',
  'ratingStar',
  'sales',
  'commissionRate',
  'offerLink',
  'productLink',
  'shopName',
]
export const PRODUCT_FIELDS_MINIMAL = [
  'itemId',
  'productName',
  'imageUrl',
  'priceMin',
  'ratingStar',
  'sales',
  'productLink',
]

export function productOfferQuery(
  keyword: string,
  options: { limit?: number; page?: number; fields?: string[] } = {},
) {
  const fields = (options.fields ?? PRODUCT_FIELDS_FULL).join(' ')
  return `query { productOfferV2(keyword: ${gqlString(keyword)}, sortType: ${SHOPEE_SORT_RELEVANCE}, page: ${options.page ?? 1}, limit: ${options.limit ?? 30}) { nodes { ${fields} } pageInfo { page limit hasNextPage } } }`
}

export type ShopeeProduct = {
  itemId: string
  name: string
  imageUrl: string
  // Em reais.
  price: number
  rating: number | null
  sales: number | null
  // Fração (0.07 = 7%).
  commissionRate: number | null
  // URL normal do produto (é ela que o anfitrião salva).
  productLink: string
  shopName: string | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  // "39.90", "R$ 39,90", "1,2mil" não: só números simples.
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return cleaned && Number.isFinite(parsed) ? parsed : null
}

function toText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function toHttpsUrl(value: unknown): string | null {
  const text = toText(value)
  if (!text) return null
  try {
    const url = new URL(text)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

// Comissão pode vir como fração ("0.07") ou porcentagem ("7").
function toRate(value: unknown) {
  const rate = toNumber(value)
  if (rate === null || rate < 0) return null
  return rate > 1 ? rate / 100 : rate
}

// Converte um nó da resposta, aceitando pequenas diferenças de nome e tipo.
// Sem id, nome, imagem, preço ou link do produto: descarta.
export function normalizeShopeeProduct(node: unknown): ShopeeProduct | null {
  if (!node || typeof node !== 'object') return null
  const raw = node as Record<string, unknown>
  const itemId = toText(raw.itemId ?? raw.item_id ?? raw.id)
  const name = toText(raw.productName ?? raw.product_name ?? raw.name)
  const imageUrl = toHttpsUrl(raw.imageUrl ?? raw.image_url ?? raw.image)
  const price = toNumber(raw.priceMin ?? raw.price ?? raw.priceMax)
  const productLink = toHttpsUrl(
    raw.productLink ?? raw.product_link ?? raw.productUrl,
  )
  if (!itemId || !name || !imageUrl || !price || price <= 0 || !productLink) {
    return null
  }
  return {
    itemId,
    name,
    imageUrl,
    price,
    rating: toNumber(raw.ratingStar ?? raw.rating_star ?? raw.rating),
    sales: toNumber(raw.sales ?? raw.sold ?? raw.historicalSold),
    commissionRate: toRate(raw.commissionRate ?? raw.commission_rate),
    productLink,
    shopName: toText(raw.shopName ?? raw.shop_name),
  }
}

export function parseProductOffers(payload: GraphqlResponse | null) {
  const container = payload?.data?.productOfferV2 as
    | { nodes?: unknown }
    | undefined
  const nodes = Array.isArray(container?.nodes) ? container.nodes : []
  const seen = new Set<string>()
  const products: ShopeeProduct[] = []
  for (const node of nodes) {
    const product = normalizeShopeeProduct(node)
    if (!product || seen.has(product.itemId)) continue
    seen.add(product.itemId)
    products.push(product)
  }
  return products
}

// Busca por palavra-chave, na ordem de relevância da API. Se a consulta
// completa voltar com erro de validação (campo com outro nome), tenta com os
// campos mínimos. `null` quando a API não respondeu.
export async function searchShopeeProducts(
  keyword: string,
  credentials: ShopeeCredentials,
  fetchImpl: FetchLike,
  options: { limit?: number; timeoutMs?: number } = {},
): Promise<ShopeeProduct[] | null> {
  const timeoutMs = options.timeoutMs ?? 10_000
  const full = await shopeeGraphql(
    productOfferQuery(keyword, { limit: options.limit }),
    credentials,
    fetchImpl,
    timeoutMs,
  )
  if (!full) return null
  if (full.data?.productOfferV2) return parseProductOffers(full)
  if (!full.errors?.length) return null
  const minimal = await shopeeGraphql(
    productOfferQuery(keyword, {
      limit: options.limit,
      fields: PRODUCT_FIELDS_MINIMAL,
    }),
    credentials,
    fetchImpl,
    timeoutMs,
  )
  return minimal?.data?.productOfferV2 ? parseProductOffers(minimal) : null
}
