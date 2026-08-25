# Database — D'LEON ERP

Banco de dados: **PostgreSQL via Supabase**.  
RLS habilitado em todas as tabelas.  
Migrations numeradas em `supabase/migrations/`.

---

## Migrations

| Arquivo | Conteúdo |
|---|---|
| `003_pagamentos.sql` *(raiz — legacy)* | Tabelas iniciais de pagamentos |
| `004_commissions.sql` *(raiz — legacy)* | Tabelas de comissões (versão inicial) |
| `supabase/migrations/004_commissions.sql` | Comissões (versão atual no repositório) |
| `supabase/migrations/005_payments.sql` | Pagamentos revisados |
| `supabase/migrations/006_repasse.sql` | Repasse financeiro |
| `supabase/migrations/007_work_orders.sql` | Ordens de Serviço |
| `supabase/migrations/008_operations.sql` | Operações, membros, roles |
| `supabase/migrations/009_workflow_tasks.sql` | Workflow engine completo |
| `supabase/migrations/010_mobile_roles.sql` | Session state mobile, RLS |

> ⚠️ Os arquivos `003_pagamentos.sql` e `004_commissions.sql` na raiz foram aplicados manualmente e não seguem o padrão de migrations. Ver TODO.md.

---

## Tabelas principais

### `customers`
Clientes / concessionárias.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| name | TEXT | Nome do cliente |
| email | TEXT | |
| phone | TEXT | |
| company | TEXT | Empresa/concessionária |
| created_at | TIMESTAMPTZ | |

---

### `vehicles`
Veículos cadastrados.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| make | TEXT | Fabricante (Toyota, Honda...) |
| model | TEXT | Modelo |
| year | INT | Ano |
| plate | TEXT | Placa |
| customer_id | UUID FK → customers | Proprietário |

---

### `cases`
Veículo em reparo — unidade central do sistema.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| case_number | TEXT | Número gerado (DLN-YYYYMMDD-NNN) |
| status | TEXT | `draft`/`active`/`completed`/`cancelled` |
| customer_id | UUID FK → customers | |
| vehicle_id | UUID FK → vehicles | |
| operation_id | UUID FK → operations | Operação à qual pertence (nullable) |
| total_amount | NUMERIC | Valor total do orçamento |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

### `technicians`
Perfil profissional dos técnicos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → auth.users | Vinculado à autenticação |
| name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| is_active | BOOLEAN | |

---

### `operations`
Bloco de trabalho (ex: lote de uma concessionária).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| name | TEXT | Nome da operação |
| customer_id | UUID FK → customers | Concessionária |
| status | TEXT | `draft`/`active`/`paused`/`completed`/`cancelled` |
| workflow_template_id | UUID FK → workflow_templates | Template do fluxo de produção |
| budget_type_default | TEXT | `individual`/`batch` |
| start_date | DATE | |
| end_date | DATE | |
| target_vehicle_count | INT | Meta de veículos |

---

### `operation_members`
Técnicos vinculados a uma operação.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| operation_id | UUID FK → operations | |
| technician_id | UUID FK → technicians | |
| primary_function | TEXT | Role principal do técnico na operação |
| joined_at | TIMESTAMPTZ | |
| left_at | TIMESTAMPTZ | NULL = ainda na operação |

---

### `operation_member_roles`
Roles adicionais de um membro (pode ter múltiplos).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| member_id | UUID FK → operation_members | |
| role | TEXT | `pdr_tech`/`inspector`/`assembler`/`supervisor`/`financial`/`admin` |

---

### `user_session_state`
Estado ativo do técnico no mobile (role + operação escolhidos).

| Coluna | Tipo | Descrição |
|---|---|---|
| user_id | UUID PK FK → auth.users | |
| active_role | TEXT | Role ativo no momento |
| active_operation_id | UUID FK → operations | Operação ativa |
| updated_at | TIMESTAMPTZ | |

