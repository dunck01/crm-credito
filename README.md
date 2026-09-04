# CRM Restituição

CRM simples para controlar identificação, contato, conversão, cancelamento e comissões de restituição de seguros.

Um cliente, vários casos. CPF único por empresa. Cliente que não aceitou continua na base. Cliente marcado como **Não contatar** não mistura com a fila de abordagem.

## Stack

- Next.js 14 + Tailwind
- Prisma + PostgreSQL
- NextAuth (credentials)
- Multi-tenant (Super Admin cria empresas)

## Funil (MVP)

1. Aguardando contato
2. Aguardando resposta
3. Não aceitou
4. Convertido
5. Cancelamento
6. Pagamento
7. Finalizado
8. Perdido

Só avança de **Cancelamento** para **Pagamento** com a data de cancelamento confirmado.

## Setup

1. Suba um PostgreSQL. Localmente:

```
docker run -d --name crm-credito-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm_credito -p 5433:5432 postgres:16
```

Ou use Neon. **Não use o banco do Fichário.**

2. Copie as variáveis de ambiente:

```
cp apps/web/.env.example apps/web/.env.local
cp packages/database/.env.example packages/database/.env
```

3. Preencha `DATABASE_URL`, `NEXTAUTH_SECRET` e `NEXTAUTH_URL=http://localhost:3001`.
   Exemplo local: `postgresql://postgres:postgres@localhost:5433/crm_credito?sslmode=disable`
4. Instale e suba o schema:

```
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

App em [http://localhost:3001](http://localhost:3001).

## Deploy na Vercel

1. Envie o repositório ao GitHub (`commit` + `push`). Não commite `.env` / `.env.local`.
2. Na Vercel: **Add New Project** → este repo.
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Node.js:** 24.x
4. Environment Variables:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | Connection string da Neon (pooler, `sslmode=require`) |
| `NEXTAUTH_SECRET` | String aleatória (ex.: `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública, ex. `https://crm-credito.vercel.app` |

O schema e o seed já foram aplicados na Neon. Depois do primeiro deploy, se a URL da Vercel for outra, atualize `NEXTAUTH_URL`.

Upload de documentos: até **4 MB** (limite do body na Vercel).

## Logins do seed

| Perfil | E-mail | Senha |
|---|---|---|
| Super Admin | admin@admin.com | 123456 |
| Empresa | pedro@restituicao.com | 123456 |

## Fora desta versão

WhatsApp automático, assinatura digital, banco/boletos, IA, app mobile, relatórios avançados.
