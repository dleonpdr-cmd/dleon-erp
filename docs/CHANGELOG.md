# Changelog — D'LEON ERP

Formato: cada entrada registra o que foi entregue, os arquivos principais e o commit de referência.

---

## [Fase E] — Supervisor Dashboard Mobile (2026-08-25)

**Commit:** `1a361c9`

### Adicionado
- `components/mobile/MobileHomeSupervisor.tsx` — dashboard read-only para supervisor/admin:
  - KPIs: em andamento, na fila, total concluídos
  - Linha de produção: barra de progresso por etapa com % concluído, ativos e avg wait
  - Seção EM ANDAMENTO: todos os técnicos ativos com step badge + tempo trabalhando
  - Seção GARGALOS: auto-detecção (queued > 3, avg_wait > 60min, + sempre destaca maior avg_wait_minutes da operação)
  - Fila completa: filtro por step_type (chips), ordenada por wait_minutes desc
  - Bottom nav amber (`#F59E0B`) — diferenciado dos outros roles
- Prop `readOnly` em `MobileTaskDetail` — oculta todos os botões de ação, exibe banner âmbar "MODO VISUALIZAÇÃO"

### Modificado
- `app/mobile/page.tsx` — supervisor e admin chamam `MobileHomeSupervisor` com `getOperationStepCounts()`
- `app/mobile/task/[id]/page.tsx` — passa `readOnly=true` para supervisor, admin e financial
- `components/mobile/MobileTaskDetail.tsx` — prop `readOnly?: boolean`, `isMyTask` respeita readOnly

### Sem migration, sem novas server actions, sem novas queries

---

## [Sprint de Organização] — Documentação + Refactor (2026-08-25)

**Commits:** (Sprint 1+2)

### Sprint 1 — Documentação
- `docs/README.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DATABASE.md`
- `docs/ROADMAP.md`, `CHANGELOG.md`, `PROJECT_MEMORY.md`, `TODO.md`
- `docs/UI_GUIDELINES.md`, `API_CONTRACT.md`, `DESIGN_DECISIONS.md`

### Sprint 2 — Limpeza
- `hooks/useElapsed.ts` — hook centralizado, elimina 3 implementações duplicadas
- `MobileHomePDR`, `MobileTaskDetail`, `MobileHomeAssembler` — importam de `@/hooks/useElapsed`

---

## [Fase D] — Mobile Desmontador/Montador (2026-08-25)

**Commits:** `4e1a237`, `24d549e`

### Adicionado
- `components/mobile/MobileHomeAssembler.tsx` — home do assembler com:
  - Seção DESMONTAGEM com fila de tasks `disassembly`
  - Seção MONTAGEM com fila de tasks `assembly`
  - Seção EM ANDAMENTO com timer ao vivo
  - Botão "Concluir desmontagem" com `advanceToStepId` → auto-cria repair task
  - Badge URGENTE, bloqueio de múltiplas tasks simultâneas
  - Accent azul `#3498DB` para assembler

### Modificado
- `app/mobile/page.tsx` — adicionado case `assembler` com resolução de `repairStepId`
- `components/mobile/MobileTaskDetail.tsx` — adicionada prop `repairStepId`, `handleComplete` passa `advanceToStepId` para desmontagem
- `app/mobile/task/[id]/page.tsx` — resolve `repairStepId` para tasks `disassembly`

### Validado em produção
- Home assembler renderiza corretamente com 2 tasks de desmontagem + 1 de montagem
- Concluir desmontagem → repair task auto-criada na fila do PDR tech ✓
- Timer ao vivo funcionando ✓
- Bloqueio de múltiplas tasks ✓

---

## [Fase C — Ajustes] — Mobile Inspetor UX (2026-08-25)

**Commit:** `621c796`

### Corrigido
- `fmtWait` agora usa `Math.round()` — elimina decimais (ex: `0.25 min` → `0 min`)
- "painels" → "painéis" — corrigido acento e plural
- Controles bloqueados durante submit (`disabled={pending}`, `opacity: 0.6`)

### Melhorado
- Card de resumo antes do submit (contagem OK, problemas, lista de painéis com problema)
- Painéis com problema recebem borda vermelha, fundo avermelhado e ícone ⚠
- Header com progresso em tempo real: `X/13 avaliados`
- Tela de conclusão `✓ Inspeção concluída / Redirecionando...` por 1.5s

---

## [Fase C] — Mobile Inspetor (2026-08-22)

**Commit:** `a02ea29`

### Adicionado
- `components/mobile/MobileHomeInspector.tsx` — home do inspetor
- `components/mobile/MobileInspectionForm.tsx` — formulário de 13 painéis
- Lógica de `submitInspection()` com `rework_needed`/`approved`
- Rounds automáticos: repasse cria nova inspeção com `round + 1`
- Busca dinâmica de `reworkStepId`, `nextInspectionStepId`, `assemblyStepId` via `workflow_steps`
- Accent roxo `#9B59B6` para inspector

