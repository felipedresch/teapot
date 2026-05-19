# Plano de Monetização do mywish

> Documento de referência para a transição de produto grátis para freemium com paywall.
> Base estratégica, decisões de preço, copy, métricas e execução.

---

## 1. Contexto e posicionamento

### O que é o mywish hoje

Lista de presentes online para celebrações da vida: casamento, aniversário, chá de bebê, chá de panela, chá de casa nova, formatura, bodas, noivado, confraternização e eventos corporativos. O diferencial está no tom emocional e no visual aconchegante (polaroids, fitinhas, tipografia display itálica, paleta `sage`/`blush`/`muted-rose`/`warm-white`).

### Por que cobrar agora

O produto cresceu de forma orgânica via SEO e está com 85 eventos criados e 363 usuários cadastrados. Os custos de Convex (egress, I/O, storage de imagens) escalam linearmente com uso, e o produto entrega alto valor emocional num momento crítico da vida das pessoas (casamento, chegada de um filho, aniversários marcantes). Existe willingness to pay real.

### Posicionamento da cobrança

O paywall é uma **taxa única, simbólica, pra deixar a lista pronta pra compartilhar**. O tom mantém o aconchego do site. Nada de "trial expirando", "desbloqueio premium", "upgrade agora". A linguagem é de cuidado e finalização, no mesmo carinho do produto.

---

## 2. Modelo de precificação

### Estrutura segmentada por tipo de evento

| Categoria | Tipos de evento | Lista única | Vitalício |
|-----------|-----------------|-------------|-----------|
| **Premium** | Casamento, bodas, noivado | R$ 29,90 | R$ 59,90 |
| **Comum** | Aniversário, chá de panela, chá de bebê, chá de casa nova, formatura, confraternização, evento corporativo, outro | R$ 9,90 | R$ 29,90 |

### Pagamento

- **Somente Pix** (taxa fixa de R$ 1 no integrador)
- Aprovação na hora, QR code direto no paywall
- Receita líquida por transação:
  - R$ 9,90 paga → R$ 8,90 líquido
  - R$ 29,90 paga → R$ 28,90 líquido
  - R$ 59,90 paga → R$ 58,90 líquido

### Lógica do vitalício

**Regra técnica:** qualquer compra de vitalício (R$ 29,90 ou R$ 59,90) destrava criação ilimitada de qualquer tipo de evento, premium ou comum, pela vida da conta.

**Posicionamento ao usuário:** nunca informar publicamente que comprando o vitalício comum (R$ 29,90) é possível criar casamento depois. O comprador de casamento está pagando por **confiança e ocasião**, e provavelmente não quer pagar barato pra essa decisão. A diferença de preço carrega valor simbólico em si.

**Como apresentar em cada paywall:**
- Paywall comum: "Crie quantas listas quiser, pra sempre." Sem mencionar limitações por tipo de evento.
- Paywall premium: "Crie quantas listas quiser, pra sempre." Mesma frase. Sem mencionar que existe um tier mais barato.

### Justificativa estratégica

- **R$ 9,90 / R$ 29,90 (razão 3.02x):** sweet spot pro tier dual. Vitalício se paga em 3 listas, oferta clara.
- **R$ 29,90 / R$ 59,90 (razão 2.0x):** ainda no sweet spot. Mercado de casamento está acostumado com tarifas a partir de R$ 99 (iCasei, Felicitous), então R$ 29,90 já é um preço de entrada em relação aos concorrentes.
- O preço **mais alto traz confiança** no segmento premium, onde a pessoa investe R$ 30 mil+ na festa e não quer "site de R$ 9,90".

---

## 3. Funil e momento da paywall

### Fluxo do usuário

1. Pessoa entra no site (Google, link compartilhado, direto)
2. Clica em "Criar minha lista"
3. Escolhe tipo de evento, preenche dados, adiciona presentes (tudo grátis, sem login obrigatório)
4. Clica em **"Compartilhar"** → **PAYWALL APARECE AQUI**
5. Paga via Pix, lista é ativada, link público é gerado
6. Compartilha link com convidados
7. Convidados precisam fazer login pra reservar (mantido grátis)

### Por que esse momento

- **Máximo sunk cost psicológico**: a pessoa investiu tempo montando a lista com carinho
- **Máxima motivação**: ela quer compartilhar agora, não amanhã
- **Mínima fricção pré-paywall**: nada de pedir cartão, login, ou cadastro complexo antes
- **Efeito IKEA**: a pessoa valoriza mais o que ela mesma montou

### O que continua grátis

- Criar conta
- Criar lista
- Adicionar presentes (sem limite)
- Personalizar (capa, descrição, datas, local)
- Visualizar prévia em modo privado
- Convidados reservarem presentes (depois que o anfitrião pagou)

### O que vai pra trás do paywall

