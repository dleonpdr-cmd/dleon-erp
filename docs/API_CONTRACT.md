# API Contract — D'LEON ERP

> Este documento descreve os modelos de dados principais e as server actions disponíveis.  
> Não descreve endpoints HTTP — o sistema usa Server Actions, não uma REST API tradicional.

---

## Modelos principais

### Case (Caso)

Representa um veículo em reparo.

```ts
type Case = {
  id: string                    // UUID
  case_number: string           // "DLN-20260623-664"
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  customer_id: string           // FK → customers
  vehicle_id: string            // FK → vehicles
  operation_id: string | null   // FK → operations (nullable para casos antigos)
  total_amount: number          // Valor total do orçamento
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

### Operation (Operação)

Bloco de trabalho com um cliente/concessionária.

```ts
type Operation = {
  id: string
  name: string                        // "Daihatsu Ibaraki"
  customer_id: string | null          // FK → customers
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  workflow_template_id: string | null // FK → workflow_templates
  budget_type_default: 'individual' | 'batch'
  notes: string | null
  start_date: string | null           // DATE
  end_date: string | null
  target_vehicle_count: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}
```

---

### WorkflowTask (Task)

Tarefa de produção para um veículo.

```ts
type WorkflowTask = {
  id: string
  operation_id: string
  case_id: string
  work_order_id: string | null
  workflow_step_id: string
  task_type: StepType              // denormalizado do step
  status: 'queued' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
  priority: 'urgent' | 'normal' | 'low'
  round: number                    // rodada de inspeção (começa em 1)
  requested_at: string
  requested_by: string | null
  assigned_to: string | null       // FK → technicians
  started_at: string | null
  started_by: string | null        // FK → auth.users
  finished_at: string | null
  finished_by: string | null
  notes: string | null
  payload: Record<string, unknown> | null  // ex: { inspection_result: 'approved' }
  created_at: string
  updated_at: string
}
```

---

### QueueItem (view v_workflow_queue)

WorkflowTask enriquecida com dados do caso, veículo, cliente e técnico.

```ts
type QueueItem = WorkflowTask & {
  step_name: string               // "PDR", "Inspeção", etc.
  step_type: StepType
  step_order: number
  responsible_role: string | null
  case_number: string             // "DLN-20260623-664"
  total_amount: number
  customer_name: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_plate: string
  assigned_name: string | null    // Nome do técnico atribuído
  queue_position: number          // Posição na fila (1-indexed)
  wait_minutes: number            // Minutos aguardando na fila
  work_minutes: number | null     // Minutos em execução
}
```

---

### Estimate (Estimativa / Orçamento)

```ts
type Estimate = {
  id: string
  case_id: string
  type: 'individual' | 'batch'
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  total_amount: number
  line_items: EstimateLineItem[]  // JSONB
  send_status: 'pending' | 'sent' | 'failed' | null
  sent_at: string | null
  created_at: string
}

type EstimateLineItem = {
  description: string
  quantity: number
  unit_price: number
  total: number
}
```

---

### WorkOrder (Ordem de Serviço)

```ts
type WorkOrder = {
  id: string
  case_id: string
  status: string
  total_amount: number            // Snapshot do valor (imutável após criação)
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

### Commission (Comissão)

```ts
type Commission = {
  id: string
  case_id: string
  technician_id: string
  work_order_id: string
  status: 'pending_payment' | 'paid' | 'calculated' | 'closed' | 'reviewed' | 'partial'
  total_amount: number
  commission_rate: number         // Percentual
  commission_amount: number       // Valor calculado
  paid_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

### Payment (Pagamento)

```ts
type Payment = {
  id: string
  work_order_id: string
  amount: number
  payment_date: string
  payment_method: string          // 'cash', 'transfer', 'card', etc.
  notes: string | null
  created_by: string
  created_at: string
}
```

---

### Technician (Técnico)

```ts
type Technician = {
  id: string
  user_id: string                 // FK → auth.users
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
}
```

---

### CurrentTechnicianContext

Contexto resolvido pelo `resolveCurrentTechnician()` — disponível em todas as páginas mobile.

```ts
type CurrentTechnicianContext = {
  technicianId: string
  technicianName: string
  userId: string
  activeRole: string              // role ativo
  operationId: string             // operação ativa
  operationName: string           // nome da operação
  availableRoles: string[]        // todos os roles do técnico nesta operação
}
```

---

## Server Actions principais

### Workflow

```ts
// Iniciar uma task (queued → in_progress)
startTask(taskId: string, operationId: string): Promise<{ error?: string }>

// Concluir uma task (in_progress → completed)
// advanceToStepId: se fornecido, cria a próxima task automaticamente
completeTask(
  taskId: string,
  operationId: string,
  opts?: { notes?: string; payload?: Record<string, unknown>; advanceToStepId?: string }
): Promise<{ nextTaskId?: string; error?: string }>

// Submeter inspeção (approved ou rework_needed)
submitInspection(
  taskId: string,
  operationId: string,
  result: 'approved' | 'rework_needed',
  findings: InspectionFindingInput[],
  stepIds: { reworkStepId?: string; nextInspectionStepId?: string; nextStepAfterApproval?: string }
): Promise<{ error?: string }>

// Buscar fila da operação
getOperationQueue(operationId: string): Promise<QueueItem[]>

// Buscar eventos de uma task
getTaskEvents(taskId: string): Promise<WorkflowTaskEvent[]>
```

### Roles

```ts
// Resolver contexto do técnico atual (a partir dos cookies de sessão)
resolveCurrentTechnician(): Promise<CurrentTechnicianContext | null>

// Listar operações disponíveis para o usuário
getMyOperations(): Promise<Operation[]>

// Definir role e operação ativa
setActiveRole(role: string, operationId: string): Promise<{ error?: string }>
```

---

## Step Types

```ts
type StepType =
  | 'reception'
  | 'disassembly'
  | 'repair'
  | 'inspection'
  | 'rework'
  | 'assembly'
  | 'wash'
  | 'polish'
  | 'paint'
  | 'parts'
  | 'finalization'
  | 'custom'
```

---

## Mapeamento Role → Step Types

```ts
const ROLE_STEP_TYPES: Record<string, string[]> = {
  pdr_tech:   ['repair', 'rework'],
  inspector:  ['inspection'],
  assembler:  ['disassembly', 'assembly'],
  supervisor: [],   // vê tudo
  financial:  [],
  admin:      [],
}
```
