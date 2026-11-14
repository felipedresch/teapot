// Mercado Livre Afiliados. Não existe API pública para gerar link: o oficial é
// a barra de afiliados ou o gerador da Central de Afiliados, que devolvem um
// meli.la. Abrindo um desses, ele cai na URL do produto com `matt_word` (a
// etiqueta do afiliado) e `matt_tool` (o número da ferramenta). Aqui a gente
// põe os mesmos dois parâmetros na URL longa do produto.
//
// TODO: confirmar com o primeiro link gerado no painel que a comissão vem só
// com esses dois parâmetros (docs/AFFILIATES.md, "Mercado Livre"). Se o
// Mercado Livre passar a exigir o meli.la, trocar esta função por uma chamada
// ao gerador quando ele tiver API.
export function mercadoLivreAffiliateUrl(
  url: URL,
  config: { word: string; toolId: string },
) {
  const next = new URL(url)
  next.searchParams.set('matt_word', config.word)
  next.searchParams.set('matt_tool', config.toolId)
  return next
}
