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

Embaixo da grade de presentes aparece, só com alguma loja ligada e algum
presente com link:

> Podemos receber uma comissão por compras feitas pelos links dos presentes,
> sem custo extra pra você.

Com a Amazon ligada, vem junto a frase que o programa de associados exige:
"Como Associado da Amazon, o mywish ganha com compras qualificadas." O
navegador só sabe se há loja ligada (server function
`getAffiliateDisclosure`, no loader da página); os IDs ficam no Worker.

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

## Variáveis

### Worker (site)

Lidas em `process.env` pela rota `/r/$giftId` e pelo aviso de comissão. Só
na produção (`mywish`): na staging e nos previews, deixe sem, para os testes
não gerarem cliques de afiliado.

| Variável | Tipo | Valor |
| --- | --- | --- |
| `AMAZON_ASSOCIATE_TAG` | variável (`vars` do `wrangler.jsonc`) | o ID de rastreamento, ex.: `mywish-20` |
| `MELI_AFFILIATE_TAG` | variável | a etiqueta do Mercado Livre (vai em `matt_word`) |
| `MELI_AFFILIATE_TOOL_ID` | variável | o número que aparece em `matt_tool` |
| `SHOPEE_AFFILIATE_APP_ID` | variável | o App ID da Open API da Shopee |
| `SHOPEE_AFFILIATE_SECRET` | **segredo** (`wrangler secret put`) | a senha (Secret) da Open API |
| `AFFILIATE_LINKS_DISABLED` | opcional | `true` desliga tudo |

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

Nenhuma variável nova. O evento do PostHog usa o `POSTHOG_PROJECT_API_KEY`
que já existe. A tabela `giftLinkClicks` e as funções de `convex/giftLinks.ts`
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

### Shopee (Programa de Afiliados)

1. Cadastro em `affiliate.shopee.com.br`. A análise leva alguns dias.
2. Com a conta aprovada, no painel de afiliado, abra **Open API** e peça o
   acesso. Saem o **App ID** e a **senha (Secret)**.
3. `SHOPEE_AFFILIATE_APP_ID=<app id>` no `vars` e o segredo com
   `npx wrangler secret put SHOPEE_AFFILIATE_SECRET --name mywish`.
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
