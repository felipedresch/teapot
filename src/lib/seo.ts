export const SITE_NAME = 'MyWish'
export const SITE_DOMAIN = 'mywish.com.br'
// Public metadata must never inherit a staging, localhost or www build URL.
export const SITE_URL = `https://${SITE_DOMAIN}`

export function absoluteUrl(path = '/') {
  const pathname = path.split(/[?#]/, 1)[0]
  const normalizedPath = `/${pathname.replace(/^\/+|\/+$/g, '')}`
  return `${SITE_URL}${normalizedPath}`
}

export function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
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
  }
}

export function pageMeta(title: string, description: string) {
  return [
    { title: `${title} | ${SITE_NAME}` },
    { name: 'description', content: description },
    { property: 'og:title', content: `${title} | ${SITE_NAME}` },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:title', content: `${title} | ${SITE_NAME}` },
    { name: 'twitter:description', content: description },
  ]
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
