// Segue os redirecionamentos de um encurtador (br.shp.ee, meli.la, a.co,
// amzn.to) até a URL da loja, sem baixar a página.

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export const DEFAULT_RESOLVE_TIMEOUT_MS = 2500
const MAX_HOPS = 5

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// Devolve a URL final ou null se não deu (timeout, erro de rede, laço).
// O timeout vale para a cadeia inteira, não para cada salto. `shouldFollow`
// diz se ainda é encurtador: assim que chega na página da loja, para, sem
// abrir a página do produto.
export async function resolveRedirects(
  url: URL,
  fetchImpl: FetchLike,
  timeoutMs = DEFAULT_RESOLVE_TIMEOUT_MS,
  shouldFollow: (url: URL) => boolean = () => true,
): Promise<URL | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let current = url
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT },
      })
      // Só os cabeçalhos interessam; o corpo é descartado.
      await response.body?.cancel().catch(() => undefined)
      const location = response.headers.get('location')
      if (response.status < 300 || response.status >= 400 || !location) {
        return hop === 0 ? null : current
      }
      const next = new URL(location, current)
      if (next.protocol !== 'http:' && next.protocol !== 'https:') return null
      current = next
      if (!shouldFollow(current)) return current
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
