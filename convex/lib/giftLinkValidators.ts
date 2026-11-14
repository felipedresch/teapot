import { v } from 'convex/values'

// Mesmas lojas e motivos de src/lib/affiliate (o Convex não importa de src/).
export const giftLinkStoreValidator = v.union(
  v.literal('amazon'),
  v.literal('shopee'),
  v.literal('mercadolivre'),
  v.literal('magalu'),
  v.literal('shein'),
)

export const giftLinkReasonValidator = v.union(
  v.literal('rewritten'),
  v.literal('invalid_url'),
  v.literal('unknown_store'),
  v.literal('store_disabled'),
  v.literal('existing_affiliate'),
  v.literal('own_affiliate'),
  v.literal('resolve_failed'),
  v.literal('generator_failed'),
)

export const giftLinkSourceValidator = v.union(
  v.literal('guest'),
  v.literal('host'),
  v.literal('unknown'),
)