- Geração do link público
- Compartilhamento (botão "Compartilhar", QR code, link copiável)
- Tornar a lista pesquisável (`isPublic: true`)

---

## 4. Paywall: visual e copy

### Princípio guia

Paywall **continua sendo o site**, com a mesma estética. Polaroid, fitinha, paleta quente, fonte display itálica. A pessoa não pode sentir que saiu do mywish e entrou num gateway de pagamento genérico.

### Estrutura sugerida (componente único, dois layouts por categoria)

```
┌─────────────────────────────────────────┐
│                                         │
│      [ornament/fitinha decorativa]      │
│                                         │
│        sua lista está quase pronta      │  ← font-accent
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   [polaroid] [polaroid] [poli]  │   │  ← prévia visual
│  │   item 1     item 2     item 3  │   │     dos primeiros 3 itens
│  └─────────────────────────────────┘   │
│                                         │
│  Você adicionou {N} presentes com tanto │
│  carinho. Para compartilhar com quem    │
│  você ama, é uma taxa única.            │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │  Esta lista  │  │  Para sempre │    │
│  │   R$ 9,90    │  │   R$ 29,90   │    │
│  │              │  │  ★ favorita  │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  Pix · aprovação na hora · 100% seguro  │
│                                         │
│           talvez depois                 │  ← link discreto
│                                         │
└─────────────────────────────────────────┘
```

### Copy por categoria

**Tier comum (aniversário, chás, formatura, etc.):**

- Cabeçalho: _"sua lista está quase pronta"_
- Transição: _"Você adicionou {N} presentes com tanto carinho. Para compartilhar com quem você ama, é uma taxa única."_
- Card 1 (Esta lista, R$ 9,90): _"Pagamento único. Link pra compartilhar com todo mundo. Sem mensalidade."_
- Card 2 (Para sempre, R$ 29,90): _"Crie quantas listas quiser, pra sempre. Aniversários, chás, formaturas, tudo."_

**Tier premium (casamento, bodas, noivado):**

- Cabeçalho: _"sua lista está quase pronta"_
- Transição: _"Você adicionou {N} presentes com tanto carinho. Para compartilhar com quem vai celebrar com vocês, é uma taxa única."_
- Card 1 (Este evento, R$ 29,90): _"Pagamento único. Lista no ar até o seu grande dia e depois. Sem mensalidade."_
- Card 2 (Para sempre, R$ 59,90): _"Crie quantas listas quiser, pra sempre. Casamento, bodas, e tudo que vier depois."_

### Pós-pagamento

Tela de sucesso com a mesma estética, mostrando:
- Ornament/fitinha de celebração
- Frase: _"pronta pra o mundo"_ ou _"agora é só compartilhar"_
- Link gerado, botão de copiar, QR code, opções de compartilhamento (WhatsApp, Instagram, email)
- Sub-CTA pequeno: _"Personalizar mais"_ (volta pra edição)

---

## 5. Do's e Don'ts

### DO

- **Mantenha o tom emocional em toda copy do paywall.** Polaroid das prévias dentro do paywall, fitinha decorativa, fonte display itálica nos cabeçalhos.
- **Mostre o trabalho que a pessoa já fez** dentro do paywall. Quantos itens, prévia visual, nome da lista.
- **Honre quem já criou listas antes do paywall.** Comunicar aos 363 usuários existentes que listas criadas até a data X continuam ativas pra sempre. Gera goodwill e zero churn induzido.
- **Use PostHog pra medir cada degrau do funil.** Sem dados, qualquer decisão de preço vira chute.
- **Teste o A/B com calma.** 4 semanas mínimas por variante antes de mover o preço.
- **Mantenha "talvez depois" como saída visível.** Permite que a pessoa volte depois sem sentir-se barrada.
- **Cobre Pix com QR code dentro do próprio site.** Não redirecione pra gateway externo se possível. Manter o usuário dentro da estética do mywish.

### DON'T

- **Não use linguagem de SaaS.** Evite "desbloquear", "upgrade", "premium", "oferta especial", "apenas R$ X". Quebra o tom.
- **Não mencione que o vitalício comum cobre casamento.** A diferença de preço entre os tiers segmentados existe pra entregar confiança no segmento premium. Esse é o produto que estão comprando.
- **Não complique com cupons, promoções, contagens regressivas.** Mata o tom emocional. O preço já é razoável.
- **Não cobre por adição de item.** Penaliza o engajamento no pior momento possível (montagem da lista).
- **Não introduza assinatura mensal/anual.** O caso de uso é episódico. Recorrência seria fricção sem motivo.
- **Não esconda a opção "talvez depois".** Frustra e mancha a marca.
- **Não obrigue login antes do paywall.** Cadastro pode acontecer junto com o pagamento.
- **Não comece com 3 tiers.** Dois tiers por categoria já está no limite cognitivo. Mais é fricção.

