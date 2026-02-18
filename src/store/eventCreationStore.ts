// Store (Zustand) para fluxo de criação de evento sem login prévio.
// Ideia:
// - Na home, o usuário pode começar a criar um evento sem estar autenticado.
// - Preenche dados básicos do evento e adiciona alguns gifts "locais".
// - Ao clicar em "finalizar / criar evento", exigimos login com Google.
// - Após o login, um fluxo futuro usará os dados deste store para:
//   - Chamar mutation Convex createEvent
//   - Chamar mutation createGift para cada gift local
//   - Associar o usuário autenticado como host do evento (já feito em createEvent).

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Id } from '../../convex/_generated/dataModel'

type DraftGift = {
  tempId: string
  name: string
  description?: string
  category?: string
  referenceUrl?: string
  imageId?: Id<'_storage'>
  imageUrl?: string
}

type DraftEvent = {
  name: string
  eventType: string
  customEventType?: string
  hosts: Array<string>
  createdByPartner: 'partnerOne' | 'partnerTwo'
  isPublic: boolean
  date?: string
  location?: string
  description?: string
  coverImageId?: Id<'_storage'>
  coverImageUrl?: string
}

type EventCreationState = {
  draftEvent: DraftEvent | null
  draftGifts: DraftGift[]
  customGiftCategories: string[]
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setDraftEvent: (data: DraftEvent) => void
  clearDraftEvent: () => void
  addDraftGift: (gift: DraftGift) => void
  removeDraftGift: (tempId: string) => void
  addCustomGiftCategory: (value: string) => void
  clearDraftGifts: () => void
  pendingPublish: boolean
  setPendingPublish: (value: boolean) => void
  resetAll: () => void
}

export const useEventCreationStore = create<EventCreationState>()(
  persist(
    (set) => ({
      draftEvent: null,
      draftGifts: [],
      customGiftCategories: [],
      pendingPublish: false,
      isHydrated: false,

      setHydrated: (value) => set({ isHydrated: value }),

      setDraftEvent: (data) => set({ draftEvent: data }),

      clearDraftEvent: () => set({ draftEvent: null }),

      addDraftGift: (gift) =>
        set((state) => ({
          draftGifts: [...state.draftGifts, gift],
        })),

      removeDraftGift: (tempId) =>
        set((state) => ({
          draftGifts: state.draftGifts.filter((g) => g.tempId !== tempId),
        })),

      addCustomGiftCategory: (value) =>
        set((state) => {
          const normalized = value.trim()
          if (!normalized) return state
          if (state.customGiftCategories.includes(normalized)) return state
          return {
            customGiftCategories: [...state.customGiftCategories, normalized],
          }
        }),

      clearDraftGifts: () => set({ draftGifts: [] }),

      setPendingPublish: (value) => set({ pendingPublish: value }),

      resetAll: () =>
        set({
          draftEvent: null,
          draftGifts: [],
          customGiftCategories: [],
          pendingPublish: false,
        }),
    }),
    {
      name: 'event-creation-store-v2',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
      partialize: (state) => ({
        draftEvent: state.draftEvent,
        draftGifts: state.draftGifts,
        customGiftCategories: state.customGiftCategories,
        pendingPublish: state.pendingPublish,
      }),
    },
  ),
)

