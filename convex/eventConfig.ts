import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const getEventConfig = query({
  args: {
    eventId: v.id('events'),
  },
  returns: v.array(
    v.object({
      _id: v.id('eventConfig'),
      _creationTime: v.number(),
      eventId: v.id('events'),
      key: v.string(),
      value: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query('eventConfig')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    return configs
  },
})

export const setEventConfig = mutation({
  args: {
    eventId: v.id('events'),
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
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
      throw new Error('Somente hosts podem alterar configurações do evento')
    }

    const existing = await ctx.db
      .query('eventConfig')
      .withIndex('by_event_and_key', (q) =>
        q.eq('eventId', args.eventId).eq('key', args.key),
      )
      .unique()

    if (existing) {
      await ctx.db.patch('eventConfig', existing._id, {
        value: args.value,
      })
    } else {
      await ctx.db.insert('eventConfig', {
        eventId: args.eventId,
        key: args.key,
        value: args.value,
      })
    }

    return null
  },
})

