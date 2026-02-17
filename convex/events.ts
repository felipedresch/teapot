import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'

const DEFAULT_EVENT_TYPES: Array<{
  value: string
  label: string
  supportsPairNames: boolean
}> = [
  { value: 'wedding', label: 'Casamento', supportsPairNames: true },
  { value: 'bridal-shower', label: 'Chá de panela', supportsPairNames: true },
  { value: 'birthday', label: 'Aniversário', supportsPairNames: false },
  { value: 'baby-shower', label: 'Chá de bebê', supportsPairNames: false },
  { value: 'housewarming', label: 'Chá de casa nova', supportsPairNames: false },
  { value: 'graduation', label: 'Formatura', supportsPairNames: false },
  { value: 'other', label: 'Outro', supportsPairNames: false },
]

type EventRole = 'host' | 'guest'

type EventSummary = {
  eventId: Id<'events'>
  role: EventRole
  name: string
  slug: string
  eventType: string
  customEventType?: string
  hosts: Array<string>
  isPublic: boolean
  partnerOneName: string
  partnerTwoName: string
}

export const listEventTypes = query({
  args: {},
  returns: v.array(
    v.object({
      value: v.string(),
      label: v.string(),
      supportsPairNames: v.boolean(),
    }),
  ),
  handler: async () => {
    return DEFAULT_EVENT_TYPES
  },
})

