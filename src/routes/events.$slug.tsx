import { createFileRoute } from '@tanstack/react-router'

// Rota pública da lista de presentes de um evento específico.
// Path esperado: /events/$slug
//
// Fluxo:
// - Host envia este link para os convidados.
// - Convidado cai diretamente na página da lista de presentes daquele evento.
// - Nesta página:
//   - carregaremos o evento via slug (useEventBySlug);
//   - carregaremos os gifts deste evento (useGifts);
//   - usuário NÃO precisa estar logado para apenas visualizar a lista;
//   - ao clicar para "escolher / reservar" um presente:
//     - se não estiver logado, será forçado a fazer login com Google;
//     - após login, utilizaremos a mutation reserveGift (que também cria
//       automaticamente membership guest no eventMembers se ainda não existir);
//     - depois do login, ele deve voltar para esta mesma página com o estado
//       preservado para concluir a reserva.

export const Route = createFileRoute('/events/$slug')({
  component: EventGiftsPageShell,
})

function EventGiftsPageShell() {
  // TODO: Implementar:
  // - Leitura do slug via Route.useParams()
  // - useEventBySlug(slug) para carregar dados do evento
  // - useGifts(eventId) quando o evento estiver carregado
  // - Listagem dos presentes
  // - Botão de reserva que dispara fluxo de login + reserveGift
  return null
}

