# Site na Cloudflare

O site (TanStack Start) roda em Workers da Cloudflare, com SSR: o
`@cloudflare/vite-plugin` monta o Worker no `npm run build`, a entrada é
[`src/server.ts`](../src/server.ts) e os arquivos de `dist/client` saem direto
como Static Assets. O backend é o Convex, que continua subindo à mão com
`npx convex deploy`. Até outubro de 2026 o site estava na Railway (Nitro com
servidor Node). Variáveis de cada lugar: [ENV_VARS.md](ENV_VARS.md).

## Como está montado

| | Staging | Produção |
| --- | --- | --- |
| Worker | `mywish-staging` (`env.staging` do `wrangler.jsonc`) | `mywish` (topo do `wrangler.jsonc`) |
| Branch que sobe | `staging` | `master` |
| Domínio | `staging.mywish.com.br` (rota no `wrangler.jsonc`) | `mywish.com.br` e `www.mywish.com.br` (rotas no `wrangler.jsonc`) |
| workers.dev | `https://mywish-staging.galeria-felipe-dev.workers.dev` | `https://mywish.galeria-felipe-dev.workers.dev` |
| Previews das branches | sim: `https://<branch>-mywish-staging.galeria-felipe-dev.workers.dev` | não |
| Convex | `different-tiger-679` (o dev, como na Railway); previews no projeto `teapot` | `polished-octopus-281` |

Conta da Cloudflare: `4310b383610db9c6b12d0cd7849ceb12`, plano Workers Paid.

- **Configuração:** [`wrangler.jsonc`](../wrangler.jsonc). O build escolhe o
  Worker pela variável `CLOUDFLARE_ENV`: vazia na produção, `staging` na
  staging e nos previews. O plugin grava a configuração final em
  `dist/server/wrangler.json`, e o `npx wrangler deploy` (ou `wrangler preview`)
  sobe essa.
- **Entrada do Worker:** `src/server.ts` faz os redirecionamentos canônicos
  ([`src/lib/canonical.ts`](../src/lib/canonical.ts): `www` para a raiz, barra
  no fim, sitemaps antigos) e passa o resto ao SSR. Nos endereços `workers.dev`
  ela põe `X-Robots-Tag: noindex`.
- **Cabeçalhos dos arquivos:** [`public/_headers`](../public/_headers): cache
  de um ano em `/assets/*`, que levam hash no nome, e `noindex` nos
  `workers.dev`. Arquivo estático não passa pelo `src/server.ts`.
- **Blog:** o SSR lê o Slop Machine em `SLOP_MACHINE_BASE_URL` (variável no
  `wrangler.jsonc`). O segredo `SLOP_MACHINE_WEBHOOK_SECRET` do
  `/api/slop/revalidate` fica em cada Worker (Settings > Variables and
  secrets, ou `npx wrangler secret put SLOP_MACHINE_WEBHOOK_SECRET --name <worker>`).
  O cache do blog é por instância do Worker e vale 5 minutos.
- **Logs:** Workers Logs ligado (`observability`), em Workers & Pages >
  `<worker>` > Observability.

## Builds (Workers & Pages > `<worker>` > Settings > Builds)

Repositório `felipedresch/teapot`. O Workers Builds roda o `npm ci` sozinho,
com o npm do campo `packageManager` do `package.json` (10.9.2). Ao trocar de
npm, gere o lock de novo com ele e confira com
`npx -y npm@<versão> ci --dry-run` numa pasta sem `node_modules`. O token de
build dos dois Workers é o `mywish build token`, só deste app. Cache de build
ligado.

**mywish** (aba Production; sem builds de preview)

- Branch `master`. Build `npm run build`; deploy `npx wrangler deploy`.
- Variáveis (o Vite embute no JavaScript; nada aqui é segredo):
  `NODE_VERSION=22`, `VITE_CONVEX_URL=https://polished-octopus-281.convex.cloud`,
  `VITE_POSTHOG_KEY` (a chave pública `phc_`) e
  `VITE_POSTHOG_HOST=https://us.i.posthog.com`.

**mywish-staging**

- Aba Production: branch `staging`, os mesmos comandos, e as variáveis
  `NODE_VERSION=22`, `CLOUDFLARE_ENV=staging`,
  `VITE_CONVEX_URL=https://different-tiger-679.convex.cloud`, `VITE_POSTHOG_KEY`
  e `VITE_POSTHOG_HOST`.
- Aba Previews Base: veja Previews, abaixo.