export const createEvent = mutation({
  args: {
    name: v.string(),
    eventType: v.string(),
    customEventType: v.optional(v.string()),
    hosts: v.array(v.string()),
    isPublic: v.boolean(),
    createdByPartner: v.optional(
      v.union(v.literal('partnerOne'), v.literal('partnerTwo')),
    ),
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

    const normalizedHosts = normalizeHosts(args.hosts)
    const normalizedCustomEventType = normalizeOptionalText(args.customEventType)
    if (args.eventType === 'other' && !normalizedCustomEventType) {
      throw new Error('Informe o tipo de evento quando selecionar "Outro".')
    }

    const slug = await generateUniqueEventSlug(ctx, {
      eventName: args.name,
      hosts: normalizedHosts,
    })

    const partnerOneName = normalizedHosts[0] ?? ''
    const partnerTwoName = normalizedHosts[1] ?? ''

    const eventId = await ctx.db.insert('events', {
      name: args.name,
      slug,
      eventType: args.eventType,
      customEventType: normalizedCustomEventType,
      hosts: normalizedHosts,
      isPublic: args.isPublic,
      partnerOneName,
      partnerTwoName,
      createdByUserId: userId,
      createdByPartner:
        partnerTwoName && args.createdByPartner === 'partnerTwo'
          ? 'partnerTwo'
          : 'partnerOne',
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
      eventType: v.string(),
      customEventType: v.optional(v.string()),
      hosts: v.array(v.string()),
      isPublic: v.boolean(),
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

    return await mapMembershipsToEventSummaries(ctx, memberships)
  },
})

export const listMyEventsGrouped = query({
  args: {},
  returns: v.object({
    hosting: v.array(
      v.object({
        eventId: v.id('events'),
        role: v.union(v.literal('host'), v.literal('guest')),
        name: v.string(),
        slug: v.string(),
        eventType: v.string(),
        customEventType: v.optional(v.string()),
        hosts: v.array(v.string()),
        isPublic: v.boolean(),
        partnerOneName: v.string(),
        partnerTwoName: v.string(),
      }),
    ),
    attending: v.array(
      v.object({
        eventId: v.id('events'),
        role: v.union(v.literal('host'), v.literal('guest')),
        name: v.string(),
        slug: v.string(),
        eventType: v.string(),
        customEventType: v.optional(v.string()),
        hosts: v.array(v.string()),
        isPublic: v.boolean(),
        partnerOneName: v.string(),
        partnerTwoName: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { hosting: [], attending: [] }
    }

    const memberships = await ctx.db
      .query('eventMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const summaries = await mapMembershipsToEventSummaries(ctx, memberships)
    return {
      hosting: summaries.filter((summary) => summary.role === 'host'),
      attending: summaries.filter((summary) => summary.role === 'guest'),
    }
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
      eventType: v.string(),
      customEventType: v.optional(v.string()),
      hosts: v.array(v.string()),
      isPublic: v.boolean(),
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
    return {
      _id: event._id,
      _creationTime: event._creationTime,
      name: event.name,
      slug: event.slug,
      eventType: getEventTypeValue(event.eventType),
      customEventType: normalizeOptionalText(event.customEventType),
      hosts: getEventHosts(event.hosts, event.partnerOneName, event.partnerTwoName),
      isPublic: getEventVisibility(event.isPublic),
      partnerOneName: event.partnerOneName,
      partnerTwoName: event.partnerTwoName,
      createdByUserId: event.createdByUserId,
      createdByPartner: event.createdByPartner,
      date: event.date,
      location: event.location,
      description: event.description,
      coverImageId: event.coverImageId,
    }
  },
})

async function generateUniqueEventSlug(
  ctx: MutationCtx,
  input: {
    eventName: string
    hosts: Array<string>
  },
) {
  const hostPart = input.hosts.slice(0, 2).join('-')
  const base = normalizeSlugPart(
    `${hostPart}-${input.eventName}`,
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
      eventType: v.string(),
      customEventType: v.optional(v.string()),
      hosts: v.array(v.string()),
      partnerOneName: v.string(),
      partnerTwoName: v.string(),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const search = args.search?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const events = await ctx.db.query('events').collect()
    const results: Array<{
      _id: (typeof events)[number]['_id']
      slug: string
      name: string
      eventType: string
      customEventType?: string
      hosts: Array<string>
      partnerOneName: string
      partnerTwoName: string
      location?: string
      description?: string
    }> = []

    for (const event of events) {
      const isPublic = getEventVisibility(event.isPublic)
      if (!isPublic) continue
      const hosts = getEventHosts(
        event.hosts,
        event.partnerOneName,
        event.partnerTwoName,
      )
      const eventType = getEventTypeValue(event.eventType)
      const customEventType = normalizeOptionalText(event.customEventType)
      const searchableText = [
        event.name,
        event.slug,
        eventType,
        customEventType ?? '',
        ...hosts,
        event.location ?? '',
        event.partnerOneName,
        event.partnerTwoName,
        event.description ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      if (!search || searchableText.includes(search)) {
        results.push({
          _id: event._id,
          slug: event.slug,
          name: event.name,
          eventType,
          customEventType,
          hosts,
          partnerOneName: event.partnerOneName,
          partnerTwoName: event.partnerTwoName,
          location: event.location,
          description: event.description,
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
    eventType: v.optional(v.string()),
    customEventType: v.optional(v.string()),
    hosts: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
    createdByPartner: v.optional(
      v.union(v.literal('partnerOne'), v.literal('partnerTwo')),
    ),
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

    const currentHosts = getEventHosts(
      event.hosts,
      event.partnerOneName,
      event.partnerTwoName,
    )
    const nextHosts = args.hosts ? normalizeHosts(args.hosts) : currentHosts
    const nextPartnerOneName =
      args.partnerOneName ?? nextHosts[0] ?? event.partnerOneName
    const nextPartnerTwoName =
      args.partnerTwoName ?? nextHosts[1] ?? event.partnerTwoName
    const nextEventType = args.eventType ?? getEventTypeValue(event.eventType)
    const nextCustomEventType =
      nextEventType === 'other'
        ? normalizeOptionalText(args.customEventType) ?? event.customEventType
        : normalizeOptionalText(args.customEventType)

    if (nextEventType === 'other' && !nextCustomEventType) {
      throw new Error('Informe o tipo de evento quando selecionar "Outro".')
    }

    await ctx.db.patch('events', args.eventId, {
      name: args.name ?? event.name,
      eventType: nextEventType,
      customEventType: nextCustomEventType,
      hosts: nextHosts,
      isPublic: args.isPublic ?? event.isPublic,
      createdByPartner: args.createdByPartner ?? event.createdByPartner,
      partnerOneName: nextPartnerOneName,
      partnerTwoName: nextPartnerTwoName,
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

function normalizeHosts(hosts: Array<string>) {
  const normalized = hosts
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 5)

  if (normalized.length === 0) {
    throw new Error('Informe ao menos um anfitrião.')
  }

  return normalized
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function getEventHosts(
  hosts: Array<string> | undefined,
  partnerOneName: string,
  partnerTwoName: string,
) {
  const normalizedHosts =
    hosts?.map((name) => name.trim()).filter((name) => name.length > 0) ?? []

  if (normalizedHosts.length > 0) {
    return normalizedHosts.slice(0, 5)
  }

  return [partnerOneName, partnerTwoName]
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 5)
}

function getEventTypeValue(eventType: string | undefined) {
  return eventType?.trim() || 'other'
}

function getEventVisibility(isPublic: boolean | undefined) {
  return isPublic ?? true
}

async function mapMembershipsToEventSummaries(
  ctx: QueryCtx,
  memberships: Array<{
    eventId: Id<'events'>
    role: EventRole
  }>,
) {
  const results: Array<EventSummary> = []

  for (const membership of memberships) {
    const event = await ctx.db.get(membership.eventId)
    if (!event) continue

    results.push({
      eventId: event._id,
      role: membership.role,
      name: event.name,
      slug: event.slug,
      eventType: getEventTypeValue(event.eventType),
      customEventType: normalizeOptionalText(event.customEventType),
      hosts: getEventHosts(event.hosts, event.partnerOneName, event.partnerTwoName),
      isPublic: getEventVisibility(event.isPublic),
      partnerOneName: event.partnerOneName,
      partnerTwoName: event.partnerTwoName,
    })
  }

  return results
}

