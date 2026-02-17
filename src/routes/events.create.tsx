import { createFileRoute } from '@tanstack/react-router'

// Página dedicada (opcional) para o fluxo de criação/edição do evento.
// Dependendo do design, parte desse fluxo pode ficar na própria home (/),
// mas esta rota existe para:
// - Ter um espaço mais focado de "wizard" de criação do evento;
// - Consumir e editar o estado do eventCreationStore;
// - Depois do login Google, redirecionar o usuário para cá para finalizar
//   a criação (chamando as mutations Convex).
//
// Fluxo esperado:
// - Usuário (possível host) chega na home e escolhe "Criar meu evento".
// - Navegamos para /events/create.
// - Ele preenche:
//   - dados básicos do evento (draftEvent no store);
//   - adiciona alguns gifts locais (draftGifts no store).
// - Ao clicar em "finalizar / publicar", se não estiver logado:
//   - disparamos login com Google;
//   - após login, recuperamos o estado do store;
//   - chamamos createEvent + createGift(s);
//   - então redirecionamos para a página pública do evento (/events/$slug)
//     ou para uma página de dashboard de host, dependendo do design futuro.

export const Route = createFileRoute('/events/create')({
  component: EventCreatePageShell,
})

function EventCreatePageShell() {
  // TODO: Implementar:
  // - Formulário ligado ao eventCreationStore (draftEvent).
  // - Lista de gifts locais ligada ao draftGifts do store.
  // - Botão de "finalizar / publicar" que integra com login + Convex.
  return null
}

