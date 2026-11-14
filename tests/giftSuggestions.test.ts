import { describe, expect, it, vi } from 'vitest'
import {
  PRODUCT_FIELDS_MINIMAL,
  SHOPEE_GRAPHQL_URL,
  normalizeShopeeProduct,
  parseProductOffers,
  productOfferQuery,
  searchShopeeProducts,
  type FetchLike,
  type ShopeeProduct,
} from '../convex/lib/shopeeAffiliateApi'
import { MIN_RATING, rankSuggestions } from '../convex/lib/suggestionRanking'
import {
  SUGGESTION_OCCASIONS,
  suggestionOccasionForEventType,
  uniqueSuggestionKeywords,
} from '../convex/lib/suggestionIdeas'
import { giftInsights } from '../src/content/giftInsights'
import { SHOPEE_FIXTURE_RESPONSES } from '../src/dev/shopeeFixtures'
import {
  shopeeOptionsUrl,
  shopeeSearchUrl,
} from '../src/lib/affiliate/shopeeOptions'

const CREDS = { appId: '123', secret: 'abc' }

function products(keyword: string) {
  return parseProductOffers(SHOPEE_FIXTURE_RESPONSES[keyword])
}

function product(over: Partial<ShopeeProduct>): ShopeeProduct {
  return {
    itemId: String(Math.random()),
    name: 'Produto',
    imageUrl: 'https://down-br.img.susercontent.com/file/x',
    price: 50,
    rating: 4.8,
    sales: 1000,
    commissionRate: 0.07,
    productLink: 'https://shopee.com.br/product/1/2',
    shopName: null,
    ...over,
  }
}

describe('leitura do productOfferV2', () => {
  it('converte texto em número e descarta nós incompletos', () => {
    const list = products('kit potes herméticos vidro')
    expect(list.map((p) => p.itemId)).not.toContain('106')
    expect(list[0]).toMatchObject({
      itemId: '101',
      price: 79.9,
      rating: 4.8,
      sales: 3200,
      commissionRate: 0.06,
    })
  })

  it('aceita nomes e formatos um pouco diferentes', () => {
    expect(
      normalizeShopeeProduct({
        item_id: 9,
        product_name: 'Jarra',
        image_url: 'https://x.test/a.jpg',
        price: 'R$ 39,90',
        rating_star: 4.6,
        sold: '120',
        commission_rate: '7',
        product_link: 'https://shopee.com.br/jarra-i.1.9',
      }),
    ).toMatchObject({
      itemId: '9',
      price: 39.9,
      rating: 4.6,
      sales: 120,
      commissionRate: 0.07,
    })
    expect(normalizeShopeeProduct({ itemId: 1, productName: 'x' })).toBeNull()
    expect(parseProductOffers({ data: null })).toEqual([])
  })

  it('pede keyword, ordem por relevância e limite', () => {
    expect(productOfferQuery('jarra "vidro"', { limit: 20 })).toContain(
      'productOfferV2(keyword: "jarra \\"vidro\\"", sortType: 1, page: 1, limit: 20)',
    )
  })

  it('se a consulta completa der erro de campo, tenta com os campos mínimos', async () => {
    const bodies: string[] = []
    const fetch = vi.fn<FetchLike>(async (_input, init) => {
      const body = String(init?.body)
      bodies.push(body)
      if (body.includes('commissionRate')) {
        return Response.json({
          errors: [{ message: 'Cannot query field "commissionRate"' }],
        })
      }
      return Response.json(
        SHOPEE_FIXTURE_RESPONSES['jogo de toalhas de banho algodão'],
      )
    })
    const result = await searchShopeeProducts('toalha', CREDS, fetch)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][0]).toBe(SHOPEE_GRAPHQL_URL)
    expect(bodies[1]).toContain(PRODUCT_FIELDS_MINIMAL.join(' '))
    expect(result?.length).toBe(4)
  })

  it('API fora devolve null (o cron mantém o cache)', async () => {
    const fetch: FetchLike = async () => new Response('erro', { status: 500 })
    expect(await searchShopeeProducts('x', CREDS, fetch)).toBeNull()
  })
})

