# Arquitetura — D'LEON ERP

## Visão geral

O projeto é um monorepo Next.js 15 com App Router. Não há separação frontend/backend — tudo vive no mesmo repositório. A lógica de negócio fica em **Server Actions** (`'use server'`), consumidas diretamente pelos componentes de servidor ou pelos componentes cliente via `useTransition`.

---

## Estrutura de pastas

```
dleon-erp/
│
├── app/                          # Roteamento Next.js (App Router)
│   ├── (auth)/login/             # Login — rota pública
│   ├── (dashboard)/pagamentos/   # Dashboard financeiro consolidado
│   ├── acesso-negado/            # Página de erro de permissão
│   ├── mobile/                   # App mobile dos técnicos (layout separado)
│   │   ├── layout.tsx            # Layout sem AppShell, maxWidth 430px
│   │   ├── page.tsx              # Dispatcher por role
│   │   ├── task/[id]/            # Detalhe de task
│   │   ├── queue/                # Fila da operação
│   │   ├── history/              # Histórico do técnico
│   │   └── profile/              # Perfil e seleção de role
│   ├── api/                      # Server actions organizadas por domínio
│   │   ├── workflow/             # Engine de workflow (actions + constants)
│   │   ├── roles/                # Autenticação de role + session state
│   │   ├── operations/           # CRUD de operações
│   │   ├── work-orders/          # CRUD de OS
│   │   ├── commissions/          # Comissões
│   │   ├── payments/             # Pagamentos
│   │   ├── repasse/              # Repasse financeiro
│   │   ├── estimativas/          # Orçamentos + geração de PDF
│   │   ├── faturas/              # Faturas
│   │   ├── pagamentos/           # Dashboard de pagamentos
│   │   └── usuarios/             # Gestão de usuários
│   ├── cases/                    # CRUD de casos
│   ├── operations/               # Páginas de operações
│   ├── work-orders/              # Páginas de OS
│   ├── estimativas/              # Páginas de orçamentos
│   ├── commissions/              # Páginas de comissões
│   ├── technicians/              # Gestão de técnicos
│   ├── workflow-templates/       # CRUD de templates de workflow
│   ├── customers/                # Clientes
│   ├── vehicles/                 # Veículos
│   ├── usuarios/                 # Usuários do sistema
│   └── precos/                   # Tabela de preços
│
├── components/                   # Componentes React
│   ├── AppShell.tsx              # Layout admin (sidebar + header)
│   ├── mobile/                   # Componentes do app mobile
│   │   ├── MobileHomePDR.tsx
│   │   ├── MobileHomeInspector.tsx
│   │   ├── MobileHomeAssembler.tsx
│   │   ├── MobileInspectionForm.tsx
│   │   ├── MobileTaskDetail.tsx
│   │   ├── MobileQueueView.tsx
│   │   ├── MobileHistory.tsx
│   │   ├── MobileProfile.tsx
│   │   └── MobileSetup.tsx
│   ├── workflow/                 # Componentes de workflow (admin)
│   │   ├── CaseWorkflowSection.tsx
│   │   ├── OperationQueueShell.tsx
│   │   └── WorkflowTemplateShell.tsx
│   ├── operations/               # Shell da operação
│   ├── estimativas/              # Editor de orçamento + PDF
│   ├── commissions/              # Shell de comissões
│   ├── payments/                 # Seção de pagamentos
│   ├── pagamentos/               # Dashboard financeiro
│   ├── cases/                    # Componentes de caso
│   ├── technicians/              # Gestão de roles de técnico
│   ├── work-orders/              # Shell de OS
│   └── usuarios/                 # Botões de usuário
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser (createBrowserClient)
│   │   ├── server.ts             # Cliente server (createServerClient com cookies)
│   │   └── middleware.ts         # Refresh de sessão no middleware
│   ├── auth.ts                   # Helpers de autenticação
│   ├── pagamentos.ts             # Helpers financeiros
│   └── types/pagamentos.ts       # Tipos de pagamentos (a consolidar em types/)
│
├── types/
│   ├── database.types.ts         # Tipos gerados do schema Supabase
│   └── pagamentos.ts             # (duplicado — ver TODO.md)
│
├── hooks/                        # Hooks React reutilizáveis
│   └── useElapsed.ts             # Timer ao vivo para tasks em andamento
│
├── supabase/
│   └── migrations/               # SQL numerado sequencialmente
│       ├── 004_commissions.sql
│       ├── 005_payments.sql
│       ├── 006_repasse.sql
│       ├── 007_work_orders.sql
│       ├── 008_operations.sql
│       ├── 009_workflow_tasks.sql
│       └── 010_mobile_roles.sql
│
└── docs/                         # Esta pasta
```

