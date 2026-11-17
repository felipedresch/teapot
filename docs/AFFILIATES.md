# Links de afiliado

Segunda receita do mywish: quando o convidado clica em "Ver referência" de um
presente e compra na loja, a comissão de afiliado vem para o mywish. O preço
para quem compra não muda e o produto não muda. O código está pronto e
**desligado**: cada loja liga sozinha quando a variável dela existe no Worker.

## Como funciona

1. O link "Ver referência" da página da lista (`src/routes/events.$slug.tsx`,
   componente `GiftReferenceLink`) aponta para `/r/<giftId>?o=guest|host`, e
   não mais para o link da loja. No navegador, o link ganha também
   `&d=<distinct_id do PostHog>`.
2. A rota `/r/$giftId` ([`src/routes/r.$giftId.ts`](../src/routes/r.$giftId.ts))
   roda no Worker:
   - busca o presente no Convex (`giftLinks.getGiftLinkTarget`);
   - passa o `referenceUrl` pelos adaptadores
     ([`src/lib/affiliate/`](../src/lib/affiliate/));
   - registra o clique (`giftLinks.registerGiftLinkClick`): uma linha na
     tabela `giftLinkClicks` e o evento `gift_link_clicked` no PostHog;
   - responde `302` para o link final, com `no-store` e `noindex`.
3. O `referenceUrl` salvo pelo anfitrião **nunca muda no banco**. A troca
   acontece a cada clique; desligar uma loja volta tudo ao link original na
   hora.

Se o presente não existe (id errado, apagado) ou o Convex não responde, o
clique volta para a página de onde veio. Registrar o clique tem limite de
1,5 s: se o Convex demorar, o convidado segue para a loja sem o registro.
Robôs (buscadores, prévia de link do WhatsApp) não contam como clique.

### O que cada adaptador faz

O módulo é puro e testado (`tests/affiliate.test.ts`). Ordem de cada clique:

1. Descobre a loja pelo domínio (`stores.ts`). Sem loja conhecida, o link
   segue igual.
2. Loja desligada (sem variável): o link segue igual, sem nenhuma chamada de
   rede.
3. **Afiliado de outra pessoa no link: não troca.** Muitos links vêm do botão
   de compartilhar de quem já é afiliado. Contam como afiliado:
   - Amazon: parâmetro `tag` (ou `ascsubtag`);
   - Shopee: `s.shopee.com.br/...`, `utm_medium=affiliates`, `utm_source=an_...`,
     `mmp_pid=an_...`, `af_siteid` ou `uls_trackid`;
   - Mercado Livre: `matt_word`, `matt_tool` ou `matt_source`.
4. Encurtador (`a.co`, `amzn.to`, `br.shp.ee`, `meli.la` e o
   `mercadolivre.com.br/sec/...`): segue os redirecionamentos sem abrir a
   página do produto, com 2,5 s no total. Se não abrir a tempo, ou cair em
   outro site, o link segue como veio. Depois de aberto, olha de novo o
   afiliado do passo 3 (o `amzn.to` e o `meli.la` quase sempre têm).
5. Troca:
   - **Amazon:** põe `tag=<AMAZON_ASSOCIATE_TAG>`. Só `amazon.com.br`.
   - **Mercado Livre:** põe `matt_word=<MELI_AFFILIATE_TAG>` e
     `matt_tool=<MELI_AFFILIATE_TOOL_ID>`.
   - **Shopee:** chama a API aberta de afiliados
     (`https://open-api.affiliate.shopee.com.br/graphql`, mutation
     `generateShortLink`) e manda para o `s.shopee.com.br/...` que ela devolve.
     Se a API falhar ou passar de 2,5 s, o link segue como veio. Os `subIds`
     vão como `mywish` e a origem (`guest`/`host`): aparecem no relatório da
     Shopee.
   - **Magalu e Shein:** só detectados, sem adaptador (TODO em
     `src/lib/affiliate/index.ts`).

`AFFILIATE_LINKS_DISABLED=true` desliga todas as lojas sem apagar os IDs.

### Aviso de comissão

O aviso fica no rodapé de todas as páginas
([`Footer`](../src/components/Footer.tsx)) e na pergunta "Como o MyWish se
mantém de graça?" do FAQ, não no meio das telas: dentro do bloco de
sugestões e da lista, ele pesava a página.

