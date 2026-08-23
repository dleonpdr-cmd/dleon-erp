export const WO_STATUS_LABEL: Record<string, string> = {
  waiting:          'Aguardando início',
  in_progress:      'Em reparo',
  paused:           'Pausado',
  waiting_qc:       'Aguardando QC',
  qc_rejected:      'Reprovado no QC',
  completed:        'Concluído',
  ready_to_invoice: 'Pronto para faturar',
  cancelled:        'Cancelado',
}

export const WO_STATUS_COLOR: Record<string, string> = {
  waiting:          '#555',
  in_progress:      '#FF6B00',
  paused:           '#FFB800',
  waiting_qc:       '#7F77DD',
  qc_rejected:      '#E24B4A',
  completed:        '#1D9E75',
  ready_to_invoice: '#1D9E75',
  cancelled:        '#333',
}

export const ITEM_STATUS_LABEL: Record<string, string> = {
  pending:     'Pendente',
  in_progress: 'Em andamento',
  completed:   'Concluído',
  issue:       'Problema',
}

export const ITEM_STATUS_COLOR: Record<string, string> = {
  pending:     '#555',
  in_progress: '#FF6B00',
  completed:   '#1D9E75',
  issue:       '#E24B4A',
}

export const PAUSE_REASON_LABEL: Record<string, string> = {
  lunch:               'Almoço',
  waiting_part:        'Aguardando peça',
  vehicle_unavailable: 'Veículo indisponível',
  client:              'Aguardando cliente',
  other:               'Outro',
}

export const QC_CHECKS = [
  { key: 'visual_finish',     label: 'Acabamento visual' },
  { key: 'reflection',        label: 'Reflexo da peça' },
  { key: 'waviness',          label: 'Ondulação' },
  { key: 'tool_marks',        label: 'Marcas de ferramenta' },
  { key: 'alignment',         label: 'Alinhamento' },
  { key: 'disassembly',       label: 'Desmontagem / remontagem' },
  { key: 'cleaning',          label: 'Limpeza' },
  { key: 'final_photos',      label: 'Fotos finais' },
  { key: 'additional_damage', label: 'Dano adicional' },
  { key: 'final_note',        label: 'Observação final' },
]

// ─── Utilitários de tempo ────────────────────────────────────────────────────

export function formatWorkedTime(minutes: number): string {
  if (minutes < 1) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ─── Próxima ação ─────────────────────────────────────────────────────────────

export function getNextAction(wo: {
  status: string
  items: { status: string }[]
  pauses: { ended_at: string | null }[]
}): { label: string; action: string } {
  const pendingPanels = wo.items.filter(i => i.status === 'pending').length
  const issuePanels   = wo.items.filter(i => i.status === 'issue').length

  switch (wo.status) {
    case 'waiting':
      return { label: 'Iniciar reparo', action: 'start' }
    case 'paused':
      return { label: 'Retomar reparo', action: 'resume' }
    case 'in_progress':
      if (pendingPanels > 0)
        return { label: `Concluir ${pendingPanels} painel(is) restante(s)`, action: 'panels' }
      return { label: 'Finalizar reparo', action: 'finish' }
    case 'waiting_qc':
      return { label: 'Aguardando revisão de QC', action: 'qc' }
    case 'qc_rejected':
      return { label: issuePanels > 0 ? `Corrigir ${issuePanels} painel(is)` : 'Retornar para reparo', action: 'return' }
    case 'completed':
      return { label: 'Marcar como pronto para faturar', action: 'invoice' }
    case 'ready_to_invoice':
      return { label: 'Criar 請求書', action: 'create_invoice' }
    default:
      return { label: '—', action: 'none' }
  }
}

export const WO_EVENT_LABEL: Record<string, string> = {
  created:           'OS criada',
  started:           'Reparo iniciado',
  paused:            'Serviço pausado',
  resumed:           'Serviço retomado',
  item_started:      'Painel iniciado',
  item_completed:    'Painel concluído',
  item_issue:        'Problema no painel',
  qc_submitted:      'QC submetido',
  qc_approved:       'QC aprovado',
  qc_rejected:       'QC reprovado',
  returned_to_repair:'Retornou para reparo',
  ready_to_invoice:  'Pronto para faturar',
  technician_added:  'Técnico adicionado',
  technician_removed:'Técnico removido',
  note_added:        'Observação registrada',
  status_changed:    'Status alterado',
  cancelled:         'OS cancelada',
}
