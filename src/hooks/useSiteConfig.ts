// TODO: Conectar à tabela `config` do Convex para buscar valores reais
// Por enquanto retorna dados placeholder para desenvolvimento.
// A tabela config já existe no schema (convex/schema.ts) com key/value.
// Quando integrar, usar useQuery(api.config.getAll) ou similar.

export function useSiteConfig() {
  // TODO: Replace with Convex query
  return {
    partnerOneName: 'Sthéfany',
    partnerTwoName: 'Bruno',
    eventName: 'Chá de Casa Nova',
    eventDate: '15 de Março de 2025',
    welcomeMessage:
      'Que bom que você está aqui! Escolha com carinho um mimo para nos presentear nessa fase tão especial.',
    thankYouMessage: 'Muito obrigado pelo carinho! ♥',
    isLoading: false,
  }
}
