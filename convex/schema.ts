import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
  }).index('email', ['email']),

  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),

  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  events: defineTable({
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
  }).index('by_slug', ['slug']),

  // Relação entre usuários e eventos com papéis (host/guest)
  eventMembers: defineTable({
    userId: v.id('users'),
    eventId: v.id('events'),
    role: v.union(v.literal('host'), v.literal('guest')),
    joinedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_event', ['eventId'])
    .index('by_event_and_user', ['eventId', 'userId']),

  // Configurações por evento
  eventConfig: defineTable({
    eventId: v.id('events'),
    key: v.string(),
    value: v.string(),
  })
    .index('by_event', ['eventId'])
    .index('by_event_and_key', ['eventId', 'key']),

  // Presentes (gifts) da lista do casal
  gifts: defineTable({
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
  })
    .index('by_event', ['eventId'])
    .index('by_event_and_status', ['eventId', 'status']),

  // Configurações do site (textos, nomes, etc.)
  config: defineTable({
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),
})

export default schema
