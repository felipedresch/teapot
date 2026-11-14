// Redirecionamento com rastreio do link de referência dos presentes:
// /r/<giftId>?o=guest|host&d=<distinct_id do PostHog>. Busca o link no Convex,
// troca pelo de afiliado quando a loja está ligada (src/lib/affiliate),
// registra o clique e responde 302. O referenceUrl do banco não muda.
// docs/AFFILIATES.md.
import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import { readAffiliateConfig, toAffiliateUrl } from '../lib/affiliate'
import {
  GIFT_LINK_DISTINCT_ID_PARAM,
  GIFT_LINK_SOURCE_PARAM,
  isBotUserAgent,
  parseGiftLinkSource,
} from '../lib/affiliate/links'

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

export const Route = createFileRoute('/r/$giftId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
        if (!convexUrl) return backTo(request)
        const convex = new ConvexHttpClient(convexUrl)

        const target = await convex
          .query(api.giftLinks.getGiftLinkTarget, { giftId: params.giftId })
          .catch(() => null)
        if (!target) return backTo(request)

        const url = new URL(request.url)
        const source = parseGiftLinkSource(
          url.searchParams.get(GIFT_LINK_SOURCE_PARAM),
        )
        const result = await toAffiliateUrl(
          target.referenceUrl,
          readAffiliateConfig(process.env),
          { subIds: ['mywish', source] },
        )

        // Link que não é http/https não sai do site.
        if (result.reason === 'invalid_url') return backTo(request)

        if (!isBotUserAgent(request.headers.get('user-agent'))) {
          await withTimeout(
            convex
              .mutation(api.giftLinks.registerGiftLinkClick, {
                giftId: target.giftId,
                store: result.store,
                rewritten: result.rewritten,
                reason: result.reason,
                source,
                distinctId:
                  url.searchParams.get(GIFT_LINK_DISTINCT_ID_PARAM) ??
                  undefined,
              })
              .catch(() => null),
            CLICK_TIMEOUT_MS,
          )
        }

        return redirectTo(result.url)
      },
    },
  },
})
