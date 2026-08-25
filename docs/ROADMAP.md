# Roadmap — D'LEON ERP

## ✅ Concluído

### Infraestrutura
- [x] Setup Next.js 15 + Supabase + TypeScript
- [x] Autenticação (login, middleware, RLS)
- [x] Layout admin (AppShell, sidebar, navegação)
- [x] Schema base: customers, vehicles, cases

### Módulo Financeiro
- [x] Tabela de preços (`/precos`)
- [x] Estimativas / Orçamentos — editor, PDF, envio por email
- [x] Pagamentos — registro e listagem
- [x] Comissões — cálculo, fechamento, pagamento
- [x] Repasse — solicitação, liberação, registro
- [x] Dashboard consolidado de pagamentos

### Módulo Operacional
- [x] Clientes, Veículos, Casos
- [x] Ordens de Serviço (Work Orders)
- [x] Operações (blocos de trabalho por cliente/concessionária)
- [x] Técnicos — perfil, roles, operações

### Workflow Engine
- [x] Templates de workflow (etapas configuráveis)
- [x] Workflow tasks — fila por operação
- [x] View `v_workflow_queue` com dados completos
- [x] Server actions: `startTask`, `completeTask`, `submitInspection`
- [x] `advanceToStepId` — auto-criação da próxima task

### Mobile App — Técnico
- [x] **Fase A** — Autenticação mobile, seleção de role e operação, session state
- [x] **Fase B** — Mobile PDR Tech: fila de reparos e repassses, timer, iniciar/concluir
- [x] **Fase C** — Mobile Inspector: fila de inspeções, formulário de 13 painéis, aprovação/repasse, rounds
- [x] **Fase D** — Mobile Assembler: desmontagem, montagem, timer, auto-criação de repair task

### Documentação
- [x] **Sprint 1** — pasta `docs/` com 11 documentos estruturados

---

## 🔄 Em desenvolvimento

### Mobile App
- [ ] **Fase E** — Supervisor Dashboard mobile (visão geral da fila por operação)

---

## 📋 Próximas fases

### Fase E — Supervisor Mobile
- Visão consolidada de toda a fila da operação
- Filtros por step_type, status, prioridade
- Mover/repriorizar tasks
- Ver histórico de qualquer task

### Fase F — Gestão de Operações (Admin)
- Dashboard da operação com KPIs
- Gráficos de throughput por step
- Relatório de produtividade por técnico
- Exportação de dados (CSV, Excel)

### Fase G — Módulo de Fotos
- Upload de fotos nas tasks (inspection_findings)
- Galeria por veículo/caso
- Comparativo antes/depois
- Integração com armazenamento Supabase Storage

### Fase H — Notificações
- Push notifications para técnicos (nova task na fila)
- Email para clientes (status do veículo)
- Alertas para supervisor (task parada há muito tempo)

### Fase I — Assinatura Digital
- Assinatura eletrônica nas estimativas
- Workflow de aprovação pelo cliente
- Envio por link (sem login)

### Fase J — Relatórios e BI
- Dashboard executivo
- Relatórios por período, cliente, técnico
- Exportação para Excel
- Comparativo de desempenho entre operações

### Fase K — Multi-empresa
- Suporte a múltiplas empresas no mesmo sistema
- Isolamento por `company_id` em todas as tabelas
- Planos e billing

---

## Débitos técnicos (ver TODO.md)

- Migrations `003` e `004` fora do diretório padrão
- `types/pagamentos.ts` duplicado em `lib/types/pagamentos.ts`
- `components/pagamentos/` e `components/payments/` sem hierarquia clara
- `useElapsed` reimplementado em 3 arquivos (resolvido na Sprint 2)
- `EstimativaShell.tsx` com 832 linhas (candidato a divisão)
- `workflow/actions.ts` com 711 linhas (candidato a divisão em actions + queries)
