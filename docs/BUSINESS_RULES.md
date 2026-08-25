# Regras de Negócio — D'LEON ERP

## Fluxo Operacional PDR (Workflow)

O fluxo padrão de um veículo em reparo de granizo:

```
Entrada do caso
    ↓
[Desmontagem]          — Assembler: remove molduras e peças
    ↓
[PDR / Reparo]         — PDR Tech: reparo de amassados painel por painel
    ↓
[Inspeção]             — Inspector: avalia qualidade painel por painel
    ↓
    ├─ APROVADO ────→ [Montagem] → Finalizado
    │
    └─ REPASSE ─────→ [Repasse PDR] → [Inspeção Round+1] → (loop)
```

### Regras do Workflow

- Cada veículo (case) gera **tasks individuais** por etapa dentro de uma operação
- Tasks têm `status`: `queued` → `in_progress` → `completed` (ou `skipped`/`cancelled`)
- Apenas **1 task por vez** pode estar `in_progress` por técnico
- O campo `round` conta quantas vezes o veículo passou pela inspeção (começa em 1)
- Quando uma inspeção resulta em `rework_needed`:
  - Cria task de `rework` (repasse) para o PDR tech
  - Cria task de `inspection` com `round = round + 1`
- Quando uma inspeção resulta em `approved`:
  - Cria task de `assembly` para o assembler
- Quando desmontagem é concluída:
  - Cria task de `repair` (PDR) automaticamente via `advanceToStepId`

### Step Types disponíveis

| step_type | Role responsável | Descrição |
|---|---|---|
| `reception` | — | Recepção do veículo |
| `disassembly` | assembler | Desmontagem de peças |
| `repair` | pdr_tech | Reparo PDR dos amassados |
| `inspection` | inspector | Inspeção de qualidade (13 painéis) |
| `rework` | pdr_tech | Repasse após inspeção reprovada |
| `assembly` | assembler | Remontagem das peças |
| `wash` | — | Lavagem |
| `polish` | — | Polimento |
| `paint` | — | Pintura |
| `parts` | — | Troca de peças |
| `finalization` | — | Finalização e entrega |
| `custom` | — | Etapa livre |

---

## Fluxo Financeiro

```
Caso criado
    ↓
Orçamento (Estimativa)
    ├─ Tipo: Individual (por veículo)
    └─ Tipo: Lote (por operação/concessionária)
    ↓
Ordem de Serviço (OS / Work Order)
    ↓
Comissão calculada
    ↓
Liberação (aprovação pelo supervisor/financeiro)
    ↓
Repasse ao técnico
    ↓
Pagamento registrado
```

### Tipos de orçamento

- **Individual**: orçamento por veículo, com valores por painel/peça
- **Lote**: orçamento global para um conjunto de veículos (ex: lote de 50 carros da concessionária)

### Regras financeiras

- Uma OS é criada a partir de um caso com orçamento aprovado
- A comissão do técnico é calculada com base no valor da OS e na tabela de preços
- O repasse só pode ser realizado após liberação explícita pelo financeiro/supervisor
- Pagamentos são registrados manualmente e vinculados à OS

---

## Papéis (Roles)

| Role | Acesso mobile | Acesso admin | Descrição |
|---|---|---|---|
| `pdr_tech` | Home PDR (repair + rework) | Limitado | Técnico de PDR |
| `inspector` | Home Inspector (inspection) | Limitado | Inspetor de qualidade |
| `assembler` | Home Assembler (disassembly + assembly) | Limitado | Desmontador/Montador |
| `supervisor` | Fila geral | Completo | Supervisão da operação |
| `financial` | — | Módulo financeiro | Gestão financeira |
| `admin` | — | Completo | Administrador geral |

### Regras de permissão

- Um técnico pode ter **múltiplos roles** na mesma operação
- O role ativo é armazenado em `user_session_state.active_role`
- A operação ativa é armazenada em `user_session_state.active_operation_id`
- O técnico muda seu role ativo via `/mobile/profile`
- A view `v_workflow_queue` filtra tasks por `step_type` compatível com o role ativo

---

## Operações

Uma **Operação** representa um bloco de trabalho com um cliente/concessionária. Exemplos:
- "Daihatsu Ibaraki — Agosto 2026"
- "Toyota Pátio Nagoya — Granizo Junho"
- "Cliente Individual — Honda Fit"

### Hierarquia

```
Operation (bloco de trabalho)
  └─ Case (veículo individual)
       ├─ Estimate (orçamento)
       ├─ WorkOrder (OS)
       └─ WorkflowTasks (fila de tarefas)
```

### Regras da operação

- Uma operação tem um **template de workflow** que define quais etapas existem
- Técnicos são adicionados à operação como membros com roles específicos
- A fila de cada técnico mostra apenas as tasks do seu role dentro da operação ativa

---

## Inspeção de painéis

O processo de inspeção avalia **13 painéis** do veículo:

| id | Label |
|---|---|
| `roof` | Teto |
| `bonnet` | Capô |
| `l_front_door` | Porta Dianteira Esq |
| `r_front_door` | Porta Dianteira Dir |
| `l_rear_door` | Porta Traseira Esq |
| `r_rear_door` | Porta Traseira Dir |
| `l_front_wing` | Para-lama Dianteiro Esq |
| `r_front_wing` | Para-lama Dianteiro Dir |
| `l_rear_fender` | Para-lama Traseiro Esq |
| `r_rear_fender` | Para-lama Traseiro Dir |
| `trunk` | Tampa do Porta-malas |
| `l_sill` | Soleira Esq |
| `r_sill` | Soleira Dir |

Cada painel recebe: `OK` ou `Problema` (com observação e severidade `minor`/`major`/`critical`).  
Os resultados são salvos em `inspection_findings`.

Se **qualquer painel** tiver problema → resultado `rework_needed`.  
Todos OK → resultado `approved`.

---

## Casos (Cases)

- Um case representa um veículo específico em reparo
- Campos principais: `case_number` (gerado automaticamente), `status`, `customer_id`, `vehicle_id`, `operation_id`
- Status do case: `draft` → `active` → `completed` / `cancelled`
- O status pode avançar manualmente pelo admin/supervisor ou automaticamente quando o workflow termina

---

## Templates de Workflow

- Um template define a sequência de steps de produção
- É reutilizável entre operações do mesmo tipo
- Exemplo: template "Granizo Padrão" = disassembly → repair → inspection → rework → inspection → assembly
- Cada step tem `sort_order`, `responsible_role` e `auto_advance`
