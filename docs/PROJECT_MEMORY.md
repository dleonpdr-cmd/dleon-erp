# PROJECT MEMORY — D'LEON ERP

> Este documento é a memória permanente do projeto.  
> Atualizar sempre que uma grande funcionalidade for concluída.  
> Última atualização: 2026-08-25 (Fase E completa — Supervisor Dashboard mobile)

---

## ⚠️ NUNCA ALTERAR SEM APROVAÇÃO EXPLÍCITA

As seguintes estruturas são a "constituição" do projeto. Qualquer mudança exige discussão e aprovação antes de qualquer código:

### 1. Hierarquia de dados

```
Operation → Case → Estimate → Work Order → Workflow Tasks → Invoice
```

Esta é a espinha dorsal do sistema. Nunca inverter a hierarquia, nunca criar atalhos.

### 2. Workflow oficial de produção PDR

```
Desmontagem → PDR → Inspeção → [Repasse → Inspeção]* → Montagem
```

- O loop `Repasse ↔ Inspeção` é ilimitado (campo `round`)
- A aprovação na inspeção é que avança para montagem
- A desmontagem auto-cria o repair task via `advanceToStepId`

### 3. Fluxo financeiro

```
Caso → Orçamento → OS → Comissão → Liberação → Repasse → Pagamento
```

Nunca pular etapas. O repasse só ocorre após liberação.

### 4. Roles e permissões

```
pdr_tech → repair, rework
inspector → inspection
assembler → disassembly, assembly
supervisor → tudo (leitura + gestão)
financial → módulo financeiro
admin → tudo
```

Um técnico pode ter múltiplos roles na mesma operação. O role ativo é armazenado em `user_session_state`.

### 5. View `v_workflow_queue`

Nunca substituir por queries inline na aplicação. Toda a lógica de fila, joins e cálculo de wait_minutes vive na view SQL.

---

## Visão geral do sistema

**D'LEON ERP** é um sistema de gestão para empresas de PDR (Paintless Dent Repair) e reparo de granizo, com foco no mercado japonês. Gerencia o ciclo completo de um veículo — desde a entrada até a entrega — com controle de produção em tempo real via app mobile para técnicos.

**Usuários:** técnicos PDR, inspetores, desmontadores/montadores, supervisores, financeiro, admin

**Deploy:** Vercel (produção automática via main) + Supabase (PostgreSQL gerenciado)

---

## Arquitetura

**Stack:** Next.js 15 (App Router) + Supabase + TypeScript + Vercel

**Padrão:** Server Components para fetch de dados → props para Client Components → Server Actions para mutações

**Mobile:** Rotas em `/app/mobile/` com layout separado (dark, maxWidth 430px). Dispatcher em `app/mobile/page.tsx` roteia para a home correta por role. `readOnly=true` passado automaticamente para supervisor, admin e financial em `/mobile/task/[id]`.

**Banco:** PostgreSQL via Supabase PostgREST. RLS habilitado em todas as tabelas. View `v_workflow_queue` para queries de fila.

**Sem ORM** — queries diretas ao Supabase client.

---

## Módulos concluídos

| Módulo | Status | Notas |
|---|---|---|
| Base do sistema | ✅ | customers, vehicles, cases, auth |
| Estimativas/Orçamentos | ✅ | Editor, PDF, email |
| Pagamentos | ✅ | Registro e listagem |
| Comissões | ✅ | Cálculo, fechamento, pagamento |
| Repasse | ✅ | Solicitação, liberação, registro |
| Dashboard financeiro | ✅ | /pagamentos consolidado |
| Ordens de Serviço | ✅ | CRUD + workflow |
| Operações | ✅ | Blocos de trabalho |
| Workflow Engine | ✅ | Templates, tasks, fila |
| Mobile Fase A | ✅ | Auth, roles, session state |
| Mobile Fase B | ✅ | PDR Tech |
| Mobile Fase C | ✅ | Inspector |
| Mobile Fase D | ✅ | Assembler |
| Mobile Fase E | ✅ | Supervisor dashboard |
| Documentação | ✅ | docs/ completo |

## Módulos em desenvolvimento

| Módulo | Status | Notas |
|---|---|---|
| Mobile Fase F | 🔄 | Gestão de Operações (Admin) — KPIs, throughput, exportação |

## Módulos planejados

Ver `ROADMAP.md` para detalhes (Fases F–K).

---

## Decisões importantes

### Por que `user_session_state` em vez de cookies?
O role ativo e a operação ativa precisam ser persistentes entre sessões e dispositivos. Cookies seriam perdidos ao limpar o browser. A tabela `user_session_state` com RLS garante que cada técnico só vê o próprio estado, e pode ser acessada de qualquer dispositivo.

### Por que `v_workflow_queue` é uma view e não uma query?
A query de fila envolve 6+ tabelas, cálculo de `wait_minutes`, `queue_position` e joins com veículo/cliente/técnico. Manter isso em uma view SQL garante que qualquer mudança de lógica seja feita em um único lugar. Nunca replicar isso em TypeScript.

