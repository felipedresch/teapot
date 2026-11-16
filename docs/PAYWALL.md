# Cobrança (paywall)

Hoje o anfitrião monta a lista de graça e paga um Pix único para compartilhar
(R$ 9,90 ou R$ 29,90, mais o acesso vitalício; `convex/payments.ts`). Um
interruptor desliga tudo isso e deixa o MyWish gratuito.

## O interruptor

`PAYWALL_ENABLED` em [`convex/lib/paywallSwitch.ts`](../convex/lib/paywallSwitch.ts).
É uma constante no código, e não variável de ambiente, porque o Convex (quem
libera a lista) e o site (textos) precisam mudar juntos, e boa parte dos textos
é estática: páginas, metadados, JSON-LD, blog e `/llms.txt`. Uma variável
teria de existir em dois lugares e poderia ficar diferente entre eles.

Com `false`:

- **Listas novas:** nascem `grandfathered` (grátis para sempre).
- **Listas que esperavam pagamento:** contam como grátis na hora (`effectiveMonetizationStatus`). Ao publicar ou editar, a lista grava `grandfathered`.
- **Textos:** os que falam de preço trocam para a versão grátis: `byPaywall(pago, gratis)` em `src/lib/paywall.ts` e os marcadores `<!-- pago -->` / `<!-- gratis -->` do blog ([BLOG.md](BLOG.md)).
- **Páginas:** `/precos` vira "é grátis", com a explicação dos links de parceiro.
- **Pagamentos já feitos:** continuam valendo. Quem pagou não perde nada.

Listas que ficaram grátis continuam grátis se a cobrança voltar. As listas
criadas depois que ela volta já nascem esperando pagamento.

## Como virar (desligar a cobrança)

1. Trocar para `export const PAYWALL_ENABLED = false` numa branch e abrir o PR.
2. `npx convex deploy` (produção), depois o merge na `master`. É a ordem de sempre ([CLOUDFLARE.md](CLOUDFLARE.md)).
3. Gravar as listas pendentes como grátis:
   `npx convex run --prod payments:liberarListasPendentes`
4. Conferir em produção:
   - `/precos`, `/faq`, home e `/llms.txt` sem preço;
   - um artigo do blog com preço;
   - criar uma lista e compartilhar sem paywall.

Para religar, o caminho é o mesmo com `true`, sem o passo 3.

## Ao escrever textos novos

Toda menção ao preço do MyWish vem em par: `byPaywall('…R$ 9,90…', '…grátis…')`
no código, ou `<!-- pago -->…<!-- /pago --><!-- gratis -->…<!-- /gratis -->`
no Markdown. Para conferir, basta procurar por `9,90` e `Pix` fora de um
desses pares.
