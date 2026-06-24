-- ============================================================
-- D'LEON ERP — Módulo de Pagamentos
-- Migration: 003_pagamentos.sql
-- ============================================================

-- Faturas (faturamento ao cliente)
CREATE TABLE IF NOT EXISTS faturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          TEXT UNIQUE NOT NULL,
  cliente_id      UUID NOT NULL REFERENCES clientes(id),
  os_ids          UUID[] DEFAULT '{}',
  valor_total     NUMERIC(12, 2) NOT NULL,
  data_emissao    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  data_pagamento  DATE,
  status          TEXT NOT NULL DEFAULT 'aberta'
                  CHECK (status IN ('aberta','pago','vencido','cancelado')),
  metodo_pagamento TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Comissões dos técnicos
CREATE TABLE IF NOT EXISTS comissoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id      UUID NOT NULL REFERENCES tecnicos(id),
  mes_referencia  DATE NOT NULL,
  os_ids          UUID[] DEFAULT '{}',
  valor_base      NUMERIC(12, 2) NOT NULL,
  percentual      NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  valor_comissao  NUMERIC(12, 2) GENERATED ALWAYS AS
                  (ROUND(valor_base * percentual / 100, 0)) STORED,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','cancelado')),
  data_pagamento  DATE,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER faturas_updated_at
  BEFORE UPDATE ON faturas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER comissoes_updated_at
  BEFORE UPDATE ON comissoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_faturas_cliente   ON faturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status    ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_tecnico ON comissoes(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_mes     ON comissoes(mes_referencia);

-- RLS
ALTER TABLE faturas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faturas_auth"   ON faturas   FOR ALL TO authenticated USING (true);
CREATE POLICY "comissoes_auth" ON comissoes FOR ALL TO authenticated USING (true);

-- View: resumo mensal
CREATE OR REPLACE VIEW v_resumo_pagamentos AS
SELECT
  DATE_TRUNC('month', f.data_emissao)::DATE AS mes,
  COUNT(*) AS total_faturas,
  SUM(f.valor_total) AS faturamento_total,
  SUM(CASE WHEN f.status = 'pago'    THEN f.valor_total ELSE 0 END) AS recebido,
  SUM(CASE WHEN f.status = 'aberta'  THEN f.valor_total ELSE 0 END) AS a_receber,
  SUM(CASE WHEN f.status = 'vencido' THEN f.valor_total ELSE 0 END) AS vencido
FROM faturas f
GROUP BY DATE_TRUNC('month', f.data_emissao)
ORDER BY mes DESC;

-- View: OS prontas para faturar
CREATE OR REPLACE VIEW v_os_para_faturar AS
SELECT
  os.id, os.numero, os.cliente_id,
  c.nome AS cliente_nome,
  os.tecnico_id,
  t.nome AS tecnico_nome,
  os.total_veiculos, os.valor_total, os.data_conclusao
FROM ordens_servico os
JOIN clientes c ON c.id = os.cliente_id
JOIN tecnicos  t ON t.id = os.tecnico_id
WHERE os.status = 'concluido'
  AND NOT EXISTS (SELECT 1 FROM faturas f WHERE os.id = ANY(f.os_ids))
ORDER BY os.data_conclusao;
