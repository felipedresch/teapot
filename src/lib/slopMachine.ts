type SlopMachineListResponseItem = {
  slug: string
  title: string
  description: string
  keywords?: string[]
  publishedAt: string
  updatedAt: string
}

type SlopMachineArticleResponse = SlopMachineListResponseItem & {
  markdown: string
  faqSchema?: string
}

type SlopMachineSitemapEntry = {
  url: string
  lastmod: string
}

type FaqSchemaExtractionResult = {
  markdownWithoutFaq: string
  faqJsonLd: string | null
}

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const DEFAULT_PROJECT_SLUG = 'mywish-app'
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry<unknown>>()
const FAQ_START_MARKER = '<!-- FAQ_SCHEMA_START -->'
const FAQ_END_MARKER = '<!-- FAQ_SCHEMA_END -->'

function normalizeMarkdownLineEndings(markdown: string) {
  return markdown.replace(/\r\n?/g, '\n')
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

function getRawBaseUrl() {
  const fromServerEnv = process.env.SLOP_MACHINE_BASE_URL
  const fromViteEnv = import.meta.env.VITE_SLOP_MACHINE_BASE_URL

  if (fromServerEnv) {
    return fromServerEnv
  }

  if (fromViteEnv) {
    return fromViteEnv
  }

  throw new Error(
    'SLOP_MACHINE_BASE_URL is missing. Configure SLOP_MACHINE_BASE_URL (server) or VITE_SLOP_MACHINE_BASE_URL.',
  )
}

function getProjectSlug() {
  return process.env.SLOP_MACHINE_PROJECT_SLUG || import.meta.env.VITE_SLOP_MACHINE_PROJECT_SLUG || DEFAULT_PROJECT_SLUG
}

export function getSlopProjectSlug() {
  return getProjectSlug()
}

function getCacheTtlMs() {
  const raw = process.env.SLOP_MACHINE_CACHE_TTL_MS || import.meta.env.VITE_SLOP_MACHINE_CACHE_TTL_MS
  const parsed = raw ? Number(raw) : NaN

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_CACHE_TTL_MS
}

function getCacheKey(path: string) {
  return `${getProjectSlug()}:${path}`
}

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (!cached) {
    return null
  }

  if (Date.now() > cached.expiresAt) {
    cache.delete(key)
    return null
  }

  return cached.value as T
}

function setCached<T>(key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + getCacheTtlMs(),
  })
}

async function fetchJson<T>(path: string): Promise<T> {
  const key = getCacheKey(path)
  const cached = getCached<T>(key)
  if (cached) {
    return cached
  }

  const baseUrl = normalizeBaseUrl(getRawBaseUrl())
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Slop Machine request failed: ${response.status}`)
  }

  const data = (await response.json()) as T
  setCached(key, data)
  return data
}

function normalizeListPayload(payload: unknown): SlopMachineListResponseItem[] {
  if (Array.isArray(payload)) {
    return payload as SlopMachineListResponseItem[]
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'contents' in payload &&
    Array.isArray((payload as { contents: unknown }).contents)
  ) {
    return (payload as { contents: SlopMachineListResponseItem[] }).contents
  }

  return []
}

function sanitizeInternalLinks(markdown: string) {
  return markdown.replace(/\[LINK: ([^\]]+)\]\(INTERNAL\)/g, '[$1](/blog)')
}

export function stripFrontmatter(markdown: string) {
  const normalized = normalizeMarkdownLineEndings(markdown).replace(/^\uFEFF/, '')
  return normalized.replace(/^---\n[\s\S]*?\n---(?:\n|$)/u, '')
}

function extractFaqSchema(markdown: string): FaqSchemaExtractionResult {
  const startIndex = markdown.indexOf(FAQ_START_MARKER)
  const endIndex = markdown.indexOf(FAQ_END_MARKER)

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return {
      markdownWithoutFaq: markdown.trim(),
      faqJsonLd: null,
    }
  }

  const faqJsonLd = markdown
    .slice(startIndex + FAQ_START_MARKER.length, endIndex)
    .trim()

  const before = markdown.slice(0, startIndex).trim()
  const after = markdown.slice(endIndex + FAQ_END_MARKER.length).trim()
  const markdownWithoutFaq = [before, after].filter(Boolean).join('\n\n')

  return {
    markdownWithoutFaq,
    faqJsonLd: faqJsonLd || null,
  }
}

export function getSafeFaqSchema(faqSchema?: string) {
  if (!faqSchema) {
    return null
  }

  try {
    const parsed = JSON.parse(faqSchema)
    return JSON.stringify(parsed)
  } catch {
    return null
  }
}

export function getSlopWebhookSecret() {
  return process.env.SLOP_MACHINE_WEBHOOK_SECRET || ''
}

export function purgeSlopMachineCache() {
  cache.clear()
}

export async function fetchSlopMachineList() {
  const projectSlug = getProjectSlug()
  const payload = await fetchJson<unknown>(`/api/content/${projectSlug}/list`)
  return normalizeListPayload(payload)
}

export async function fetchSlopMachineArticle(contentSlug: string) {
  const projectSlug = getProjectSlug()
  const article = await fetchJson<SlopMachineArticleResponse>(
    `/api/content/${projectSlug}/${contentSlug}`,
  )

  const normalizedMarkdown = sanitizeInternalLinks(stripFrontmatter(article.markdown))
  const { markdownWithoutFaq, faqJsonLd } = extractFaqSchema(normalizedMarkdown)

  return {
    ...article,
    faqSchema: article.faqSchema || faqJsonLd || undefined,
    markdown: markdownWithoutFaq,
  }
}

export async function fetchSlopMachineSitemapEntries() {
  const projectSlug = getProjectSlug()
  const payload = await fetchJson<{ entries?: SlopMachineSitemapEntry[] }>(
    `/api/content/${projectSlug}/sitemap`,
  )
  return payload.entries ?? []
}