**Ordem do deploy:** `npx convex deploy` primeiro, depois o merge na `master`.
O deploy do Convex não foi automatizado de propósito.

**Deploy à mão** (só se o Workers Builds estiver fora): numa cópia limpa do
repositório, sem `.env` nem `.env.local`, porque o Vite lê esses arquivos no
build e eles apontam para o Convex de dev.

```bash
git worktree add ../teapot-deploy master
cd ../teapot-deploy
npx -y npm@10.9.2 ci
VITE_CONVEX_URL=https://polished-octopus-281.convex.cloud VITE_POSTHOG_KEY=phc_... VITE_POSTHOG_HOST=https://us.i.posthog.com npm run build
npx wrangler deploy
```

Para a staging, a mesma coisa a partir da branch `staging`, com
`CLOUDFLARE_ENV=staging` e `VITE_CONVEX_URL=https://different-tiger-679.convex.cloud`
no build.

**Build quebrado com "Failed: error occurred while installing tools or
dependencies"** logo depois de "Installing nodejs": é o cache de build da
Cloudflare. Settings > Builds > Build cache > Clear Cache, e um build novo
(push ou "Retry build"; o Retry repete as configurações do build antigo,
inclusive as variáveis).

## Previews das branches

Toda branch que recebe push, menos `master`, `staging` e `dev`, ganha um
preview no Worker `mywish-staging` com **um Convex só dela**. Nenhum preview usa
o Convex de dev, o de produção nem o de outra branch. A `dev` é a branch de
trabalho, que cada um roda com o próprio Convex de dev (`npx convex dev`),
como no Harmony.

- **Esteira** (`scripts/cloudflare/`, aba Previews Base). Build e preview
  escritos como
  `if [ -f <script> ]; then sh <script>; else echo Branch sem a esteira da Cloudflare; fi`,
  com `scripts/cloudflare/preview-build.sh` e
  `scripts/cloudflare/preview-deploy.sh`: branch antiga passa sem build.
  - `preview-build.sh` cria o Convex de preview da branch no projeto `teapot`
    (`npx convex deploy --preview-create <branch>`), roda o seed e faz o build
    do site apontando para ele (`preview-site.sh`, que também acerta o
    `SITE_URL` desse Convex). A cada push o Convex da branch é recriado: banco
    limpo e seed de novo. `master` e `dev` saem sem preview (a marca
    `.sem-preview`); `staging` dá erro, porque o build dela é o da aba
    Production.
  - `preview-deploy.sh` sobe o build como um Preview da Cloudflare
    (`wrangler preview`). O nome sai de `preview.mjs`, porque o endereço precisa
    ser conhecido antes do build.
- **Variáveis da aba Previews Base:** `NODE_VERSION=22` e o segredo
  `CONVEX_PREVIEW_DEPLOY_KEY`, a chave de preview `cloudflare-pr` do projeto
  `teapot` no Convex. Ela só cria e apaga deployments de preview: não alcança
  dev nem produção. Nada de `VITE_*`: o endereço do Convex vem do preview, e
  preview não manda análise ao PostHog. As variáveis do Worker do preview vêm
  do bloco `previews` do `wrangler.jsonc`.
