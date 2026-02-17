// Hook de leitura de eventos ligados ao usuário atual (host ou guest)
// - Usa Convex useQuery em api.events.listEventsForCurrentUser
// - Futuramente pode ser usado na home para mostrar "meus eventos"
//   ou para navegação rápida do host/convidado.

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useMyEvents() {
  const events = useQuery(api.events.listEventsForCurrentUser)

  const isLoading = events === undefined

  return {
    events: events ?? [],
    isLoading,
  }
}

export function useMyEventsGrouped() {
  const grouped = useQuery(api.events.listMyEventsGrouped)

  const isLoading = grouped === undefined

  return {
    hosting: grouped?.hosting ?? [],
    attending: grouped?.attending ?? [],
    isLoading,
  }
}

// Hook para carregar um evento público por slug
// - Usado na rota pública /eventos/$slug
// - Não exige autenticação, apenas carrega os dados básicos do evento.

export function useEventBySlug(slug: string | undefined) {
  const event = useQuery(
    api.events.getEventBySlug,
    slug ? { slug } : 'skip',
  )

  const isLoading = event === undefined

  return {
    event,
    isLoading,
  }
}

export function useEventMembership(eventId: Id<'events'> | undefined) {
  const membership = useQuery(
    api.events.getMembershipForCurrentUserAndEvent,
    eventId ? { eventId } : 'skip',
  )

  const isLoading = membership === undefined

  return {
    membership: membership ?? null,
    isLoading,
  }
}

export function useEventSearch(search: string, enabled: boolean) {
  const events = useQuery(
    api.events.searchPublicEvents,
    enabled ? { search: search.trim() || undefined } : 'skip',
  )

  return {
    events: events ?? [],
    isLoading: enabled && events === undefined,
  }
}

