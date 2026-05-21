import { getAuthUserId } from '@convex-dev/auth/server'
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
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
  {
    value: 'housewarming',
    label: 'Chá de casa nova',
    supportsPairNames: false,
  },
  { value: 'graduation', label: 'Formatura', supportsPairNames: false },
  { value: 'other', label: 'Outro', supportsPairNames: false },
]

type EventRole = 'host' | 'guest'

type EventVisibility = 'draft' | 'unlisted' | 'public'

type EventSummary = {
  eventId: Id<'events'>
  role: EventRole
  name: string
  slug: string
  eventType: string
  customEventType?: string
  hosts: Array<string>
  isPublic: boolean
  visibility: EventVisibility
  partnerOneName: string
  partnerTwoName: string
  coverImageUrl?: string
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
    visibility: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('unlisted'),
        v.literal('public'),
      ),
    ),
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
    const normalizedCustomEventType = normalizeOptionalText(
      args.customEventType,
    )
    if (args.eventType === 'other' && !normalizedCustomEventType) {
      throw new Error('Informe o tipo de evento quando selecionar "Outro".')
    }

    const slug = await generateUniqueEventSlug(ctx, {
      eventName: args.name,
      hosts: normalizedHosts,
    })

    const partnerOneName = normalizedHosts[0] ?? ''
    const partnerTwoName = normalizedHosts[1] ?? ''
    const hasLifetimeAccess = await hasActiveLifetimeAccess(ctx, userId)

    // Free users always start as draft. Lifetime users can pick anything;
    // default to draft if they didn't ask for something specific.
    const requestedVisibility = args.visibility ?? 'draft'
    const visibility: EventVisibility = hasLifetimeAccess
      ? requestedVisibility
      : 'draft'
    const isPublic = visibility === 'public'

    const eventId = await ctx.db.insert('events', {
      name: args.name,
      slug,
      eventType: args.eventType,
      customEventType: normalizedCustomEventType,
      hosts: normalizedHosts,
      visibility,
      isPublic,
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
      monetizationStatus: hasLifetimeAccess ? 'paid' : 'requires_payment',
      paidAt: hasLifetimeAccess ? Date.now() : undefined,
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
      visibility: v.union(
        v.literal('draft'),
        v.literal('unlisted'),
        v.literal('public'),
      ),
      partnerOneName: v.string(),
      partnerTwoName: v.string(),
      coverImageUrl: v.optional(v.string()),
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
        visibility: v.union(
          v.literal('draft'),
          v.literal('unlisted'),
          v.literal('public'),
        ),
        partnerOneName: v.string(),
        partnerTwoName: v.string(),
        coverImageUrl: v.optional(v.string()),
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
        visibility: v.union(
          v.literal('draft'),
          v.literal('unlisted'),
          v.literal('public'),
        ),
        partnerOneName: v.string(),
        partnerTwoName: v.string(),
        coverImageUrl: v.optional(v.string()),
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
      visibility: v.union(
        v.literal('draft'),
        v.literal('unlisted'),
        v.literal('public'),
      ),
      partnerOneName: v.string(),
      partnerTwoName: v.string(),
      createdByUserId: v.id('users'),
      createdByPartner: v.union(
        v.literal('partnerOne'),
        v.literal('partnerTwo'),
      ),
      date: v.optional(v.string()),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImageId: v.optional(v.id('_storage')),
      coverImageUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!event) return null
    const userId = await getAuthUserId(ctx)
    const hostHasLifetime = await hasActiveLifetimeAccess(
      ctx,
      event.createdByUserId,
    )
    const unlocked = isEventUnlocked(event, hostHasLifetime)
    const effectiveVisibility = getEffectiveVisibility(event, unlocked)

    if (effectiveVisibility === 'draft') {
      const membership = userId
        ? await ctx.db
            .query('eventMembers')
            .withIndex('by_event_and_user', (q) =>
              q.eq('eventId', event._id).eq('userId', userId),
            )
            .unique()
        : null

      if (!membership) {
        return null
      }
    }
    const isPublic = effectiveVisibility === 'public'

    const coverImageUrl = event.coverImageId
      ? ((await ctx.storage.getUrl(event.coverImageId)) ?? undefined)
      : undefined

    return {
      _id: event._id,
      _creationTime: event._creationTime,
      name: event.name,
      slug: event.slug,
      eventType: getEventTypeValue(event.eventType),
      customEventType: normalizeOptionalText(event.customEventType),
      hosts: getEventHosts(
        event.hosts,
        event.partnerOneName,
        event.partnerTwoName,
      ),
      isPublic,
      visibility: effectiveVisibility,
      partnerOneName: event.partnerOneName,
      partnerTwoName: event.partnerTwoName,
      createdByUserId: event.createdByUserId,
      createdByPartner: event.createdByPartner,
      date: event.date,
      location: event.location,
      description: event.description,
      coverImageId: event.coverImageId,
      coverImageUrl,
    }
  },
})

