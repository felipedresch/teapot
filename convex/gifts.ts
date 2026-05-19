import { getAuthUserId } from '@convex-dev/auth/server'
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from './_generated/server'
import { v } from 'convex/values'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

const REFERENCE_FETCH_TIMEOUT_MS = 12000
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024
const TEMP_GIFT_IMAGE_TTL_MS = 6 * 60 * 60 * 1000
const BROWSER_LIKE_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function normalizeReferenceUrl(referenceUrl: string) {
  const normalized = referenceUrl.trim()
  if (!normalized) {
    throw new Error('Informe um link válido.')
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error('Link de referência inválido.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Use um link com http ou https.')
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error('Link de referência não permitido.')
  }

  return parsed
}

function isPrivateHost(hostname: string) {
  const host = hostname.trim().toLowerCase()
  if (!host) return true
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true
  }

  if (host.includes(':')) {
    return host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')
  }

  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  if (!isIpv4) {
    return false
  }

  const parts = host.split('.').map((part) => Number(part))
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }

  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REFERENCE_FETCH_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function decodeHtmlEntity(value: string) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function parseAttribute(tag: string, attribute: string) {
  const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, 'i')
  const match = tag.match(regex)
  return match?.[1]?.trim()
}

function getImageCandidatesFromHtml(html: string) {
  const candidates: string[] = []
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? []

  for (const tag of metaTags) {
    const property = parseAttribute(tag, 'property')?.toLowerCase()
    const name = parseAttribute(tag, 'name')?.toLowerCase()
    const content = parseAttribute(tag, 'content')
    if (!content) continue

    if (
      property === 'og:image' ||
      property === 'og:image:secure_url' ||
      name === 'twitter:image' ||
      name === 'twitter:image:src'
    ) {
      candidates.push(decodeHtmlEntity(content))
    }
  }

  const linkTags = html.match(/<link\s+[^>]*>/gi) ?? []
  for (const tag of linkTags) {
    const rel = parseAttribute(tag, 'rel')?.toLowerCase()
    const href = parseAttribute(tag, 'href')
    if (rel === 'image_src' && href) {
      candidates.push(decodeHtmlEntity(href))
    }
  }

  if (candidates.length > 0) {
    return candidates
  }

  const firstImgSrc = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  if (firstImgSrc) {
    candidates.push(decodeHtmlEntity(firstImgSrc))
  }

  return candidates
}

function getAbsoluteImageUrl(candidate: string, baseUrl: URL) {
  const normalized = candidate.trim()
  if (!normalized) return null
  if (normalized.startsWith('data:')) return null
  if (normalized.startsWith('blob:')) return null

  try {
    const resolved = new URL(normalized, baseUrl)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null
    }
    if (isPrivateHost(resolved.hostname)) {
      return null
    }
    return resolved.toString()
  } catch {
    return null
  }
}

function normalizeAmazonImageUrl(imageUrl: string) {
  const [base, query] = imageUrl.split('?')
  const normalizedBase =
    base?.replace(/\._[^./]+_\.(jpe?g|png|webp)$/i, '.$1') ?? imageUrl
  if (!query) {
    return normalizedBase
  }
  return `${normalizedBase}?${query}`
}

function isLikelyTrackingImageUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    const full = `${host}${path}`.toLowerCase()

    if (full.includes('amazon-adsystem')) return true
    if (full.includes('pixel')) return true
    if (full.includes('tracker')) return true
    if (full.includes('/uedata')) return true
    if (full.includes('/batch/')) return true
    if (full.includes('/gp/aw/ol')) return true
    if (host.startsWith('fls-na.')) return true

    return false
  } catch {
    return true
  }
}

function pickPreferredImageUrl(candidates: string[], referenceUrl: URL) {
  const filteredCandidates = candidates.filter(
    (candidate) => !isLikelyTrackingImageUrl(candidate),
  )
  if (filteredCandidates.length === 0) {
    return null
  }

  const isAmazonReference = referenceUrl.hostname.includes('amazon.')
  if (isAmazonReference) {
    const amazonProductImage = filteredCandidates.find((candidate) =>
      candidate.includes('m.media-amazon.com/images/I/'),
    )
    if (amazonProductImage) {
      return normalizeAmazonImageUrl(amazonProductImage)
    }
  }

  const firstValid = filteredCandidates[0]
  if (!firstValid) {
    return null
  }
  return firstValid
}