### Modificado
- `app/mobile/page.tsx` — adicionado case `inspector`
- `app/mobile/task/[id]/page.tsx` — reescrito para buscar step IDs dinamicamente

---

## [Fase B] — Mobile PDR Tech (2026-08-20)

### Adicionado
- `components/mobile/MobileHomePDR.tsx` — home do técnico PDR
  - Seção CARRO ATUAL com timer ao vivo
  - Seção MINHA FILA (repairs + reworks)
  - Seção AGUARDANDO OUTRAS EQUIPES
  - Iniciar / Concluir inline
  - Accent laranja `#FF6B00`
- `components/mobile/MobileTaskDetail.tsx` — detalhe de qualquer task
- `components/mobile/MobileQueueView.tsx` — fila geral
- `components/mobile/MobileHistory.tsx` — histórico do técnico
- `components/mobile/MobileProfile.tsx` — perfil e troca de role
- `components/mobile/MobileSetup.tsx` — seleção de operação/role inicial

### Adicionado (rotas)
- `app/mobile/layout.tsx` — layout mobile (sem AppShell, dark bg)
- `app/mobile/page.tsx` — dispatcher por role
- `app/mobile/task/[id]/page.tsx`
- `app/mobile/queue/page.tsx`
- `app/mobile/history/page.tsx`
- `app/mobile/profile/page.tsx`

---

## [Fase A] — Mobile Auth e Roles (2026-08-18)

### Adicionado
- Migration `010_mobile_roles.sql` — `user_session_state`, RLS, roles mobile
- `app/api/roles/actions.ts` — `resolveCurrentTechnician()`, `getMyOperations()`, `setActiveRole()`
- `app/api/roles/constants.ts` — tipos de roles
- Perfil do técnico expandido em `app/technicians/[id]/page.tsx`
- `components/technicians/TechnicianRolesShell.tsx`

---

## [Workflow Engine] (2026-08-10)

### Adicionado
- Migration `009_workflow_tasks.sql` — tabelas completas do workflow engine
- `app/api/workflow/actions.ts` — `startTask`, `completeTask`, `submitInspection`, `getOperationQueue`, `getTaskEvents`
- `app/api/workflow/constants.ts` — tipos, labels, cores
- View `v_workflow_queue` com joins completos
- `components/workflow/WorkflowTemplateShell.tsx` — editor de templates
- `components/workflow/OperationQueueShell.tsx` — fila da operação (admin)
- `components/workflow/CaseWorkflowSection.tsx` — status do workflow no caso
- Rotas: `/workflow-templates`, `/workflow-templates/new`, `/workflow-templates/[id]`

---

## [Operações] (2026-08-05)

### Adicionado
- Migration `008_operations.sql` — operations, operation_members, operation_member_roles
- `app/api/operations/actions.ts` — CRUD de operações
- Rotas: `/operations`, `/operations/new`, `/operations/[id]`, `/operations/[id]/queue`
- `components/operations/OperationShell.tsx`
- Seletor de operação em `/cases/new` e seção de operação em `/cases/[id]`

---

## [Ordens de Serviço] (2026-07-28)

### Adicionado
- Migration `007_work_orders.sql`
- `app/api/work-orders/actions.ts`
- Rotas: `/work-orders`, `/work-orders/[id]`
- `components/work-orders/WorkOrderShell.tsx`
- Card de OS na página do caso

---

## [Repasse] (2026-07-20)

### Adicionado
- Migration `006_repasse.sql`
- `app/api/repasse/actions.ts` — `solicitarLiberacao`, `liberarComissao`, `registrarRepasse`
- Botões de liberação e repasse no `CommissionShell`

---

## [Pagamentos] (2026-07-15)

### Adicionado
- Migration `005_payments.sql`
- `app/api/payments/actions.ts`
- `components/payments/PaymentSection.tsx`
- Página `/pagamentos` — dashboard consolidado

---

## [Comissões] (2026-07-08)

### Adicionado
- Migration `004_commissions.sql`
- `app/api/commissions/actions.ts`
- `components/commissions/CommissionShell.tsx`
- Rotas: `/commissions`, `/commissions/[caseId]`

---

## [Estimativas] (2026-06-28)

### Adicionado
- `app/api/estimativas/actions.ts` — CRUD de estimativas
- `components/estimativas/EstimativaShell.tsx` — editor de orçamento
- `components/estimativas/EstimativaPDF.tsx` — geração de PDF (react-pdf)
- Route handler PDF: `app/api/estimativas/[id]/pdf/route.ts`
- Envio por email via Resend

---

## [Base do sistema] (2026-06-20)

### Adicionado
- Setup Next.js 15, Supabase, TypeScript, Tailwind
- Schema base: customers, vehicles, cases
- Autenticação com Supabase Auth
- Layout admin (AppShell)
- CRUD de clientes, veículos, casos
- Migration `003_pagamentos.sql` — tabelas financeiras iniciais
