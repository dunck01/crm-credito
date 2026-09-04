# Instruções e Regras do Workspace — CRM Restituição

Este arquivo define as regras e convenções que todo agente ou desenvolvedor deve seguir ao trabalhar no repositório `crm-credito`.

## Escopo e Arquitetura do Produto
- **Produto:** CRM interno de restituição de créditos/seguros (Fintech).
- **Core Stack:** Next.js 14 (App Router), React, Tailwind CSS, Prisma, NextAuth, TypeScript.
- **Identidade Visual:** Mesa de Crédito Noturna (Navy/Charcoal, Lime `#C8F542`, Teal `#2EE6A6`, Coral/Danger, Paper Bond Cold para light mode).
- **Regras Imutáveis de Negócio:** Não alterar schema do banco, Prisma, rotas de autenticação, NextAuth ou status do funil sem solicitação explícita.

## Regras de Qualidade React & Next.js (Doctor Rules)
1. **Reutilização de Componentes:** Antes de criar qualquer novo JSX, consulte `apps/web/src/components/` e `apps/web/src/components/crm/`. Reutilize modais, botões (`.btn`, `.btn-primary`, `.btn-ghost`), inputs (`.field`), badges de status (`segment-tag`) e utilitários de formatação (`formatCpf`, `formatPhone`, `fmtMoney`).
2. **Next.js 14 App Router:** Mantenha Server Components como padrão. Use `'use client'` estritamente nas folhas da árvore com interatividade real.
3. **Padrões de Estado:** Calcule valores derivados inline ou via `useMemo`. Não sincronize estados locais usando `useEffect`. Declare todas as dependências nos hooks.
4. **Design Tokens:** Proibido hexadecimais fixos ou classes de cores não dinâmicas nos componentes. Use sempre as variáveis CSS semânticas (`var(--ink)`, `var(--paper)`, `var(--line)`, `var(--card-glass)`, etc.).
5. **Mobile-First:** Inputs com 16px no mobile (`text-base sm:text-sm`), touch targets de no mínimo 44px, sem overflow horizontal no body.
6. **Verificação Estática:** Sempre execute `npx tsc --noEmit` em `apps/web` antes de concluir qualquer alteração.

Para diretrizes detalhadas, consulte [.agents/rules/react-nextjs-doctor.md](file:///C:/Projetos/GitHub/crm-credito/.agents/rules/react-nextjs-doctor.md).
