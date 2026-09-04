# Prompt para Gemini 3.8 Flash — LGPD + isolamento de carteira

Cole o bloco abaixo no Gemini com o repositório `crm-credito` aberto. **Não mude visual, tema, mobile-first, funil de 8 status, deploy Vercel, Prisma datasource nem NextAuth credentials.** Trabalho é **ACL no servidor + UI que deixa de vazar PII**.

Contexto: mesa de restituição de seguros. Cada vendedor compete com os outros **e com o admin da mesa**. Ninguém pode ver dados pessoais de cliente que não seja da **própria carteira**. O máximo permitido entre pessoas é **número** (contagem, soma, ranking).

---

Você é um engenheiro sênior de backend/ACL (Next.js 14 App Router, Prisma, NextAuth). Implemente isolamento estrito de dados pessoais (LGPD) neste CRM. A regra de ouro:

> Um registro de cliente (e tudo que pende dele: casos, documentos, histórico, CPF, telefone, e-mail, cidade, apólice, valores individuais, observações) só pode ser lido, listado, alterado ou apagado pelo usuário cujo `id` é igual a `Client.assignedUserId`. **Isso vale também para `TENANT_ADMIN` e `SUPER_ADMIN` quando estiverem no `/app`.** Papel de admin **não** é “ver a carteira dos outros”. Admin gerencia equipe e vê **agregados**.

## Por que o código atual está errado

`canSeeAllClients(role)` em `apps/web/src/lib/session.ts` é só um alias de `isAdminRole`. Em todo o backend, admin bypassa `assignedUserId`. Isso é o buraco.

Arquivos que usam esse bypass hoje:

- `apps/web/src/lib/session.ts` — `canSeeAllClients`
- `apps/web/src/app/api/clients/route.ts` — GET lista o tenant inteiro se admin; POST 409 devolve `serializeClient(existing)` de **qualquer** carteira
- `apps/web/src/app/api/clients/[id]/route.ts` — `loadOwnedClient` libera admin; PUT permite `assignedUserId`; DELETE só admin, em qualquer cliente
- `apps/web/src/app/api/clients/[id]/cases/route.ts`
- `apps/web/src/app/api/clients/[id]/history/route.ts`
- `apps/web/src/app/api/cases/[id]/route.ts` — inclusive DELETE de caso só admin, sem checar dono de forma estrita
- `apps/web/src/app/api/cases/[id]/documents/route.ts`
- `apps/web/src/app/api/cases/[id]/documents/[docId]/route.ts`

UI que assume “admin vê tudo”:

- `apps/web/src/components/crm/CrmApp.tsx` — filtro “Todos os responsáveis” / carteira de outro vendedor (`assignedFilter`)
- `apps/web/src/components/crm/ClientModal.tsx` — select “Operador Responsável” habilitado para admin (transferência = ver/roubar carteira); `lookupCpf` chama `GET /api/clients?cpf=`
- `apps/web/src/components/crm/DashboardView.tsx` — KPIs calculados no cliente a partir da lista; se a lista vier completa, o admin vê volume financeiro da concorrência **e** os nomes no kanban/tabela
- `GET /api/tenant/users` — qualquer operador autenticado recebe e-mail de toda a equipe (não é PII de cliente, mas minimize: e-mail só para quem gerencia equipe)

`/admin` (SUPER_ADMIN) já devolve `_count.clients` por tenant — isso é número, pode ficar. **Não** passe a listar clientes lá.

## Regras de negócio (obrigatório)

### 1. Carteira = `assignedUserId`

- CRUD de cliente/caso/documento/histórico: somente se `client.assignedUserId === session.user.id` **e** `client.tenantId === session.tenantId`.
- Não existe “ver todos” por role.
- Cliente novo **sempre** nasce com `assignedUserId = session.user.id`. Ignore `body.assignedUserId`. Não permita transferir carteira (nem admin). Competição: quem cadastrou, dono.
- 404 genérico se o id existir mas for de outro vendedor (não use 403 com texto “não é da sua carteira” em GET por id — isso confirma existência). Preferível: `404 Cliente não encontrado.`