---

## 6. Perigos e armadilhas a evitar

### 1. O vitalício se vendendo de menos

**Risco:** sem framing forte, a distribuição entre tiers vai pra 90/10 (lista única vs vitalício) em vez dos 70/20 desejados.

**Mitigação:** card do vitalício com destaque visual (selo "favorita", borda diferente, leve elevação). Copy específica que aciona o cenário multi-evento ("aniversários todo ano", "vários filhos", "celebrações da família").

### 2. A pessoa abandonar no paywall e voltar

**Risco:** ela vê o paywall, fecha o navegador, depois esquece.

**Mitigação:**
- Enviar email automático 24h depois com link direto pra paywall: _"sua lista está esperando"_
- Outro email 7 dias depois caso ainda não tenha pago
- Manter o estado salvo (já está, é Convex)

### 3. Cliente do tier premium descobrir que paga mais

**Risco:** comprador de casamento descobre que comprou R$ 59,90 enquanto outras pessoas pagam R$ 29,90 pelo "mesmo" vitalício.

**Mitigação:**
- Paywall premium nunca mostra o tier comum. Paywall comum nunca mostra o tier premium.
- FAQ não detalha preços por categoria, mostra apenas "a partir de R$ 9,90".
- Se questionado em suporte, posicione como "preços por tipo de celebração", sem mais detalhes.

### 4. Convidados acharem que vão pagar

**Risco:** convidado entra no link compartilhado, pensa que precisa pagar pra reservar.

**Mitigação:** primeira tela do link compartilhado deve dizer claramente "reservar é grátis, só faça login". Já existe estrutura pra isso, validar copy.

### 5. Custo de Convex crescer mais rápido que receita

**Risco:** imagens grandes, queries pesadas, e a margem ficar ruim.

**Mitigação:**
- Manter compressão de imagem agressiva (já em curso pelo último commit `b18ad1f`)
- Limite razoável de imagens por presente (talvez 1 ou 2)
- Monitorar `convex egress` semanalmente no dashboard
- Considerar mover assets pra Cloudflare R2 ou similar se egress virar problema

### 6. Tom do paywall quebrar a marca

**Risco:** desenvolvimento apressado e paywall sai genérico, "padrão SaaS".

**Mitigação:** este documento. Revisão visual obrigatória antes de subir pra produção. Mostrar pra alguém que nunca viu o produto e perguntar "isso parece o mywish?".

---

## 7. PostHog: eventos, funil, métricas

### Eventos a instrumentar

| Evento | Propriedades | Quando dispara |
|--------|--------------|----------------|
| `event_created` | `eventType`, `userId` | Pessoa cria o evento (passo 1 do fluxo de criação) |
| `gift_added` | `eventId`, `eventType`, `totalGifts` | Cada vez que um presente é adicionado |
| `gift_image_uploaded` | `eventId`, `eventType` | Upload de imagem em presente |
| `share_clicked` | `eventId`, `eventType`, `totalGifts` | Pessoa clica em "Compartilhar" pela primeira vez |
| `paywall_shown` | `eventId`, `eventType`, `category` (premium/comum), `totalGifts` | Paywall aparece na tela |
| `paywall_tier_viewed` | `tier` (single/lifetime), `category` | Pessoa hovera/foca num card específico |
| `paywall_tier_selected` | `tier`, `category`, `price` | Clica no botão de um tier |
| `pix_qr_generated` | `tier`, `category`, `price`, `eventId` | QR code Pix é exibido |
| `payment_succeeded` | `tier`, `category`, `price`, `eventId`, `secondsToPay` | Webhook do Pix confirma pagamento |
| `payment_abandoned` | `tier`, `category`, `price`, `eventId`, `lastStep` | Usuário fecha sem pagar (timeout ou navegação) |
| `paywall_dismissed` | `eventId`, `category`, `wayOut` ("talvez_depois" / "fechou_modal") | Clica em "talvez depois" ou fecha |
| `share_link_used` | `eventId` | Convidado abre o link compartilhado |
| `gift_reserved` | `eventId`, `eventType` | Convidado reserva um presente (proxy de valor entregue) |

### Funil principal (PostHog Funnels)

```
event_created
    ↓ (% que adicionam presentes)
gift_added (≥1)
    ↓ (% que terminam de montar)
share_clicked
    ↓ (% que veem paywall)
paywall_shown
    ↓ (% que abrem Pix)
pix_qr_generated
    ↓ (% que pagam)
payment_succeeded
```

Quebre o funil por `category` (premium vs comum) e por `eventType`. Provavelmente casamento converte diferente de aniversário.

### Métricas principais (dashboard)

**Volume:**
- Eventos criados / semana
- Eventos compartilhados / semana (chegaram ao paywall)
- Pagamentos / semana