function toAbsoluteImageCandidates(candidates: string[], baseUrl: URL) {
  const deduped = new Set<string>()

  for (const candidate of candidates) {
    const absolute = getAbsoluteImageUrl(candidate, baseUrl)
    if (absolute) {
      deduped.add(absolute)
    }
  }

  return Array.from(deduped)
}

function parseReferenceExtractionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return 'Não foi possível extrair imagem desse link agora.'
}

function parseMarkdownImageCandidates(markdown: string) {
  const candidates = new Set<string>()

  const markdownImageMatches = markdown.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi)
  for (const match of markdownImageMatches) {
    const url = match[1]?.trim()
    if (url) {
      candidates.add(url)
    }
  }

  const rawUrlMatches = markdown.matchAll(/https?:\/\/[^\s)<>"']+/gi)
  for (const match of rawUrlMatches) {
    const rawUrl = match[0]?.trim()
    if (!rawUrl) continue
    const sanitized = rawUrl.replace(/[),.;]+$/, '')
    if (sanitized.includes('.jpg') || sanitized.includes('.jpeg') || sanitized.includes('.png') || sanitized.includes('.webp')) {
      candidates.add(sanitized)
    }
  }

  return Array.from(candidates)
}

async function tryResolveImageFromDirectFetch(referenceUrl: URL) {
  const pageResponse = await fetchWithTimeout(referenceUrl.toString(), {
    headers: {
      'user-agent': BROWSER_LIKE_USER_AGENT,
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'follow',
  })

  if (!pageResponse.ok) {
    return null
  }

  const pageContentType = pageResponse.headers.get('content-type') ?? ''
  if (pageContentType.startsWith('image/')) {
    return referenceUrl.toString()
  }

  const html = await pageResponse.text()
  const candidateUrls = toAbsoluteImageCandidates(
    getImageCandidatesFromHtml(html),
    referenceUrl,
  )

  return pickPreferredImageUrl(candidateUrls, referenceUrl)
}

async function tryResolveImageFromReaderFallback(referenceUrl: URL) {
  const readerUrl = `https://r.jina.ai/${referenceUrl.toString()}`
  const readerResponse = await fetchWithTimeout(readerUrl, {
    headers: {
      'user-agent': BROWSER_LIKE_USER_AGENT,
      'x-with-generated-alt': 'true',
      'x-retain-images': 'all',
      'x-respond-with': 'markdown',
      'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'follow',
  })

  if (!readerResponse.ok) {
    return null
  }

  const markdown = await readerResponse.text()
  const candidateUrls = toAbsoluteImageCandidates(
    parseMarkdownImageCandidates(markdown),
    referenceUrl,
  )
  return pickPreferredImageUrl(candidateUrls, referenceUrl)
}

async function tryResolveImageFromMicrolink(referenceUrl: URL) {
  const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(
    referenceUrl.toString(),
  )}`
  const microlinkResponse = await fetchWithTimeout(microlinkUrl, {
    headers: {
      'user-agent': BROWSER_LIKE_USER_AGENT,
      accept: 'application/json',
    },
    redirect: 'follow',
  })

  if (!microlinkResponse.ok) {
    return null
  }

  const payload = (await microlinkResponse.json()) as {
    status?: string
    data?: {
      image?: {
        url?: string
      }
    }
  }

  if (payload.status !== 'success') {
    return null
  }

  const imageUrl = payload.data?.image?.url?.trim()
  if (!imageUrl) {
    return null
  }

  const candidates = toAbsoluteImageCandidates([imageUrl], referenceUrl)
  return pickPreferredImageUrl(candidates, referenceUrl)
}

async function downloadReferenceImage(sourceImageUrl: string, referenceUrl: URL) {
  const imageResponse = await fetchWithTimeout(sourceImageUrl, {
    headers: {
      'user-agent': BROWSER_LIKE_USER_AGENT,
      referer: referenceUrl.toString(),
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!imageResponse.ok) {
    throw new Error('Não foi possível baixar a imagem do link.')
  }

  const imageContentType = imageResponse.headers.get('content-type') ?? ''
  if (!imageContentType.startsWith('image/')) {
    throw new Error('O link retornou um arquivo que não é imagem.')
  }

  const imageBlob = await imageResponse.blob()
  if (imageBlob.size === 0) {
    throw new Error('A imagem retornada está vazia.')
  }
  if (imageBlob.size > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error('A imagem do link é muito grande (máx. 8MB).')
  }

  return imageBlob
}

async function registerTemporaryGiftImage(
  ctx: MutationCtx,
  imageId: Id<'_storage'>,
) {
  const existing = await ctx.db
    .query('temporaryGiftImages')
    .withIndex('by_image_id', (q) => q.eq('imageId', imageId))
    .unique()
  if (existing) {
    return existing._id
  }

  const createdAt = Date.now()
  const expiresAt = createdAt + TEMP_GIFT_IMAGE_TTL_MS
  const tempImageId = await ctx.db.insert('temporaryGiftImages', {
    imageId,
    createdAt,
    expiresAt,
  })

  await ctx.scheduler.runAfter(
    TEMP_GIFT_IMAGE_TTL_MS,
    internal.gifts.cleanupTemporaryGiftImage,
    { tempImageId },
  )

  return tempImageId
}

async function removeTemporaryGiftImageRecordByImageId(
  ctx: MutationCtx,
  imageId?: Id<'_storage'> | null,
) {
  if (!imageId) return
  const existing = await ctx.db
    .query('temporaryGiftImages')
    .withIndex('by_image_id', (q) => q.eq('imageId', imageId))
    .unique()
  if (!existing) return
  await ctx.db.delete(existing._id)
}

export const listGiftCatalogForEvent = query({
  args: {
    eventId: v.id('events'),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      _id: v.id('gifts'),
      _creationTime: v.number(),
      eventId: v.id('events'),
      name: v.string(),
      description: v.optional(v.string()),
      imageId: v.optional(v.id('_storage')),
      imageUrl: v.optional(v.string()),
      category: v.optional(v.string()),
      referenceUrl: v.optional(v.string()),
      status: v.union(
        v.literal('available'),
        v.literal('reserved'),
        v.literal('received'),
      ),
      reservedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const giftsPage = await ctx.db
      .query('gifts')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .paginate(args.paginationOpts)

    const giftCatalog = []

    for (const gift of giftsPage.page) {
      let imageUrl: string | undefined

      if (gift.imageId) {
        imageUrl = (await ctx.storage.getUrl(gift.imageId)) ?? undefined
      }

      giftCatalog.push({
        _id: gift._id,
        _creationTime: gift._creationTime,
        eventId: gift.eventId,
        name: gift.name,
        description: gift.description,
        imageId: gift.imageId,
        imageUrl,
        category: gift.category,
        referenceUrl: gift.referenceUrl,
        status: gift.status,
        reservedAt: gift.reservedAt,
      })
    }

    giftCatalog.sort((a, b) => a._creationTime - b._creationTime)

    return {
      ...giftsPage,
      page: giftCatalog,
    }
  },
})

export const extractGiftImageFromReferenceUrl = action({
  args: {
    referenceUrl: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    imageId: v.optional(v.id('_storage')),
    imageUrl: v.optional(v.string()),
    sourceImageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const normalizedReferenceUrl = normalizeReferenceUrl(args.referenceUrl)

      let sourceImageUrl: string | null = null

      try {
        sourceImageUrl = await tryResolveImageFromDirectFetch(normalizedReferenceUrl)
      } catch {
        sourceImageUrl = null
      }

      if (!sourceImageUrl) {
        try {
          sourceImageUrl = await tryResolveImageFromReaderFallback(normalizedReferenceUrl)
        } catch {
          sourceImageUrl = null
        }
      }

      if (!sourceImageUrl) {
        try {
          sourceImageUrl = await tryResolveImageFromMicrolink(normalizedReferenceUrl)
        } catch {
          sourceImageUrl = null
        }
      }

      if (!sourceImageUrl) {
        return {
          success: false,
          error:
            'Não conseguimos extrair a imagem automaticamente desse link. Você pode enviar a imagem manualmente.',
        }
      }

      const imageBlob = await downloadReferenceImage(
        sourceImageUrl,
        normalizedReferenceUrl,
      )
      const imageId = await ctx.storage.store(imageBlob)
      await ctx.runMutation(internal.gifts.registerTemporaryGiftImageInternal, {
        imageId,
      })
      const imageUrl = await ctx.storage.getUrl(imageId)
      if (!imageUrl) {
        return {
          success: false,
          error: 'Não foi possível preparar a imagem extraída.',
        }
      }

      return {
        success: true,
        imageId,
        imageUrl,
        sourceImageUrl,
      }
    } catch (error) {
      return {
        success: false,
        error: parseReferenceExtractionError(error),
      }
    }
  },
})

export const listGiftStatusesForGiftIds = query({
  args: {
    giftIds: v.array(v.id('gifts')),
  },
  returns: v.array(
    v.object({
      _id: v.id('gifts'),
      status: v.union(
        v.literal('available'),
        v.literal('reserved'),
        v.literal('received'),
      ),
      reservedAt: v.optional(v.number()),
      reservedByCurrentUser: v.boolean(),
      reservedByName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.giftIds.length === 0) {
      return []
    }

    const userId = await getAuthUserId(ctx)
    const gifts = await Promise.all(args.giftIds.map((giftId) => ctx.db.get(giftId)))
    const existingGifts = gifts.filter((gift) => gift !== null)
    if (existingGifts.length === 0) {
      return []
    }

    const eventId = existingGifts[0].eventId
    const isHostView = userId
      ? (
          await ctx.db
            .query('eventMembers')
            .withIndex('by_event_and_user', (q) =>
              q.eq('eventId', eventId).eq('userId', userId),
            )
            .unique()
        )?.role === 'host'
      : false

    const statuses = []

    for (const gift of existingGifts) {
      let reservedByName: string | undefined
      const reservedByCurrentUser =
        !!userId &&
        !!gift.reservedBy &&
        String(gift.reservedBy) === String(userId)

      if (isHostView && gift.reservedBy) {
        const user = await ctx.db.get(gift.reservedBy)
        const name = user?.name?.trim()
        if (name) {
          reservedByName = name
        }
      }

      statuses.push({
        _id: gift._id,
        status: gift.status,
        reservedAt: gift.reservedAt,
        reservedByCurrentUser,
        reservedByName,
      })
    }

    return statuses
  },
})

export const cleanupTemporaryGiftImage = internalMutation({
  args: {
    tempImageId: v.id('temporaryGiftImages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tempImage = await ctx.db.get(args.tempImageId)
    if (!tempImage) {
      return null
    }

    const giftUsingImage = await ctx.db
      .query('gifts')
      .withIndex('by_image_id', (q) => q.eq('imageId', tempImage.imageId))
      .first()

    if (giftUsingImage) {
      await ctx.db.delete(tempImage._id)
      return null
    }

    try {
      await ctx.storage.delete(tempImage.imageId)
    } catch {
      // Ignore storage deletion errors for already-removed files.
    }
    await ctx.db.delete(tempImage._id)
    return null
  },
})

export const registerTemporaryGiftImageInternal = internalMutation({
  args: {
    imageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await registerTemporaryGiftImage(ctx, args.imageId)
    return null
  },
})

export const registerUploadedGiftImage = mutation({
  args: {
    eventId: v.id('events'),
    imageId: v.id('_storage'),
  },
  returns: v.null(),
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
      throw new Error('Somente hosts podem registrar imagens de presentes')
    }

    await registerTemporaryGiftImage(ctx, args.imageId)
    return null
  },
})

export const discardTemporaryGiftImage = mutation({
  args: {
    imageId: v.id('_storage'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const temporaryImage = await ctx.db
      .query('temporaryGiftImages')
      .withIndex('by_image_id', (q) => q.eq('imageId', args.imageId))
      .unique()

    if (!temporaryImage) {
      return null
    }

    const giftUsingImage = await ctx.db
      .query('gifts')
      .withIndex('by_image_id', (q) => q.eq('imageId', args.imageId))
      .first()
    if (giftUsingImage) {
      await ctx.db.delete(temporaryImage._id)
      return null
    }

    try {
      await ctx.storage.delete(args.imageId)
    } catch {
      // Ignore storage deletion errors for already-removed files.
    }
    await ctx.db.delete(temporaryImage._id)
    return null
  },
})

export const createGift = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id('_storage')),
    category: v.optional(v.string()),
    referenceUrl: v.optional(v.string()),
  },
  returns: v.id('gifts'),
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
      throw new Error('Somente hosts podem criar presentes')
    }

    const giftId = await ctx.db.insert('gifts', {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      category: args.category,
      referenceUrl: args.referenceUrl,
      status: 'available',
      reservedBy: undefined,
      reservedAt: undefined,
    })

    await removeTemporaryGiftImageRecordByImageId(ctx, args.imageId)

    return giftId
  },
})

export const reserveGift = mutation({
  args: {
    giftId: v.id('gifts'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Precisa estar autenticado para reservar um presente')
    }

    const gift = await ctx.db.get(args.giftId)
    if (!gift) {
      throw new Error('Presente não encontrado')
    }

    if (gift.status !== 'available') {
      throw new Error('Presente já reservado ou recebido')
    }

    const eventId = gift.eventId

    let membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', eventId).eq('userId', userId),
      )
      .unique()

    if (!membership) {
      const membershipId = await ctx.db.insert('eventMembers', {
        userId,
        eventId,
        role: 'guest',
        joinedAt: Date.now(),
      })
      membership = await ctx.db.get(membershipId)
    }

    await ctx.db.patch('gifts', args.giftId, {
      status: 'reserved',
      reservedBy: userId,
      reservedAt: Date.now(),
    })

    return null
  },
})

export const generateGiftImageUploadUrl = mutation({
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
      throw new Error('Somente hosts podem enviar imagens de presentes')
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const updateGift = mutation({
  args: {
    giftId: v.id('gifts'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.union(v.id('_storage'), v.null())),
    category: v.optional(v.string()),
    referenceUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const gift = await ctx.db.get(args.giftId)
    if (!gift) {
      throw new Error('Presente não encontrado')
    }

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', gift.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership || membership.role !== 'host') {
      throw new Error('Somente hosts podem editar presentes')
    }

    const nextImageId = args.imageId === null ? undefined : args.imageId

    await ctx.db.patch('gifts', args.giftId, {
      name: args.name ?? gift.name,
      description: args.description ?? gift.description,
      imageId: args.imageId !== undefined ? nextImageId : gift.imageId,
      category: args.category ?? gift.category,
      referenceUrl: args.referenceUrl ?? gift.referenceUrl,
    })

    if (args.imageId !== undefined) {
      await removeTemporaryGiftImageRecordByImageId(ctx, nextImageId ?? undefined)
    }

    if (gift.imageId && args.imageId !== undefined && gift.imageId !== nextImageId) {
      await ctx.storage.delete(gift.imageId)
      await removeTemporaryGiftImageRecordByImageId(ctx, gift.imageId)
    }

    return null
  },
})

export const deleteGift = mutation({
  args: {
    giftId: v.id('gifts'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const gift = await ctx.db.get(args.giftId)
    if (!gift) {
      throw new Error('Presente não encontrado')
    }

    const membership = await ctx.db
      .query('eventMembers')
      .withIndex('by_event_and_user', (q) =>
        q.eq('eventId', gift.eventId).eq('userId', userId),
      )
      .unique()

    if (!membership || membership.role !== 'host') {
      throw new Error('Somente hosts podem excluir presentes')
    }

    if (gift.imageId) {
      await ctx.storage.delete(gift.imageId)
      await removeTemporaryGiftImageRecordByImageId(ctx, gift.imageId)
    }

    await ctx.db.delete('gifts', args.giftId)

    return null
  },
})
