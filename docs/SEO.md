Perfeito. Tenho tudo que preciso. Vou montar um plano completo e bem estruturado pra você.

---

# Plano de SEO + AI SEO para mywish.com.br

Vou dividir em **3 frentes**: Fundação técnica, AI SEO (GEO), e SEO tradicional. A ordem importa — a base técnica alimenta tudo o resto.

---

## 🏗️ FASE 1 — Fundação Técnica (Semana 1–2)

Isso é pré-requisito pra tudo. Sem isso, nem o Google nem o ChatGPT te acham direito.

### robots.txt — libere os bots de IA
Adicione explicitamente no seu `robots.txt`:

```text
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: https://mywish.com.br/sitemap.xml
```

> Muitos sites bloqueiam esses bots sem querer via Cloudflare ou configurações de segurança. Confira seus logs de servidor pra garantir que eles estão chegando.

### Sitemap XML
- Garanta que seu `sitemap.xml` existe e está atualizado
- Submeta no **Google Search Console** e também no **Bing Webmaster Tools** (crucial — o ChatGPT usa o índice do Bing para busca em tempo real)

### Performance (Core Web Vitals)
- LCP < 2.5s, INP < 200ms, CLS < 0.1
- Use o **PageSpeed Insights** pra medir
- Imagens em WebP/AVIF, lazy loading, CDN pra assets estáticos

### HTTPS + URLs limpas
- URLs descritivas: `/lista/aniversario` não `/?id=123`
- Canonical tags em todas as páginas
- Sem chains de redirect (A→B→C; vá direto A→C)

---

## 🤖 FASE 2 — AI SEO / GEO (Semana 2–4)

Aqui é onde você ganha visibilidade no ChatGPT, Perplexity, Google AI Overviews, etc.

### 1. llms.txt
Crie o arquivo `https://mywish.com.br/llms.txt` — é o "mapa do site" para IAs, em Markdown:

```text
# MyWish — Lista de Presentes Online

> MyWish é uma plataforma brasileira para criar e compartilhar listas de presentes para qualquer ocasião: aniversários, casamentos, bodas, chá de bebê, bar mitzvah e muito mais. Design artesanal e leve, sem foco comercial.

## Páginas principais
- [Criar lista de presentes](https://mywish.com.br/criar) — Crie sua lista gratuita em minutos
- [Como funciona](https://mywish.com.br/como-funciona) — Guia passo a passo
- [Ocasiões](https://mywish.com.br/ocasioes) — Listas para cada tipo de evento
- [FAQ](https://mywish.com.br/faq) — Perguntas frequentes

## Sobre
MyWish foi criado para tornar o processo de presentear mais simples e bonito, conectando pessoas através de desejos compartilhados.
```

> **Nota honesta:** nenhum provedor de IA confirma oficialmente suportar `llms.txt`, mas é de baixo custo, pode ajudar, e provavelmente se tornará padrão. Vale fazer.

### 2. Schema Markup (JSON-LD) — o mais importante

Páginas com Schema completo têm **3.7x mais chance de serem citadas** por IAs.

**Na homepage e páginas principais**, implemente `Organization`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MyWish",
  "url": "https://mywish.com.br",
  "logo": "https://mywish.com.br/logo.png",
  "description": "Plataforma para criar listas de presentes para aniversários, casamentos, bodas e outras ocasiões especiais.",
  "sameAs": [
    "https://instagram.com/mywishbr",
    "https://tiktok.com/@mywishbr"
  ]
}
</script>
```

**Nas páginas de FAQ** (crie uma se não tiver), use `FAQPage` — é ouro puro para IAs:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Como criar uma lista de presentes online gratuita?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No MyWish, você cria sua lista em minutos: acesse mywish.com.br, clique em 'Criar lista', escolha a ocasião, adicione seus itens desejados e compartilhe o link com amigos e família. É gratuito e sem complicação."
      }
    },
    {
      "@type": "Question",
      "name": "Posso criar lista de presentes para casamento?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim! O MyWish suporta listas para casamentos, bodas, aniversários, chá de bebê, bar mitzvah e qualquer outra ocasião especial."
      }
    }
  ]
}
</script>
```

**Em artigos do blog** (ver fase 3), use `Article` com `dateModified` atualizado — frescor do conteúdo gera **3.2x mais citações**.

### 3. Estrutura de conteúdo para IAs — "Answer-First"

As IAs fragmentam seu conteúdo em blocos de 200–300 palavras. Cada parágrafo precisa fazer sentido sozinho (o chamado "Island Test").

**Regras práticas:**
- Comece cada seção com a resposta direta em 40–60 palavras
- Parágrafos curtos (2–4 frases)
- Use H2/H3 no formato de pergunta: "Como criar uma lista de presentes para aniversário?"
- Listas numeradas para processos ("como usar")
- Tabelas para comparações
- Evite começar parágrafos com "Isso", "Ele", "Eles" — use o substantivo explícito

### 4. Seja indexado no Bing (crítico para ChatGPT)

O ChatGPT usa o índice do **Bing** para busca em tempo real. Se você não está no Bing, não aparece no ChatGPT Search.

- Cadastre-se no **Bing Webmaster Tools**: bing.com/webmasters
- Submeta seu sitemap lá também
- Verifique se suas páginas estão indexadas buscando `site:mywish.com.br` no Bing