export const generateEventCoverUploadUrl = mutation({
  args: {
    eventId: v.id('events'),
  },
  returns: v.string(),
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
      throw new Error('Somente hosts podem fazer upload da capa')
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const generateEventDraftCoverUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const updateEventCoverImage = mutation({
  args: {
    eventId: v.id('events'),
    coverImageId: v.optional(v.union(v.id('_storage'), v.null())),
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
      throw new Error('Somente hosts podem editar a capa do evento')
    }

    const nextCoverImageId =
      args.coverImageId === null ? undefined : args.coverImageId

    await ctx.db.patch('events', args.eventId, {
      coverImageId: nextCoverImageId,
    })

    if (event.coverImageId && event.coverImageId !== nextCoverImageId) {
      await ctx.storage.delete(event.coverImageId)
    }

    return null
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
  const base = normalizeSlugPart(`${hostPart}-${input.eventName}`)

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
      const hostHasLifetime = await hasActiveLifetimeAccess(
        ctx,
        event.createdByUserId,
      )
      const unlocked = isEventUnlocked(event, hostHasLifetime)
      const effectiveVisibility = getEffectiveVisibility(event, unlocked)
      if (effectiveVisibility !== 'public') continue
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

export const listRecentPublicEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('events'),
      _creationTime: v.number(),
      slug: v.string(),
      name: v.string(),
      eventType: v.string(),
      customEventType: v.optional(v.string()),
      hosts: v.array(v.string()),
      location: v.optional(v.string()),
      date: v.optional(v.string()),
      coverImageUrl: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 5, 12))
    // Fetch a buffer larger than the requested limit so we can drop events
    // without a cover image (the showcase only displays events with photos).
    const candidates = await ctx.db
      .query('events')
      .withIndex('by_is_public', (q) => q.eq('isPublic', true))
      .order('desc')
      .take(limit * 4)

    const results: Array<{
      _id: Id<'events'>
      _creationTime: number
      slug: string
      name: string
      eventType: string
      customEventType?: string
      hosts: Array<string>
      location?: string
      date?: string
      coverImageUrl: string
    }> = []

    for (const event of candidates) {
      if (!event.coverImageId) continue
      const coverImageUrl = await ctx.storage.getUrl(event.coverImageId)
      if (!coverImageUrl) continue

      results.push({
        _id: event._id,
        _creationTime: event._creationTime,
        slug: event.slug,
        name: event.name,
        eventType: getEventTypeValue(event.eventType),
        customEventType: normalizeOptionalText(event.customEventType),
        hosts: getEventHosts(
          event.hosts,
          event.partnerOneName,
          event.partnerTwoName,
        ),
        location: event.location,
        date: event.date,
        coverImageUrl,
      })

      if (results.length >= limit) break
    }

    return results
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
    visibility: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('unlisted'),
        v.literal('public'),
      ),
    ),
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
        ? (normalizeOptionalText(args.customEventType) ?? event.customEventType)
        : normalizeOptionalText(args.customEventType)

    if (nextEventType === 'other' && !nextCustomEventType) {
      throw new Error('Informe o tipo de evento quando selecionar "Outro".')
    }

    const hasLifetimeAccess = await hasActiveLifetimeAccess(ctx, userId)
    const currentMonetizationStatus =
      event.monetizationStatus ?? 'grandfathered'
    const isUnlocked =
      hasLifetimeAccess ||
      currentMonetizationStatus === 'grandfathered' ||
      currentMonetizationStatus === 'paid'

    const currentVisibility = getStoredVisibility(event)
    const requestedVisibility = args.visibility ?? currentVisibility

    if (requestedVisibility !== 'draft' && !isUnlocked) {
      throw new Error('Pagamento necessário para compartilhar este evento.')
    }

    const nextIsPublic = requestedVisibility === 'public'

    await ctx.db.patch('events', args.eventId, {
      name: args.name ?? event.name,
      eventType: nextEventType,
      customEventType: nextCustomEventType,
      hosts: nextHosts,
      visibility: requestedVisibility,
      isPublic: nextIsPublic,
      monetizationStatus: hasLifetimeAccess
        ? 'paid'
        : currentMonetizationStatus,
      paidAt: hasLifetimeAccess ? Date.now() : event.paidAt,
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
      if (gift.imageId) {
        await ctx.storage.delete(gift.imageId)
      }
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

    if (event.coverImageId) {
      await ctx.storage.delete(event.coverImageId)
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

type EventVisibilityFields = {
  visibility?: EventVisibility
  isPublic?: boolean
  monetizationStatus?: 'grandfathered' | 'requires_payment' | 'paid'
}

export function getStoredVisibility(
  event: EventVisibilityFields,
): EventVisibility {
  if (event.visibility) return event.visibility
  // Legacy events without `visibility`: derive from `isPublic`.
  // isPublic=false historically meant members-only (now: draft).
  // isPublic=true|undefined meant link works for anyone (now: public).
  if (event.isPublic === false) return 'draft'
  return 'public'
}

export function isEventUnlocked(
  event: EventVisibilityFields,
  hostHasLifetime: boolean,
): boolean {
  const status = event.monetizationStatus ?? 'grandfathered'
  return hostHasLifetime || status === 'grandfathered' || status === 'paid'
}

export function getEffectiveVisibility(
  event: EventVisibilityFields,
  isUnlocked: boolean,
): EventVisibility {
  if (!isUnlocked) return 'draft'
  return getStoredVisibility(event)
}

async function hasActiveLifetimeAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
) {
  const entitlement = await ctx.db
    .query('userEntitlements')
    .withIndex('by_user_and_type', (q) =>
      q.eq('userId', userId).eq('type', 'lifetime'),
    )
    .unique()

  return entitlement?.status === 'active'
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

    const hostHasLifetime = await hasActiveLifetimeAccess(
      ctx,
      event.createdByUserId,
    )
    const unlocked = isEventUnlocked(event, hostHasLifetime)
    const effectiveVisibility = getEffectiveVisibility(event, unlocked)

    const coverImageUrl = event.coverImageId
      ? ((await ctx.storage.getUrl(event.coverImageId)) ?? undefined)
      : undefined

    results.push({
      eventId: event._id,
      role: membership.role,
      name: event.name,
      slug: event.slug,
      eventType: getEventTypeValue(event.eventType),
      customEventType: normalizeOptionalText(event.customEventType),
      hosts: getEventHosts(
        event.hosts,
        event.partnerOneName,
        event.partnerTwoName,
      ),
      isPublic: effectiveVisibility === 'public',
      visibility: effectiveVisibility,
      partnerOneName: event.partnerOneName,
      partnerTwoName: event.partnerTwoName,
      coverImageUrl,
    })
  }

  return results
}
