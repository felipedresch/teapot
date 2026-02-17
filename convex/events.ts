import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query, type MutationCtx } from './_generated/server'
import { v } from 'convex/values'

export const createEvent = mutation({
  args: {
    name: v.string(),
    partnerOneName: v.string(),
    partnerTwoName: v.string(),
    createdByPartner: v.union(v.literal('partnerOne'), v.literal('partnerTwo')),
    date: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id('_storage')),
  },
  returns: v.object({
    eventId: v.id('events'),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const slug = await generateUniqueEventSlug(ctx, {
      eventName: args.name,
      partnerOneName: args.partnerOneName,
      partnerTwoName: args.partnerTwoName,
    })

    const eventId = await ctx.db.insert('events', {
      name: args.name,
      slug,
      partnerOneName: args.partnerOneName,
      partnerTwoName: args.partnerTwoName,
      createdByUserId: userId,
      createdByPartner: args.createdByPartner,
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

    return {
      eventId,
      slug,
    }
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
      partnerOneName: v.string(),
      partnerTwoName: v.string(),
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
      partnerOneName: string
      partnerTwoName: string
    }[] = []

    for (const membership of memberships) {
      const event = await ctx.db.get(membership.eventId)
      if (!event) continue

      results.push({
        eventId: event._id,
        role: membership.role,
        name: event.name,
        slug: event.slug,
        partnerOneName: event.partnerOneName,
        partnerTwoName: event.partnerTwoName,
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
      partnerOneName: v.string(),
      partnerTwoName: v.string(),
      createdByUserId: v.id('users'),
      createdByPartner: v.union(v.literal('partnerOne'), v.literal('partnerTwo')),
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

async function generateUniqueEventSlug(
  ctx: MutationCtx,
  input: {
    eventName: string
    partnerOneName: string
    partnerTwoName: string
  },
) {
  const base = normalizeSlugPart(
    `${input.partnerOneName}-${input.partnerTwoName}-${input.eventName}`,
  )

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = generateNumericSuffix()
    const candidate = `${base}-${suffix}`
    const existing = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', candidate))
      .unique()

    if (!existing) {
      return candidate
    }
  }

  throw new Error('Não foi possível gerar um slug único para este evento')
}

function generateNumericSuffix() {
  const value = Math.floor(Math.random() * 9000) + 1000
  return String(value)
}

function normalizeSlugPart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

export const searchPublicEvents = query({
  args: {
    search: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id('events'),
      slug: v.string(),
      name: v.string(),
      location: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const events = await ctx.db.query('events').collect()
    const results: Array<{
      _id: (typeof events)[number]['_id']
      slug: string
      name: string
      location?: string
    }> = []

    for (const event of events) {
      const searchableText = [
        event.name,
        event.slug,
        event.location ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      if (!search || searchableText.includes(search)) {
        results.push({
          _id: event._id,
          slug: event.slug,
          name: event.name,
          location: event.location,
        })
      }
    }

    return results.slice(0, 20)
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

export const updateEvent = mutation({
  args: {
    eventId: v.id('events'),
    name: v.optional(v.string()),
    partnerOneName: v.optional(v.string()),
    partnerTwoName: v.optional(v.string()),
    date: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', args.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership || membership.role !== 'host') {
      throw new Error('Somente hosts podem editar o evento')
    }

    await ctx.db.patch('events', args.eventId, {
      name: args.name ?? event.name,
      partnerOneName: args.partnerOneName ?? event.partnerOneName,
      partnerTwoName: args.partnerTwoName ?? event.partnerTwoName,
      date: args.date ?? event.date,
      location: args.location ?? event.location,
      description: args.description ?? event.description,
    })

    return null
  },
})

export const deleteEvent = mutation({
  args: {
    eventId: v.id('events'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', args.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership || membership.role !== 'host') {
      throw new Error('Somente hosts podem excluir o evento')
    }

    const gifts = await ctx.db
      .query('gifts')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    for (const gift of gifts) {
      await ctx.db.delete('gifts', gift._id)
    }

    const configs = await ctx.db
      .query('eventConfig')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    for (const config of configs) {
      await ctx.db.delete('eventConfig', config._id)
    }

    const memberships = await ctx.db
      .query('eventMembers')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    for (const member of memberships) {
      await ctx.db.delete('eventMembers', member._id)
    }

    await ctx.db.delete('events', args.eventId)

    return null
  },
})

