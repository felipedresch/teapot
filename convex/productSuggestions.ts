// Sugestões de produto da Shopee para o anfitrião ("Ideias para o seu…").
// Um cron diário (convex/crons.ts) busca cada ideia de
// convex/lib/suggestionIdeas.ts na Open API, escolhe 3 produtos por faixa de
// preço (convex/lib/suggestionRanking.ts) e guarda em productSuggestions. A
// página só lê esse cache: nunca chama a API por visita. Sem as credenciais,
// o cron não faz nada, a tabela fica vazia e a interface não aparece.
// docs/AFFILIATES.md.
import { internalAction, internalMutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import {
  searchShopeeProducts,
  type ShopeeCredentials,
} from './lib/shopeeAffiliateApi'
import { rankSuggestions } from './lib/suggestionRanking'
import {
  SUGGESTION_OCCASIONS,
  uniqueSuggestionKeywords,
} from './lib/suggestionIdeas'
import {
  suggestionOccasionValidator,
  suggestionSlotValidator,
} from './lib/giftLinkValidators'

const suggestionProductValidator = v.object({
  slot: suggestionSlotValidator,
  itemId: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  price: v.number(),
  rating: v.optional(v.number()),
  sales: v.optional(v.number()),
  commissionRate: v.optional(v.number()),
  productLink: v.string(),
  shopName: v.optional(v.string()),
})

function readShopeeCredentials(): ShopeeCredentials | null {
  const appId = process.env.SHOPEE_AFFILIATE_APP_ID?.trim()
  const secret = process.env.SHOPEE_AFFILIATE_SECRET?.trim()
  return appId && secret ? { appId, secret } : null
}

export const refreshProductSuggestions = internalAction({
  args: {},
  returns: v.object({
    skipped: v.boolean(),
    keywords: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx) => {
    const credentials = readShopeeCredentials()
    if (!credentials) return { skipped: true, keywords: 0, failed: 0 }

    let failed = 0
    const keywords = uniqueSuggestionKeywords()
    for (const [keyword, targets] of keywords) {
      const products = await searchShopeeProducts(keyword, credentials, fetch, {
        limit: 30,
      })
      // API fora: mantém o que estava no cache.
      if (!products) {
        failed += 1
        continue
      }
      const ranked = rankSuggestions(products).map((product) => ({
        slot: product.slot,
        itemId: product.itemId,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        rating: product.rating ?? undefined,
        sales: product.sales ?? undefined,
        commissionRate: product.commissionRate ?? undefined,
        productLink: product.productLink,
        shopName: product.shopName ?? undefined,
      }))
      await ctx.runMutation(
        internal.productSuggestions.replaceIdeaSuggestions,
        {
          targets,
          products: ranked,
        },
      )
    }
    return { skipped: false, keywords: keywords.size, failed }
  },
})

export const replaceIdeaSuggestions = internalMutation({
  args: {
    targets: v.array(
      v.object({ occasion: suggestionOccasionValidator, ideaId: v.string() }),
    ),
    products: v.array(suggestionProductValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const fetchedAt = Date.now()
    for (const target of args.targets) {
      const old = await ctx.db
        .query('productSuggestions')
        .withIndex('by_occasion_and_idea', (q) =>
          q.eq('occasion', target.occasion).eq('ideaId', target.ideaId),
        )
        .collect()
      for (const row of old) await ctx.db.delete(row._id)
      for (const [position, product] of args.products.entries()) {
        await ctx.db.insert('productSuggestions', {
          ...product,
          occasion: target.occasion,
          ideaId: target.ideaId,
          position,
          fetchedAt,
        })
      }
    }
    return null
  },
})

const listedProductValidator = v.object({
  slot: suggestionSlotValidator,
  itemId: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  price: v.number(),
  rating: v.optional(v.number()),
  sales: v.optional(v.number()),
  productLink: v.string(),
})

// Ideias com produtos em cache, na ordem do giftInsights. Lista vazia quando
// a Shopee está desligada.
export const listProductSuggestions = query({
  args: { occasion: suggestionOccasionValidator },
  returns: v.array(
    v.object({
      ideaId: v.string(),
      label: v.string(),
      category: v.optional(v.string()),
      products: v.array(listedProductValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('productSuggestions')
      .withIndex('by_occasion_and_idea', (q) => q.eq('occasion', args.occasion))
      .collect()
    return SUGGESTION_OCCASIONS[args.occasion].ideas
      .map((idea) => ({
        ideaId: idea.id,
        label: idea.label,
        category: idea.category,
        products: rows
          .filter((row) => row.ideaId === idea.id)
          .sort((a, b) => a.position - b.position)
          .map((row) => ({
            slot: row.slot,
            itemId: row.itemId,
            name: row.name,
            imageUrl: row.imageUrl,
            price: row.price,
            rating: row.rating,
            sales: row.sales,
            productLink: row.productLink,
          })),
      }))
      .filter((idea) => idea.products.length > 0)
  },
})

function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

// Produto em cache que combina com o nome de um presente sem link (botão
// "Ver opções na Shopee" do convidado, quando a Shopee não aceita link de
// busca). Combina pelo rótulo da ideia ou pelo nome do produto; o mais
// escolhido ganha. null quando nada combina.
export const findSuggestionForGiftName = query({
  args: { name: v.string() },
  returns: v.union(v.null(), v.object({ productLink: v.string() })),
  handler: async (ctx, args) => {
    const giftWords = new Set(normalizeWords(args.name))
    if (giftWords.size === 0) return null
    const rows = await ctx.db.query('productSuggestions').take(500)
    let best: { productLink: string; score: number } | null = null
    for (const row of rows) {
      const idea = SUGGESTION_OCCASIONS[row.occasion].ideas.find(
        (candidate) => candidate.id === row.ideaId,
      )
      const words = new Set([
        ...normalizeWords(idea?.label ?? ''),
        ...normalizeWords(row.name),
      ])
      let score = 0
      for (const word of giftWords) if (words.has(word)) score += 1
      // Precisa bater pelo menos metade das palavras do presente.
      if (score * 2 < giftWords.size) continue
      score += row.slot === 'popular' ? 0.5 : 0
      if (!best || score > best.score) {
        best = { productLink: row.productLink, score }
      }
    }
    return best ? { productLink: best.productLink } : null
  },
})