> Alguns links de produto são de parceiros: o MyWish pode receber uma
> comissão, sem custo extra para quem compra.

Ao ligar a Amazon, o programa de associados exige a frase "Como Associado da
Amazon, o mywish ganha com compras qualificadas." no site: ponha no mesmo
rodapé. A server function `getAffiliateDisclosure` (loader da página da
lista) diz ao navegador só se há loja ligada (`shopee` liga o "Ver opções na
Shopee"); os IDs ficam no Worker.

### O que medir

- PostHog, evento `gift_link_clicked`: `giftId`, `eventId`, `store`
  (`amazon`, `shopee`, `mercadolivre`, `magalu`, `shein` ou `other`),
  `rewritten` (trocou ou não), `reason` e `linkSource` (`guest` ou `host`).
  Vai com `$process_person_profile: false`, como o resto do site.
- Convex, tabela `giftLinkClicks`: as mesmas informações, com índices
  `by_gift` e `by_event`.

Valores de `reason`: `rewritten` (trocou), `store_disabled` (loja sem
variável ou sem adaptador), `unknown_store`, `existing_affiliate` (afiliado de
outra pessoa), `own_affiliate` (já era o nosso), `resolve_failed`
(encurtador não abriu), `generator_failed` (API da Shopee falhou),
`invalid_url`.

Antes de ligar qualquer loja vale subir só o rastreio por algumas semanas: o
`reason` mostra quantos cliques seriam trocados e quantos já vêm com afiliado
de alguém.

## Sugestões de produto da Shopee

Hoje cerca de 70% dos presentes não têm link. As sugestões atacam isso dos
dois lados.

### Para o anfitrião: "Ideias para o seu <ocasião>"

Em dois lugares
([`GiftSuggestions`](../src/components/gift-suggestions/GiftSuggestions.tsx)):

- no passo "Presentes" da criação da lista (`/events/create`), antes do
  formulário: é o momento de mais intenção, quando a pessoa ainda não tem
  nenhum presente;
- no topo de "Adicionar presente" da página da lista.

O bloco:

- chips com as ideias mais pedidas nas listas do mywish, tiradas de
  `src/content/giftInsights.ts`: chá de casa nova, chá de panela (também
  usado em casamento) e as categorias de aniversário. O chá de bebê, sem
  dados no giftInsights, usa as categorias clássicas (fraldas, body, lenços,
  toalha com capuz, banheira, kit higiene, manta, mordedor); pano de prato e
  air fryer também vêm de listas reais olhadas à mão. Formatura e "outro"
  ficam sem o bloco;
- a primeira ideia já vem aberta, com até 3 cards: "Mais em conta", "Mais
  escolhido" e "Para presentear", com foto, nome, preço, nota e vendas;
- "Adicionar à lista" põe o presente na lista com um toque: nome, categoria,
  link e foto. Na página da lista, cria o presente na hora; na criação, entra
  no rascunho e a foto sobe na publicação. Depois o botão vira "Na lista"
  (pelo link salvo, então sobrevive ao reload). Para mudar algo, o anfitrião
  edita o card.

### Para o anfitrião: "Link sugerido"

Num presente sem link que combina com um produto da curadoria, o card mostra
o produto e "Usar este link no presente". O toque salva o link curto de
afiliado no presente (e a foto, se o presente não tinha). O casamento de
nomes fica em
[`convex/lib/suggestionMatch.ts`](../convex/lib/suggestionMatch.ts): o
substantivo principal do presente ("Pano" em "Pano de pratos") precisa ser o
do produto ou o da ideia; com duas palavras fortes, as duas batem. Melhor
deixar de mostrar do que mostrar o produto errado.

Ideias e buscas ficam em
[`convex/lib/suggestionIdeas.ts`](../convex/lib/suggestionIdeas.ts) (troque
só o `keyword` para mudar a busca; um teste confere que os rótulos ainda
existem no giftInsights).

### De onde vêm os produtos

- Um cron diário do Convex (`convex/crons.ts`, 7h UTC) chama
  `productSuggestions.refreshProductSuggestions`. Para cada busca, ele
  consulta o `productOfferV2` da Open API
  ([`convex/lib/shopeeAffiliateApi.ts`](../convex/lib/shopeeAffiliateApi.ts)).
  A mesma busca em duas ocasiões roda uma vez só.
- O ranking ([`convex/lib/suggestionRanking.ts`](../convex/lib/suggestionRanking.ts)):
  - parte da ordem de relevância da API;
  - descarta nota abaixo de 4,5 e menos de 50 vendas (aceita 10 vendas se
    sobrarem menos de 3 produtos);
  - escolhe o que mais vende como "Mais escolhido";
  - "Mais em conta" é o mais barato abaixo da mediana de preço;
  - "Para presentear" fica um pouco acima, até 2,2× a mediana.

  A comissão só desempata. Quando a busca não dá três faixas honestas,
  aparecem dois cards.

- O resultado fica na tabela `productSuggestions`. A página só lê esse cache e
  nunca chama a API por visita. Se a API cair, o cache do dia anterior fica.
- **Sem as credenciais no Convex, o cron não faz nada.** O bloco só aparece
  para as ideias que têm produto na tabela.

### Curadoria manual (enquanto a Open API não sai)

Desde 2026-11-16 a tabela é preenchida à mão, a partir de
[`scripts/sugestoes/curadoria.json`](../scripts/sugestoes/curadoria.json):

1. Os produtos saem da busca de **Oferta de produto** do painel de afiliado,
   com o mesmo critério do ranking (nota, vendas, faixas de preço), revisados
   à mão: nome curto e limpo, sem refil, peça avulsa ou item quase repetido.
2. O link de cada um é gerado em **Link personalizado** (até 5 por vez), com
   `Sub_id 1 = mywish` e `Sub_id 2 = sugestao`. Assim o relatório de vendas
   do painel separa as compras que vieram das sugestões. É um link curto
   `s.shopee.com.br/...` que já leva o ID de afiliado; ele é salvo como link
   do presente, e o `/r/` só repassa.
3. `node scripts/sugestoes/carregar.mjs --check` valida o arquivo, e
   `node scripts/sugestoes/carregar.mjs` grava na produção (`--dev` para o
   deployment de dev). Cada ideia vai para todas as ocasiões que a usam.

Cuidados:

- Não automatize buscas seguidas no painel: depois de umas 20 em sequência a
  Shopee bloqueia a página por alguns minutos ("Página indisponível").
- Preço e vendas são do dia da curadoria. Revise uma vez por mês, ou quando um
  produto sair do ar.
- Quando a Open API for liberada e as credenciais estiverem no Convex, o cron
  troca esta curadoria pelas escolhas automáticas.

### Para o convidado: "Onde comprar"

Num presente sem link, disponível ou reservado pelo próprio convidado, que
combina com um produto da curadoria (o mesmo casamento do "Link sugerido"), o
card mostra foto, nome e preço do produto, com "Onde comprar". O clique vai
para `/r/<giftId>?v=shopee`, que registra o clique e, sem a Open API, manda
para o link curto da curadoria (`reason: own_affiliate`).

### Para o convidado: "Fora da lista"

No fim da página da lista, só para o convidado
([`OutsideListSuggestions`](../src/components/gift-suggestions/OutsideListSuggestions.tsx)):
um produto por ideia mais pedida da ocasião (até 8), com o aviso de que não
fazem parte da lista dos anfitriões. Quando tudo já foi reservado, o título
muda para "Os presentes da lista já foram escolhidos". O link vai direto para
o link curto da curadoria.

### Para o convidado: "Ver opções na Shopee"

Num presente sem link e sem produto que combine (e ainda não recebido), com a
Shopee ligada no Worker, aparece um link discreto. Ele vai para
`/r/<giftId>?v=shopee`
([`shopeeOptions.ts`](../src/lib/affiliate/shopeeOptions.ts)), que tenta, em
ordem:

1. o link curto de afiliado da **busca** da Shopee pelo nome do presente;
2. se a API recusar link de busca, o produto em cache que combina com o nome;
3. se nada combinar, a busca sem afiliado (o convidado acha o presente, só não
   há comissão).

**Não confirmado:** se o `generateShortLink` aceita URL de busca. O `reason`
do `gift_link_clicked` (com `linkKind: shopee_options`) mostra qual caminho
valeu nos primeiros cliques.

### Eventos

No PostHog, do navegador:

- `gift_suggestion_viewed`: chip aberto, com `occasion`, `ideaId` e quantos
  produtos;
- `gift_suggestion_added`: com `slot` e `price` (`eventId: draft` quando vem
  da criação da lista);
- `shopee_options_clicked`: com `hasMatch: true` quando veio do "Onde
  comprar";
- `suggested_link_used`: anfitrião usou o "Link sugerido";
- `outside_list_suggestion_clicked`: convidado clicou num produto "fora da
  lista".

Os links da curadoria já são de afiliado, mesmo sem nenhuma loja ligada no
Worker: o aviso do rodapé cobre todos eles.

O clique em si chega também como `gift_link_clicked`, pelo servidor.

### Ver sem login nem chaves

`/dev/sugestoes` mostra os componentes reais com as fixtures de
[`src/dev/shopeeFixtures.ts`](../src/dev/shopeeFixtures.ts), em todos os
estados: aberto, depois de adicionar, carregando, sem resultados e imagem
quebrada. As imagens são ilustrações. A rota só existe em desenvolvimento: no
build de produção dá 404, e as fixtures não vão no bundle.

## Variáveis

### Worker (site)

Lidas em `process.env` pela rota `/r/$giftId` e pelo aviso de comissão. Só
na produção (`mywish`): na staging e nos previews, deixe sem, para os testes
não gerarem cliques de afiliado.

| Variável                   | Tipo                                  | Valor                                            |
| -------------------------- | ------------------------------------- | ------------------------------------------------ |
| `AMAZON_ASSOCIATE_TAG`     | variável (`vars` do `wrangler.jsonc`) | o ID de rastreamento, ex.: `mywish-20`           |
| `MELI_AFFILIATE_TAG`       | variável                              | a etiqueta do Mercado Livre (vai em `matt_word`) |
| `MELI_AFFILIATE_TOOL_ID`   | variável                              | o número que aparece em `matt_tool`              |
| `SHOPEE_AFFILIATE_APP_ID`  | variável                              | o App ID da Open API da Shopee                   |
| `SHOPEE_AFFILIATE_SECRET`  | **segredo** (`wrangler secret put`)   | a senha (Secret) da Open API                     |
| `AFFILIATE_LINKS_DISABLED` | opcional                              | `true` desliga tudo                              |

O Mercado Livre só liga com as duas variáveis; a Shopee também.

Variáveis de texto vão no `vars` do topo do `wrangler.jsonc` (produção): o
`npx wrangler deploy` sobrescreve as que estão só no painel. Segredo, uma vez
por Worker:

```bash
npx wrangler secret put SHOPEE_AFFILIATE_SECRET --name mywish
```

Para testar local, ponha as variáveis num `.dev.vars` na raiz (não vai para o
git) e rode `npm run build && npx vite preview`.

### Convex

| Variável                                             | Valor                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `SHOPEE_AFFILIATE_APP_ID`, `SHOPEE_AFFILIATE_SECRET` | as mesmas do Worker. Ligam o cron das sugestões; só na produção (`npx convex env set --prod ...`) |

O evento do PostHog usa o `POSTHOG_PROJECT_API_KEY` que já existe. A tabela `giftLinkClicks` e as funções de `convex/giftLinks.ts`
precisam estar no Convex **antes** do site: suba com `npx convex deploy`
primeiro e depois o Worker. Na ordem contrária, os cliques em "Ver
referência" voltam para a página até o Convex subir.

## Como ligar cada loja

Depois do cadastro aprovado, ligue uma loja por vez e confira com um link de
teste, em aba anônima, se a loja mostra o clique no painel de afiliado.

### Amazon (Associados Amazon.com.br)

1. Cadastro em `associados.amazon.com.br`, com `mywish.com.br` como site.
2. Copie o **ID de rastreamento** (termina em `-20`). Dá para criar um só para
   o mywish em "Gerenciar IDs de rastreamento".
3. `AMAZON_ASSOCIATE_TAG=<id>` no `vars` da produção.
4. A Amazon aprova de vez só depois de 3 vendas qualificadas em 180 dias. Até
   lá a conta fica provisória.
5. Leia o Contrato Operacional: a frase de associado já está no aviso, e o
   link tem que deixar claro que vai para a Amazon (no mywish, o convidado
   clica no produto que o anfitrião escolheu).

### Mercado Livre (Afiliados e Criadores)

O Mercado Livre não tem API pública para gerar link de afiliado. O adaptador
põe na URL os mesmos parâmetros que o link do painel traz.

1. Cadastro na Central de Afiliados e Criadores (`mercadolivre.com.br/afiliados`).
2. Gere um link de qualquer produto pelo gerador da Central (ou pela barra de
   afiliados) e abra o `meli.la` que ele devolve.
3. Na URL final, copie o valor de `matt_word` (sua etiqueta) e de `matt_tool`
   (o número).
4. `MELI_AFFILIATE_TAG=<matt_word>` e `MELI_AFFILIATE_TOOL_ID=<matt_tool>`.
5. **Confira** se o clique aparece no painel com um link montado à mão: a
   URL do produto mais `?matt_word=...&matt_tool=...`. Se não aparecer, o
   Mercado Livre está exigindo o `meli.la` do gerador e o adaptador
   (`src/lib/affiliate/mercadolivre.ts`, TODO no topo) precisa de outro
   caminho; deixe o Mercado Livre desligado até lá.

Visto em 2026-11-16: a conta tem a etiqueta `drfe7828713` e `matt_tool`
`92414274`. O `meli.la` do gerador **não** cai mais na URL do produto: ele
leva para `mercadolivre.com.br/social/<etiqueta>` com os dois parâmetros e um
`ref` cifrado, que aponta o produto. Isso aumenta a chance de a URL montada à
mão não contar; o teste do passo 5 ainda não foi feito. Um navegador sem login
no Mercado Livre cai numa tela de "acesse sua conta", então faça o teste num
celular ou numa aba anônima de verdade. Os termos, segundo guias de terceiros,
só contam cliques das mídias cadastradas no perfil: confira se o
`mywish.com.br` está lá. O gerador aceita várias URLs, uma por linha.

### Shopee (Programa de Afiliados)

1. Cadastro em `affiliate.shopee.com.br`. A análise leva alguns dias.
2. Com a conta aprovada, o acesso à Open API é pedido por formulário, não no
   painel (lá o botão "Aplicar" fica desativado e o "entre em contato" não
   abre). Formulário:
   `help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091` →
   já é afiliado: Sim → outras dificuldades → ID de afiliado e telefone do
   cadastro → cadastro / conta → **Quero ativar a API**. Resposta em até 3
   dias úteis. Depois, em **Abrir API** no painel, clique em Aplicar: saem o
   **App ID** e a **senha (Secret)**. Pedido feito em 2026-11-16.
   O `mywish.com.br` já está cadastrado como mídia da conta.
3. `SHOPEE_AFFILIATE_APP_ID=<app id>` no `vars` e o segredo com
   `npx wrangler secret put SHOPEE_AFFILIATE_SECRET --name mywish`. Para as
   sugestões, as mesmas duas no Convex de produção
   (`npx convex env set --prod SHOPEE_AFFILIATE_APP_ID ...`). Para não esperar
   o cron, rode uma vez
   `npx convex run --prod productSuggestions:refreshProductSuggestions`.
4. Confira: um clique num presente da Shopee tem que cair num
   `s.shopee.com.br/...`, e no PostHog o `reason` tem que ser `rewritten`. Se
   vier `generator_failed`, a API recusou: confira o App ID, a senha e o
   formato da assinatura em `src/lib/affiliate/shopee.ts` contra a
   documentação que o painel mostra (o formato saiu de clientes da
   comunidade, não da documentação oficial).

### Magalu, Shein e outros

Ainda sem adaptador. O Parceiro Magalu monta a loja do afiliado em
`magazinevoce.com.br/<loja>/...`, que precisa de outro caminho de URL; a Shein
paga por redes parceiras. Para criar um: uma função em `src/lib/affiliate/`,
o caso no `switch` de `index.ts`, as variáveis em `config.ts` e os testes.
