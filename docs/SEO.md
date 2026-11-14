# SEO do MyWish

## Endereço principal

`https://mywish.com.br` é a origem canônica. `src/lib/seo.ts` centraliza URLs e metadados; não usa variáveis de build para gerar URLs públicas, evitando canonicals de staging, localhost ou www.

`src/lib/canonical.ts`, chamado pela entrada do Worker da Cloudflare (`src/server.ts`), redireciona `www` com HTTP 308 e preserva caminho e query string. O certificado precisa estar válido antes que o navegador possa receber esse redirecionamento. Na Cloudflare, `www.mywish.com.br` precisa de registro com proxy e da rota no Worker `mywish` ([CLOUDFLARE.md](CLOUDFLARE.md#domínio-e-dns)). Os endereços `workers.dev` saem com `X-Robots-Tag: noindex`.

## Sitemap e conteúdo

- `/sitemap.xml` é gerado no servidor com páginas públicas e artigos publicados.
- `src/routes/sitemap[.]xml.ts` usa o escape de ponto do TanStack Router. Um arquivo chamado `sitemap.xml.ts` cria a rota `/sitemap/xml`, não `/sitemap.xml`.
- `/sitemap-index.xml` e `/sitemap/xml` redirecionam para o sitemap principal.
- Não recriar `public/sitemap.xml`: ele ocultaria a resposta dinâmica.
- O sitemap usa os slugs da mesma API de conteúdo usada no blog. Assim, diferenças de domínio no sitemap do fornecedor não excluem os artigos.
- `lastmod` dos artigos reflete as datas da API. Páginas estáticas omitem esse campo; não inventar uma atualização diária.
- Falha na API de conteúdo retorna 503 no sitemap, com Retry-After, em vez de publicar silenciosamente um sitemap incompleto.
- O blog distingue artigo ausente (404) de indisponibilidade do fornecedor.

Os guias de ocasião ficam em `src/content/occasions.ts`: casamento, aniversário, chá de bebê, chá de panela e casa nova. Cada página tem orientações próprias, exemplos e dúvidas relevantes. `/lista-de-presentes` é a página central e `/precos` explica os valores e o que cada pagamento libera. Home, navegação, rodapé e artigos oferecem links para essas páginas.

Os textos devem refletir o produto: montagem gratuita; compartilhamento pago; compra e entrega dos presentes fora do MyWish. Não anunciar conversão de presentes em dinheiro. Os valores devem acompanhar `getPrices` e `getPaywallCategory` em `convex/payments.ts`.

## Citações por IA (ChatGPT, Perplexity, Copilot)

Entre maio e agosto de 2026, o ChatGPT foi a maior fonte de visitantes depois do tráfego direto, e a que mais convertia: dos 149 visitantes vindos de chatgpt.com, 42 criaram lista. Em setembro essa origem praticamente zerou. O Google traz pouco: quase todos os cliques vêm de buscas pelo nome "mywish". A estratégia é ter páginas que respondem perguntas de forma direta, com dados próprios e data de atualização visível.

- `/dados/presentes-mais-pedidos`: levantamento próprio com as listas reais (chá de casa nova e chá de panela). Os números vêm de `src/content/giftInsights.ts`, gerado por `npm run dados:gerar` (lê a produção com `npx convex data --prod`; só publica agregados anônimos, itens em pelo menos 5 listas). Rodar todo mês e publicar: a data da página acompanha a geração.
- `/como-escolher-site-de-lista-de-presentes`: comparativo por tipo de solução (não por marca, para não publicar preço ou regra de terceiros desatualizado). Diz também quando o MyWish não é a melhor opção.
- Guias de casa nova e chá de panela mostram os 10 itens mais pedidos e linkam o levantamento.
- `public/llms.txt` resume os fatos do produto e aponta para os dados.
- `public/robots.txt` libera explicitamente OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot e Bingbot.

### Datas

`src/content/pageDates.ts` guarda a data da última revisão real de cada página pública. Ela aparece como "Atualizado em", vai no `dateModified` do JSON-LD e no `lastmod` do sitemap. Só mude a data quando o conteúdo mudar.

### Bing e IndexNow

O ChatGPT busca na web com ajuda do índice do Bing. Depois de cada publicação com conteúdo novo, rodar `npm run indexnow` (todas as URLs do sitemap) ou `npm run indexnow -- /caminho` (só as alteradas). A chave fica em `public/<chave>.txt` e no próprio script. Vale também cadastrar o site no Bing Webmaster Tools (dá para importar do Search Console) e enviar o sitemap por lá.

## Dados estruturados

O site inclui Organization e WebSite. Artigos incluem Article e navegação BreadcrumbList; guias de ocasião incluem BreadcrumbList, FAQPage e Article com `dateModified`. A página de dados inclui Dataset; preços incluem Service com as ofertas reais (acompanhar `getPrices`). A FAQ usa perguntas e respostas que estão visíveis na própria página. Não publicar avaliações, autores, recursos ou ofertas inexistentes. `toJsonLd` escapa `<` para impedir que conteúdo externo encerre um bloco script.

## Medição

PostHog captura visualizações iniciais e mudanças de rota com `capture_pageview: 'history_change'`. A configuração anterior desativava essas visualizações sem envio manual equivalente. Isso limita a comparação histórica por pageviews.

A chave de ingestão não permite ler relatórios. O projeto Teapot é `315519` no PostHog US; uma chave pessoal precisa incluir esse projeto. A chave do Harmony encontrada na investigação tem acesso ao projeto Harmony e retorna 403 para Teapot.

No Google Search Console, enviar `https://mywish.com.br/sitemap.xml` e acompanhar cliques, impressões, consultas, páginas e canonicals selecionados. Mudanças técnicas não garantem indexação ou crescimento de posições.

## Verificação antes e depois de publicar

```sh
npm test
npx tsc --noEmit
npm run build
npm run seo:check -- https://mywish.com.br
```

Para testar o servidor local, passar sua origem para `seo:check`. O comando verifica as URLs do sitemap, status HTTP, canonical único, H1 único, JSON-LD, 404s e redirecionamentos. `--skip-www` só deve ser usado para isolar um problema de DNS/certificado; não valida a correção do domínio.

## Referências

- [Canonicals e redirecionamentos — Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Sitemaps e lastmod — Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Checkout transparente — AbacatePay](https://docs.abacatepay.com/pages/transparents/create)
