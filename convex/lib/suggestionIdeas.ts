// Ideias de presente que viram sugestões da Shopee para o anfitrião. Saem dos
// itens mais pedidos de src/content/giftInsights.ts (npm run dados:gerar), na
// mesma ordem; o teste tests/giftSuggestions.test.ts confere que os nomes
// ainda existem lá. Para mudar a busca de uma ideia, troque só o `keyword`.

export type SuggestionOccasion = 'casaNova' | 'panela' | 'aniversario'

export type SuggestionIdea = {
  // Fica no banco (productSuggestions.ideaId): não renomeie à toa.
  id: string
  // Texto do chip, igual ao item do giftInsights.
  label: string
  // Busca na Shopee.
  keyword: string
  // Categoria que o formulário de presente recebe junto.
  category?: string
}

export const SUGGESTION_OCCASIONS: Record<
  SuggestionOccasion,
  { label: string; ideas: SuggestionIdea[] }
> = {
  casaNova: {
    label: 'chá de casa nova',
    ideas: [
      {
        id: 'potes-hermeticos',
        label: 'Potes herméticos',
        keyword: 'kit potes herméticos vidro',
        category: 'Cozinha',
      },
      {
        id: 'formas-assadeiras',
        label: 'Formas e assadeiras',
        keyword: 'kit formas assadeiras antiaderente',
        category: 'Cozinha',
      },
      {
        id: 'jogo-pratos',
        label: 'Jogo de pratos',
        keyword: 'aparelho de jantar 12 peças',
        category: 'Cozinha',
      },
      {
        id: 'toalhas-banho',
        label: 'Toalhas de banho',
        keyword: 'jogo de toalhas de banho algodão',
        category: 'Banheiro',
      },
      {
        id: 'faqueiro-talheres',
        label: 'Faqueiro e talheres',
        keyword: 'faqueiro inox 24 peças',
        category: 'Cozinha',
      },
      {
        id: 'jogo-copos',
        label: 'Jogo de copos',
        keyword: 'jogo de copos de vidro',
        category: 'Cozinha',
      },
      {
        id: 'tapete',
        label: 'Tapete',
        keyword: 'tapete sala antiderrapante',
        category: 'Sala',
      },
      {
        id: 'utensilios-cozinha',
        label: 'Utensílios de cozinha',
        keyword: 'kit utensílios de cozinha silicone',
        category: 'Cozinha',
      },
      {
        id: 'jogo-panelas',
        label: 'Jogo de panelas',
        keyword: 'jogo de panelas antiaderente',
        category: 'Cozinha',
      },
      {
        id: 'cesto-roupa',
        label: 'Cesto de roupa',
        keyword: 'cesto de roupa suja',
        category: 'Banheiro',
      },
    ],
  },
  panela: {
    label: 'chá de panela',
    ideas: [
      {
        id: 'jogo-pratos',
        label: 'Jogo de pratos',
        keyword: 'aparelho de jantar 12 peças',
        category: 'Cozinha',
      },
      {
        id: 'jogo-copos',
        label: 'Jogo de copos',
        keyword: 'jogo de copos de vidro',
        category: 'Cozinha',
      },
      {
        id: 'utensilios-cozinha',
        label: 'Utensílios de cozinha',
        keyword: 'kit utensílios de cozinha silicone',
        category: 'Cozinha',
      },
      {
        id: 'potes-hermeticos',
        label: 'Potes herméticos',
        keyword: 'kit potes herméticos vidro',
        category: 'Cozinha',
      },
      {
        id: 'formas-assadeiras',
        label: 'Formas e assadeiras',
        keyword: 'kit formas assadeiras antiaderente',
        category: 'Cozinha',
      },
      {
        id: 'faqueiro-talheres',
        label: 'Faqueiro e talheres',
        keyword: 'faqueiro inox 24 peças',
        category: 'Cozinha',
      },
      {
        id: 'toalhas-banho',
        label: 'Toalhas de banho',
        keyword: 'jogo de toalhas de banho algodão',
        category: 'Banheiro',
      },
      {
        id: 'mop-rodo-vassoura',
        label: 'Mop, rodo e vassoura',
        keyword: 'mop giratório balde',
      },
      {
        id: 'xicaras-canecas',
        label: 'Xícaras e canecas',
        keyword: 'jogo de xícaras de porcelana',
        category: 'Cozinha',
      },
      {
        id: 'escorredor-louca',
        label: 'Escorredor de louça',
        keyword: 'escorredor de louça inox',
        category: 'Cozinha',
      },
    ],
  },
  aniversario: {
    label: 'aniversário',
    ideas: [
      {
        id: 'roupas-acessorios',
        label: 'Roupas, calçados e acessórios',
        keyword: 'mochila casual',
      },
      {
        id: 'casa-decoracao',
        label: 'Casa, cozinha e decoração',
        keyword: 'luminária de mesa decorativa',
        category: 'Decoração',
      },
      {
        id: 'beleza-perfumes',
        label: 'Beleza e perfumes',
        keyword: 'kit skincare presente',
      },
      {
        id: 'brinquedos-infantil',
        label: 'Brinquedos e infantil',
        keyword: 'brinquedo educativo',
      },
      {
        id: 'livros-jogos',
        label: 'Livros, papelaria e jogos',
        keyword: 'jogo de tabuleiro',
      },
      {
        id: 'eletronicos',
        label: 'Eletrônicos',
        keyword: 'fone de ouvido bluetooth',
        category: 'Eletro',
      },
    ],
  },
}

// Ocasião das sugestões pelo tipo do evento. Casamento usa as ideias do chá de
// panela (as listas são parecidas); os outros tipos ficam sem sugestões.
export function suggestionOccasionForEventType(
  eventType: string | undefined,
): SuggestionOccasion | null {
  switch (eventType) {
    case 'housewarming':
      return 'casaNova'
    case 'bridal-shower':
    case 'wedding':
      return 'panela'
    case 'birthday':
      return 'aniversario'
    default:
      return null
  }
}

// Todas as buscas únicas (a mesma ideia em duas ocasiões busca uma vez só).
export function uniqueSuggestionKeywords() {
  const byKeyword = new Map<
    string,
    Array<{ occasion: SuggestionOccasion; ideaId: string }>
  >()
  for (const [occasion, config] of Object.entries(
    SUGGESTION_OCCASIONS,
  ) as Array<
    [SuggestionOccasion, (typeof SUGGESTION_OCCASIONS)[SuggestionOccasion]]
  >) {
    for (const idea of config.ideas) {
      const targets = byKeyword.get(idea.keyword) ?? []
      targets.push({ occasion, ideaId: idea.id })
      byKeyword.set(idea.keyword, targets)
    }
  }
  return byKeyword
}
