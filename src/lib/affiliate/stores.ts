// Lojas que o redirecionamento /r/<giftId> reconhece. Tudo aqui é puro: só
// lê a URL, sem rede.

export const AFFILIATE_STORES = [
  'amazon',
  'shopee',
  'mercadolivre',
  'magalu',
  'shein',
] as const

export type AffiliateStore = (typeof AFFILIATE_STORES)[number]

type StoreHosts = {
  // Domínios da loja (vale o próprio domínio e qualquer subdomínio).
  domains: string[]
  // Encurtadores que levam para a loja e precisam ser seguidos antes da troca.
  shorteners: string[]
}

const STORE_HOSTS: Record<AffiliateStore, StoreHosts> = {
  // Só a Amazon Brasil: a tag de associado vale para um marketplace só.
  amazon: { domains: ['amazon.com.br'], shorteners: ['a.co', 'amzn.to'] },
  // br.shp.ee é o botão de compartilhar do app. s.shopee.com.br é o link
  // curto de afiliado (de quem gerou), tratado em hasExistingAffiliate.
  shopee: { domains: ['shopee.com.br'], shorteners: ['shp.ee'] },
  mercadolivre: { domains: ['mercadolivre.com.br'], shorteners: ['meli.la'] },
  magalu: {
    domains: ['magazineluiza.com.br', 'magalu.com', 'magazinevoce.com.br'],
    shorteners: [],
  },
  shein: { domains: ['shein.com', 'shein.com.br'], shorteners: [] },
}

function matchesHost(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

// O createGift não normaliza o link: alguns vêm sem https:// ("shopee.com.br/…").
export function parseHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, '')}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

// Loja do link, pelo domínio ou pelo encurtador.
export function detectStore(url: URL): AffiliateStore | null {
  const host = url.hostname.toLowerCase()
  for (const store of AFFILIATE_STORES) {
    const { domains, shorteners } = STORE_HOSTS[store]
    if (
      [...domains, ...shorteners].some((domain) => matchesHost(host, domain))
    ) {
      return store
    }
  }
  return null
}

export function isShortener(url: URL) {
  const host = url.hostname.toLowerCase()
  // O meli.la passa por mercadolivre.com.br/sec/<código> antes do produto.
  if (
    matchesHost(host, 'mercadolivre.com.br') &&
    url.pathname.startsWith('/sec/')
  ) {
    return true
  }
  return AFFILIATE_STORES.some((store) =>
    STORE_HOSTS[store].shorteners.some((domain) => matchesHost(host, domain)),
  )
}

function hasParam(url: URL, names: string[]) {
  return names.some((name) => url.searchParams.get(name)?.trim())
}

// O link já leva o afiliado de alguém (de outra pessoa ou o nosso)? Muitos
// links chegam pelo botão de compartilhar de quem já é afiliado: nesses, a
// comissão é de quem mandou e o link fica como está.
export function hasExistingAffiliate(store: AffiliateStore, url: URL) {
  const host = url.hostname.toLowerCase()
  switch (store) {
    case 'amazon':
      // `tag` é o código do associado. O amzn.to é quase sempre de um
      // associado: a tag aparece depois de seguir o encurtador.
      return hasParam(url, ['tag', 'ascsubtag'])
    case 'shopee': {
      if (matchesHost(host, 's.shopee.com.br')) return true
      const medium = url.searchParams.get('utm_medium')?.toLowerCase() ?? ''
      const source = url.searchParams.get('utm_source') ?? ''
      const pid = url.searchParams.get('mmp_pid') ?? ''
      return (
        medium === 'affiliates' ||
        source.startsWith('an_') ||
        pid.startsWith('an_') ||
        hasParam(url, ['af_siteid', 'uls_trackid'])
      )
    }
    case 'mercadolivre':
      return hasParam(url, ['matt_tool', 'matt_word', 'matt_source'])
    case 'magalu':
      // Links do Parceiro Magalu são a vitrine de alguém em magazinevoce.
      return matchesHost(host, 'magazinevoce.com.br')
    case 'shein':
      return hasParam(url, ['url_from', 'aff_id'])
  }
}
