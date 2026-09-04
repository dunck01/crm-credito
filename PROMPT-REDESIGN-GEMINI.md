# Prompt para Gemini 3.8 Flash — redesign visual do CRM Restituição

Cole o bloco abaixo no Gemini 3.8 Flash com o repositório `crm-credito` aberto. O código já está mobile-first; o trabalho é **só visual / UI**, sem mudar regra de negócio.

---

Você é um diretor de arte + front-end sênior. Transforme o visual deste CRM (Next.js 14 + Tailwind + CSS em `apps/web/src/app/globals.css`) em um produto **fintech contemporâneo** de restituição de crédito/seguros. NÃO é um CRM genérico de vendas. NÃO é o visual “paper/fichário” atual (creme, Inter + Space Mono, cards brancos com borda).

## Produto (não altere a lógica)

CRM interno para operação de **restituição de seguros / crédito**: identificar apólices, contatar cliente, converter, cancelar seguro, receber valores, controlar comissão da empresa e do operador.

Entidades: **Cliente** (pessoa, CPF único) + **vários casos/seguros**. Funil de 8 colunas. Flag “Não contatar”. Agenda de retornos. Dashboard financeiro.

Stack a preservar: Next.js App Router, NextAuth, Prisma, componentes em `apps/web/src/components/crm/*`, APIs em `apps/web/src/app/api/*`. **Não mude** schema, status, regras de cancelamento, CPF único, rotas, auth.

## Conceito visual (obrigatório)

Tema: **“mesa de crédito noturna”** — produto financeiro brasileiro de alta confiança, com energia de fintech 2026, não banco estatal.

Paleta:
- Fundo: charcoal profundo / ink navy (`#070B14` a `#0E1624`), não cinza Bootstrap.
- Superfícies: vidro fosco com borda 1px em ciano-muito-baixo-alpha e highlight interno sutil.
- Acento primário: **verde-lime elétrico** de “valor recuperado / crédito liberado” (`#C8F542` ou similar), usado com parcimônia.
- Acento secundário: **teal de fluxo** (`#2EE6A6`) para WhatsApp/contato e “em andamento”.
- Alerta: coral/âmbar, nunca vermelho-sangue de erro de form genérico.
- Texto: off-white `#E8EDF5` + mute `#8B97AB`.
- Dinheiro sempre em lime ou teal, tabular nums.

Tipografia:
- Display / números / marca: uma grotesk geométrica ou mono condensada distinta (ex.: `Geist`, `IBM Plex Mono`, `Syne`, `Outfit`). Não Space Mono + Inter juntos como está.
- UI: sans humanista contemporânea, tracking um pouco negativo nos títulos.
- Valores em `font-variant-numeric: tabular-nums`.

Forma:
- Raio grande nos shells (20–28px), menor nos chips (999px).
- Kanban: colunas como “trilhos de operação”, não caixas de post-it.
- Cards de caso: mini extrato — nome, seguradora, apólice como “código de crédito”, valor em destaque, retorno como timestamp.
- Modal: sheet com handle no mobile; no desktop, painel 720–880px com header sticky e footer de ações.
- Microdetalhe de “crédito”: thin progress / tick marks no card quando o caso está em Cancelamento ou Pagamento. Sem ilustrações clipart, sem 3D genérico, sem gradiente roxo-IA.

Motion:
- 180–280ms, easing `cubic-bezier(.22,1,.36,1)`.
- Troca de coluna: o card “assenta” com sombra maior.
- Números do dashboard: sem count-up exagerado; apenas fade.

Dark é o **default**. Mantenha o toggle, mas o light mode deve ser um “paper bond” frio (off-white azulado), não o creme atual.

## Mobile-first (já existe — evolua, não desmonte)

Já há:
- `viewport` device-width
- bottom nav (Funil / Lista / Agenda / Números)
- kanban com `scroll-snap`
- modal em sheet no mobile
- tabela vira cards (`.mobile-client-list`)
- filtros em grid 2 colunas
- inputs 16px para não dar zoom no iOS
- safe-area

Você deve **refinar** esses padrões no novo visual: bottom nav com indicador lime, sheet com grabber, colunas snap com padding de peek da próxima coluna, cards de lista com valor à direita.

Breakpoints a respeitar: base mobile → `640` → `768` (some bottom nav, volta switcher) → `1024`.

## Arquivos que pode editar

- `apps/web/src/app/globals.css` (sistema visual)
- `apps/web/src/app/layout.tsx` (fontes)
- `apps/web/src/components/crm/*` (markup/classes, sem mudar fluxo de dados)
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/admin/layout.tsx` e `page.tsx`
- `apps/web/src/app/icon.svg` / `apple-icon.svg` se quiser um mark de “escudo-crédito / apólice”

Não reescreva APIs, Prisma, seed, auth.

## Telas a redesenhar (todas)

1. Login — marca + uma linha: “Restituição de crédito e seguros”. Sem stock de predinho.
2. App `/app` — topbar, busca, filtros, kanban, lista, agenda, dashboard.
3. Modal de cliente/caso — hierarquia: identidade → casos → financeiro → docs → histórico.
4. Equipe e Super Admin — mesmo idioma visual.

## Critérios de aceite

- Continua funcionando: login, funil, modal, filtros, agenda, dashboard, admin.
- Mobile 390px: bottom nav visível, kanban snap, modal sheet, sem overflow horizontal (exceto o board).
- Desktop 1280px: kanban em colunas, modal central.
- Contraste AA no texto principal.
- Sem emojis de enfeite, sem “AI slop” (gradiente roxo, glassmorphism excessivo, orbs enormes).
- O produto deve parecer **crédito / restituição**, não Trello, não Notion, não CRM de açougue.

Implemente o CSS e os componentes. Depois verifique login e `/app` em 390px e 1280px.

---
