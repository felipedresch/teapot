import { create } from 'zustand'
import type { Id } from '../../convex/_generated/dataModel'

export type EventGift = {
  _id: Id<'gifts'>
  _creationTime: number
  eventId: Id<'events'>
  name: string
  description?: string
  imageId?: Id<'_storage'>
  category?: string
  referenceUrl?: string
  status: 'available' | 'reserved' | 'received'
  reservedBy?: Id<'users'>
  reservedAt?: number
  reservedByName?: string
}

type EventGiftsState = {
  eventId: Id<'events'> | null
  gifts: EventGift[]
  setFromServer: (eventId: Id<'events'>, gifts: EventGift[]) => void
  addGift: (gift: EventGift) => void
  updateGift: (giftId: Id<'gifts'>, patch: Partial<EventGift>) => void
  removeGift: (giftId: Id<'gifts'>) => void
  reset: () => void
}

export const useEventGiftsStore = create<EventGiftsState>((set) => ({
  eventId: null,
  gifts: [],

  setFromServer: (eventId, gifts) =>
    set((state) => {
      // Se estamos mudando de evento, substitui tudo.
      if (!state.eventId || state.eventId !== eventId) {
        return { eventId, gifts }
      }

      // Mesmo evento: usamos a lista do servidor como fonte da verdade,
      // preservando possíveis campos extras locais se o _id bater.
      const merged = gifts.map((serverGift) => {
        const local = state.gifts.find((g) => g._id === serverGift._id)
        return local ? { ...serverGift, ...local } : serverGift
      })

      return { eventId, gifts: merged }
    }),

  addGift: (gift) =>
    set((state) => {
      if (!state.eventId || state.eventId !== gift.eventId) {
        return state
      }
      const exists = state.gifts.some((g) => g._id === gift._id)
      if (exists) return state
      return { gifts: [gift, ...state.gifts] }
    }),

  updateGift: (giftId, patch) =>
    set((state) => ({
      gifts: state.gifts.map((g) =>
        g._id === giftId
          ? {
              ...g,
              ...patch,
            }
          : g,
      ),
    })),

  removeGift: (giftId) =>
    set((state) => ({
      gifts: state.gifts.filter((g) => g._id !== giftId),
    })),

  reset: () => set({ eventId: null, gifts: [] }),
}))

