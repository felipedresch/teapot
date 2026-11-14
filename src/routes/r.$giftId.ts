// Redirecionamento com rastreio do link de referência dos presentes:
// /r/<giftId>?o=guest|host&d=<distinct_id do PostHog>. Busca o link no Convex,
// troca pelo de afiliado quando a loja está ligada (src/lib/affiliate),
// registra o clique e responde 302. O referenceUrl do banco não muda.
// Com `v=shopee`, é o botão "Ver opções na Shopee" de um presente sem link
// (src/lib/affiliate/shopeeOptions.ts). docs/AFFILIATES.md.
import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import {
  readAffiliateConfig,
  toAffiliateUrl,
  type AffiliateResult,
} from '../lib/affiliate'
import {
  GIFT_LINK_DISTINCT_ID_PARAM,
  GIFT_LINK_SOURCE_PARAM,
  GIFT_LINK_VIEW_PARAM,
  isBotUserAgent,
  parseGiftLinkSource,
} from '../lib/affiliate/links'
import { shopeeOptionsUrl } from '../lib/affiliate/shopeeOptions'

// Registrar o clique não pode segurar o convidado.
const CLICK_TIMEOUT_MS = 1500

const RESPONSE_HEADERS = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
}

function redirectTo(location: string) {
  return new Response(null, {
    status: 302,
    headers: { ...RESPONSE_HEADERS, location },
  })
}

// Sem o presente (id errado, presente apagado, Convex fora), volta para a
// página de onde o clique veio, se for do próprio site.
function backTo(request: Request) {
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const from = new URL(referer)
      if (from.origin === new URL(request.url).origin) {
        return redirectTo(from.pathname + from.search)
      }
    } catch {
      // referer inválido: cai na home
    }
  }
  return redirectTo('/')
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), ms),
    ),
  ])
}

type Resolved = {
  giftId: Id<'gifts'>
  result: AffiliateResult
  kind: 'reference' | 'shopee_options'
}

export const Route = createFileRoute('/r/$giftId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
        if (!convexUrl) return backTo(request)
        const convex = new ConvexHttpClient(convexUrl)

        const url = new URL(request.url)
        const source = parseGiftLinkSource(
          url.searchParams.get(GIFT_LINK_SOURCE_PARAM),
        )
        const config = readAffiliateConfig(process.env)
        let resolved: Resolved | null = null

        if (url.searchParams.get(GIFT_LINK_VIEW_PARAM) === 'shopee') {
          const gift = await convex
            .query(api.giftLinks.getGiftForShopeeOptions, {
              giftId: params.giftId,
            })
            .catch(() => null)
          if (gift) {
            const result = await shopeeOptionsUrl(gift.name, config, {
              subIds: ['mywish', 'options', source],
              findMatch: async (name) =>
                (
                  await convex.query(
                    api.productSuggestions.findSuggestionForGiftName,
                    { name },
                  )
                )?.productLink ?? null,
            })
            resolved = { giftId: gift.giftId, result, kind: 'shopee_options' }
          }
        } else {
          const target = await convex
            .query(api.giftLinks.getGiftLinkTarget, { giftId: params.giftId })
            .catch(() => null)
          if (target) {
            const result = await toAffiliateUrl(target.referenceUrl, config, {
              subIds: ['mywish', source],
            })
            resolved = { giftId: target.giftId, result, kind: 'reference' }
          }
        }

        // Presente não achado ou link que não é http/https: não sai do site.
        if (!resolved || resolved.result.reason === 'invalid_url') {
          return backTo(request)
        }

        if (!isBotUserAgent(request.headers.get('user-agent'))) {
          await withTimeout(
            convex
              .mutation(api.giftLinks.registerGiftLinkClick, {
                giftId: resolved.giftId,
                store: resolved.result.store,
                rewritten: resolved.result.rewritten,
                reason: resolved.result.reason,
                source,
                kind: resolved.kind,
                distinctId:
                  url.searchParams.get(GIFT_LINK_DISTINCT_ID_PARAM) ??
                  undefined,
              })
              .catch(() => null),
            CLICK_TIMEOUT_MS,
          )
        }

        return redirectTo(resolved.result.url)
      },
    },
  },
})
