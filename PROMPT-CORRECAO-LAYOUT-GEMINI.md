# Prompt para Gemini 3.8 Flash — correção de layout / diagramação

Cole o bloco abaixo no Gemini com o repositório `crm-credito` aberto. **Não mude regra de negócio, APIs, Prisma, status do funil, CPF único nem auth.** Trabalho é só **espaçamento, alinhamento, overflow e consistência visual**.

O CRM já é mobile-first (bottom nav, kanban snap, lista em cards, modal sheet). Preserve isso. Dark é o default (`:root`); light é `body.light-mode`.

---

Você é um UI engineer sênior. Audite e corrija a diagramação do CRM Restituição (Next.js 14, Tailwind, CSS em `apps/web/src/app/globals.css`). O visual fintech (navy, lime `#C8F542`, teal `#2EE6A6`) deve permanecer. O que está errado é **layout**, não o conceito.

## Bugs de layout para corrigir (obrigatório)

### 1. Card do kanban — WhatsApp fora da grade
Em `KanbanBoard.tsx` o botão WA está num flex ao lado do nome, mas em `globals.css` `.wa-quick-btn` pode ainda estar `position: absolute` e `.card .name` com `padding-right: 50px` (resto do layout antigo).

**Correto:** WA no fluxo (`position: static`, `flex-shrink: 0`). Nome sem padding-right extra, com `min-width: 0` e truncate se precisar. No header do modal (`.modal-header-sticky .wa-quick-btn`) também estático, alinhado com o X.

Verificar em 390px e 1280px: nome e WA na mesma linha, sem sobreposição, sem buraco de 50px.

### 2. Filtros no celular — 5º select cortado
`.filters-bar` é grid 2 colunas. São 5 `<select>`. O último (“Todas as seguradoras”) fica numa célula e o texto corta.

**Correto:** no mobile (`<768px`) o último select ocupa a linha inteira (`grid-column: 1 / -1`). Em desktop volta a `display: flex; flex-wrap: wrap` com `width: auto`.

### 3. Dashboard — 9 KPIs numa única linha
Não use `lg:grid-cols-9`. Em ~1280px cada card fica ~120px e o rótulo trunca.

**Correto:** `grid-cols-2 sm:grid-cols-3 xl:grid-cols-5` (quebra natural). Hero financeiro já está `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — mantenha. Padding interno uniforme (não misturar `p-3` / `p-5` sem escala).

Arquivo: `apps/web/src/components/crm/DashboardView.tsx`.

### 4. Modal — ritmo vertical duplicado
`.row2` / `.row3` no desktop têm `gap: 12px` **e** cada `.field` tem `margin-bottom: 14px`. O espaço entre campos fica irregular (maior entre linhas do grid do que o gap).

**Correto:**
- Mobile: campos empilhados (`grid-template-columns: 1fr`), `margin-bottom` só no `.field`.
- `≥768px`: `.row2 .field, .row3 .field { margin-bottom: 0 }` e o espaço vem só do `gap` do grid.
- `.row3` em `≥1024px`: 3 colunas.

### 5. Modal no celular — footer e header apertados
`.modal-actions` é flex com texto de CPF à esquerda e dois botões à direita. Em 390px o CPF compete com “Cancelar / Salvar”.

**Correto:**
- Mobile: footer em coluna (botões full-width, CPF acima ou omitido no mobile).
- Header sticky: título com `min-width: 0; truncate`; ações (WhatsApp + X) não encolhem; `align-items: flex-start; gap: 12px`.
- `.modal-body` é a única área com scroll (`overflow-y: auto; flex: 1; min-height: 0`). `.modal` é flex column, `overflow: hidden`.
- Seções internas (`p-4` dentro do `modal-body`) não somar padding excessivo: use `p-3` no mobile e `p-4` no desktop, um único nível de box por bloco (Identidade / Casos / Financeiro / Docs / Histórico).

### 6. Histórico — input + botão na mesma linha
Em `ClientModal.tsx` o campo de nota e o botão “Registrar” estão `flex gap-2`. No mobile o botão espreme o input.

**Correto:** mobile empilha (`flex-col`); `≥640px` lado a lado. Input `flex-1; min-width: 0`. Botão não menor que 44px de altura no touch.

### 7. Classes Tailwind inválidas / tokens quebrados
- `p-4.5` **não existe** no Tailwind padrão (aparece no admin). Trocar por `p-4` ou `p-[18px]`.
- Admin usa `text-fintech-ink`, `bg-fintech-lime`, etc. Esses tokens em `tailwind.config.js` são **hex fixos do dark**. No `body.light-mode` o admin fica com texto claro em fundo claro (ou o contrário).

**Correto:** cores de UI via CSS variables (`text-[var(--ink)]`, `bg-[var(--accent-lime)]`, `text-[var(--ink-soft)]`). Hardcoded `text-sky-400`, `text-emerald-400`, `text-rose-400`, `bg-sky-500/10` no CrmApp, Kanban, TableView, TeamModal, ClientModal, AgendaView **não mudam no light**. Substituir por tokens (`var(--c-primeiro)`, `var(--danger)`, `var(--accent-teal)`).

### 8. Tema claro vs `html.dark`
`layout.tsx` tem `<html className="dark">`. O app troca tema com `body.light-mode`. Classes `dark:` do Tailwind e `html.dark` **não acompanham** o toggle.

**Correto:** ou remove `className="dark"` do `<html>` e não use `dark:` do Tailwind, ou sincronize `document.documentElement.classList.toggle('dark', isDark)` no mesmo `toggleTheme` de `CrmApp.tsx`. Um sistema só.

### 9. Tabela desktop
7 colunas em `.data-table`. Garantir `min-width` na tabela (~900px) dentro de container com `overflow-x: auto`, para não esmagar células. Não esconder a tabela no mobile — a lista `.mobile-client-list` já substitui (`display: none` na tabela `<768px`).

### 10. Admin
Alinhar `/admin` ao mesmo idioma visual do `/app` (não um mix de `fintech-*` hex + `var(--surface-*)`). Header quebra em coluna no mobile (já tem `.admin-header`). Tabela com scroll horizontal. Modal de criar empresa: sheet no mobile (já existe `items-end sm:items-center`); grids `grid-cols-1 sm:grid-cols-2`.

## Checklist visual (390px e 1280px)

- [ ] Nenhum overflow horizontal no `body` (exceto `.board` e `.admin-table-wrap` / `.table-view-container`).
- [ ] Bottom nav não cobre o último card: padding-bottom do `.wrap` inclui a altura da nav + safe-area.
- [ ] Kanban: coluna `min(78vw–82vw, ~300px)`, snap, peek da próxima coluna visível.
- [ ] Login: card centralizado, CTA lime sem estourar a largura, campos 16px no mobile.
- [ ] Contraste AA no texto principal (lime só em acento/CTA, não em parágrafo longo).
- [ ] Light mode: texto `--ink` escuro em `--paper` claro; admin incluído.
- [ ] Sem `p-4.5`, sem `position: absolute` no WA do card, sem `grid-cols-9`.

## Arquivos permitidos

`apps/web/src/app/globals.css`
`apps/web/tailwind.config.js`
`apps/web/src/app/layout.tsx`
`apps/web/src/components/crm/*`
`apps/web/src/app/(auth)/login/page.tsx`
`apps/web/src/app/admin/layout.tsx`
`apps/web/src/app/admin/page.tsx`

Não altere `packages/database`, rotas de API, seed, auth.

Quando terminar, descreva cada bug da lista (1–10) como corrigido ou N/A, com o arquivo tocado.

---
