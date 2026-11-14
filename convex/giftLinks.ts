// Cliques em "ver referência" dos presentes. O Worker (src/routes/r.$giftId.ts)
// busca o link aqui, troca pelo de afiliado quando a loja está ligada e
// registra o clique. Como funciona: docs/AFFILIATES.md.
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import {
  giftLinkReasonValidator,
  giftLinkSourceValidator,
  giftLinkStoreValidator,
} from './lib/giftLinkValidators'

// O link do presente já é público (listGiftCatalogForEvent devolve o mesmo
// referenceUrl para quem tem o eventId). Id inválido ou presente sem link: null.
export const getGiftLinkTarget = query({
  args: { giftId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      giftId: v.id('gifts'),
      eventId: v.id('events'),
      referenceUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const giftId = ctx.db.normalizeId('gifts', args.giftId)
    if (!giftId) return null
    const gift = await ctx.db.get(giftId)
    const referenceUrl = gift?.referenceUrl?.trim()
    if (!gift || !referenceUrl) return null
    return { giftId: gift._id, eventId: gift.eventId, referenceUrl }
  },
})

export const registerGiftLinkClick = mutation({
  args: {
    giftId: v.id('gifts'),
    store: v.union(v.null(), giftLinkStoreValidator),
    rewritten: v.boolean(),
    reason: giftLinkReasonValidator,
    source: giftLinkSourceValidator,
    // distinct_id do PostHog do navegador, quando o link o trouxe.
    distinctId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const gift = await ctx.db.get(args.giftId)
    if (!gift?.referenceUrl) return null

    await ctx.db.insert('giftLinkClicks', {
      giftId: gift._id,
      eventId: gift.eventId,
      store: args.store ?? undefined,
      rewritten: args.rewritten,
      reason: args.reason,
      source: args.source,
      createdAt: Date.now(),
    })

    const distinctId = args.distinctId?.trim().slice(0, 200)
    await ctx.scheduler.runAfter(0, internal.analytics.capturePostHogEvent, {
      eventName: 'gift_link_clicked',
      distinctId: distinctId || `gift-link:${gift._id}`,
      properties: {
        giftId: String(gift._id),
        eventId: String(gift.eventId),
        store: args.store ?? 'other',
        rewritten: args.rewritten,
        reason: args.reason,
        linkSource: args.source,
      },
      // Como no navegador (person_profiles: 'identified_only'): o evento entra
      // no funil do distinct_id sem criar pessoa no PostHog.
      processPersonProfile: false,
    })

    return null
  },
})
