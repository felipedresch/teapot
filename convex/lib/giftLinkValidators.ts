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

// Sugestões de produto (convex/productSuggestions.ts).
export const suggestionOccasionValidator = v.union(
  v.literal('casaNova'),
  v.literal('panela'),
  v.literal('aniversario'),
  v.literal('bebe'),
)

export const suggestionSlotValidator = v.union(
  v.literal('budget'),
  v.literal('popular'),
  v.literal('gift'),
)

// Para onde o clique em /r/<giftId> leva: o link do presente ou a busca do
// botão "Ver opções na Shopee".
export const giftLinkKindValidator = v.union(
  v.literal('reference'),
  v.literal('shopee_options'),
)