> RLS: `auth.uid() = user_id` — cada usuário só vê e altera a própria linha.

---

### `workflow_templates`
Templates reutilizáveis de fluxo de produção.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| name | TEXT | Ex: "Granizo Padrão" |
| description | TEXT | |
| is_active | BOOLEAN | |

---

### `workflow_steps`
Etapas ordenadas dentro de um template.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| template_id | UUID FK → workflow_templates | |
| name | TEXT | Nome da etapa |
| step_type | TEXT | Ver lista de tipos em BUSINESS_RULES.md |
| sort_order | INT | Ordem de execução |
| responsible_role | TEXT | Role que executa (NULL = qualquer) |
| is_active | BOOLEAN | |
| auto_advance | BOOLEAN | Auto-criar próxima task ao concluir |
| config | JSONB | Configurações extras |

---

### `workflow_tasks`
Tarefas reais geradas para cada veículo.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| operation_id | UUID FK → operations | |
| case_id | UUID FK → cases | |
| work_order_id | UUID FK → work_orders | |
| workflow_step_id | UUID FK → workflow_steps | |
| task_type | TEXT | Tipo da etapa (denormalizado do step) |
| status | TEXT | `queued`/`in_progress`/`completed`/`skipped`/`cancelled` |
| priority | TEXT | `urgent`/`normal`/`low` |
| round | INT | Número da rodada de inspeção |
| requested_at | TIMESTAMPTZ | Quando a task foi criada |
| assigned_to | UUID FK → technicians | |
| started_at | TIMESTAMPTZ | |
| started_by | UUID FK → auth.users | |
| finished_at | TIMESTAMPTZ | |
| finished_by | UUID FK → auth.users | |
| notes | TEXT | |
| payload | JSONB | Dados extras (ex: `inspection_result`) |

---

### `workflow_task_events`
Histórico de eventos de uma task.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| task_id | UUID FK → workflow_tasks | |
| event_type | TEXT | `started`/`completed`/`cancelled`/etc. |
| user_id | UUID FK → auth.users | |
| payload | JSONB | Dados do evento |
| created_at | TIMESTAMPTZ | |

---

### `inspection_findings`
Resultados de inspeção por painel.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| task_id | UUID FK → workflow_tasks | Task de inspeção |
| part_id | TEXT | ID do painel (ex: `roof`, `bonnet`) |
| part_label | TEXT | Nome do painel em PT |
| severity | TEXT | `minor`/`major`/`critical` |
| notes | TEXT | Observação do inspetor |
| photo_url | TEXT | URL da foto (futuro) |
| resolved | BOOLEAN | |
| resolved_at | TIMESTAMPTZ | |

---

### `work_orders`
Ordens de Serviço.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| case_id | UUID FK → cases | |
| status | TEXT | |
| total_amount | NUMERIC | Snapshot do valor no momento da OS |
| created_at | TIMESTAMPTZ | |

---

## Views

### `v_workflow_queue`
View principal do mobile. Retorna todas as tasks com joins completos:
- Dados do veículo (make, model, year, plate)
- Cliente (customer_name)
- Técnico atribuído (assigned_name)
- Número do caso (case_number)
- Posição na fila (queue_position)
- Tempo de espera em minutos (wait_minutes)
- Tempo de trabalho (work_minutes)

**Nunca fazer este join na aplicação — sempre usar a view.**

---

## Relacionamentos principais

```
auth.users
  └─ technicians (user_id)
       └─ operation_members (technician_id)
            └─ operation_member_roles (member_id)

operations (workflow_template_id → workflow_templates)
  └─ cases (operation_id)
       └─ work_orders (case_id)
       └─ workflow_tasks (case_id, operation_id)
            └─ workflow_task_events (task_id)
            └─ inspection_findings (task_id)

workflow_templates
  └─ workflow_steps (template_id)

user_session_state (user_id → auth.users)
```