---

## Padrões de código

### Server Actions

Toda lógica de banco fica em Server Actions (`'use server'`), nunca diretamente em componentes:

```ts
// app/api/workflow/actions.ts
'use server'
export async function startTask(taskId: string, operationId: string) {
  const supabase = await createSupabaseServerClient()
  // ...
}
```

### Componentes de servidor vs cliente

- **Páginas** (`page.tsx`) são sempre Server Components — buscam dados e passam como props
- **Shells e formulários** são Client Components (`'use client'`) — gerenciam estado e chamam server actions

```tsx
// Padrão: server component busca dados
export default async function MobileTaskPage({ params }) {
  const task = await supabase.from('v_workflow_queue').select('*').eq('id', id).single()
  return <MobileTaskDetail task={task} />
}

// Client component recebe dados como props
'use client'
export default function MobileTaskDetail({ task, ctx }) {
  const [pending, startT] = useTransition()
  function handleComplete() {
    startT(async () => { await completeTask(task.id, ctx.operationId) })
  }
}
```

### Supabase

Sempre usar `createSupabaseServerClient()` em server actions e server components. Nunca usar o cliente browser no servidor.

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server'
const supabase = await createSupabaseServerClient()
```

### Params assíncronos (Next.js 15)

```tsx
// CORRETO — Next.js 15
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

## Fluxo de dados (Mobile)

```
Vercel Edge
  └─ app/mobile/page.tsx (Server Component)
       ├─ resolveCurrentTechnician()   → user_session_state + operation_members
       ├─ getOperationQueue()          → v_workflow_queue (view SQL)
       └─ MobileHomeXxx (Client)
            ├─ startTask()   → Server Action → workflow_tasks UPDATE
            ├─ completeTask() → Server Action → workflow_tasks UPDATE + INSERT next
            └─ router.refresh() / router.push()
```

---

## Autenticação e roles

O sistema usa dois níveis de identidade:

1. **Auth (Supabase)** — `auth.users` — quem é o usuário do sistema
2. **Técnico** — `technicians` — perfil profissional, vinculado ao `auth.users` via `user_id`
3. **Session State** — `user_session_state` — role e operação ativos no momento

```
auth.users → technicians → operation_members → operation_member_roles
                                                    └─ user_session_state (active_role, active_operation_id)
```

---

## RLS (Row Level Security)

Todas as tabelas têm RLS habilitado. As políticas seguem dois padrões:

- `auth.uid() = user_id` — o usuário vê apenas seus próprios dados (ex: `user_session_state`)
- Policies baseadas em `operation_members` — o técnico vê dados da sua operação ativa

---

## Views SQL

A view `v_workflow_queue` é o coração do sistema mobile. Ela devolve todas as tasks com joins de veículo, cliente, técnico, posição na fila e tempo de espera. Nunca fazer esse join na aplicação — sempre usar a view.

---

## Convenções de nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas SQL | snake_case | `workflow_tasks`, `operation_members` |
| Tipos TypeScript | PascalCase | `QueueItem`, `WorkflowTask` |
| Componentes | PascalCase | `MobileHomePDR`, `CommissionShell` |
| Server Actions | camelCase | `startTask`, `completeTask` |
| Rotas | kebab-case | `/work-orders`, `/workflow-templates` |
| IDs de DB | UUID v4 | `gen_random_uuid()` |