describe('ranking por faixa de preço', () => {
  it('escolhe mais em conta, mais escolhido e para presentear', () => {
    const ranked = rankSuggestions(products('kit potes herméticos vidro'))
    expect(ranked.map((p) => [p.slot, p.itemId])).toEqual([
      ['budget', '103'],
      ['popular', '102'],
      ['gift', '101'],
    ])
  })

  it('filtra nota abaixo de 4,5 mesmo vendendo muito', () => {
    const ranked = rankSuggestions(products('kit potes herméticos vidro'))
    expect(ranked.every((p) => (p.rating ?? 0) >= MIN_RATING)).toBe(true)
    expect(ranked.map((p) => p.itemId)).not.toContain('104')
  })

  it('não puxa o mais caro: o de presente fica até 2,2× a mediana', () => {
    const ranked = rankSuggestions(products('aparelho de jantar 12 peças'))
    expect(ranked.map((p) => p.itemId)).not.toContain('204')
    expect(ranked.find((p) => p.slot === 'gift')?.itemId).toBe('201')
    expect(ranked.find((p) => p.slot === 'popular')?.itemId).toBe('202')
    expect(ranked.find((p) => p.slot === 'budget')?.itemId).toBe('205')
  })

  it('comissão só desempata', () => {
    const ranked = rankSuggestions([
      product({ itemId: 'a', sales: 500, commissionRate: 0.05, price: 40 }),
      product({ itemId: 'b', sales: 500, commissionRate: 0.12, price: 40 }),
      product({ itemId: 'c', sales: 900, commissionRate: 0.01, price: 60 }),
    ])
    expect(ranked.find((p) => p.slot === 'popular')?.itemId).toBe('c')
    expect(ranked.find((p) => p.slot === 'budget')?.itemId).toBe('b')
  })

  it('sem produto bom, nenhum card', () => {
    expect(rankSuggestions(products('escorredor de louça inox'))).toEqual([])
  })

  it('aceita menos vendas quando poucos passam', () => {
    const ranked = rankSuggestions([
      product({ itemId: 'a', sales: 20, price: 30 }),
      product({ itemId: 'b', sales: 15, price: 50 }),
    ])
    expect(ranked.length).toBe(2)
  })
})

describe('ideias', () => {
  it('saem dos itens mais pedidos do giftInsights', () => {
    const names = (key: 'chaDeCasaNova' | 'chaDePanela') =>
      giftInsights.occasions[key].items.map((item) => item.name)
    for (const idea of SUGGESTION_OCCASIONS.casaNova.ideas) {
      expect(names('chaDeCasaNova')).toContain(idea.label)
    }
    for (const idea of SUGGESTION_OCCASIONS.panela.ideas) {
      expect(names('chaDePanela')).toContain(idea.label)
    }
    const birthday = giftInsights.birthday.categories.map((c) => c.name)
    for (const idea of SUGGESTION_OCCASIONS.aniversario.ideas) {
      expect(birthday).toContain(idea.label)
    }
  })

  it('a mesma busca em duas ocasiões roda uma vez só', () => {
    const keywords = uniqueSuggestionKeywords()
    expect(keywords.get('kit potes herméticos vidro')).toEqual([
      { occasion: 'casaNova', ideaId: 'potes-hermeticos' },
      { occasion: 'panela', ideaId: 'potes-hermeticos' },
    ])
  })

  it('tipo de evento vira ocasião', () => {
    expect(suggestionOccasionForEventType('housewarming')).toBe('casaNova')
    expect(suggestionOccasionForEventType('wedding')).toBe('panela')
    expect(suggestionOccasionForEventType('birthday')).toBe('aniversario')
    expect(suggestionOccasionForEventType('graduation')).toBeNull()
  })
})

describe('ver opções na Shopee', () => {
  const config = { shopee: CREDS }
  const shortLink = (link: string) =>
    Response.json({ data: { generateShortLink: { shortLink: link } } })

  it('usa o link curto da busca quando a API aceita', async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      shortLink('https://s.shopee.com.br/busca'),
    )
    const result = await shopeeOptionsUrl('Jarra de vidro', config, {
      fetch,
      findMatch: async () => null,
    })
    expect(result).toMatchObject({
      url: 'https://s.shopee.com.br/busca',
      rewritten: true,
    })
    expect(String(fetch.mock.calls[0][1]?.body)).toContain(
      'https://shopee.com.br/search?keyword=Jarra+de+vidro',
    )
  })

  it('se a API recusar a busca, usa o produto em cache que combina', async () => {
    const fetch = vi.fn<FetchLike>(async (_input, init) =>
      String(init?.body).includes('/search')
        ? Response.json({ errors: [{ message: 'invalid url' }] })
        : shortLink('https://s.shopee.com.br/produto'),
    )
    const result = await shopeeOptionsUrl('Potes herméticos', config, {
      fetch,
      findMatch: async () => 'https://shopee.com.br/product/1000/102',
    })
    expect(result).toMatchObject({
      url: 'https://s.shopee.com.br/produto',
      rewritten: true,
    })
  })

  it('sem nada que combine, abre a busca sem afiliado', async () => {
    const fetch: FetchLike = async () => Response.json({ errors: [{}] })
    const result = await shopeeOptionsUrl('Cafeteira italiana', config, {
      fetch,
      findMatch: async () => null,
    })
    expect(result).toMatchObject({
      url: shopeeSearchUrl('Cafeteira italiana').toString(),
      rewritten: false,
      reason: 'generator_failed',
    })
  })

  it('Shopee desligada: nem chama a API', async () => {
    const fetch = vi.fn<FetchLike>()
    const result = await shopeeOptionsUrl(
      'Jarra',
      {},
      { fetch, findMatch: async () => null },
    )
    expect(result.reason).toBe('store_disabled')
    expect(fetch).not.toHaveBeenCalled()
  })
})
