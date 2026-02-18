import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Layout from '../components/Layout'
import ConvexProvider from '../integrations/convex/provider'
import PostHogProvider from '../integrations/posthog/provider'
import {
  SITE_NAME,
  absoluteUrl,
  getOrganizationJsonLd,
  getWebsiteJsonLd,
  toJsonLd,
} from '../lib/seo'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'theme-color',
        content: '#c3829e',
      },
      {
        title: `${SITE_NAME} | Lista de presentes online`,
      },
      {
        name: 'description',
        content:
          'Crie e compartilhe lista de presentes online para aniversário, casamento, chá de bebê e outras celebrações.',
      },
      {
        name: 'robots',
        content: 'index, follow, max-image-preview:large',
      },
      {
        property: 'og:site_name',
        content: SITE_NAME,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:locale',
        content: 'pt_BR',
      },
      {
        property: 'og:title',
        content: `${SITE_NAME} | Lista de presentes online`,
      },
      {
        property: 'og:description',
        content:
          'Crie e compartilhe lista de presentes online para aniversário, casamento, chá de bebê e outras celebrações.',
      },
      {
        property: 'og:image',
        content: absoluteUrl('/logo512.png'),
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: `${SITE_NAME} | Lista de presentes online`,
      },
      {
        name: 'twitter:description',
        content:
          'Crie e compartilhe lista de presentes online para aniversário, casamento, chá de bebê e outras celebrações.',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400;1,9..144,500&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: RootNotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState()
  const canonicalUrl = absoluteUrl(routerState.location.pathname)

  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="pt-BR" href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(getOrganizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(getWebsiteJsonLd()) }}
        />
      </head>
      <body>
        <ConvexProvider>
          <PostHogProvider>
            <Layout>{children}</Layout>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          </PostHogProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootNotFound() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-14 text-center space-y-3">
      <h1 className="font-display italic text-3xl text-espresso">Pagina nao encontrada</h1>
      <p className="text-sm text-warm-gray">Esse link nao existe ou nao esta mais disponivel.</p>
      <Link to="/" className="text-sm text-muted-rose hover:underline">
        Voltar para a pagina inicial
      </Link>
    </div>
  )
}
