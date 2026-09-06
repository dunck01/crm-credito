---
name: tenant-wallet-acl
description: >-
  Audits and enforces wallet ACL and LGPD isolation in the CRM: tenantId + assignedUserId ownership,
  no PII leak across sellers, 404 on foreign records, CPF clash without payload, admin aggregates only.
  Use when touching clients, cases, documents, history, session helpers, tenant stats/users, wallet
  reassignment, serializeClient, or when asked to audit ACL, LGPD, carteira, isolamento, PII, or /tenant-wallet-acl.
---

# Tenant Wallet ACL

Regra de ouro: PII de cliente (e tudo que pende dele) só é lido, listado, alterado ou apagado se `client.assignedUserId === session.user.id` **e** `client.tenantId === session.tenantId`. Vale para `TENANT_ADMIN` e `SUPER_ADMIN` em `/app`. Admin gerencia equipe e vê **números**, não a carteira alheia.

Fonte de verdade (não reimplementar helpers):

- `apps/web/src/lib/session.ts` — `requireTenantUser`, `ownsClient`, `canManageTeam`, `canSeeTeamAggregates`
- `apps/web/src/lib/wallet.ts` — absorção de carteira na saída de membro / órfãos
- `packages/database/prisma/schema.prisma` — `@@unique([tenantId, cpf])`

Histórico do requisito: `PROMPT-LGPD-ISOLAMENTO-GEMINI.md` (o código já aplica o isolamento; o prompt descreve o buraco antigo).

---

## Procedimento (Runbook)

Quando ativado, execute as etapas abaixo no código tocado **e** nos call sites vizinhos.

### 1. Superfície de dados pessoais

PII de cliente inclui: nome, CPF, telefone, e-mail, cidade/UF, obs, apólice, valores individuais, documentos, histórico, ids de cliente/caso.

Toda rota em `apps/web/src/app/api/clients/**` e `apps/web/src/app/api/cases/**` deve:

1. `requireTenantUser()` → 401 se falhar.
2. Filtrar por `tenantId: user.tenantId`.
3. Exigir dono: `assignedUserId: user.id` na listagem, ou `ownsClient(user, client)` no registro. Caso sempre via `include: { client: true }` (ou equivalente) antes do check.
4. Recurso existente mas de outro vendedor (ou outro tenant) → **404** genérico (`Cliente não encontrado.` / `Caso não encontrado.`). Nunca 403 que confirme existência.

Não recriar `canSeeAllClients`. Role **não** bypassa carteira.

### 2. Lista, busca e cadastro

`GET /api/clients`: `where` **sempre** `tenantId` + `assignedUserId: user.id`. Query `?cpf=` idem. Não aceitar `?assignedUserId=` de terceiro.

`POST /api/clients`:

- `assignedUserId` = `user.id`. Ignore `body.assignedUserId`.
- CPF único na mesa (`@@unique([tenantId, cpf])`). **Não** mude a unique para incluir vendedor.
- Clash com o próprio: 409 **com** `client` serializado (`Este CPF já está cadastrado na sua carteira.`).
- Clash com outro: 409 **sem** campo `client`, mensagem neutra (`Este CPF já está cadastrado nesta mesa.`). Sem nome, telefone, id, máscara de CPF.

`PUT /api/clients/[id]`: não copie `assignedUserId` do body. Clash de CPF: 409 sem serializar o outro.

UI (`CrmApp`, `ClientModal`, dashboard): só opera na lista já isolada pela API. Sem filtro “todos os responsáveis”, sem select que transfere carteira.

### 3. Admin: números, não pessoas

- Equipe: `GET/POST/PUT/DELETE /api/tenant/users` só com `canManageTeam` (403 para operador).
- Mesa: `GET /api/tenant/stats` só com `canSeeTeamAggregates`. Payload = `SellerTeamStat` em `apps/web/src/lib/types.ts` (id/nome do **vendedor** + contagens e somas). Proibido: PII ou id de cliente/caso.
- `/api/admin/tenants`: `_count` + users da empresa. Sem `include: { clients: true }`.

### 4. Exceção: absorção de carteira (não é “ver todos”)

Únicos caminhos que mudam `assignedUserId` de cliente alheio:

- `DELETE /api/tenant/users` → `reassignClients` para o admin que removeu o membro
- `POST /api/tenant/wallet/claim-orphans` → `claimOrphanClients` (`assignedUserId: null` → o admin)

Não use esses helpers para impersonation, “entrar como”, ou filtro de carteira no `/app`. Não permita transferência ad hoc via PUT de cliente.

### 5. Documentos, logs, serialização

- Upload/download/delete de documento: mesmo `ownsClient` no caso. Limite `MAX_UPLOAD_BYTES`.
- `serializeClient` só do registro **próprio**.
- Não logue CPF, telefone ou e-mail de cliente em `console` nem em mensagem de erro.

### 6. Quality gate

`npx tsc --noEmit --project apps/web/tsconfig.json` — 0 erros.

---

## Relatório

```markdown
### ACL Carteira: [rota / arquivo]

#### 1. Ownership
- [Status: ✅ Isolado | ⚠️ Furo | ❌ Bypass]
- tenantId, ownsClient / assignedUserId, 404 vs 403.

#### 2. PII
- [Status: ✅ Contido | ⚠️ Vazamento]
- 409 de CPF, serializeClient, stats, logs.

#### 3. Admin vs carteira
- [Status: ✅ Agregados | ⚠️ Papel bypassa]
- stats/users vs lista de clientes.

#### 4. Correção
- Diff mínimo nos call sites. Sem `canSeeAllClients`.
```
