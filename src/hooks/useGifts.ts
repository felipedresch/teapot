// Hooks relacionados aos presentes (gifts) de um evento

import { useCallback } from 'react'
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useGifts(eventId: Id<'events'> | undefined) {
  const {
    results: giftCatalog,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.gifts.listGiftCatalogForEvent,
    eventId ? { eventId } : 'skip',
    { initialNumItems: 24 },
  )
  const loadedGiftIds = giftCatalog.map((gift) => gift._id)
  const giftStatuses = useQuery(
    api.gifts.listGiftStatusesForGiftIds,
    eventId && loadedGiftIds.length > 0 ? { giftIds: loadedGiftIds } : 'skip',
  )

  const statusMap = new Map((giftStatuses ?? []).map((status) => [status._id, status]))
  const gifts = giftCatalog.map((gift) => {
    const status = statusMap.get(gift._id)
    return {
      ...gift,
      status: status?.status ?? gift.status,
      reservedAt: status?.reservedAt ?? gift.reservedAt,
      reservedByCurrentUser: status?.reservedByCurrentUser ?? false,
      reservedByName: status?.reservedByName,
    }
  })

  return {
    gifts,
    isLoading:
      !!eventId &&
      (paginationStatus === 'LoadingFirstPage' ||
        (giftCatalog.length > 0 && giftStatuses === undefined)),
    paginationStatus,
    hasMore: paginationStatus === 'CanLoadMore',
    isLoadingMore: paginationStatus === 'LoadingMore',
    loadMore,
  }
}

export function useGiftMutations() {
  const createGiftMutation = useMutation(api.gifts.createGift)
  const reserveGiftMutation = useMutation(api.gifts.reserveGift)
  const updateGiftMutation = useMutation(api.gifts.updateGift)
  const deleteGiftMutation = useMutation(api.gifts.deleteGift)

  const createGift = useCallback(
    async (args: {
      eventId: Id<'events'>
      name: string
      description?: string
      imageId?: Id<'_storage'>
      imageUrl?: string
      category?: string
      referenceUrl?: string
    }) => {
      const { imageUrl: _, ...mutationArgs } = args
      const giftId = await createGiftMutation(mutationArgs)
      return giftId
    },
    [createGiftMutation],
  )

  const reserveGift = useCallback(
    async (args: { giftId: Id<'gifts'> }) => {
      await reserveGiftMutation(args)
    },
    [reserveGiftMutation],
  )

  const updateGift = useCallback(
    async (args: {
      giftId: Id<'gifts'>
      name?: string
      description?: string
      imageId?: Id<'_storage'> | null
      imageUrl?: string
      category?: string
      referenceUrl?: string
    }) => {
      const { imageUrl: _, ...mutationArgs } = args
      await updateGiftMutation(mutationArgs)
    },
    [updateGiftMutation],
  )

  const deleteGift = useCallback(
    async (args: { giftId: Id<'gifts'> }) => {
      await deleteGiftMutation(args)
    },
    [deleteGiftMutation],
  )

  return {
    createGift,
    reserveGift,
    updateGift,
    deleteGift,
  }
}
