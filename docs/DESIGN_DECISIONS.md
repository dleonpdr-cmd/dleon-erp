# Design Decisions — D'LEON ERP

> Registro das decisões arquitetônicas importantes.  
> Cada decisão explica o problema, as alternativas consideradas e o motivo da escolha.

---

## DD-001 — Por que Operation existe

**Problema:** Casos individuais não têm como ser gerenciados em lote. Uma concessionária entrega 300 carros de uma vez — criar 300 casos sem contexto torna impossível gerenciar a equipe, o workflow e o financeiro.

**Alternativas consideradas:**
- Apenas "projetos" com casos vinculados (sem workflow integrado)
- Tags nos casos para agrupamento

**Decisão:** `Operation` como entidade de primeiro nível que agrupa casos, define o template de workflow e gerencia a equipe (membros + roles). Cada case pertence a uma operação. Isso permite:
- Fila unificada por operação
- Template de produção compartilhado
- Gestão de time (quem faz o quê)
- Relatórios por operação

---

## DD-002 — Por que Case pertence a Operation (e não ao contrário)

**Problema:** Onde definir a hierarquia?

**Decisão:** `cases.operation_id` é nullable — casos antigos (antes das operações) continuam funcionando. Casos novos são criados dentro de uma operação. Isso preserva compatibilidade retroativa e permite casos individuais sem operação.

---

## DD-003 — Por que Work Order usa snapshot de valor

**Problema:** O valor de um orçamento pode ser editado depois que a OS já foi criada. Isso criaria inconsistência financeira.

**Decisão:** A OS armazena `total_amount` no momento da criação (snapshot). Qualquer alteração no orçamento após a criação da OS não afeta a OS existente. Para refletir o novo valor, uma nova OS deve ser criada.

---

## DD-004 — Por que o Workflow gera Tasks (e não Jobs/Tickets)

**Problema:** Como modelar "este carro precisa ser desmontado agora"?

**Alternativas:** Jobs, Tickets, Items, Events

**Decisão:** `workflow_tasks` — o nome "task" é genérico o suficiente para qualquer tipo de etapa de produção, e alinha com a terminologia natural ("tenho 3 tasks na fila"). Cada task representa uma instância de execução de um step para um caso específico.

---

## DD-005 — Por que existem Roles (e não apenas permissões individuais)

**Problema:** Como controlar quem vê o quê no mobile sem tornar isso complexo demais?

**Decisão:** Roles predefinidos (`pdr_tech`, `inspector`, `assembler`, etc.) que mapeiam diretamente para `step_types`. O mobile usa `ROLE_STEP_TYPES` para filtrar a fila — simples e sem ambiguidade. Um técnico pode ter múltiplos roles na mesma operação para flexibilidade.

---

## DD-006 — Por que existem filas por operação e não globais

**Problema:** Uma empresa pode ter múltiplas operações simultâneas com equipes diferentes.

**Decisão:** A fila é sempre filtrada por `operation_id`. O técnico seleciona sua operação ativa ao fazer login mobile. Tasks de operações diferentes não aparecem na fila. Isso isola as operações e evita conflitos de prioridade entre projetos diferentes.

---

## DD-007 — Por que `user_session_state` e não cookies ou JWT claims

**Problema:** O técnico precisa "lembrar" qual role e qual operação está usando entre sessões.

**Alternativas:**
- Cookie no browser — perde ao limpar, não sincroniza entre dispositivos
- JWT claims customizados — exigiria reemissão de token a cada troca de role
- LocalStorage — não acessível no servidor

**Decisão:** Tabela `user_session_state` no banco com RLS (`auth.uid() = user_id`). Persiste entre sessões, sincroniza entre dispositivos, acessível no servidor via `createSupabaseServerClient()`. Trade-off: um round-trip extra ao banco no load de cada página mobile — aceitável.

---

## DD-008 — Por que `v_workflow_queue` é uma view SQL e não uma query TypeScript

**Problema:** A query de fila requer joins de 6+ tabelas, cálculo de posição, tempo de espera e múltiplos filtros.

**Alternativas:**
- Query TypeScript com múltiplos `.from()` e merges no código
- GraphQL com resolvers
- Stored procedure

