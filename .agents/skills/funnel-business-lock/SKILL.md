---
name: funnel-business-lock
description: >-
  Locks CRM funnel and immutable business rules: 8 CaseStatus values, cancellationConfirmedAt gate
  to PAGAMENTO/FINALIZADO, do-not-contact out of the contact queue, CPF unique per tenant, Prisma
  schema and NextAuth untouched unless explicitly requested. Use when changing case status, kanban,
  constants, Prisma, auth, client flags, or when asked about funil, transições, status, schema lock,
  or /funnel-business-lock.
---

# Funnel Business Lock

Não alterar schema Prisma, rotas de autenticação/NextAuth, datasource, nem o conjunto de status do funil **sem solicitação explícita do usuário nesta conversa**.

Fonte de verdade (ler, não copiar listas para outro arquivo):

- Funil: `apps/web/src/lib/constants.ts` (`CASE_STAGES`) e enum `CaseStatus` em `packages/database/prisma/schema.prisma`
- Gate de pagamento: `apps/web/src/app/api/cases/[id]/route.ts`
- Fila de abordagem: `CONTACT_COLUMNS` + `doNotContact` em `CrmApp.tsx`
- Auth: `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- CPF: `@@unique([tenantId, cpf])` no model `Client`

`Escopo Pedro.md` descreve um funil antigo (15 status de caso). O MVP é o de 8 status em `CASE_STAGES`. Não “alinhar” o código ao escopo antigo.

---

## Procedimento (Runbook)

### 1. Superfícies imutáveis

Sem pedido explícito, **não** edite:

- `packages/database/prisma/schema.prisma` (models, enums, unique, datasource)
- `apps/web/src/lib/auth.ts` e `apps/web/src/app/api/auth/**`
- Chaves de `CASE_STAGES` / `CaseStatus` (adicionar, remover, renomear, reordenar o significado)

Se a tarefa pedir UI/copy, mude só `title` se for estritamente necessário e o `key` permanecer igual. Preferível não mexer.

Contrato (`CONTRACT_STATUSES`) e tipo de documento (`DOCUMENT_TYPES`) não são etapas do funil. Não fundir com `CaseStatus`.

### 2. Funil de 8 status

Um cliente, vários casos. Status vive no **caso**, não no cliente.

Chaves atuais: `AGUARDANDO_CONTATO` → `AGUARDANDO_RESPOSTA` → `NAO_ACEITOU` → `CONVERTIDO` → `CANCELAMENTO` → `PAGAMENTO` → `FINALIZADO`, mais `PERDIDO`.

- Caso novo: default `AGUARDANDO_CONTATO` (já no schema e nos POSTs).
- `NAO_ACEITOU` permanece na base (não arquivar/apagar por recusa).
- `VALID_STATUS` nas APIs deve derivar de `CASE_STAGES`, não de um set paralelo inventado.
- UI (kanban, filtros, dashboard) itera `CASE_STAGES`. Não hardcode a lista de 8 strings num quarto lugar.

### 3. Transição Cancelamento → Pagamento / Finalizado

Em `PUT /api/cases/[id]`, avançar para `PAGAMENTO` ou `FINALIZADO` a partir de status que **não** é já `PAGAMENTO`/`FINALIZADO` exige `cancellationConfirmedAt` (body ou valor já persistido). Sem data: **400** com `Confirme o cancelamento do seguro antes de avançar para pagamento.`

Não enfraquecer esse gate no client (kanban/modal) sem o mesmo check no servidor. Não substituir a data por um boolean solto. Campos de cancelamento/pagamento/comissão já existem em `InsuranceCase` — não crie status novos para “cliente recebeu” ou “empresa paga”.

### 4. Não contatar e fila

- `doNotContact` + `doNotContactReason` (`DO_NOT_CONTACT_REASONS`) no **cliente**.
- Fora do filtro `nao-contatar`, casos em `CONTACT_COLUMNS` (`AGUARDANDO_CONTATO`, `AGUARDANDO_RESPOSTA`) de cliente marcado **não** entram na fila de abordagem (`cardsByStatus` em `CrmApp.tsx`).
- Não misturar “Não contatar” com `PERDIDO` nem com `isArchived`. Arquivo é outro flag.

### 5. CPF e cadastro

- CPF/CNPJ: 11 ou 14 dígitos (`digitsOnly`). Único por tenant.
- Não afrouxar a unique. Não permitir o mesmo CPF em duas carteiras da mesma mesa.
- Clash e PII: skill `tenant-wallet-acl`.

### 6. Quality gate

`npx tsc --noEmit --project apps/web/tsconfig.json` — 0 erros.

Se o usuário **pediu** mudar schema/funil/auth, confirme o pedido no relatório e altere só o que foi pedido (migration/enum + `CASE_STAGES` + `VALID_STATUS` + UI que itera as constantes, juntos).

---

## Relatório

```markdown
### Funil / lock: [arquivo]

#### 1. Superfícies imutáveis
- [Status: ✅ Intactas | ⚠️ Pedido explícito | ❌ Alteração sem pedido]
- schema, NextAuth, chaves de CaseStatus.

#### 2. Transições e fila
- [Status: ✅ Conforme | ⚠️ Gate/fila quebrados]
- cancellationConfirmedAt, doNotContact vs CONTACT_COLUMNS, default AGUARDANDO_CONTATO.

#### 3. Fonte única
- [Status: ✅ CASE_STAGES | ⚠️ Lista duplicada]
- API/UI sem set paralelo de status.

#### 4. Correção
- Diff mínimo. Sem expandir para o funil de 15 status do Escopo Pedro.
```
