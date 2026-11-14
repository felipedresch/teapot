// Troca do link do presente pelo link de afiliado, na hora do clique em
// /r/<giftId> (src/routes/r.$giftId.ts). O referenceUrl salvo pelo anfitrião
// nunca muda no banco. Como funciona e como ligar: docs/AFFILIATES.md.
import { amazonAffiliateUrl, isOwnAmazonTag } from './amazon'
import type { AffiliateConfig } from './config'
import { mercadoLivreAffiliateUrl } from './mercadolivre'
import { resolveRedirects, type FetchLike } from './resolve'
import { shopeeAffiliateUrl } from './shopee'
import {
  detectStore,
  hasExistingAffiliate,
  isShortener,
  parseHttpUrl,
  type AffiliateStore,
} from './stores'

export { readAffiliateConfig, enabledStores } from './config'
export type { AffiliateConfig } from './config'
export { AFFILIATE_STORES, detectStore } from './stores'
export type { AffiliateStore } from './stores'

export type AffiliateReason =
  // Trocou pelo nosso link.
  | 'rewritten'
  // Link inválido (não é http/https).
  | 'invalid_url'
  // Loja que a gente não conhece.
  | 'unknown_store'
  // Loja conhecida, mas sem adaptador (Magalu, Shein) ou sem a variável.
  | 'store_disabled'
  // Já tinha afiliado de outra pessoa: fica como está.
  | 'existing_affiliate'
  // Já tinha o nosso afiliado.
  | 'own_affiliate'
  // Encurtador não abriu a tempo.
  | 'resolve_failed'
  // A API da loja (Shopee) não devolveu link.
  | 'generator_failed'

export const AFFILIATE_REASONS: AffiliateReason[] = [
  'rewritten',
  'invalid_url',
  'unknown_store',
  'store_disabled',
  'existing_affiliate',
  'own_affiliate',
  'resolve_failed',
  'generator_failed',
]

export type AffiliateResult = {
  // Para onde o clique vai.
  url: string
  store: AffiliateStore | null
  rewritten: boolean
  reason: AffiliateReason
}

export type AffiliateOptions = {
  fetch?: FetchLike
  resolveTimeoutMs?: number
  // Vão para os subIds da Shopee (relatórios por origem).
  subIds?: string[]
}

function storeEnabled(store: AffiliateStore, config: AffiliateConfig) {
  return Boolean(config[store as keyof AffiliateConfig])
}

// De quem é o afiliado que já está no link: nosso, de outra pessoa ou nenhum.
function affiliateOwner(
  store: AffiliateStore,
  url: URL,
  config: AffiliateConfig,
): 'own' | 'other' | null {
  if (
    store === 'amazon' &&
    config.amazon &&
    isOwnAmazonTag(url, config.amazon.tag)
  ) {
    return 'own'
  }
  if (
    store === 'mercadolivre' &&
    config.mercadolivre &&
    url.searchParams.get('matt_word') === config.mercadolivre.word
  ) {
    return 'own'
  }
  return hasExistingAffiliate(store, url) ? 'other' : null
}

function ownerReason(owner: 'own' | 'other'): AffiliateReason {
  return owner === 'own' ? 'own_affiliate' : 'existing_affiliate'
}

export async function toAffiliateUrl(
  rawUrl: string,
  config: AffiliateConfig,
  options: AffiliateOptions = {},
): Promise<AffiliateResult> {
  const original = parseHttpUrl(rawUrl)
  if (!original) {
    return { url: rawUrl, store: null, rewritten: false, reason: 'invalid_url' }
  }
  const passthrough = (
    store: AffiliateStore | null,
    reason: AffiliateReason,
  ): AffiliateResult => ({
    url: original.toString(),
    store,
    rewritten: false,
    reason,
  })

  const store = detectStore(original)
  if (!store) return passthrough(null, 'unknown_store')
  // Loja desligada: nem segue o encurtador.
  if (!storeEnabled(store, config)) return passthrough(store, 'store_disabled')
  const ownerBefore = affiliateOwner(store, original, config)
  if (ownerBefore) return passthrough(store, ownerReason(ownerBefore))

  const fetchImpl = options.fetch ?? fetch
  let target = original
  if (isShortener(original)) {
    const resolved = await resolveRedirects(
      original,
      fetchImpl,
      options.resolveTimeoutMs,
      isShortener,
    )
    // Se o encurtador não chegou na mesma loja, o link segue como veio.
    if (!resolved || isShortener(resolved) || detectStore(resolved) !== store) {
      return passthrough(store, 'resolve_failed')
    }
    target = resolved
    // O afiliado costuma aparecer só depois de abrir o link curto (meli.la
    // e amzn.to são quase sempre de algum afiliado).
    const ownerAfter = affiliateOwner(store, target, config)
    if (ownerAfter) return passthrough(store, ownerReason(ownerAfter))
  }

  const rewritten = (next: URL): AffiliateResult => ({
    url: next.toString(),
    store,
    rewritten: true,
    reason: 'rewritten',
  })

  switch (store) {
    case 'amazon':
      return config.amazon
        ? rewritten(amazonAffiliateUrl(target, config.amazon.tag))
        : passthrough(store, 'store_disabled')
    case 'mercadolivre':
      return config.mercadolivre
        ? rewritten(mercadoLivreAffiliateUrl(target, config.mercadolivre))
        : passthrough(store, 'store_disabled')
    case 'shopee': {
      if (!config.shopee) return passthrough(store, 'store_disabled')
      const shortLink = await shopeeAffiliateUrl(
        target,
        config.shopee,
        fetchImpl,
        options.subIds,
      )
      return shortLink
        ? rewritten(shortLink)
        : passthrough(store, 'generator_failed')
    }
    default:
      // TODO: Magalu (Parceiro Magalu monta a vitrine em magazinevoce.com.br)
      // e Shein (programa de afiliados por rede parceira) ainda sem adaptador.
      return passthrough(store, 'store_disabled')
  }
}
