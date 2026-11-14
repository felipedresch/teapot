// Amazon Associados: basta o parâmetro `tag` com o ID de associado
// (ex.: mywish-20) em qualquer URL de amazon.com.br.
export function amazonAffiliateUrl(url: URL, tag: string) {
  const next = new URL(url)
  next.searchParams.set('tag', tag)
  return next
}

// Mesmo afiliado nosso: não conta como troca.
export function isOwnAmazonTag(url: URL, tag: string) {
  return url.searchParams.get('tag') === tag
}
