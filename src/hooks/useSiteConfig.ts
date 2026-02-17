import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

const DEFAULT_CONFIG = {
  partnerOneName: '',
  partnerTwoName: '',
  eventName: '',
  eventDate: '',
  welcomeMessage:
    'Que bom que você está aqui! Escolha com carinho um mimo para nos presentear nessa fase tão especial.',
  thankYouMessage: 'Muito obrigado pelo carinho! ♥',
}

export function useSiteConfig() {
  const config = useQuery(api.config.getPublicSiteConfig)

  return {
    partnerOneName: config?.partnerOneName ?? DEFAULT_CONFIG.partnerOneName,
    partnerTwoName: config?.partnerTwoName ?? DEFAULT_CONFIG.partnerTwoName,
    eventName: config?.eventName ?? DEFAULT_CONFIG.eventName,
    eventDate: config?.eventDate ?? DEFAULT_CONFIG.eventDate,
    welcomeMessage: config?.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage,
    thankYouMessage: config?.thankYouMessage ?? DEFAULT_CONFIG.thankYouMessage,
    isLoading: config === undefined,
  }
}
