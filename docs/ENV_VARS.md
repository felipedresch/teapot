# Variáveis de ambiente

Onde cada valor mora. Montagem dos Workers e da esteira:
[CLOUDFLARE.md](CLOUDFLARE.md).

## Build do site (Vite)

O Vite embute os `VITE_*` no JavaScript: nada aqui é segredo. Localmente vêm
do `.env.local`; no Workers Builds, das variáveis de build de cada Worker.

| Variável | Produção (`mywish`) | Staging (`mywish-staging`) | Previews |
| --- | --- | --- | --- |
| `VITE_CONVEX_URL` | `https://polished-octopus-281.convex.cloud` | `https://different-tiger-679.convex.cloud` | o Convex da branch (o `npx convex deploy` põe) |
| `VITE_POSTHOG_KEY` | chave pública `phc_` | a mesma | vazia: preview não manda análise |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` | o mesmo | |
| `VITE_PREVIEW_LOGIN` | | | `true`: "Entrar" usa o login de teste |
| `CLOUDFLARE_ENV` | vazia | `staging` | `staging` (`preview-site.sh`) |
| `NODE_VERSION` | `22` | `22` | `22` |

`VITE_SITE_URL` e `VITE_CONVEX_SITE_URL` não são lidas pelo código: as URLs
públicas saem de `src/lib/seo.ts`.

## Worker (servidor)

Lidas em `process.env` pelo SSR (`src/lib/slopMachine.ts`).

| Variável | Onde | Valor |
| --- | --- | --- |
| `SLOP_MACHINE_BASE_URL` | `wrangler.jsonc` (`vars`) | produção `https://cautious-crocodile-345.convex.site`; staging e previews `https://insightful-fox-52.convex.site` |
| `SLOP_MACHINE_WEBHOOK_SECRET` | segredo de cada Worker (`wrangler secret put`) | o mesmo que o Slop Machine manda no `/api/slop/revalidate` |
| `SLOP_MACHINE_PROJECT_SLUG`, `SLOP_MACHINE_CACHE_TTL_MS` | opcionais | padrão `mywish-app` e 5 minutos |

Em desenvolvimento local (`npm run dev`), o SSR roda no workerd e cai no
`VITE_SLOP_MACHINE_BASE_URL` do `.env.local` quando não há
`SLOP_MACHINE_BASE_URL`.

## Convex

Por deployment (`npx convex env list`, `--prod` para a produção).

| Variável | Produção e dev | Previews (padrão do projeto) |
| --- | --- | --- |
| `SITE_URL` | produção `https://mywish.com.br`; dev `http://localhost:3000` | o endereço do preview (`preview-site.sh` põe a cada build) |
| `JWT_PRIVATE_KEY`, `JWKS` | um par por deployment | um par só dos previews |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | sim | não: preview entra pelo login de teste |
| `ABACATEPAY_API_KEY` | produção a chave real; dev a de teste (`abc_dev_`) | a de teste (`abc_dev_`) |
| `ABACATEPAY_WEBHOOK_SECRET` | sim | não: o webhook não chega em preview |
| `POSTHOG_PROJECT_API_KEY` | sim | não: preview não manda análise |
| `MYWISH_DEPLOYMENT_ENV` | não existe (vale produção) | `development`: liga o login por senha e o seed |

As padrão de preview ficam em `GET /v1/projects/1671791/list_default_environment_variables?deploymentType=preview`
na Management API do Convex (o `npx convex env default` só existe em CLIs mais
novas que a 1.31 deste projeto). Mudar uma delas só vale para os previews
criados depois.

## GitHub (segredos do repositório)

- `CONVEX_PREVIEW_DEPLOY_KEY`: a mesma chave `cloudflare-pr`, para a Action
  `apagar-preview.yml`.
- `CLOUDFLARE_API_TOKEN` (opcional): com ele, a Action também apaga o Preview
  da Cloudflare.
