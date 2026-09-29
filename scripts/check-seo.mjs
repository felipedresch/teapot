import assert from 'node:assert/strict'

const base = (process.argv[2] || 'https://mywish.com.br').replace(/\/$/, '')
const skipWww = process.argv.includes('--skip-www')
async function get(path, options) {
  return fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(20000),
    ...options,
  })
}
const response = await get('/sitemap.xml')
assert.equal(response.status, 200, 'sitemap must return 200')
assert.match(response.headers.get('content-type') || '', /xml/)
const xml = await response.text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
assert.ok(
  urls.length >= 12,
  'sitemap must include the public product and occasion pages',
)
assert.equal(new Set(urls).size, urls.length, 'duplicate sitemap URLs')
for (const url of urls) {
  assert.ok(
    url.startsWith('https://mywish.com.br/'),
    `non-canonical sitemap URL: ${url}`,
  )
  const path = new URL(url).pathname
  const page = await get(path)
  assert.equal(page.status, 200, `${path}: status`)
  const html = await page.text()
  const canonical = [
    ...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g),
  ].map((match) => match[1])
  assert.deepEqual(canonical, [url], `${path}: canonical`)
  assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, `${path}: H1`)
  assert.doesNotMatch(
    html,
    /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/,
    `${path}: robots`,
  )
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(match[1])
}
for (const path of [
  '/blog/nonexistent-seo-check-20260929',
  '/lista-de-presentes/nonexistent',
  '/nonexistent-seo-check-20260929',
]) {
  assert.equal(
    (await get(path)).status,
    404,
    `${path}: missing pages must return 404`,
  )
}
for (const path of ['/sitemap-index.xml', '/sitemap/xml']) {
  const legacy = await get(path, { redirect: 'manual' })
  assert.equal(legacy.status, 308, `${path}: legacy sitemap redirect`)
  assert.equal(legacy.headers.get('location'), '/sitemap.xml')
}
assert.match(
  await (await get('/robots.txt')).text(),
  /Sitemap: https:\/\/mywish\.com\.br\/sitemap\.xml/,
)
if (base === 'https://mywish.com.br' && !skipWww) {
  const www = await fetch(
    'https://www.mywish.com.br/blog?utm_source=seo-check',
    { redirect: 'manual', signal: AbortSignal.timeout(20000) },
  )
  assert.equal(www.status, 308, 'www permanent redirect')
  assert.equal(
    www.headers.get('location'),
    'https://mywish.com.br/blog?utm_source=seo-check',
  )
}
console.log(
  `PASS: ${urls.length} pages, sitemap, canonicals, structured data, 404s and redirects${skipWww ? ' (www excluded)' : ''}.`,
)