**Conversão:**
- `share_clicked / event_created` → quão "completo" fica o fluxo grátis
- `payment_succeeded / paywall_shown` → conversão de paywall (a métrica que mais importa)
- `payment_succeeded / event_created` → conversão end-to-end

**Receita:**
- Receita bruta / semana
- ARPU por evento pago
- Mix de tier (% single vs % lifetime) por categoria
- Receita por `eventType`

**Saúde:**
- Tempo médio entre `paywall_shown` e `payment_succeeded`
- Taxa de retorno: % de usuários que viram paywall, saíram, e pagaram depois
- Taxa de reserva (`gift_reserved / share_link_used`) como proxy de valor entregue aos convidados

### Como ler

- **Conversão paywall_shown → payment_succeeded abaixo de 15%:** algo no paywall está quebrado (copy, preço alto, ou bug). Revisar urgente.
- **Conversão entre 15% e 30%:** zona saudável pra produto com paywall single-shot.
- **Conversão acima de 30%:** ótimo, considerar subir preço gradualmente.
- **Mix de vitalício abaixo de 10%:** card do vitalício precisa de mais destaque visual e copy.
- **Mix de vitalício acima de 25%:** excelente, indica que a comunicação multi-evento está pegando.

---

## 8. Roadmap de execução

### Semana 1: instrumentação e comunicação

- Implementar todos os eventos do PostHog listados acima
- Dashboard com funil e métricas de receita
- Enviar email aos 363 usuários atuais avisando da mudança: tom amigável, listas atuais ficam grátis pra sempre, novo paywall vale pra novas listas a partir da data X
- Banner sutil no site avisando do mesmo

### Semana 2: implementação do paywall

- Componente do paywall (visual + copy conforme seção 4)
- Integração Pix (gateway escolhido: Mercado Pago, Asaas, Stripe Pix, etc.)
- Webhook de confirmação de pagamento
- Tela de sucesso pós-pagamento
- Email de "lista esperando" (24h e 7 dias após `paywall_dismissed`)

### Semana 3-6: rodar e medir

- Lançar paywall pra novas listas
- Não mexer em nada por 4 semanas
- Acompanhar dashboard diariamente nas primeiras 2 semanas
- Conversar com 3-5 pagantes e 3-5 que abandonaram (entrevistas curtas via email)

### Semana 7-8: primeira iteração

Decisões a tomar com base nos dados:

- **Se conversão paywall total > 25% em ambas categorias:** testar A/B com preços 20% maiores (R$ 11,90 / R$ 34,90 vs R$ 35,90 / R$ 69,90)
- **Se mix de vitalício < 15%:** redesenhar card do vitalício com destaque maior e refazer copy
- **Se conversão da categoria premium for muito menor que da comum:** revisar copy específica do paywall premium (a percepção de confiança pode estar fraca)
- **Se taxa de retorno após paywall_dismissed for > 20%:** vale a pena reforçar os emails de follow-up

---

## 9. Critérios de sucesso

### 30 dias após lançamento

- Pelo menos 50% dos eventos criados chegam até `share_clicked`
- Conversão `paywall_shown → payment_succeeded` ≥ 15%
- Mix de vitalício ≥ 12% (combinado das duas categorias)
- Zero churn induzido por usuários antigos (porque foram grandfathereds)
- Receita cobrindo custos de Convex + Pix com folga

### 90 dias após lançamento

- Conversão de paywall ≥ 20%
- Mix de vitalício ≥ 18%
- Pelo menos um teste A/B de preço rodado e decidido
- Volume crescendo (tração orgânica + paywall não matou a aquisição)
- ARPU por evento pago ≥ R$ 14 (média ponderada entre tiers e categorias)

---

## 10. Princípios que não devem ser esquecidos

1. **O mywish é um produto emocional, e a monetização precisa respeitar isso.** Toda decisão (visual, copy, fluxo) é avaliada por "isso preserva o carinho do produto?".

2. **A pessoa está pagando pra ter algo bonito pra compartilhar com quem ama.** Esse é o frame mental do comprador. Tudo se desenha em torno disso.

3. **Preço sinaliza valor.** No mercado de casamento, preço baixo demais é desconfiança. R$ 29,90 entrega seriedade onde R$ 9,90 levantaria suspeita.

4. **O vitalício é simples por dentro e segmentado por fora.** Tecnicamente é o mesmo destravamento, comercialmente são dois produtos diferentes vendidos pra dois públicos diferentes. Isso é uma escolha de framing, não desonestidade.

5. **Dados antes de mover preço.** Quatro semanas de operação estável antes de qualquer A/B. Decisão de preço sem dados é teatro.

6. **Honrar quem chegou cedo é bom investimento.** Os 363 atuais viram embaixadores se forem tratados bem nesta transição.
