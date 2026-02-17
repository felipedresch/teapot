// Hooks relacionados aos presentes (gifts) de um evento
// - Serão usados na página pública da lista (rota por slug)
//   e também em telas de host para gerenciar presentes.

import { useEffect, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useEventGiftsStore, type EventGift } from '../store/eventGiftsStore'

export function useGifts(eventId: Id<'events'> | undefined) {
  const serverGifts = useQuery(
    api.gifts.listGiftsForEvent,
    eventId ? { eventId } : 'skip',
  )

  const { eventId: storeEventId, gifts, setFromServer, reset } =
    useEventGiftsStore()

  useEffect(() => {
    if (!eventId) {
      if (storeEventId) {
        reset()
      }
      return
    }

    if (serverGifts) {
      setFromServer(eventId, serverGifts as EventGift[])
    }
  }, [eventId, serverGifts, setFromServer, reset, storeEventId])

  const isLoading = !!eventId && !serverGifts && gifts.length === 0

  return {
    gifts,
    isLoading,
  }
}

// Hook de conveniência para mutações de gifts (criar e reservar)
// - Não é usado ainda, mas ficará pronto para as telas futuras.

export function useGiftMutations() {
  const createGiftMutation = useMutation(api.gifts.createGift)
  const reserveGiftMutation = useMutation(api.gifts.reserveGift)
  const updateGiftMutation = useMutation(api.gifts.updateGift)
  const deleteGiftMutation = useMutation(api.gifts.deleteGift)

  const { eventId, addGift, updateGift, removeGift } = useEventGiftsStore()

  const createGift = useCallback(
    async (args: {
      eventId: Id<'events'>
      name: string
      description?: string
      imageId?: Id<'_storage'>
      category?: string
      referenceUrl?: string
    }) => {
      const giftId = await createGiftMutation(args)

      // Atualização otimista/local para aparecer imediatamente.
      addGift({
        _id: giftId,
        _creationTime: Date.now(),
        eventId: args.eventId,
        name: args.name,
        description: args.description,
        imageId: args.imageId,
        category: args.category,
        referenceUrl: args.referenceUrl,
        status: 'available',
        reservedBy: undefined,
        reservedAt: undefined,
        reservedByName: undefined,
      })

      return giftId
    },
    [addGift, createGiftMutation],
  )

  const reserveGift = useCallback(
    async (args: { giftId: Id<'gifts'> }) => {
      await reserveGiftMutation(args)
      updateGift(args.giftId, {
        status: 'reserved',
      })
    },
    [reserveGiftMutation, updateGift],
  )

  const updateGiftDetails = useCallback(
    async (args: {
      giftId: Id<'gifts'>
      name?: string
      description?: string
      category?: string
      referenceUrl?: string
    }) => {
      await updateGiftMutation(args)
      updateGift(args.giftId, {
        name: args.name,
        description: args.description,
        category: args.category,
        referenceUrl: args.referenceUrl,
      })
    },
    [updateGift, updateGiftMutation],
  )

  const deleteGift = useCallback(
    async (args: { giftId: Id<'gifts'> }) => {
      await deleteGiftMutation(args)
      removeGift(args.giftId)
    },
    [deleteGiftMutation, removeGift],
  )

  return {
    createGift,
    reserveGift,
    updateGift: updateGiftDetails,
    deleteGift,
  }
}

