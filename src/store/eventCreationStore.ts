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
import type { Id } from '../../convex/_generated/dataModel'

type DraftGift = {
  tempId: string
  name: string
  description?: string
  category?: string
  referenceUrl?: string
  imageId?: Id<'_storage'>
}

type DraftEvent = {
  name: string
  slug: string
  date?: string
  location?: string
  description?: string
  coverImageId?: Id<'_storage'>
}

type EventCreationState = {
  draftEvent: DraftEvent | null
  draftGifts: DraftGift[]
  setDraftEvent: (data: DraftEvent) => void
  clearDraftEvent: () => void
  addDraftGift: (gift: DraftGift) => void
  removeDraftGift: (tempId: string) => void
  clearDraftGifts: () => void
}

export const useEventCreationStore = create<EventCreationState>((set) => ({
  draftEvent: null,
  draftGifts: [],

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

  clearDraftGifts: () => set({ draftGifts: [] }),
}))