- **Variáveis do Convex de preview:** as padrão de preview do projeto
  ([ENV_VARS.md](ENV_VARS.md#convex)).
- **Login de teste:** no preview, "Entrar" usa o login por senha
  `preview@mywish.test` (a senha está em `convex/dev/previewSeed.ts`), em vez
  do Google, que não conhece o Convex de cada preview. O Convex só aceita login
  por senha em deployment com `MYWISH_DEPLOYMENT_ENV=development`, que só os
  previews têm. O seed cria esse login como anfitrião do casamento público
  "Ana & Bruno" (presentes livres, reservados e recebidos) e de um aniversário
  em rascunho, sem pagamento (o paywall), e põe uma reserva dele no chá de bebê
  de outra convidada (a tela "Reservados").
- **Rotas internas:** o preview é SSR como a produção, então abrir
  `/events/...` direto funciona.
- **Quando o PR fecha** (com ou sem merge), a Action
  [`apagar-preview.yml`](../.github/workflows/apagar-preview.yml) apaga o
  Convex de preview da branch (`scripts/convex-preview/apagar.sh`, com o segredo
  `CONVEX_PREVIEW_DEPLOY_KEY` do GitHub). Ela apaga também o Preview da
  Cloudflare se o segredo `CLOUDFLARE_API_TOKEN` existir no GitHub; sem ele, o
  Preview fica até a Cloudflare apagar os mais antigos (passando de 500).
  Branch com push e sem PR: o Convex dela fica até o Convex apagar sozinho por
  inatividade, ou até rodar o `apagar.sh` à mão. Se o fechamento do PR chegar
  antes do fim do build de preview, o Convex pode nascer depois da Action:
  confira em `GET /v1/projects/1671791/list_deployments` e apague as sobras com
  o `apagar.sh`.
- A configuração de build de cada branch é copiada da aba Previews Base no
  primeiro build. Ao mudar a base, salvar com "Apply to existing Previews"
  leva só os comandos para as branches que já existem; as variáveis delas não
  mudam, e o painel não tem onde editá-las. Branch nova pega a base inteira.

## Domínio e DNS

A zona `mywish.com.br` está nesta conta da Cloudflare (id
`5d3e283ad6ceec50e40d2e1d78d1f8b5`, plano Free, Bot Preference Sync desligado
para o `robots.txt` continuar o do site). O registro do domínio continua na
Hostinger (provedor HSTDOMAINS no registro.br), com os nameservers
`chase.ns.cloudflare.com` e `imani.ns.cloudflare.com`. Não há registro de
e-mail na zona (nem MX, SPF, DKIM ou DMARC).

| Registro | Valor | Proxy |
| --- | --- | --- |
| `AAAA @` | `100::` | sim |
| `AAAA www` | `100::` | sim |
| `AAAA staging` | `100::` | sim |
| `TXT @` | `google-site-verification=...` (Search Console) | não |

O `AAAA 100::` não aponta para lugar nenhum: quem responde é o Worker, pela
rota. A rota só pega o que passa pela Cloudflare, então os três registros
precisam do proxy (nuvem laranja). As rotas estão no `wrangler.jsonc`, pelo
`zone_id`: a chave do Workers Builds edita rotas, mas não lê zonas, e o
wrangler usaria essa leitura para achar o id pelo nome. O `www` vai para o
Worker `mywish`, e o `src/lib/canonical.ts` redireciona as páginas para a raiz
com 308; arquivo estático no `www` sai direto, como na Railway. "Always Use
HTTPS" está ligado (SSL/TLS > Edge Certificates), como a Railway fazia.

**Como a virada foi feita (22/10/2026), sem queda:** a zona entrou na
Cloudflare com a cópia exata dos registros da Hostinger, todos DNS only e
apontando para a Railway; os nameservers mudaram na Hostinger; com a zona e o
certificado universal ativos, as rotas entraram no `wrangler.jsonc`, e os três
registros viraram `AAAA 100::` com proxy. Os `TXT _railway-verify` saíram nessa
hora. Enquanto os nameservers propagavam, os dois lados respondiam com a
Railway.

**Railway:** o deploy automático foi desligado nos dois ambientes quando a
esteira entrou na `master`. O projeto `mywish` continua lá, com o último
deploy, até o dono apagar.

## Como desfazer

1. No DNS da Cloudflare, volte `@`, `www` e `staging` para os CNAMEs da
   Railway, **DNS only**: `@ → 3pj97pbx.up.railway.app`,
   `www → 2ohgfp36.up.railway.app` e `staging → gv22t5fs.up.railway.app`. A
   Railway ainda responde com o último deploy dela, que não tem o que entrou
   na `master` depois da migração. O Convex não precisa voltar.
2. Se a Railway pedir para verificar o domínio de novo, os `TXT` são
   `_railway-verify`, `_railway-verify.www` e `_railway-verify.staging`, com os
   valores que o painel dela mostrar.
3. Para religar o deploy da Railway, a `master` precisa voltar a ter o Nitro
   (o commit anterior à migração), porque o build de hoje não gera mais o
   servidor Node.

## Custo

Nada além dos US$ 5 por mês do Workers Paid, que já cobrem a conta inteira:
10 milhões de requisições e 30 milhões de ms de CPU por mês, e 6.000 minutos
de build (cada build leva uns 2 minutos). Requisição a arquivo estático é
grátis e não conta no limite. O Worker tem uns 590 KB comprimidos (o teto é
10 MB) e parte em uns 11 ms. Workers Logs inclui 20 milhões de eventos por mês.
Previews: até 500 por Worker; passando disso, a Cloudflare apaga os mais
antigos. A zona `mywish.com.br` é do plano Free.
