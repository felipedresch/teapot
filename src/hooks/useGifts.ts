// Hooks relacionados aos presentes (gifts) de um evento
// - Serão usados na página pública da lista (rota por slug)
//   e também em telas de host para gerenciar presentes.

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useGifts(eventId: Id<'events'> | undefined) {
  const gifts = useQuery(
    api.gifts.listGiftsForEvent,
    eventId ? { eventId } : 'skip',
  )

  const isLoading = gifts === undefined

  return {
    gifts: gifts ?? [],
    isLoading,
  }
}

// Hook de conveniência para mutações de gifts (criar e reservar)
// - Não é usado ainda, mas ficará pronto para as telas futuras.

export function useGiftMutations() {
  const createGift = useMutation(api.gifts.createGift)
  const reserveGift = useMutation(api.gifts.reserveGift)

  return {
    createGift,
    reserveGift,
  }
}

