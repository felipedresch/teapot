# Blog do MyWish

Os artigos ficam no próprio repositório, em `src/content/blog/<slug>.md`. Eles são escritos e revisados aqui (Claude Code), entram por PR e sobem junto com o site. Até novembro de 2026 o blog vinha do Slop Machine, um gerador externo; os textos eram fracos, sem dados e às vezes descreviam recursos que o MyWish não tem. Todos foram reescritos ou redirecionados.

## Formato do arquivo

```md
---
title: Título como a pessoa pesquisa (até ~65 caracteres)
description: Resumo de 140 a 160 caracteres com a resposta principal.
publishedAt: 2026-02-20
updatedAt: 2026-11-14
occasion: aniversario
keywords: presente de aniversário, ideias de presente, lista de aniversário
---

Primeiro parágrafo: a resposta direta para a pergunta do título, em 40 a 60 palavras.

## Seção com título no formato da pergunta

Texto...

## Perguntas frequentes

### Pergunta em linguagem natural?

Resposta em um parágrafo curto.
```

- `slug` é o nome do arquivo. Mudar o slug de um artigo publicado exige um redirecionamento em `BLOG_REDIRECTS` (`src/lib/blog.ts`).
- `occasion` (opcional): `aniversario`, `casamento`, `cha-de-panela`, `casa-nova` ou `cha-de-bebe`. Define a chamada para criar lista no meio e no fim do artigo (`src/components/BlogOccasionCta.tsx`).
- `updatedAt` só muda quando o texto muda de verdade. Ela aparece no artigo, no JSON-LD e no sitemap.
- Sem H1 no corpo: o título vem do frontmatter.
- A seção `## Perguntas frequentes`, com cada pergunta em `###`, vira FAQPage no JSON-LD automaticamente. Deixe-a no fim.
- Links internos com caminho relativo (`/lista-de-presentes/casa-nova`).

## Como escrever

- Português do Brasil, segunda pessoa ("você"), frases curtas, tom acolhedor e direto, como o resto do site. Nada de "Próximos passos" genérico nem de conclusão que repete o texto.
- Cada seção começa respondendo; os detalhes vêm depois. Títulos das seções no formato em que as pessoas perguntam.
- Listas e tabelas quando ajudam a comparar ou a escanear.
- 800 a 1.400 palavras. Melhor curto e útil do que longo e vazio.
- Dados: use os números de `src/content/giftInsights.ts` (levantamento das listas reais) e cite a página `/dados/presentes-mais-pedidos`. Não invente estatística, pesquisa, especialista, preço, marca, modelo ou loja específica. Quando falar de preço, use faixas gerais e diga que variam.
- Sem afirmações médicas, jurídicas ou de segurança infantil além do senso comum; quando o assunto pede, oriente a seguir o fabricante ou o profissional que acompanha a família.
- Cite o MyWish quando ele resolve o problema do leitor, sem transformar o artigo em propaganda. Uma menção natural no texto basta; a chamada visual entra sozinha pelo `occasion`.

## O que o MyWish faz (e o que não faz)

Fale só do que existe:

- Montar e editar a lista é grátis. Com a cobrança ligada, compartilhar exige um pagamento único via Pix: R$ 9,90 por lista (aniversário, chá de bebê, chá de panela, casa nova, formatura e outras) ou R$ 29,90 (casamento, noivado e bodas). Acesso vitalício da conta: R$ 29,90 ou R$ 59,90. Sem mensalidade e sem porcentagem sobre os presentes. Com a cobrança desligada, tudo é grátis. Veja "Preço com e sem cobrança" abaixo.
- Ocasiões no cadastro: casamento, chá de panela, aniversário, chá de bebê, chá de casa nova, formatura e outro.
- Cada presente tem nome, descrição, imagem, categoria e link de referência de qualquer loja. Ao colar o link, o MyWish tenta preencher a imagem do produto.
- O convidado abre a lista pelo link, entra com a conta Google e reserva o presente. Os outros veem que o item foi escolhido. Ele pode deixar uma mensagem para o anfitrião e pode desfazer a própria reserva (na lista ou em "Meus presentes"); o presente volta a ficar disponível. O anfitrião pode liberar qualquer presente reservado.
- A compra acontece na loja que o convidado escolher, fora do MyWish. O MyWish não vende, não entrega e não transforma presentes em dinheiro.
- O anfitrião vê as reservas e marca os presentes recebidos. Pode convidar outra pessoa para ajudar a organizar (co-anfitrião).
- Depois de liberada, a lista pode ser pública (aparece na vitrine do site) ou não listada (só quem tem o link). O endereço da lista é gerado a partir do nome do evento; não há domínio nem link personalizado à parte.
- Funciona no navegador do celular, sem aplicativo.

## Preço com e sem cobrança

A cobrança pode ser desligada. O interruptor é `PAYWALL_ENABLED`, em `convex/lib/paywallSwitch.ts`. Com ele em `false`, o MyWish fica 100% grátis: sem pagamento para compartilhar e sem Pix.

Por isso, todo trecho que fala do preço do MyWish vem em par, com dois marcadores:

```md
<!-- pago -->No MyWish, você monta a lista de graça e paga R$ 9,90, uma vez, via Pix, para compartilhar.<!-- /pago --><!-- gratis -->No MyWish, você monta e compartilha a lista de graça.<!-- /gratis -->
```

- `<!-- pago -->…<!-- /pago -->` só aparece com a cobrança ligada. `<!-- gratis -->…<!-- /gratis -->` só aparece com tudo grátis. Quem troca é `src/lib/blog.ts`.
- Vale para qualquer menção ao preço, ao Pix pago ao MyWish, a "liberar o compartilhamento", ao acesso vitalício ou à página `/precos`. Sem o par, o texto fica errado quando a cobrança muda.
- A versão grátis não cita preço, Pix para o MyWish nem plano. Curta e no mesmo tom: "você monta e compartilha a lista de graça".
- Marque o menor trecho que fica natural nas duas versões. Se a frase ficar estranha, marque o parágrafo inteiro ou a resposta inteira.
- Os marcadores funcionam no meio da frase, em volta de parágrafos e dentro das respostas do FAQ. Nunca dentro de um título (`##` ou `###`) nem cortando um link. Se a pergunta só faz sentido com cobrança ("Quanto custa?"), mantenha o título e faça a resposta em par; a versão grátis responde "Nada: ...".
- O frontmatter (`title`, `description`, `keywords`) não aceita marcadores. Não cite preço ali.
- Pix e pagamento que não são do MyWish ficam como estão: o convidado que dá dinheiro, a chave Pix do casal, as taxas de outros sites.

## Desempenho

Antes de mexer num artigo, veja:

- Google Search Console: cliques e impressões por página.
- Bing Webmaster Tools > AI Performance: citações no Copilot por página e por consulta.
- PostHog (projeto `315519`): visitantes por `$pathname` e o evento `blog_cta_clicked` (slug, ocasião, posição, destino).

Artigo citado ou que traz visita: melhore com cuidado, mantendo slug e títulos das seções. Artigo sem nada: reescreva, junte com outro ou redirecione.

Depois de publicar, rode `npm run indexnow -- /blog/<slug>` e, para artigos novos, peça indexação no Search Console.
