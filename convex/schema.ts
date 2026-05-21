import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    imageSourceUrl: v.optional(v.string()),
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
    eventType: v.optional(v.string()),
    customEventType: v.optional(v.string()),
    hosts: v.optional(v.array(v.string())),
    // Legacy flag kept in sync with `visibility` for backward compatibility and
    // for the `by_is_public` index used by the public showcase queries.
    // visibility === 'public' && unlocked => isPublic = true.
    isPublic: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('unlisted'),
        v.literal('public'),
      ),
    ),
    partnerOneName: v.string(),
    partnerTwoName: v.string(),
    createdByUserId: v.id('users'),
    createdByPartner: v.union(v.literal('partnerOne'), v.literal('partnerTwo')),
    date: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id('_storage')),
    monetizationStatus: v.optional(
      v.union(
        v.literal('grandfathered'),
        v.literal('requires_payment'),
        v.literal('paid'),
      ),
    ),
    paidAt: v.optional(v.number()),
    paidByPaymentId: v.optional(v.id('payments')),
  })
    .index('by_slug', ['slug'])
    .index('by_is_public', ['isPublic']),

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

  // Convites para co-anfitriões via link (in-house, sem email/sms)
  eventInvites: defineTable({
    eventId: v.id('events'),
    token: v.string(),
    role: v.literal('host'),
    createdByUserId: v.id('users'),
    createdAt: v.number(),
    usedByUserId: v.optional(v.id('users')),
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index('by_token', ['token'])
    .index('by_event', ['eventId']),

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
    reservationMessage: v.optional(v.string()),
  })
    .index('by_event', ['eventId'])
    .index('by_event_and_status', ['eventId', 'status'])
    .index('by_reserved_by', ['reservedBy'])
    .index('by_image_id', ['imageId']),

  temporaryGiftImages: defineTable({
    imageId: v.id('_storage'),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_image_id', ['imageId'])
    .index('by_expires_at', ['expiresAt']),

  payments: defineTable({
    eventId: v.id('events'),
    userId: v.id('users'),
    tier: v.union(v.literal('single'), v.literal('lifetime')),
    category: v.union(v.literal('common'), v.literal('premium')),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
    provider: v.literal('abacatepay'),
    providerCheckoutId: v.optional(v.string()),
    externalId: v.string(),
    brCode: v.optional(v.string()),
    brCodeBase64: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId'])
    .index('by_event_and_user', ['eventId', 'userId'])
    .index('by_external_id', ['externalId'])
    .index('by_provider_checkout_id', ['providerCheckoutId']),

  userEntitlements: defineTable({
    userId: v.id('users'),
    type: v.literal('lifetime'),
    status: v.union(v.literal('active'), v.literal('revoked')),
    sourcePaymentId: v.id('payments'),
    grantedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_type', ['userId', 'type']),

  paymentWebhookEvents: defineTable({
    provider: v.literal('abacatepay'),
    providerEventId: v.string(),
    eventName: v.string(),
    processedStatus: v.union(
      v.literal('processing'),
      v.literal('processed'),
      v.literal('failed'),
    ),
    rawPayload: v.any(),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    processingError: v.optional(v.string()),
  })
    .index('by_provider_event_id', ['providerEventId'])
    .index('by_event_name', ['eventName']),

  // Configurações do site (textos, nomes, etc.)
  config: defineTable({
    key: v.string(),
    value: v.string(),
  }).index('by_key', ['key']),
})

export default schema