---

## 📝 FASE 3 — SEO Tradicional + Conteúdo (Mês 1–3)

SEO tradicional continua sendo a base. **76% das citações de IA vêm de páginas que já rankeiam no top 10 do Google.** Ou seja: sem SEO clássico, o AI SEO não funciona.

### Arquitetura de conteúdo em clusters

Crie páginas para cada ocasião (são suas "money pages"):

```
/lista-de-presentes/
├── /aniversario/
├── /casamento/
├── /cha-de-bebe/
├── /bodas/
├── /bar-mitzvah/
├── /formatura/
└── /natal/
```

Cada página dessas deve responder: "como montar uma lista de presentes para X", "o que pedir de presente para X", "ideias de presente para X". São as queries exatas que as pessoas fazem no Google E no ChatGPT.

### Blog — seu motor de autoridade

Publique 2–4 artigos por mês respondendo perguntas reais:

**Exemplos de títulos (formato pergunta = melhor para IA):**
- "Como montar uma lista de presentes de casamento: guia completo"
- "O que pedir de presente de aniversário? 40 ideias para todas as idades"
- "Lista de presentes online vs presencial: qual é melhor?"
- "Como compartilhar lista de presentes com convidados pelo WhatsApp"
- "Presentes para bodas: ideias por tipo (papel, prata, ouro...)"

**Estrutura de cada artigo:**
1. Resposta direta no 1º parágrafo (40–60 palavras)
2. H2/H3 em formato de pergunta
3. FAQPage schema no final
4. Data de publicação e atualização visíveis
5. Atualize a cada 30 dias se possível (frescor = mais citações de IA)

### On-page SEO básico

Para cada página:
- **Title tag:** `[Keyword principal] | MyWish` (50–60 caracteres)
- **Meta description:** 150–160 caracteres, resposta direta + CTA
- **H1 único** por página
- **URL limpa e descritiva**
- **Alt text** em todas as imagens (descreva o conteúdo, não "img001")
- **Links internos** entre páginas relacionadas

### Google Search Console

- Configure e monitore semanalmente
- Veja quais queries geram impressões
- Priorize páginas com muitas impressões mas pouco CTR (ajuste title e meta description)

---

## 📣 FASE 4 — Autoridade e Menções (Mês 2–6)

Para o ChatGPT te citar com frequência, seu domínio precisa ter autoridade reconhecida por múltiplas fontes. As IAs cruzam referências.

### Link building e menções

- **Guest posts** em blogs de lifestyle, casamento, maternidade, festas
- **Parcerias** com influenciadores de casamento/festas no Instagram — peça que mencionem `mywish.com.br` (menção de texto já conta)
- **Press releases** em portais como Estadão, Veja, etc. (mesmo pequenos posts de "startup brasileira lança...")
- **Cadastro** em diretórios brasileiros: Startup SC, Cubo, etc.
- **Reddit e fóruns**: participe de r/brasil, r/relacionamentos, r/casamentos (internacional) respondendo dúvidas sobre listas de presentes e mencionando o site naturalmente

### Wikipedia e fontes de autoridade

O ChatGPT cita Wikipedia em **47.9%** das respostas. Você provavelmente não vai conseguir uma página própria, mas pode tentar aparecer em artigos relacionados (ex: artigos sobre "lista de casamento", "chá de bebê").

---

## 📊 FASE 5 — Monitoramento

### Tráfego de IA no GA4

Crie um segmento customizado no GA4 filtrando referrals de:
- `chatgpt.com`
- `chat.openai.com`
- `perplexity.ai`
- `bing.com` (parte pode vir via Copilot)

Isso te diz exatamente quanto tráfego vem de IA — como você já percebeu que é relevante.

### Monitoramento manual de citações (gratuito)

Toda semana, faça essas buscas no ChatGPT:
- "Qual site posso usar para criar lista de presentes online no Brasil?"
- "Como criar lista de presentes de casamento online?"
- "Melhor lista de desejos online brasil"

Anote se você é mencionado, em que posição, e o que os concorrentes falam. Isso é seu "Share of Voice" em IA.

### Ferramentas pagas (quando escalar)
- **Semrush AI Visibility Toolkit**
- **OmniSEO** (monitora citações em ChatGPT, Perplexity, etc.)
- **Ahrefs** (backlinks + keyword research)

---

## 🗓️ Resumo do Cronograma

| Semana | O que fazer |
|--------|------------|
| 1 | robots.txt, sitemap, Bing Webmaster Tools, PageSpeed |
| 2 | Schema Organization + FAQPage, llms.txt, canonical tags |
| 3–4 | Páginas de ocasião (/casamento, /aniversario...), FAQ pública |
| Mês 2 | Blog: primeiros 4 artigos, links internos, GA4 configurado |
| Mês 3+ | Link building, parcerias, mais conteúdo, monitoramento mensal |

---

O domínio `mywish.com.br` é excelente — curto, memorável, .com.br pesa bem para SEO local. O grande trabalho agora é construir conteúdo e autoridade em cima dessa base técnica. Quer ajuda com algum passo específico, como gerar os schemas, rascunhar artigos ou estruturar as páginas de ocasião?