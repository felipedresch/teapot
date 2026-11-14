// Escolhe 3 produtos por ideia, em faixas de preço. Puro e testado
// (tests/giftSuggestions.test.ts).
//
// A ordem de relevância da API é o ponto de partida. A comissão só desempata:
// o ganho é preço × comissão × chance de compra, e nas listas do mywish os
// presentes de preço médio, do dia a dia, são os mais reservados. Por isso
// nada aqui prefere o mais caro.
import type { ShopeeProduct } from './shopeeAffiliateApi'

export type SuggestionSlot = 'budget' | 'popular' | 'gift'

export const SUGGESTION_SLOT_LABELS: Record<SuggestionSlot, string> = {
  budget: 'Mais em conta',
  popular: 'Mais escolhido',
  gift: 'Para presentear',
}

export const MIN_RATING = 4.5
export const MIN_SALES = 50
// Se poucos passarem no filtro, aceita produto com menos vendas.
export const RELAXED_MIN_SALES = 10
// Só os mais relevantes entram na disputa.
export const RELEVANCE_POOL = 15
// "Para presentear" fica até este múltiplo da mediana de preço.
export const GIFT_MAX_PRICE_FACTOR = 2.2

export type RankedSuggestion = ShopeeProduct & {
  slot: SuggestionSlot
  // Posição na resposta da API (0 = mais relevante).
  relevance: number
}

type Candidate = ShopeeProduct & { relevance: number }

function passes(product: ShopeeProduct, minSales: number) {
  return (
    product.rating !== null &&
    product.rating >= MIN_RATING &&
    (product.sales ?? 0) >= minSales
  )
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

const commission = (product: Candidate) => product.commissionRate ?? 0

// Primeiro pelo critério, depois comissão, depois relevância.
function pickBest(
  candidates: Candidate[],
  compare: (a: Candidate, b: Candidate) => number,
) {
  return [...candidates].sort(
    (a, b) =>
      compare(a, b) ||
      commission(b) - commission(a) ||
      a.relevance - b.relevance,
  )[0]
}

export function rankSuggestions(products: ShopeeProduct[]): RankedSuggestion[] {
  const indexed = products.map((product, relevance) => ({
    ...product,
    relevance,
  }))
  let pool = indexed.filter((product) => passes(product, MIN_SALES))
  if (pool.length < 3) {
    pool = indexed.filter((product) => passes(product, RELAXED_MIN_SALES))
  }
  pool = pool.slice(0, RELEVANCE_POOL)
  if (pool.length === 0) return []

  const picked: RankedSuggestion[] = []
  const remaining = () =>
    pool.filter((product) => !picked.some((p) => p.itemId === product.itemId))

  // Mais escolhido: o que mais vende entre os relevantes.
  const popular = pickBest(pool, (a, b) => (b.sales ?? 0) - (a.sales ?? 0))
  picked.push({ ...popular, slot: 'popular' })

  const mid = median(pool.map((product) => product.price))

  // Mais em conta: o mais barato até a mediana (e abaixo do mais escolhido),
  // entre os que vendem; empate de preço vai para quem vende mais.
  const cheaper = remaining().filter(
    (product) => product.price <= mid && product.price < popular.price,
  )
  const budgetPool = cheaper.length
    ? cheaper
    : remaining().filter((product) => product.price < popular.price)
  if (budgetPool.length) {
    const budget = pickBest(
      budgetPool,
      (a, b) => a.price - b.price || (b.sales ?? 0) - (a.sales ?? 0),
    )
    picked.push({ ...budget, slot: 'budget' })
  }

  // Para presentear: um pouco acima do mais escolhido, sem passar de
  // GIFT_MAX_PRICE_FACTOR × mediana; entre esses, o que mais vende.
  const ceiling = Math.max(mid, popular.price) * GIFT_MAX_PRICE_FACTOR
  const above = remaining().filter(
    (product) => product.price > popular.price && product.price <= ceiling,
  )
  if (above.length) {
    const gift = pickBest(above, (a, b) => (b.sales ?? 0) - (a.sales ?? 0))
    picked.push({ ...gift, slot: 'gift' })
  }

  const order: SuggestionSlot[] = ['budget', 'popular', 'gift']
  return picked.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot))
}
