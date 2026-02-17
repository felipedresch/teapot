import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const createEvent = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    date: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id('_storage')),
  },
  returns: v.id('events'),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const existing = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error('Slug já está em uso')
    }

    const eventId = await ctx.db.insert('events', {
      name: args.name,
      slug: args.slug,
      date: args.date,
      location: args.location,
      description: args.description,
      coverImageId: args.coverImageId,
    })

    await ctx.db.insert('eventMembers', {
      userId,
      eventId,
      role: 'host',
      joinedAt: Date.now(),
    })

    return eventId
  },
})

export const listEventsForCurrentUser = query({
  args: {},
  returns: v.array(
    v.object({
      eventId: v.id('events'),
      role: v.union(v.literal('host'), v.literal('guest')),
      name: v.string(),
      slug: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const memberships = await ctx.db
      .query('eventMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const results: {
      eventId: typeof memberships[number]['eventId']
      role: (typeof memberships)[number]['role']
      name: string
      slug: string
    }[] = []

    for (const membership of memberships) {
      const event = await ctx.db.get(membership.eventId)
      if (!event) continue

      results.push({
        eventId: event._id,
        role: membership.role,
        name: event.name,
        slug: event.slug,
      })
    }

    return results
  },
})

export const getEventBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      date: v.optional(v.string()),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImageId: v.optional(v.id('_storage')),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!event) return null
    return event
  },
})

export const getMembershipForCurrentUserAndEvent = query({
  args: {
    eventId: v.id('events'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('eventMembers'),
      _creationTime: v.number(),
      userId: v.id('users'),
      eventId: v.id('events'),
      role: v.union(v.literal('host'), v.literal('guest')),
      joinedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', args.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership) return null
    return membership
  },
})

