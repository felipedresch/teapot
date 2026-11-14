import { describe, expect, it, vi } from 'vitest'
import {
  detectStore,
  enabledStores,
  readAffiliateConfig,
  toAffiliateUrl,
  type AffiliateConfig,
} from '../src/lib/affiliate'
import { resolveRedirects, type FetchLike } from '../src/lib/affiliate/resolve'
import {
  SHOPEE_GRAPHQL_URL,
  buildShopeeGraphqlRequest,
} from '../src/lib/affiliate/shopee'
import { shortLinkQuery } from '../convex/lib/shopeeAffiliateApi'
import { isShortener, parseHttpUrl } from '../src/lib/affiliate/stores'
import { giftLinkHref, isBotUserAgent } from '../src/lib/affiliate/links'

const CONFIG: AffiliateConfig = {
  amazon: { tag: 'mywish-20' },
  shopee: { appId: '18300000000', secret: 'segredo' },
  mercadolivre: { word: 'mywish', toolId: '12345678' },
}

function redirect(location: string, status = 301) {
  return new Response(null, { status, headers: { location } })
}

// fetch simulado: cada URL pedida devolve a resposta da tabela.
function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn<FetchLike>(async (input) => {
    const handler = routes[input]
    if (!handler) throw new Error(`fetch inesperado: ${input}`)
    return handler()
  })
}

function store(raw: string) {
  const url = parseHttpUrl(raw)
  return url ? detectStore(url) : null
}

describe('detecção de loja', () => {
  it('reconhece domínios e subdomínios de cada loja', () => {
    expect(store('https://www.amazon.com.br/dp/B0ABC')).toBe('amazon')
    expect(store('https://a.co/d/abc')).toBe('amazon')
    expect(store('https://amzn.to/3xyz')).toBe('amazon')
    expect(store('https://shopee.com.br/produto-i.1.2')).toBe('shopee')
    expect(store('https://br.shp.ee/AbCdEf')).toBe('shopee')
    expect(store('https://produto.mercadolivre.com.br/MLB-123')).toBe(
      'mercadolivre',
    )
    expect(store('https://meli.la/1AbCd')).toBe('mercadolivre')
    expect(store('https://www.magazineluiza.com.br/p/123')).toBe('magalu')
    expect(store('https://br.shein.com/item-p-1.html')).toBe('shein')
  })

  it('não confunde domínios parecidos nem lojas de outros países', () => {
    expect(store('https://www.amazon.com/dp/B0ABC')).toBeNull()
    expect(store('https://notshopee.com.br/x')).toBeNull()
    expect(store('https://mercadolivre.com.br.golpe.com/x')).toBeNull()
    expect(store('https://pin.it/abc')).toBeNull()
  })

  it('aceita link sem https:// e recusa outros protocolos', () => {
    expect(store('shopee.com.br/produto-i.1.2')).toBe('shopee')
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull()
    expect(parseHttpUrl('')).toBeNull()
  })
})

describe('configuração', () => {
  it('liga cada loja só com as variáveis completas', () => {
    expect(readAffiliateConfig({})).toEqual({})
    expect(
      readAffiliateConfig({
        AMAZON_ASSOCIATE_TAG: ' mywish-20 ',
        SHOPEE_AFFILIATE_APP_ID: '1830',
        MELI_AFFILIATE_TAG: 'mywish',
      }),
    ).toEqual({ amazon: { tag: 'mywish-20' } })
    expect(enabledStores(CONFIG)).toEqual(['amazon', 'shopee', 'mercadolivre'])
  })

  it('AFFILIATE_LINKS_DISABLED desliga tudo', () => {
    expect(
      readAffiliateConfig({
        AMAZON_ASSOCIATE_TAG: 'mywish-20',
        AFFILIATE_LINKS_DISABLED: 'true',
      }),
    ).toEqual({})
  })
})

