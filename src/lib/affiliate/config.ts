import type { AffiliateStore } from './stores'

// IDs de afiliado de cada loja. Ficam no Worker (variável ou segredo):
// docs/AFFILIATES.md. Sem a variável, a loja fica desligada e o link segue
// como o anfitrião colou.
export type AffiliateConfig = {
  amazon?: { tag: string }
  shopee?: { appId: string; secret: string }
  mercadolivre?: { word: string; toolId: string }
}

type Env = Record<string, string | undefined>

function read(env: Env, name: string) {
  const value = env[name]?.trim()
  return value ? value : undefined
}

export function readAffiliateConfig(env: Env): AffiliateConfig {
  // AFFILIATE_LINKS_DISABLED=true desliga tudo sem apagar os IDs.
  if (read(env, 'AFFILIATE_LINKS_DISABLED') === 'true') return {}

  const config: AffiliateConfig = {}

  const amazonTag = read(env, 'AMAZON_ASSOCIATE_TAG')
  if (amazonTag) config.amazon = { tag: amazonTag }

  const shopeeAppId = read(env, 'SHOPEE_AFFILIATE_APP_ID')
  const shopeeSecret = read(env, 'SHOPEE_AFFILIATE_SECRET')
  if (shopeeAppId && shopeeSecret) {
    config.shopee = { appId: shopeeAppId, secret: shopeeSecret }
  }

  const meliWord = read(env, 'MELI_AFFILIATE_TAG')
  const meliTool = read(env, 'MELI_AFFILIATE_TOOL_ID')
  if (meliWord && meliTool) {
    config.mercadolivre = { word: meliWord, toolId: meliTool }
  }

  return config
}

export function enabledStores(config: AffiliateConfig): AffiliateStore[] {
  return (Object.keys(config) as AffiliateStore[]).filter(
    (store) => config[store as keyof AffiliateConfig],
  )
}
