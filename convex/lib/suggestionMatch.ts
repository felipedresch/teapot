// Casa o nome de um presente sem link com um produto da curadoria
// (productSuggestions). Usado no "Onde comprar" do convidado, no "Link
// sugerido" do anfitrião e no /r/<giftId>?v=shopee. Puro e testado
// (tests/suggestionMatch.test.ts).
//
// Regra: a primeira palavra forte do presente (o substantivo principal, em
// português quase sempre vem primeiro: "Pano de pratos", "Panela de pressão")
// precisa ser também o substantivo principal do produto ou da ideia. Com duas
// ou mais palavras fortes, pelo menos duas batem. Assim "Pano de pratos" não
// cai em "Jogo de pratos", "Panela de pressão" não cai em "Jogo de panelas" e
// "Air fryer" não cai em "Formas de silicone para air fryer".

// Palavras que não dizem o que é o presente.
const WEAK_WORDS = new Set([
  'jogo',
  'kit',
  'conjunto',
  'par',
  'set',
  'para',
  'com',
  'sem',
  'dos',
  'das',
  'uma',
  'grande',
  'pequeno',
  'pequena',
  'novo',
  'nova',
  'cor',
  'cores',
  'casal',
  'solteiro',
  'queen',
  'king',
  'pecas',
  'peca',
  'unidades',
  'lugares',
])

function stem(word: string) {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word
}

export function normalizeWords(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
    .map(stem)
}

export function strongWords(text: string) {
  return normalizeWords(text).filter((word) => !WEAK_WORDS.has(word))
}

function headWord(text: string) {
  return strongWords(text).find((word) => !/^\d/.test(word))
}

export type MatchCandidate = {
  // Rótulo da ideia ("Jogo de pratos") e nome do produto.
  label: string
  name: string
  slot: 'budget' | 'popular' | 'gift'
}

// Quantas palavras fortes do presente aparecem no produto, ou null quando não
// combina.
export function giftMatchScore(
  giftName: string,
  candidate: Pick<MatchCandidate, 'label' | 'name'>,
) {
  const giftWords = [...new Set(strongWords(giftName))]
  const giftHead = giftWords.find((word) => !/^\d/.test(word))
  if (!giftHead) return null
  if (
    giftHead !== headWord(candidate.name) &&
    giftHead !== headWord(candidate.label)
  ) {
    return null
  }
  const productWords = new Set(
    normalizeWords(`${candidate.label} ${candidate.name}`),
  )
  const matched = giftWords.filter((word) => productWords.has(word)).length
  if (matched < Math.min(giftWords.length, 2)) return null
  return matched
}

// Melhor candidato para o presente: mais palavras batendo; no empate, o "Mais
// escolhido". -1 quando nada combina.
export function bestMatchIndex(giftName: string, candidates: MatchCandidate[]) {
  let bestIndex = -1
  let bestScore = 0
  candidates.forEach((candidate, index) => {
    const score = giftMatchScore(giftName, candidate)
    if (score === null) return
    const weighted = score + (candidate.slot === 'popular' ? 0.5 : 0)
    if (weighted > bestScore) {
      bestScore = weighted
      bestIndex = index
    }
  })
  return bestIndex
}
