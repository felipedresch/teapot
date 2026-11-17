import { describe, expect, it } from 'vitest'
import {
  bestMatchIndex,
  giftMatchScore,
  type MatchCandidate,
} from '../convex/lib/suggestionMatch'

describe('giftMatchScore', () => {
  it('casa singular com plural e ignora acento', () => {
    expect(
      giftMatchScore('Jogo de copo', {
        label: '',
        name: 'Jogo de copos Vidro 300ml',
      }),
    ).toBe(1)
    expect(
      giftMatchScore('Escorredor de louças', {
        label: '',
        name: 'Escorredor de louça Inox',
      }),
    ).toBe(2)
  })

  it('o substantivo principal precisa bater', () => {
    expect(
      giftMatchScore('Pano de pratos', {
        label: '',
        name: 'Jogo de pratos 18 peças',
      }),
    ).toBe(null)
    expect(
      giftMatchScore('Travessa de vidro', {
        label: '',
        name: 'Potes herméticos de vidro',
      }),
    ).toBe(null)
  })

  it('com duas palavras fortes, as duas precisam bater', () => {
    expect(
      giftMatchScore('Panela de pressão', {
        label: '',
        name: 'Jogo de panelas 5 peças',
      }),
    ).toBe(null)
    expect(
      giftMatchScore('Jogo de tapete banheiro', {
        label: '',
        name: 'Tapete de banheiro antiderrapante',
      }),
    ).toBe(2)
  })

  it('o principal do produto ou da ideia, não qualquer palavra', () => {
    expect(
      giftMatchScore('Air fryer', {
        label: 'Formas e assadeiras',
        name: 'Kit 3 formas de silicone para air fryer',
      }),
    ).toBe(null)
    expect(
      giftMatchScore('Perfume', {
        label: 'Beleza e perfumes',
        name: 'Kit de cuidados com a pele',
      }),
    ).toBe(null)
    expect(
      giftMatchScore('Jogo de pratos', {
        label: 'Jogo de pratos',
        name: 'Aparelho de jantar de vidro, 12 peças',
      }),
    ).toBe(1)
  })

  it('palavras fracas não contam', () => {
    expect(
      giftMatchScore('Kit de toalha', {
        label: '',
        name: 'Jogo de toalhas de banho',
      }),
    ).toBe(1)
    expect(giftMatchScore('Jogo', { label: '', name: 'Jogo de pratos' })).toBe(
      null,
    )
  })
})

describe('bestMatchIndex', () => {
  const candidates: MatchCandidate[] = [
    { label: 'Jogo de pratos', name: 'Prato raso 6 peças', slot: 'budget' },
    {
      label: 'Jogo de pratos',
      name: 'Aparelho de jantar 20 peças',
      slot: 'popular',
    },
    {
      label: 'Toalhas de banho',
      name: 'Jogo de toalhas 4 peças',
      slot: 'popular',
    },
  ]

  it('no empate, fica o mais escolhido', () => {
    expect(bestMatchIndex('Jogo de pratos', candidates)).toBe(1)
  })

  it('sem combinação, -1', () => {
    expect(bestMatchIndex('Cafeteira', candidates)).toBe(-1)
  })
})