Substitua `canSeeAllClients` por helpers claros, por exemplo:

```ts
export function ownsClient(user: { id: string }, client: { assignedUserId: string | null }) {
  return client.assignedUserId === user.id;
}

export function canManageTeam(role?: string | null) {
  return role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN';
}

export function canSeeTeamAggregates(role?: string | null) {
  return canManageTeam(role);
}
```

Não deixe `canSeeAllClients` vivo com o significado antigo. Se precisar manter o nome, faça-o **sempre retornar false** — melhor apagar e corrigir call sites.

### 2. Lista e busca

`GET /api/clients`:

- `where` **sempre** inclui `tenantId` + `assignedUserId: user.id`.
- Query `?cpf=` também filtra pela carteira do usuário. Nunca devolva o cliente de outro vendedor, mesmo sabendo o CPF.
- Não aceite `?assignedUserId=` de outro usuário para “espiar”.

Filtro client-side `assignedFilter` em `CrmApp.tsx`: **remover**. Kanban, tabela, agenda e busca só operam na lista já isolada pela API. Dashboard pessoal idem (números da **minha** carteira).

### 3. CPF único na mesa, sem vazar PII (LGPD + competição)

Mantenha `@@unique([tenantId, cpf])` no Prisma. Um CPF só pode existir uma vez na mesa (evita dois vendedores processarem a mesma restituição).

O que está errado hoje no `POST /api/clients`:

```ts
if (existing) {
  return NextResponse.json(
    { error: 'Já existe um cliente com este CPF.', client: serializeClient(existing) },
    { status: 409 }
  );
}
```

Isso entrega nome, telefone, casos e documentos do concorrente.

**Correto:**

- Se `existing.assignedUserId === user.id`: 409 com o próprio cliente (ou mensagem “este CPF já está na sua carteira”) — o vendedor pode abrir o registro **dele**.
- Se o CPF é de **outro** vendedor: 409 **sem** campo `client`. Mensagem neutra: `Este CPF já está cadastrado nesta mesa.` Não diga o nome do dono, não confirme telefone, não devolva id.
- PUT que troca CPF: mesma regra no clash (não serialize o outro).
- `lookupCpf` no modal: se 409 sem payload, só mostre o aviso neutro. Se for o próprio, pode avisar “já está na sua carteira”.

Não mude a unique para `(tenantId, assignedUserId, cpf)` — duplicar o mesmo CPF em duas carteiras é pior para o negócio.

### 4. Admin vê números, não pessoas

TENANT_ADMIN continua:

- Abrindo **Equipe** (`TeamModal`) e `POST/PUT/DELETE /api/tenant/users` (já protegido).
- Vendo um **ranking/agregado** da mesa.

Crie `GET /api/tenant/stats` (só `canSeeTeamAggregates`):

Por vendedor do tenant, **somente**:

- `userId`, `name` (nome do **vendedor**, não do cliente)
- `clientsCount`
- `casesCount`
- contagem por `CaseStatus`
- somas: `insuranceValue`, `receivedClientAmount`, `companyAmount`, `myCommission`
- `doNotContactCount`

**Proibido** neste endpoint: nome de cliente, CPF, telefone, e-mail, cidade, obs, apólice, documentos, histórico, ids de cliente/caso.

No `DashboardView` (ou bloco extra visível só para admin):

- Seção “Minha carteira” = KPIs atuais, agora só com os clientes da API isolada.
- Seção “Mesa (números)” = tabela/cards do `/api/tenant/stats`. Sem link que abra cliente de outro.

Operador (`TENANT_USER`) **não** chama esse endpoint (403). O dashboard dele é só a carteira própria.

### 5. Exclusão (LGPD — titularidade da carteira)

Hoje só admin apaga cliente/caso, e pode apagar o de qualquer um.