**Decisão:** View SQL (`v_workflow_queue`). Vantagens:
- Lógica centralizada num único lugar
- Otimização pelo query planner do PostgreSQL
- Qualquer query no banco pode usar a view
- TypeScript só precisa de `supabase.from('v_workflow_queue').select('*').eq('operation_id', ...)`

---

## DD-009 — Por que `advanceToStepId` explícito e não `auto_advance` automático

**Problema:** Ao concluir uma task, como criar a próxima automaticamente?

**Alternativas:**
- `auto_advance: true` no step — o engine descobre o próximo step automaticamente
- `advanceToStepId` explícito — o chamador decide

**Decisão:** `advanceToStepId` explícito. Motivo: o "próximo step" depende do resultado (ex: inspeção aprovada → montagem; reprovada → repasse). Uma lógica automática precisaria de um motor de regras complexo. Com `advanceToStepId` explícito, cada ponto do código sabe exatamente para onde avançar e pode ser auditado.

---

## DD-010 — Por que dois layouts completamente diferentes (admin vs mobile)

**Problema:** O app admin e o app mobile têm necessidades radicalmente diferentes de UX.

**Decisão:** Layouts separados em `app/layout.tsx` (admin com AppShell) e `app/mobile/layout.tsx` (dark, full-height, sem sidebar). Não há componentes compartilhados entre os dois layouts além dos primitivos de dados. Isso permite que cada um evolua independentemente.

---

## DD-011 — Por que Next.js 15 App Router e não Pages Router

**Problema:** Escolha do roteador.

**Decisão:** App Router foi escolhido pela capacidade de Server Components — permite buscar dados no servidor e passar como props sem um estado global de dados ou SWR/React Query. Para um sistema ERP com muitos dados sensíveis, ter tudo no servidor por padrão é uma vantagem de segurança e performance.

**Custo:** Breaking changes constantes no Next.js 15 (ex: `params` agora é `Promise`). Sempre verificar `node_modules/next/dist/docs/` antes de assumir comportamento.

---

## DD-012 — Por que português para nomes de variáveis e componentes financeiros

**Problema:** O projeto tem mistura de inglês e português em nomes de variáveis e componentes.

**Situação atual:** Componentes de workflow em inglês (`WorkflowTask`, `startTask`), componentes financeiros em português (`pagamentos`, `faturas`), componentes mobile em inglês (`MobileHomePDR`).

**Decisão pendente:** Não foi tomada uma decisão formal. O padrão emergente é inglês para infraestrutura/workflow e português para termos de negócio do mercado japonês que não têm tradução direta (ex: `pagamentos` em vez de `payments`, `estimativas` em vez de `quotes`). Manter consistência dentro de cada módulo.

---

## DD-013 — Por que não há ORM (sem Prisma, Drizzle, etc.)

**Problema:** Usar ORM ou PostgREST diretamente?

**Decisão:** Supabase PostgREST diretamente, sem ORM. Motivo: o Supabase já fornece um cliente type-safe, views SQL são cidadãos de primeira classe, e adicionar um ORM adicionaria uma camada extra de abstração sobre outra abstração.

**Trade-off:** Queries complexas são mais verbosas. Compensado pelo uso estratégico de views SQL.

---

## DD-014 — Por que não há estado global (Redux, Zustand, etc.)

**Problema:** Gerenciar estado entre componentes.

**Decisão:** Server Components eliminam a necessidade de estado global para dados remotos. Estado local com `useState`/`useTransition` é suficiente para os formulários e interações do sistema. `router.refresh()` recarrega dados do servidor sem estado global.

---

## DD-015 — Por que o campo `round` em workflow_tasks

**Problema:** Um veículo pode ser reprovado na inspeção múltiplas vezes. Como rastrear quantas vezes passou pela inspeção?

**Decisão:** Campo `round: INT` em `workflow_tasks`. Começa em 1, incrementa a cada novo ciclo de inspeção. Permite mostrar "REPASSE R2", correlacionar findings entre rounds, e calcular métricas de qualidade (quantas vezes em média um veículo precisa de repasse).
