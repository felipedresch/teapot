#!/usr/bin/env node
// Avisa Bing (e os outros buscadores do IndexNow) sobre as URLs do sitemap.
// O ChatGPT busca na web com ajuda do índice do Bing, então página nova ou
// atualizada precisa chegar lá rápido. Rodar depois de cada publicação:
//
//   node scripts/indexnow.mjs                     # todas as URLs do sitemap
//   node scripts/indexnow.mjs /dados/presentes-mais-pedidos /faq
//
// A chave é pública por definição: o arquivo public/<chave>.txt prova ao
// IndexNow que o site é nosso.
const KEY = 'b99a1c572b87c2a84279850fb990f921'
const HOST = 'mywish.com.br'
const ORIGIN = `https://${HOST}`

const paths = process.argv.slice(2)
let urls
if (paths.length) {
  urls = paths.map((p) => new URL(p, ORIGIN).toString())
} else {
  const xml = await fetch(`${ORIGIN}/sitemap.xml`).then((r) => {
    if (!r.ok) throw new Error(`sitemap: HTTP ${r.status}`)
    return r.text()
  })
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

const keyCheck = await fetch(`${ORIGIN}/${KEY}.txt`)
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY)
  throw new Error('A chave do IndexNow ainda não está publicada no site.')

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList: urls,
  }),
})
console.log(`IndexNow: ${urls.length} URLs, HTTP ${response.status}`)
if (response.status >= 400) {
  console.error(await response.text())
  process.exit(1)
}