### Por que `Operation` existe?
Antes das operações, casos eram tratados individualmente. Operações permitem trabalhar com lotes de veículos (ex: 300 carros de uma concessionária) como uma unidade, com template de workflow compartilhado, fila unificada e gestão de equipe.

### Por que o round existe?
O loop inspeção ↔ repasse pode acontecer múltiplas vezes para o mesmo veículo. O campo `round` permite rastrear quantas vezes o veículo passou pela inspeção, mostrar "REPASSE R2" no mobile, e correlacionar findings entre rounds.

### Por que `advanceToStepId` e não `auto_advance`?
`auto_advance` no step config é uma abordagem declarativa que exige lógica complexa no engine para descobrir "qual é o próximo step". Optamos por `advanceToStepId` explícito nas server actions — o chamador sabe exatamente para onde avançar, tornando o fluxo auditável e seguro para casos especiais (ex: pular inspeção se aprovado manualmente).

### Por que dois layouts (admin e mobile)?
O app admin usa AppShell com sidebar e foi projetado para desktop. O app mobile usa um layout completamente diferente (dark, full-height, botões grandes) para uso com luvas e luz solar. Misturar os dois criaria UX ruim para os técnicos.

### Por que `params: Promise<{ id: string }>` (assíncrono)?
Next.js 15 quebrou a API de params — agora são Promises. Todo `page.tsx` com `[id]` precisa de `const { id } = await params`. Nunca usar `params.id` diretamente.

---

## Regras de negócio (resumo)

Ver `BUSINESS_RULES.md` para detalhes completos.

- 1 task por vez por técnico (`in_progress`)
- Inspeção com qualquer problema → `rework_needed` → cria repasse + nova inspeção (round+1)
- Inspeção 100% OK → `approved` → cria montagem
- Desmontagem concluída → cria reparo automaticamente
- Roles múltiplos por técnico por operação
- Orçamentos: individual (por peça/painel) ou lote (valor global)

---

## Padrões de UI

Ver `UI_GUIDELINES.md` para detalhes completos.

**Cores por role:**
- PDR Tech: `#FF6B00` (laranja)
- Inspector: `#9B59B6` (roxo)
- Assembler: `#3498DB` (azul)
- Supervisor/Admin: `#F59E0B` (âmbar)
- Sucesso: `#1D9E75` (verde)
- Erro/Problema: `#E24B4A` (vermelho)

**Mobile:** maxWidth 430px, dark bg `#0D0D0D`, paddingBottom 90px (nav), bottom nav fixo

---

## Padrões de código

### Server Actions
```ts
'use server'
export async function minhaAction(id: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  // ...
}
```

### Componente mobile (padrão)
- Server Component na page → busca dados → passa props
- Client Component (`'use client'`) → `useTransition` → server action → `router.refresh()` ou `router.push()`
- Flash message: estado local, `setTimeout(() => setFlash(''), 3000)`
- Timer: `useElapsed(task.started_at)` de `@/hooks/useElapsed`

### Supabase
- Server: `createSupabaseServerClient()` de `@/lib/supabase/server`
- Browser: `createBrowserClient()` de `@/lib/supabase/client`
- Nunca usar browser client no servidor

### Params (Next.js 15)
```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

## Convenções de nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas SQL | snake_case | `workflow_tasks` |
| Tipos TS | PascalCase | `QueueItem` |
| Componentes | PascalCase | `MobileHomePDR` |
| Server Actions | camelCase | `startTask` |
| Rotas | kebab-case | `/work-orders` |
| Props | camelCase | `currentTask`, `repairStepId` |
| Constantes | UPPER_SNAKE | `ROLE_STEP_TYPES` |

---

## Fluxo operacional detalhado

```
1. Supervisor cria Operação → adiciona técnicos → seleciona template
2. Admin cria Casos (veículos) vinculados à Operação
3. Tasks são criadas na fila (status: queued)
4. Técnico abre o mobile → vê sua fila → clica Iniciar
   → startTask() → status: in_progress → timer começa
5. Técnico conclui → completeTask() → status: completed
   → se disassembly: cria repair task
   → se repair: nada automático (inspector pega da fila)
   → se inspection/approved: cria assembly task
   → se inspection/rework_needed: cria rework + inspection round+1
   → se assembly: workflow do veículo concluído
6. Financeiro: OS → comissão → libera → repasse → paga
```

---

## Fluxo financeiro detalhado

```
1. Caso criado com veículo e cliente
2. Estimativa criada (tipo individual ou lote)
   → PDF gerado automaticamente
   → PDF enviado por email via Resend
3. OS criada a partir do caso aprovado
   → Snapshot do valor no momento (imutável após criação)
4. Comissão calculada (percentual sobre valor da OS)
5. Supervisor/financeiro libera a comissão
6. Repasse registrado (transferência ao técnico)
7. Pagamento registrado (confirmação do recebimento)
```
