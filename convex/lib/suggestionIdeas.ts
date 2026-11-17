// Ideias de presente que viram sugestões da Shopee para o anfitrião. Saem dos
// itens mais pedidos de src/content/giftInsights.ts (npm run dados:gerar), na
// mesma ordem; o teste tests/giftSuggestions.test.ts confere que os nomes
// ainda existem lá. As que o giftInsights não tem (chá de bebê, pano de prato,
// air fryer) vêm de listas reais olhadas à mão e ficam listadas no teste.
// Para mudar a busca de uma ideia, troque só o `keyword`.

export type SuggestionOccasion = 'casaNova' | 'panela' | 'aniversario' | 'bebe'

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
      {
        id: 'jogo-cama',
        label: 'Jogo de cama e lençóis',
        keyword: 'jogo de cama casal 4 peças',
        category: 'Quarto',
      },
      {
        id: 'panela-pressao',
        label: 'Panela de pressão',
        keyword: 'panela de pressão 4,5 litros',
        category: 'Cozinha',
      },
      {
        id: 'liquidificador',
        label: 'Liquidificador',
        keyword: 'liquidificador',
        category: 'Eletro',
      },
      {
        id: 'cobertor',
        label: 'Edredom, manta ou cobertor',
        keyword: 'cobertor casal',
        category: 'Quarto',
      },
      {
        id: 'air-fryer',
        label: 'Air fryer',
        keyword: 'air fryer',
        category: 'Eletro',
      },
      {
        id: 'pano-prato',
        label: 'Pano de prato',
        keyword: 'kit pano de prato',
        category: 'Cozinha',
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
      {
        id: 'jogo-cama',
        label: 'Jogo de cama e lençóis',
        keyword: 'jogo de cama casal 4 peças',
        category: 'Quarto',
      },
      {
        id: 'panela-pressao',
        label: 'Panela de pressão',
        keyword: 'panela de pressão 4,5 litros',
        category: 'Cozinha',
      },
      {
        id: 'cobertor',
        label: 'Edredom, manta ou cobertor',
        keyword: 'cobertor casal',
        category: 'Quarto',
      },
      {
        id: 'liquidificador',
        label: 'Liquidificador',
        keyword: 'liquidificador',
        category: 'Eletro',
      },
      {
        id: 'pano-prato',
        label: 'Pano de prato',
        keyword: 'kit pano de prato',
        category: 'Cozinha',
      },
      {
        id: 'air-fryer',
        label: 'Air fryer',
        keyword: 'air fryer',
        category: 'Eletro',
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
  bebe: {
    label: 'chá de bebê',
    ideas: [
      {
        id: 'fraldas',
        label: 'Fraldas',
        keyword: 'fralda descartável',
      },
      {
        id: 'body-roupinhas',
        label: 'Body e roupinhas',
        keyword: 'kit body bebê',
      },
      {
        id: 'lencos-umedecidos',
        label: 'Lenços umedecidos',
        keyword: 'lenço umedecido bebê',
      },
      {
        id: 'toalha-capuz',
        label: 'Toalha com capuz',
        keyword: 'toalha de banho bebê com capuz',
        category: 'Banheiro',
      },
      {
        id: 'banheira',
        label: 'Banheira',
        keyword: 'banheira bebê',
        category: 'Banheiro',
      },
      {
        id: 'kit-higiene',
        label: 'Kit higiene',
        keyword: 'kit higiene bebê',
      },
      {
        id: 'manta-bebe',
        label: 'Manta',
        keyword: 'manta bebê',
        category: 'Quarto',
      },
      {
        id: 'mordedor',
        label: 'Mordedor',
        keyword: 'mordedor bebê',
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
    case 'baby-shower':
      return 'bebe'
    default:
      return null
  }
}

// Como chamar a ocasião no "Ideias para o seu …". Casamento usa as ideias do
// chá de panela, mas o título fala de casamento.
export function suggestionHeadingLabel(
  eventType: string | undefined,
  occasion: SuggestionOccasion,
) {
  return eventType === 'wedding'
    ? 'casamento'
    : SUGGESTION_OCCASIONS[occasion].label
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
