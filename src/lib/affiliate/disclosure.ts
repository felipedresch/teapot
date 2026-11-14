import { createServerFn } from '@tanstack/react-start'
import { enabledStores, readAffiliateConfig } from './config'

export type AffiliateDisclosure = {
  // Algum adaptador ligado: mostra o aviso de comissão.
  enabled: boolean
  // A Amazon exige a frase de associado no site.
  amazon: boolean
  // Shopee ligada: mostra "Ver opções na Shopee" nos presentes sem link.
  shopee: boolean
}

// Os IDs moram no Worker; o navegador só sabe se há loja ligada.
export const getAffiliateDisclosure = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AffiliateDisclosure> => {
    const stores = enabledStores(readAffiliateConfig(process.env))
    return {
      enabled: stores.length > 0,
      amazon: stores.includes('amazon'),
      shopee: stores.includes('shopee'),
    }
  },
)
