// Hooks relacionados aos presentes (gifts) de um evento

import { useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useGifts(eventId: Id<'events'> | undefined) {
  const gifts = useQuery(
    api.gifts.listGiftsForEvent,
    eventId ? { eventId } : 'skip',
  )

  return {
    gifts: gifts ?? [],
    isLoading: !!eventId && gifts === undefined,
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
