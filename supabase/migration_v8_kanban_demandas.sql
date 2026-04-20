-- ============================================================
-- RADAR VEON v8 — Kanban de Demandas (Gestão de Campanhas)
-- ============================================================
-- Substitui a aba Campanhas atual por um Kanban de demandas
-- organizadas por dia, com colunas customizáveis.
-- ============================================================

-- 1. Tabela de colunas do Kanban (customizáveis pela equipe)
CREATE TABLE IF NOT EXISTS demanda_colunas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT 'gray',
  ordem INTEGER NOT NULL DEFAULT 0,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed das 3 colunas padrão (inspirado no Notion do Instituto Veon)
INSERT INTO demanda_colunas (id, nome, cor, ordem) VALUES
  ('nao_iniciado', 'Não iniciado', 'gray', 0),
  ('em_andamento', 'Em andamento', 'blue', 1),
  ('concluido', 'Concluído', 'green', 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabela de demandas
CREATE TABLE IF NOT EXISTS demandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  tripulante_id UUID REFERENCES tripulantes(id) ON DELETE SET NULL,
  coluna_id TEXT NOT NULL DEFAULT 'nao_iniciado' REFERENCES demanda_colunas(id) ON DELETE SET DEFAULT,
  data_demanda DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_nome TEXT DEFAULT '',
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_demandas_data ON demandas(data_demanda DESC);
CREATE INDEX IF NOT EXISTS idx_demandas_coluna ON demandas(coluna_id);
CREATE INDEX IF NOT EXISTS idx_demandas_tripulante ON demandas(tripulante_id);
CREATE INDEX IF NOT EXISTS idx_demandas_autor ON demandas(autor_id);

-- Trigger de updated_at
CREATE TRIGGER trg_demandas_touch
  BEFORE UPDATE ON demandas
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 3. RLS policies
ALTER TABLE demanda_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;

-- Colunas: todo aprovado vê e edita (colaborativo)
CREATE POLICY colunas_all ON demanda_colunas
  FOR ALL TO authenticated
  USING (auth_approved())
  WITH CHECK (auth_approved());

-- Demandas: todo aprovado vê e edita
CREATE POLICY demandas_all ON demandas
  FOR ALL TO authenticated
  USING (auth_approved())
  WITH CHECK (auth_approved());

-- 4. Notificação automática quando demanda é criada
CREATE OR REPLACE FUNCTION notify_nova_demanda()
RETURNS TRIGGER AS $$
DECLARE
  v_trip_nome TEXT;
BEGIN
  IF NEW.tripulante_id IS NOT NULL THEN
    SELECT name INTO v_trip_nome FROM tripulantes WHERE id = NEW.tripulante_id;
  END IF;

  INSERT INTO notificacoes (recipient_id, tipo, titulo, descricao, link_entity, autor_id)
  VALUES (
    NULL,  -- broadcast para todos
    'new_campanha',
    'Nova demanda criada',
    NEW.titulo || CASE WHEN v_trip_nome IS NOT NULL THEN ' · ' || v_trip_nome ELSE '' END,
    'demanda/' || NEW.id::text,
    NEW.autor_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_demandas_notify ON demandas;
CREATE TRIGGER trg_demandas_notify
  AFTER INSERT ON demandas
  FOR EACH ROW EXECUTE FUNCTION notify_nova_demanda();

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE demandas;
ALTER PUBLICATION supabase_realtime ADD TABLE demanda_colunas;

-- ============================================================
-- FIM v8 — Kanban pronto no Supabase
-- ============================================================
