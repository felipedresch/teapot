export const SITE_NAME = 'MyWish'
export const SITE_DOMAIN = 'mywish.com.br'
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || `https://${SITE_DOMAIN}`
).replace(/\/$/, '')

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export function toJsonLd(value: unknown) {
  return JSON.stringify(value)
}

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logo512.png'),
    description:
      'MyWish é uma plataforma brasileira para criar e compartilhar listas de presentes para aniversários, casamentos, chá de bebê e outras ocasiões especiais.',
  }
}

export function getWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}
