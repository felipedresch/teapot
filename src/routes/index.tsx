import { createFileRoute } from '@tanstack/react-router'

// Página inicial (home) do projeto.
// Fluxos esperados aqui:
// - Host (casal) pode iniciar criação de um novo evento sem estar logado:
//   - clica no botão Criar Evento e é levado para a rota /events/create.
//   - preenche informações básicas do evento (nome, data, local, slug, etc.);
//   - adiciona ao menos um gift em memória (via Zustand);
//   - só quando clicar em "finalizar/criar evento" exigimos login Google;
//   - após login, usaremos os dados do store para criar o evento e gifts no Convex.
// - Convidado sem slug:
//   - verá uma barra de busca para encontrar eventos públicos;
//   - poderá pesquisar por nome de host, nome do evento, slug, local, etc.;
//   - ao selecionar um resultado, será redirecionado para a página pública da lista
//     de presentes daquele evento (rota por slug).
//
// Implementação futura:
// - Formulário controlado integrado com useEventCreationStore.
// - UI com duas "entradas" claras: "Criar evento" e "Pesquisar evento".

export const Route = createFileRoute('/')({
  component: HomePageShell,
})

function HomePageShell() {
  // TODO: Implementar UI e lógica de:
  // - Início do fluxo de criação de evento (escrita no eventCreationStore).
  // - Barra de pesquisa de eventos públicos para convidados.
  return null
}