describe('desligado: o link segue como veio', () => {
  it('não troca nem abre encurtador sem a variável da loja', async () => {
    const fetch = fakeFetch({})
    const result = await toAffiliateUrl('https://a.co/d/abc', {}, { fetch })
    expect(result).toEqual({
      url: 'https://a.co/d/abc',
      store: 'amazon',
      rewritten: false,
      reason: 'store_disabled',
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loja desconhecida e loja sem adaptador ficam iguais', async () => {
    const fetch = fakeFetch({})
    expect(
      await toAffiliateUrl('https://pin.it/abc', CONFIG, { fetch }),
    ).toMatchObject({
      url: 'https://pin.it/abc',
      store: null,
      reason: 'unknown_store',
    })
    expect(
      await toAffiliateUrl('https://www.magazineluiza.com.br/p/1', CONFIG, {
        fetch,
      }),
    ).toMatchObject({
      store: 'magalu',
      rewritten: false,
      reason: 'store_disabled',
    })
  })

  it('link inválido não vira redirecionamento', async () => {
    const result = await toAffiliateUrl('javascript:alert(1)', CONFIG)
    expect(result.reason).toBe('invalid_url')
  })
})

describe('Amazon', () => {
  it('põe a tag na URL da loja', async () => {
    const result = await toAffiliateUrl(
      'https://www.amazon.com.br/dp/B0ABC?th=1',
      CONFIG,
    )
    expect(result).toEqual({
      url: 'https://www.amazon.com.br/dp/B0ABC?th=1&tag=mywish-20',
      store: 'amazon',
      rewritten: true,
      reason: 'rewritten',
    })
  })

  it('não troca a tag de outro associado', async () => {
    const result = await toAffiliateUrl(
      'https://www.amazon.com.br/dp/B0ABC?tag=outra-20',
      CONFIG,
    )
    expect(result).toMatchObject({
      url: 'https://www.amazon.com.br/dp/B0ABC?tag=outra-20',
      rewritten: false,
      reason: 'existing_affiliate',
    })
  })

  it('reconhece a própria tag', async () => {
    const result = await toAffiliateUrl(
      'https://www.amazon.com.br/dp/B0ABC?tag=mywish-20',
      CONFIG,
    )
    expect(result.reason).toBe('own_affiliate')
  })

  it('segue o a.co até a loja e troca', async () => {
    const fetch = fakeFetch({
      'https://a.co/d/abc': () =>
        redirect('https://www.amazon.com.br/dp/B0ABC?ref_=cm_sw_r'),
    })
    const result = await toAffiliateUrl('https://a.co/d/abc', CONFIG, { fetch })
    expect(result).toMatchObject({
      url: 'https://www.amazon.com.br/dp/B0ABC?ref_=cm_sw_r&tag=mywish-20',
      rewritten: true,
    })
  })

  it('amzn.to de outro associado volta como veio', async () => {
    const fetch = fakeFetch({
      'https://amzn.to/3xyz': () =>
        redirect(
          'https://www.amazon.com.br/dp/B0ABC?tag=outra-20&linkCode=sl1',
        ),
    })
    const result = await toAffiliateUrl('https://amzn.to/3xyz', CONFIG, {
      fetch,
    })
    expect(result).toEqual({
      url: 'https://amzn.to/3xyz',
      store: 'amazon',
      rewritten: false,
      reason: 'existing_affiliate',
    })
  })
})

describe('Mercado Livre', () => {
  it('põe matt_word e matt_tool na URL do produto', async () => {
    const result = await toAffiliateUrl(
      'https://produto.mercadolivre.com.br/MLB-123-panela',
      CONFIG,
    )
    expect(result.url).toBe(
      'https://produto.mercadolivre.com.br/MLB-123-panela?matt_word=mywish&matt_tool=12345678',
    )
    expect(result.rewritten).toBe(true)
  })

  it('meli.la de outro afiliado não é trocado', async () => {
    const fetch = fakeFetch({
      'https://meli.la/1AbCd': () =>
        redirect(
          'https://www.mercadolivre.com.br/panela/p/MLB1?matt_word=outra&matt_tool=999',
          302,
        ),
    })
    const result = await toAffiliateUrl('https://meli.la/1AbCd', CONFIG, {
      fetch,
    })
    expect(result).toMatchObject({
      url: 'https://meli.la/1AbCd',
      reason: 'existing_affiliate',
      rewritten: false,
    })
  })
})

describe('Shopee', () => {
  it('assina o pedido como a API aberta pede', async () => {
    const request = await buildShopeeGraphqlRequest(
      shortLinkQuery('https://shopee.com.br/produto-i.1.2', [
        'mywish',
        'guest',
      ]),
      { appId: '123', secret: 'abc' },
      1700000000,
    )
    expect(JSON.parse(request.body).query).toBe(
      'mutation { generateShortLink(input: { originUrl: "https://shopee.com.br/produto-i.1.2", subIds: ["mywish","guest"] }) { shortLink } }',
    )
    const { createHash } = await import('node:crypto')
    const expected = createHash('sha256')
      .update(`1231700000000${request.body}abc`)
      .digest('hex')
    expect(request.headers.authorization).toBe(
      `SHA256 Credential=123, Timestamp=1700000000, Signature=${expected}`,
    )
  })

  it('segue o br.shp.ee e troca pelo link curto da API', async () => {
    const fetch = fakeFetch({
      'https://br.shp.ee/AbCdEf': () =>
        redirect('https://shopee.com.br/produto-i.1.2?smtt=0.0.9'),
      [SHOPEE_GRAPHQL_URL]: () =>
        Response.json({
          data: {
            generateShortLink: { shortLink: 'https://s.shopee.com.br/XyZ' },
          },
        }),
    })
    const result = await toAffiliateUrl('https://br.shp.ee/AbCdEf', CONFIG, {
      fetch,
    })
    expect(result).toEqual({
      url: 'https://s.shopee.com.br/XyZ',
      store: 'shopee',
      rewritten: true,
      reason: 'rewritten',
    })
    const body = JSON.parse(String(fetch.mock.calls[1][1]?.body))
    expect(body.query).toContain(
      'https://shopee.com.br/produto-i.1.2?smtt=0.0.9',
    )
  })

  it('não troca link de outro afiliado', async () => {
    const fetch = fakeFetch({})
    for (const raw of [
      'https://s.shopee.com.br/AbC',
      'https://shopee.com.br/produto-i.1.2?utm_medium=affiliates&utm_source=an_123',
      'https://shopee.com.br/produto-i.1.2?mmp_pid=an_123',
    ]) {
      const result = await toAffiliateUrl(raw, CONFIG, { fetch })
      expect(result).toMatchObject({ url: raw, reason: 'existing_affiliate' })
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('volta ao link original se a API falhar', async () => {
    const fetch = fakeFetch({
      [SHOPEE_GRAPHQL_URL]: () =>
        Response.json({ errors: [{ message: 'invalid signature' }] }),
    })
    const result = await toAffiliateUrl(
      'https://shopee.com.br/produto-i.1.2',
      CONFIG,
      { fetch },
    )
    expect(result).toMatchObject({
      url: 'https://shopee.com.br/produto-i.1.2',
      rewritten: false,
      reason: 'generator_failed',
    })
  })
})

describe('resolução de encurtador', () => {
  it('segue vários saltos e endereços relativos', async () => {
    const fetch = fakeFetch({
      'https://meli.la/1': () => redirect('https://mercadolivre.com.br/sec/1'),
      'https://mercadolivre.com.br/sec/1': () => redirect('/p/MLB1?x=1', 302),
    })
    const resolved = await resolveRedirects(
      new URL('https://meli.la/1'),
      fetch,
      1000,
      isShortener,
    )
    // Para na página da loja: não abre a página do produto.
    expect(resolved?.toString()).toBe('https://mercadolivre.com.br/p/MLB1?x=1')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('desiste no timeout e o link segue como veio', async () => {
    const hanging: FetchLike = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })
    const started = Date.now()
    const result = await toAffiliateUrl('https://a.co/d/abc', CONFIG, {
      fetch: hanging,
      resolveTimeoutMs: 50,
    })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(result).toMatchObject({
      url: 'https://a.co/d/abc',
      rewritten: false,
      reason: 'resolve_failed',
    })
  })

  it('encurtador que leva para outra loja não é trocado', async () => {
    const fetch = fakeFetch({
      'https://a.co/d/abc': () => redirect('https://golpe.example.com/x'),
    })
    const result = await toAffiliateUrl('https://a.co/d/abc', CONFIG, { fetch })
    expect(result.reason).toBe('resolve_failed')
    expect(result.url).toBe('https://a.co/d/abc')
  })

  it('erro de rede não quebra', async () => {
    const failing: FetchLike = async () => {
      throw new TypeError('network')
    }
    expect(
      await resolveRedirects(new URL('https://a.co/x'), failing),
    ).toBeNull()
  })
})

describe('link do presente', () => {
  it('monta /r/<giftId> com a origem e o distinct_id', () => {
    expect(giftLinkHref('abc123', 'guest')).toBe('/r/abc123?o=guest')
    expect(giftLinkHref('abc123', 'host', 'id 1')).toBe(
      '/r/abc123?o=host&d=id+1',
    )
  })

  it('não conta robôs como clique', () => {
    expect(isBotUserAgent('WhatsApp/2.23')).toBe(true)
    expect(isBotUserAgent('Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      ),
    ).toBe(false)
  })
})

describe('Convex', () => {
  it('os validadores do Convex têm as mesmas lojas e motivos', async () => {
    const { giftLinkReasonValidator, giftLinkStoreValidator } =
      await import('../convex/lib/giftLinkValidators')
    const { AFFILIATE_REASONS, AFFILIATE_STORES } =
      await import('../src/lib/affiliate')
    expect(giftLinkStoreValidator.members.map((m) => m.value)).toEqual([
      ...AFFILIATE_STORES,
    ])
    expect(giftLinkReasonValidator.members.map((m) => m.value)).toEqual(
      AFFILIATE_REASONS,
    )
  })
})

describe('clique no Convex', () => {
  it('os argumentos do evento do PostHog não têm campo com "$"', async () => {
    // O Convex recusa nome de campo começando com "$" (convexToJson), e a
    // mutation inteira falhava: o clique não era registrado.
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('convex/giftLinks.ts', 'utf8')
    expect(source).not.toMatch(/^\s*\$[a-z_]+\s*:/m)
    const { convexToJson } = await import('convex/values')
    expect(() =>
      convexToJson({
        properties: { linkSource: 'guest' },
        processPersonProfile: false,
      }),
    ).not.toThrow()
    expect(() => convexToJson({ $process_person_profile: false })).toThrow(
      /reserved/,
    )
  })
})
