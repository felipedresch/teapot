import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const listGiftsForEvent = query({
  args: {
    eventId: v.id('events'),
  },
  returns: v.array(
    v.object({
      _id: v.id('gifts'),
      _creationTime: v.number(),
      eventId: v.id('events'),
      name: v.string(),
      description: v.optional(v.string()),
      imageId: v.optional(v.id('_storage')),
      category: v.optional(v.string()),
      referenceUrl: v.optional(v.string()),
      status: v.union(
        v.literal('available'),
        v.literal('reserved'),
        v.literal('received'),
      ),
      reservedBy: v.optional(v.id('users')),
      reservedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    return gifts
  },
})

export const createGift = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id('_storage')),
    category: v.optional(v.string()),
    referenceUrl: v.optional(v.string()),
  },
  returns: v.id('gifts'),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', args.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership || membership.role !== 'host') {
      throw new Error('Somente hosts podem criar presentes')
    }

    const giftId = await ctx.db.insert('gifts', {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      category: args.category,
      referenceUrl: args.referenceUrl,
      status: 'available',
      reservedBy: undefined,
      reservedAt: undefined,
    })

    return giftId
  },
})

export const reserveGift = mutation({
  args: {
    giftId: v.id('gifts'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Precisa estar autenticado para reservar um presente')
    }

    const gift = await ctx.db.get(args.giftId)
    if (!gift) {
      throw new Error('Presente não encontrado')
    }

    if (gift.status !== 'available') {
      throw new Error('Presente já reservado ou recebido')
    }

    const eventId = gift.eventId

    let membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', eventId).eq('userId', userId),
      )
      .unique()

    if (!membership) {
      const membershipId = await ctx.db.insert('eventMembers', {
        userId,
        eventId,
        role: 'guest',
        joinedAt: Date.now(),
      })
      membership = await ctx.db.get(membershipId)
    }

    await ctx.db.patch('gifts', args.giftId, {
      status: 'reserved',
      reservedBy: userId,
      reservedAt: Date.now(),
    })

    return null
  },
})

