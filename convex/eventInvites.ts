import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

function generateToken() {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 24; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

async function assertEventHost(
  ctx: MutationCtx,
  eventId: Id<'events'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('eventMembers')
    .withIndex('by_event_and_user', (q) =>
      q.eq('eventId', eventId).eq('userId', userId),
    )
    .unique()

  if (!membership || membership.role !== 'host') {
    throw new Error('Somente hosts podem gerenciar convites do evento.')
  }
}

export const ensurePartnerInvite = mutation({
  args: { eventId: v.id('events') },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    await assertEventHost(ctx, args.eventId, userId)

    const existing = await ctx.db
      .query('eventInvites')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const active = existing
      .filter((invite) => !invite.usedAt && !invite.revokedAt)
      .sort((a, b) => b.createdAt - a.createdAt)[0]

    if (active) {
      return { token: active.token }
    }

    let token = generateToken()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const collision = await ctx.db
        .query('eventInvites')
        .withIndex('by_token', (q) => q.eq('token', token))
        .unique()
      if (!collision) break
      token = generateToken()
    }

    await ctx.db.insert('eventInvites', {
      eventId: args.eventId,
      token,
      role: 'host',
      createdByUserId: userId,
      createdAt: Date.now(),
    })

    return { token }
  },
})

export const listPartnerInvites = query({
  args: { eventId: v.id('events') },
  returns: v.array(
    v.object({
      _id: v.id('eventInvites'),
      token: v.string(),
      createdAt: v.number(),
      usedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
      status: v.union(
        v.literal('active'),
        v.literal('used'),
        v.literal('revoked'),
      ),
      usedByName: v.optional(v.string()),
      usedByEmail: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', args.eventId).eq('userId', userId),
      )
      .unique()
    if (!membership || membership.role !== 'host') return []

    const invites = await ctx.db
      .query('eventInvites')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const sorted = invites.sort((a, b) => b.createdAt - a.createdAt)

    return await Promise.all(
      sorted.map(async (invite) => {
        let usedByName: string | undefined
        let usedByEmail: string | undefined
        if (invite.usedByUserId) {
          const user = await ctx.db.get(invite.usedByUserId)
          if (user) {
            usedByName = user.name ?? undefined
            usedByEmail = user.email ?? undefined
          }
        }
        const status: 'active' | 'used' | 'revoked' = invite.usedAt
          ? 'used'
          : invite.revokedAt
            ? 'revoked'
            : 'active'
        return {
          _id: invite._id,
          token: invite.token,
          createdAt: invite.createdAt,
          usedAt: invite.usedAt,
          revokedAt: invite.revokedAt,
          status,
          usedByName,
          usedByEmail,
        }
      }),
    )
  },
})

export const revokePartnerInvite = mutation({
  args: { inviteId: v.id('eventInvites') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const invite = await ctx.db.get(args.inviteId)
    if (!invite) throw new Error('Convite não encontrado.')

    await assertEventHost(ctx, invite.eventId, userId)

    if (invite.usedAt || invite.revokedAt) {
      return null
    }

    await ctx.db.patch('eventInvites', args.inviteId, {
      revokedAt: Date.now(),
    })

    return null
  },
})

export const rotatePartnerInvite = mutation({
  args: { eventId: v.id('events') },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    await assertEventHost(ctx, args.eventId, userId)

    const existing = await ctx.db
      .query('eventInvites')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const now = Date.now()
    for (const invite of existing) {
      if (!invite.usedAt && !invite.revokedAt) {
        await ctx.db.patch('eventInvites', invite._id, { revokedAt: now })
      }
    }

    let token = generateToken()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const collision = await ctx.db
        .query('eventInvites')
        .withIndex('by_token', (q) => q.eq('token', token))
        .unique()
      if (!collision) break
      token = generateToken()
    }

    await ctx.db.insert('eventInvites', {
      eventId: args.eventId,
      token,
      role: 'host',
      createdByUserId: userId,
      createdAt: now,
    })

    return { token }
  },
})

export const previewInvite = query({
  args: {
    slug: v.string(),
    token: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal('valid'),
        v.literal('invalid'),
        v.literal('used'),
        v.literal('revoked'),
        v.literal('already-host'),
        v.literal('event-not-found'),
      ),
      eventName: v.optional(v.string()),
      eventSlug: v.optional(v.string()),
      hosts: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!event) {
      return { status: 'event-not-found' as const }
    }

    const invite = await ctx.db
      .query('eventInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!invite || invite.eventId !== event._id) {
      return {
        status: 'invalid' as const,
        eventName: event.name,
        eventSlug: event.slug,
      }
    }

    if (invite.revokedAt) {
      return {
        status: 'revoked' as const,
        eventName: event.name,
        eventSlug: event.slug,
      }
    }

    if (invite.usedAt) {
      return {
        status: 'used' as const,
        eventName: event.name,
        eventSlug: event.slug,
      }
    }

    const hosts = [event.partnerOneName, event.partnerTwoName]
      .map((host) => host.trim())
      .filter(Boolean)

    const userId = await getAuthUserId(ctx)
    if (userId) {
      const membership = await ctx.db
        .query('eventMembers')
        .withIndex('by_event_and_user', (q) =>
          q.eq('eventId', event._id).eq('userId', userId),
        )
        .unique()
      if (membership && membership.role === 'host') {
        return {
          status: 'already-host' as const,
          eventName: event.name,
          eventSlug: event.slug,
          hosts,
        }
      }
    }

    return {
      status: 'valid' as const,
      eventName: event.name,
      eventSlug: event.slug,
      hosts,
    }
  },
})

export const acceptPartnerInvite = mutation({
  args: {
    slug: v.string(),
    token: v.string(),
  },
  returns: v.object({
    eventSlug: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Você precisa fazer login para aceitar o convite.')
    }

    const event = await ctx.db
      .query('events')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!event) {
      throw new Error('Evento não encontrado.')
    }

    const invite = await ctx.db
      .query('eventInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    if (!invite || invite.eventId !== event._id) {
      throw new Error('Este convite é inválido.')
    }
    if (invite.revokedAt) {
      throw new Error('Este convite foi revogado pelo anfitrião.')
    }
    if (invite.usedAt) {
      throw new Error('Este convite já foi utilizado.')
    }

    const existingMembership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', event._id).eq('userId', userId),
      )
      .unique()

    const now = Date.now()

    if (existingMembership) {
      if (existingMembership.role !== 'host') {
        await ctx.db.patch('eventMembers', existingMembership._id, {
          role: 'host',
          joinedAt: existingMembership.joinedAt ?? now,
        })
      }
    } else {
      await ctx.db.insert('eventMembers', {
        userId,
        eventId: event._id,
        role: 'host',
        joinedAt: now,
      })
    }

    await ctx.db.patch('eventInvites', invite._id, {
      usedByUserId: userId,
      usedAt: now,
    })

    return { eventSlug: event.slug }
  },
})