**Correto:** o **dono** (`assignedUserId`) pode arquivar/excluir o próprio cliente e os próprios casos. Admin **não** apaga carteira alheia. `DELETE` usa o mesmo `ownsClient`. Arquivar (`isArchived`) idem.

Não implemente portal de titular (titular do dado pedindo exportação) neste MVP.

### 6. Documentos e uploads

Qualquer GET/POST/DELETE em `/api/cases/[id]/documents` deve carregar o caso **com** `client.assignedUserId` e aplicar `ownsClient`. Arquivo em disco não é servido se o caso não for da carteira. Não altere o limite de 4 MB nem o storage.

### 7. Minimização extra

- `GET /api/tenant/users`: se o caller **não** for admin, 403 (operador não precisa da lista para filtrar carteira). Admin continua recebendo equipe para o TeamModal.
- `serializeClient` / `assignedUser.email`: ok no detalhe do **próprio** cliente. Não exponha lista de clientes de terceiros em lugar nenhum.
- Não logue CPF, telefone, e-mail de cliente em `console.log` nem em mensagem de erro.
- `/api/admin/tenants` permanece com `_count` + users da empresa (plataforma). Sem `include: { clients: true }`.

### 8. UI

- Remova o `<select>` “Todos os responsáveis” / lista de vendedores no filtro de `CrmApp.tsx`.
- No `ClientModal`, campo “Operador Responsável”: somente leitura com o nome do usuário logado (ou esconda). `disabled` para todo mundo; valor fixo `currentUserId`.
- Botão Equipe continua só para admin.
- Label/busca: pode continuar “Buscar por cliente, CPF…” — a busca é **dentro da carteira**.
- Não quebre o layout (bottom nav, kanban snap, sheet modal, tokens CSS). Sem restyle.

## Fora de escopo (não faça)

- Não mude o funil de 8 status nem as regras de transição (`cancellationConfirmedAt` etc.).
- Não mude tema, `globals.css` de diagramação, fontes, cores lime/teal.
- Não mude unique de CPF para incluir vendedor.
- Não crie impersonation / “entrar como”.
- Não devolva PII mascarada (tipo `***.***.***-00` de outro vendedor) — mascarar ainda confirma que o CPF existe na mesa de fulano. 409 neutro basta.
- Não adicione dependência nova.

## Checklist de aceite

- [ ] Login operador A: vê só clientes com `assignedUserId = A`. Kanban, tabela, agenda, modal, dashboard pessoal.
- [ ] Login admin: idem para a **carteira do admin**. Não há filtro “ver carteira do Pedro”.
- [ ] Admin abre Dashboard e vê ranking numérico da mesa **sem** nome/CPF/telefone de cliente.
- [ ] `GET /api/clients` como admin **não** retorna cliente de outro `assignedUserId` (teste mental: mesmo payload).
- [ ] `GET /api/clients/:id` de cliente alheio → 404, body sem PII.
- [ ] `GET /api/clients?cpf=` de CPF alheio → lista vazia (não 200 com o registro).
- [ ] `POST /api/clients` com CPF de outro vendedor → 409 sem `client`.
- [ ] `POST /api/clients` com CPF próprio → 409 (ou reopen) só com o registro do dono.
- [ ] Upload/download de documento de caso alheio → 404/401, nunca o arquivo.
- [ ] Mover card no kanban de caso alheio (ID chutado) → falha.
- [ ] Transferir `assignedUserId` via PUT → ignorado ou 400; o campo some da UI.
- [ ] Operador não lista `/api/tenant/users` (403). Admin lista e gerencia equipe.
- [ ] SUPER_ADMIN em `/admin` continua vendo quantidade de clientes por empresa, não a ficha.
- [ ] `pnpm` typecheck / build não quebra. Seed pode continuar criando clientes do Pedro; isso é a carteira do Pedro, não um “ver todos”.

Implemente nos arquivos listados, rode a cabeça nos call sites de `canSeeAllClients` e `assignedFilter`, e não deixe nenhum caminho (incluindo 409 e query CPF) serializar cliente de terceiros.
