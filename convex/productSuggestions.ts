// Sugestões de produto da Shopee para o anfitrião ("Ideias para o seu…").
// Um cron diário (convex/crons.ts) busca cada ideia de
// convex/lib/suggestionIdeas.ts na Open API, escolhe 3 produtos por faixa de
// preço (convex/lib/suggestionRanking.ts) e guarda em productSuggestions. A
// página só lê esse cache: nunca chama a API por visita. Sem as credenciais,
// o cron não faz nada, a tabela fica vazia e a interface não aparece.
// docs/AFFILIATES.md.
import {
  internalAction,
  internalMutation,
  query,
  type QueryCtx,
} from './_generated/server'
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
  type SuggestionOccasion,
} from './lib/suggestionIdeas'
import {
  suggestionOccasionValidator,
  suggestionSlotValidator,
} from './lib/giftLinkValidators'
import { bestMatchIndex, type MatchCandidate } from './lib/suggestionMatch'
import type { Doc } from './_generated/dataModel'

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

type SuggestionRow = Doc<'productSuggestions'>

// Produtos que podem casar com um presente da lista. Com a ocasião, só os
// dela: "Manta casal" num chá de casa nova não pode cair numa manta de bebê.
// Sem ocasião (formatura, outro), tudo menos chá de bebê.
async function matchRows(
  ctx: QueryCtx,
  occasion: SuggestionOccasion | undefined,
): Promise<SuggestionRow[]> {
  if (occasion) {
    return ctx.db
      .query('productSuggestions')
      .withIndex('by_occasion_and_idea', (q) => q.eq('occasion', occasion))
      .take(500)
  }
  const rows = await ctx.db.query('productSuggestions').take(500)
  return rows.filter((row) => row.occasion !== 'bebe')
}

function matchCandidates(rows: SuggestionRow[]): MatchCandidate[] {
  return rows.map((row) => {
    const idea = SUGGESTION_OCCASIONS[row.occasion].ideas.find(
      (candidate) => candidate.id === row.ideaId,
    )
    return { label: idea?.label ?? '', name: row.name, slot: row.slot }
  })
}

// Produto em cache que combina com o nome de um presente sem link, para o
// /r/<giftId>?v=shopee (convex/lib/suggestionMatch.ts). null quando nada
// combina.
export const findSuggestionForGiftName = query({
  args: {
    name: v.string(),
    occasion: v.optional(suggestionOccasionValidator),
  },
  returns: v.union(v.null(), v.object({ productLink: v.string() })),
  handler: async (ctx, args) => {
    const rows = await matchRows(ctx, args.occasion)
    const index = bestMatchIndex(args.name, matchCandidates(rows))
    return index < 0 ? null : { productLink: rows[index].productLink }
  },
})

// O mesmo casamento para todos os presentes sem link de uma página de uma
// vez: "Onde comprar" do convidado e "Link sugerido" do anfitrião. Mesma
// ordem dos nomes; null onde nada combina. Os produtos são públicos.
export const matchSuggestionsForGiftNames = query({
  args: {
    names: v.array(v.string()),
    occasion: v.optional(suggestionOccasionValidator),
  },
  returns: v.array(
    v.union(
      v.null(),
      v.object({
        itemId: v.string(),
        name: v.string(),
        imageUrl: v.string(),
        price: v.number(),
        productLink: v.string(),
      }),
    ),
  ),
  handler: async (ctx, args) => {
    const rows = await matchRows(ctx, args.occasion)
    const candidates = matchCandidates(rows)
    return args.names.slice(0, 300).map((name) => {
      const index = bestMatchIndex(name, candidates)
      if (index < 0) return null
      const row = rows[index]
      return {
        itemId: row.itemId,
        name: row.name,
        imageUrl: row.imageUrl,
        price: row.price,
        productLink: row.productLink,
      }
    })
  },
})
