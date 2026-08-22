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
