import { getAuthUserId } from '@convex-dev/auth/server'
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

const AVATAR_FETCH_TIMEOUT_MS = 10000
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export const currentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      isAdmin: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const user = await ctx.db.get(userId)
    if (!user) return null

    let resolvedImage = user.image
    if (user.imageStorageId) {
      const cachedUrl = await ctx.storage.getUrl(user.imageStorageId)
      if (cachedUrl) {
        resolvedImage = cachedUrl
      }
    }

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      image: resolvedImage,
      email: user.email,
      emailVerificationTime: user.emailVerificationTime,
      phone: user.phone,
      phoneVerificationTime: user.phoneVerificationTime,
      isAnonymous: user.isAnonymous,
      isAdmin: user.isAdmin,
    }
  },
})

export const setCachedAvatar = internalMutation({
  args: {
    userId: v.id('users'),
    imageStorageId: v.id('_storage'),
    imageSourceUrl: v.string(),
    previousStorageId: v.optional(v.id('_storage')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      imageStorageId: args.imageStorageId,
      imageSourceUrl: args.imageSourceUrl,
    })
    if (args.previousStorageId && args.previousStorageId !== args.imageStorageId) {
      try {
        await ctx.storage.delete(args.previousStorageId)
      } catch {
        // ignore
      }
    }
    return null
  },
})

export const getCurrentUserForCaching = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('users'),
      image: v.optional(v.string()),
      imageStorageId: v.optional(v.id('_storage')),
      imageSourceUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const user = await ctx.db.get(userId)
    if (!user) return null
    return {
      _id: user._id,
      image: user.image,
      imageStorageId: user.imageStorageId,
      imageSourceUrl: user.imageSourceUrl,
    }
  },
})

export const ensureCachedAvatar = action({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const user = await ctx.runQuery(internal.users.getCurrentUserForCaching, {})
    if (!user) return null
    const sourceUrl = user.image?.trim()
    if (!sourceUrl) return null

    if (user.imageStorageId && user.imageSourceUrl === sourceUrl) {
      return null
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AVATAR_FETCH_TIMEOUT_MS)

    let blob: Blob
    try {
      const response = await fetch(sourceUrl, { signal: controller.signal })
      if (!response.ok) return null
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.startsWith('image/')) return null
      blob = await response.blob()
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }

    if (blob.size === 0 || blob.size > MAX_AVATAR_BYTES) return null

    const imageStorageId = await ctx.storage.store(blob)
    await ctx.runMutation(internal.users.setCachedAvatar, {
      userId: user._id,
      imageStorageId,
      imageSourceUrl: sourceUrl,
      previousStorageId: user.imageStorageId,
    })
    return null
  },
})
