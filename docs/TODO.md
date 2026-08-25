# TODO — D'LEON ERP

> Débitos técnicos, bugs conhecidos e melhorias pendentes.  
> Atualizar sempre que identificar um novo item ou resolver um existente.

---

## Débitos técnicos

### Alta prioridade

- [ ] **Migrations fora do lugar**: `003_pagamentos.sql` e `004_commissions.sql` estão na raiz do projeto, não em `supabase/migrations/`. Devem ser movidos para o diretório padrão.  
  _Risco: baixo (só organização). Não afeta banco pois já foram aplicados manualmente._

- [ ] **Tipos duplicados**: `types/pagamentos.ts` e `lib/types/pagamentos.ts` têm o mesmo conteúdo. Manter apenas em `types/` e atualizar imports.  
  _Arquivos afetados: ~3-5 imports._

### Média prioridade

- [ ] **`components/pagamentos/` vs `components/payments/`**: dois módulos para o mesmo domínio financeiro com nomenclatura diferente (PT vs EN). Devem ser unificados em uma pasta única no futuro.

- [ ] **`app/api/pagamentos/` vs `app/api/payments/`**: mesma situação. Verificar qual é o primário e unificar.

- [ ] **`useElapsed` duplicado**: hook reimplementado em `MobileHomePDR.tsx`, `MobileHomeAssembler.tsx` e `MobileTaskDetail.tsx`. Extrair para `hooks/useElapsed.ts` (Sprint 2).

- [ ] **`prompt_debug_v2.md` na raiz**: arquivo de debug pessoal que não deve estar no repositório. Deletar.

### Baixa prioridade

- [ ] **`EstimativaShell.tsx` (832 linhas)**: arquivo muito grande com editor, preview A4 e modal de envio misturados. Candidato a divisão em `EstimativaEditor.tsx` + `EstimativaSendModal.tsx`.

- [ ] **`workflow/actions.ts` (711 linhas)**: mistura mutações (`startTask`, `completeTask`, `submitInspection`) com queries (`getOperationQueue`, `getTaskEvents`). Candidato a divisão em `actions.ts` + `queries.ts`.

- [ ] **`work-orders/actions.ts` (582 linhas)**: arquivo grande com CRUD + lógica de status. Candidato a divisão.

- [ ] **CommissionShell.tsx erro TypeScript**: `TS2367` — comparação com `'awaiting_liberation'` que não existe no tipo de status atual. Corrigir o enum de status ou remover a comparação.

---

## Bugs conhecidos

- [ ] **None** — sem bugs conhecidos em produção no momento.

---

## Melhorias UX (mobile)

- [ ] **Fotos na inspeção**: placeholder `📷 Foto — em breve` já existe no formulário de inspeção. Implementar upload quando `inspection_findings.photo_url` for populado.
- [ ] **Timer offline**: timer para quando o técnico perde conexão e a task continua in_progress.
- [ ] **Pull-to-refresh**: substituir `router.refresh()` por um gesto de pull-to-refresh na home mobile.

---

## Infraestrutura

- [ ] **`.env.example`** não existe. Criar com as variáveis necessárias documentadas.
- [ ] **Testes automatizados**: zero coverage atualmente. Adicionar testes E2E (Playwright) para o fluxo crítico de workflow.
- [ ] **CI/CD**: configurar GitHub Actions para rodar `tsc --noEmit` e lint em cada PR.

---

## Funcionalidades futuras (ver ROADMAP.md)

- [ ] Fase E — Supervisor Dashboard mobile
- [ ] Fase F — KPIs e relatórios de operação
- [ ] Fase G — Upload de fotos
- [ ] Fase H — Push notifications
- [ ] Fase I — Assinatura digital
