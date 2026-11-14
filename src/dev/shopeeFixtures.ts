// Respostas de exemplo do productOfferV2 da Shopee, no formato que as fontes
// de terceiros descrevem (preços e notas como texto). Servem aos testes
// (tests/giftSuggestions.test.ts) e à página de desenvolvimento
// /dev/sugestoes. Produtos e números inventados; as imagens apontam para um
// endereço que não existe (a página de dev troca por ilustrações).

type FixtureNode = Record<string, string | number | null>

function node(
  itemId: number,
  productName: string,
  priceMin: string,
  ratingStar: string,
  sales: number,
  commissionRate: string,
  extra: FixtureNode = {},
): FixtureNode {
  return {
    itemId,
    productName,
    imageUrl: `https://down-br.img.susercontent.com/file/fixture-${itemId}`,
    priceMin,
    priceMax: priceMin,
    ratingStar,
    sales,
    commissionRate,
    offerLink: `https://s.shopee.com.br/fixture${itemId}`,
    productLink: `https://shopee.com.br/product/1000/${itemId}`,
    shopName: 'Loja Exemplo',
    ...extra,
  }
}

const response = (nodes: FixtureNode[]) => ({
  data: {
    productOfferV2: {
      nodes,
      pageInfo: { page: 1, limit: 30, hasNextPage: false },
    },
  },
})

export const SHOPEE_FIXTURE_RESPONSES: Record<
  string,
  ReturnType<typeof response>
> = {
  'kit potes herméticos vidro': response([
    node(
      101,
      'Kit 5 Potes Herméticos de Vidro com Tampa de Bambu',
      '79.90',
      '4.8',
      3200,
      '0.06',
    ),
    node(
      102,
      'Kit 10 Potes Herméticos Plástico Livre de BPA',
      '42.90',
      '4.7',
      8700,
      '0.08',
    ),
    node(
      103,
      'Conjunto 3 Potes de Vidro Borossilicato Tampa Hermética',
      '35.90',
      '4.9',
      1500,
      '0.07',
    ),
    // Nota baixa: fica de fora.
    node(
      104,
      'Kit 20 Potes Herméticos Promoção',
      '29.90',
      '4.1',
      12000,
      '0.10',
    ),
    node(
      105,
      'Kit 6 Potes de Vidro Quadrados com Trava',
      '119.90',
      '4.8',
      640,
      '0.05',
    ),
    // Sem imagem: descartado na leitura.
    node(106, 'Pote Hermético Avulso 1L', '15.90', '4.6', 900, '0.07', {
      imageUrl: null,
    }),
    node(
      107,
      'Kit 4 Potes Herméticos Cerâmica Decorados',
      '249.90',
      '4.9',
      120,
      '0.12',
    ),
  ]),
  'aparelho de jantar 12 peças': response([
    node(
      201,
      'Aparelho de Jantar 12 Peças Porcelana Branca',
      '129.90',
      '4.8',
      2100,
      '0.05',
    ),
    node(
      202,
      'Jogo de Pratos Rasos 6 Peças Cerâmica Off White',
      '69.90',
      '4.7',
      4300,
      '0.07',
    ),
    node(
      203,
      'Aparelho de Jantar 20 Peças Stoneware Verde Sálvia',
      '219.90',
      '4.9',
      780,
      '0.06',
    ),
    node(
      204,
      'Aparelho de Jantar 30 Peças Luxo Borda Dourada',
      '599.00',
      '4.9',
      90,
      '0.15',
    ),
    node(
      205,
      'Jogo 6 Pratos Fundos Vidro Temperado',
      '54.90',
      '4.6',
      2600,
      '0.07',
    ),
  ]),
  'jogo de toalhas de banho algodão': response([
    node(
      301,
      'Jogo de Toalhas 4 Peças 100% Algodão Fio Penteado',
      '89.90',
      '4.8',
      5100,
      '0.07',
    ),
    node(
      302,
      'Kit 2 Toalhas de Banho Gigantes Felpudas',
      '59.90',
      '4.7',
      7300,
      '0.08',
    ),
    node(
      303,
      'Jogo de Toalhas 5 Peças Egípcio Premium Bordado',
      '169.90',
      '4.9',
      1300,
      '0.06',
    ),
    node(
      304,
      'Toalha de Banho Avulsa Microfibra',
      '19.90',
      '4.3',
      15000,
      '0.09',
    ),
  ]),
  // Busca que não devolve nada que passe no filtro.
  'escorredor de louça inox': response([
    node(401, 'Escorredor de Louça Inox Compacto', '49.90', '4.2', 300, '0.07'),
  ]),
}

// Ideias de casa nova com resposta de exemplo, para a página de dev.
export const FIXTURE_IDEA_KEYWORDS: Record<string, string> = {
  'potes-hermeticos': 'kit potes herméticos vidro',
  'jogo-pratos': 'aparelho de jantar 12 peças',
  'toalhas-banho': 'jogo de toalhas de banho algodão',
}
