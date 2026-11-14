// Gerado por scripts/dados-presentes.mjs em 2026-11-14. Não editar à mão.
// Números agregados e anônimos das listas do MyWish (ver /dados/presentes-mais-pedidos).

export type GiftInsightItem = {
  name: string
  /** % das listas da ocasião que incluem o item */
  listShare: number
  /** % desses presentes reservados por convidados, nas listas já compartilhadas (null = amostra pequena) */
  reservedShare: number | null
}

export type OccasionInsights = {
  lists: number
  medianGifts: number
  reservedShare: number
  items: GiftInsightItem[]
}

export const giftInsights = {
  "generatedAt": "2026-11-14",
  "period": {
    "from": "2026-03",
    "to": "2026-11"
  },
  "lists": 173,
  "sharedLists": 75,
  "gifts": 6582,
  "medianGifts": 34,
  "linkShare": 30,
  "stores": [
    {
      "name": "Shopee",
      "share": 47
    },
    {
      "name": "Mercado Livre",
      "share": 28
    },
    {
      "name": "Amazon",
      "share": 10
    },
    {
      "name": "Magazine Luiza",
      "share": 4
    },
    {
      "name": "Shein",
      "share": 2
    }
  ],
  "occasions": {
    "chaDeCasaNova": {
      "lists": 96,
      "medianGifts": 33,
      "reservedShare": 28,
      "items": [
        {
          "name": "Potes herméticos",
          "listShare": 83,
          "reservedShare": 32
        },
        {
          "name": "Formas e assadeiras",
          "listShare": 76,
          "reservedShare": 28
        },
        {
          "name": "Jogo de pratos",
          "listShare": 76,
          "reservedShare": 34
        },
        {
          "name": "Toalhas de banho",
          "listShare": 76,
          "reservedShare": 30
        },
        {
          "name": "Faqueiro e talheres",
          "listShare": 72,
          "reservedShare": 40
        },
        {
          "name": "Jogo de copos",
          "listShare": 71,
          "reservedShare": 56
        },
        {
          "name": "Tapete",
          "listShare": 69,
          "reservedShare": 20
        },
        {
          "name": "Utensílios de cozinha",
          "listShare": 60,
          "reservedShare": 43
        },
        {
          "name": "Jogo de panelas",
          "listShare": 57,
          "reservedShare": 32
        },
        {
          "name": "Cesto de roupa",
          "listShare": 55,
          "reservedShare": 21
        },
        {
          "name": "Tábua de corte",
          "listShare": 55,
          "reservedShare": 21
        },
        {
          "name": "Jarra",
          "listShare": 52,
          "reservedShare": 52
        },
        {
          "name": "Jogo de facas",
          "listShare": 51,
          "reservedShare": 27
        },
        {
          "name": "Xícaras e canecas",
          "listShare": 49,
          "reservedShare": 46
        },
        {
          "name": "Jogo de cama e lençóis",
          "listShare": 48,
          "reservedShare": 31
        },
        {
          "name": "Mop, rodo e vassoura",
          "listShare": 47,
          "reservedShare": 21
        },
        {
          "name": "Panela de pressão",
          "listShare": 46,
          "reservedShare": 58
        },
        {
          "name": "Lixeira",
          "listShare": 45,
          "reservedShare": 8
        },
        {
          "name": "Porta-temperos",
          "listShare": 45,
          "reservedShare": 42
        },
        {
          "name": "Sanduicheira",
          "listShare": 45,
          "reservedShare": 50
        },
        {
          "name": "Liquidificador",
          "listShare": 43,
          "reservedShare": 56
        },
        {
          "name": "Jogo de taças",
          "listShare": 42,
          "reservedShare": 44
        },
        {
          "name": "Edredom, manta ou cobertor",
          "listShare": 39,
          "reservedShare": 11
        },
        {
          "name": "Escorredor de macarrão",
          "listShare": 39,
          "reservedShare": 55
        },
        {
          "name": "Frigideira",
          "listShare": 39,
          "reservedShare": 29
        }
      ]
    },
    "chaDePanela": {
      "lists": 39,
      "medianGifts": 43,
      "reservedShare": 26,
      "items": [
        {
          "name": "Jogo de pratos",
          "listShare": 90,
          "reservedShare": 32
        },
        {
          "name": "Jogo de copos",
          "listShare": 85,
          "reservedShare": 71
        },
        {
          "name": "Utensílios de cozinha",
          "listShare": 79,
          "reservedShare": 25
        },
        {
          "name": "Potes herméticos",
          "listShare": 77,
          "reservedShare": 19
        },
        {
          "name": "Formas e assadeiras",
          "listShare": 74,
          "reservedShare": 30
        },
        {
          "name": "Faqueiro e talheres",
          "listShare": 72,
          "reservedShare": 36
        },
        {
          "name": "Toalhas de banho",
          "listShare": 69,
          "reservedShare": 16
        },
        {
          "name": "Mop, rodo e vassoura",
          "listShare": 67,
          "reservedShare": 19
        },
        {
          "name": "Xícaras e canecas",
          "listShare": 62,
          "reservedShare": 60
        },
        {
          "name": "Tapete",
          "listShare": 59,
          "reservedShare": 0
        },
        {
          "name": "Escorredor de louça",
          "listShare": 56,
          "reservedShare": null
        },
        {
          "name": "Lixeira",
          "listShare": 56,
          "reservedShare": null
        },
        {
          "name": "Jogo de cama e lençóis",
          "listShare": 54,
          "reservedShare": 40
        },
        {
          "name": "Jogo de panelas",
          "listShare": 54,
          "reservedShare": null
        },
        {
          "name": "Tábua de corte",
          "listShare": 49,
          "reservedShare": null
        },
        {
          "name": "Panela de pressão",
          "listShare": 46,
          "reservedShare": null
        },
        {
          "name": "Cesto de roupa",
          "listShare": 44,
          "reservedShare": null
        },
        {
          "name": "Porta-temperos",
          "listShare": 44,
          "reservedShare": null
        },
        {
          "name": "Edredom, manta ou cobertor",
          "listShare": 41,
          "reservedShare": null
        },
        {
          "name": "Jogo de facas",
          "listShare": 41,
          "reservedShare": null
        },
        {
          "name": "Jogo de taças",
          "listShare": 41,
          "reservedShare": null
        },
        {
          "name": "Cabides",
          "listShare": 36,
          "reservedShare": null
        },
        {
          "name": "Jarra",
          "listShare": 36,
          "reservedShare": null
        },
        {
          "name": "Liquidificador",
          "listShare": 36,
          "reservedShare": null
        },
        {
          "name": "Ralador",
          "listShare": 33,
          "reservedShare": null
        }
      ]
    }
  },
  "birthday": {
    "lists": 13,
    "gifts": 236,
    "medianGifts": 15,
    "linkShare": 78,
    "categories": [
      {
        "name": "Roupas, calçados e acessórios",
        "giftShare": 33,
        "listShare": 85
      },
      {
        "name": "Casa, cozinha e decoração",
        "giftShare": 15,
        "listShare": 54
      },
      {
        "name": "Beleza e perfumes",
        "giftShare": 13,
        "listShare": 46
      },
      {
        "name": "Brinquedos e infantil",
        "giftShare": 10,
        "listShare": 46
      },
      {
        "name": "Livros, papelaria e jogos",
        "giftShare": 6,
        "listShare": 54
      },
      {
        "name": "Eletrônicos",
        "giftShare": 2,
        "listShare": 23
      }
    ]
  }
} as const satisfies {
  generatedAt: string
  period: { from: string; to: string }
  lists: number
  sharedLists: number
  gifts: number
  medianGifts: number
  linkShare: number
  stores: Array<{ name: string; share: number }>
  occasions: Record<'chaDeCasaNova' | 'chaDePanela', OccasionInsights>
  birthday: {
    lists: number
    gifts: number
    medianGifts: number
    linkShare: number
    /** giftShare: % dos presentes; listShare: % das listas com ao menos um item da categoria */
    categories: Array<{ name: string; giftShare: number; listShare: number }>
  }
}
