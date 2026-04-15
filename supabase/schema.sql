-- ============================================================
-- RADAR VEON — Schema Completo (Supabase / PostgreSQL)
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums
CREATE TYPE user_role AS ENUM ('almirante', 'equipe', 'tripulante');
CREATE TYPE eixo_type AS ENUM ('servico', 'treinamento', 'tecnologia');
CREATE TYPE health_status AS ENUM ('verde', 'amarelo', 'vermelho');
CREATE TYPE frequencia_type AS ENUM ('diaria', 'semanal', 'quinzenal', 'mensal');
CREATE TYPE ticket_status AS ENUM ('aberto', 'em_andamento', 'resolvido');
CREATE TYPE ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE reuniao_tipo AS ENUM ('acompanhamento', 'onboarding', 'estrategia');

-- 3. Tables

-- profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'tripulante',
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tripulantes
CREATE TABLE tripulantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  phone TEXT NOT NULL,
  contract_start DATE NOT NULL,
  contract_plan TEXT NOT NULL,
  health_score INTEGER NOT NULL DEFAULT 100,
  health_status health_status NOT NULL DEFAULT 'verde',
  meta_ads_account_id TEXT,
  google_ads_account_id TEXT,
  agulha_active BOOLEAN NOT NULL DEFAULT FALSE,
  perfil_comportamental_done BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- entregas
CREATE TABLE entregas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  eixo eixo_type NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- cadencias
CREATE TABLE cadencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eixo eixo_type NOT NULL,
  tipo TEXT NOT NULL,
  frequencia frequencia_type NOT NULL,
  quantidade_minima INTEGER NOT NULL DEFAULT 1,
  peso_no_eixo DECIMAL(5,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- tickets_suporte
CREATE TABLE tickets_suporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  aberto_por UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assunto TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  status ticket_status NOT NULL DEFAULT 'aberto',
  prioridade ticket_prioridade NOT NULL DEFAULT 'media',
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- presencas_oficina
CREATE TABLE presencas_oficina (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oficina_numero INTEGER NOT NULL,
  oficina_tema TEXT NOT NULL,
  oficina_data DATE NOT NULL,
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  notas TEXT
);

-- reunioes
CREATE TABLE reunioes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tipo reuniao_tipo NOT NULL,
  pauta TEXT NOT NULL DEFAULT '',
  acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_reuniao TIMESTAMPTZ NOT NULL
);

-- 4. Indexes
CREATE INDEX idx_tripulantes_health_status ON tripulantes(health_status);
CREATE INDEX idx_tripulantes_active ON tripulantes(active);
CREATE INDEX idx_entregas_tripulante_id ON entregas(tripulante_id);
CREATE INDEX idx_entregas_responsavel_id ON entregas(responsavel_id);
CREATE INDEX idx_entregas_eixo ON entregas(eixo);
CREATE INDEX idx_entregas_delivered_at ON entregas(delivered_at);
CREATE INDEX idx_tickets_tripulante_id ON tickets_suporte(tripulante_id);
CREATE INDEX idx_tickets_status ON tickets_suporte(status);
CREATE INDEX idx_presencas_tripulante_id ON presencas_oficina(tripulante_id);
CREATE INDEX idx_presencas_oficina_data ON presencas_oficina(oficina_data);
CREATE INDEX idx_reunioes_tripulante_id ON reunioes(tripulante_id);
CREATE INDEX idx_reunioes_data ON reunioes(data_reuniao);

-- 5. RLS Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripulantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas_oficina ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunioes ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_almirante" ON profiles
  FOR SELECT USING (get_user_role() = 'almirante');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_all_almirante" ON profiles
  FOR ALL USING (get_user_role() = 'almirante');

-- tripulantes policies
CREATE POLICY "tripulantes_select_staff" ON tripulantes
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "tripulantes_select_own" ON tripulantes
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "tripulantes_insert_almirante" ON tripulantes
  FOR INSERT WITH CHECK (get_user_role() = 'almirante');

CREATE POLICY "tripulantes_update_staff" ON tripulantes
  FOR UPDATE USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "tripulantes_delete_almirante" ON tripulantes
  FOR DELETE USING (get_user_role() = 'almirante');

-- entregas policies
CREATE POLICY "entregas_select_staff" ON entregas
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "entregas_select_own" ON entregas
  FOR SELECT USING (
    tripulante_id IN (SELECT id FROM tripulantes WHERE profile_id = auth.uid())
  );

CREATE POLICY "entregas_insert_staff" ON entregas
  FOR INSERT WITH CHECK (get_user_role() IN ('almirante', 'equipe'));

-- cadencias policies (read-only for equipe, full for almirante)
CREATE POLICY "cadencias_select_staff" ON cadencias
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "cadencias_all_almirante" ON cadencias
  FOR ALL USING (get_user_role() = 'almirante');

-- tickets policies
CREATE POLICY "tickets_select_staff" ON tickets_suporte
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "tickets_select_own" ON tickets_suporte
  FOR SELECT USING (
    tripulante_id IN (SELECT id FROM tripulantes WHERE profile_id = auth.uid())
  );

CREATE POLICY "tickets_insert_all" ON tickets_suporte
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tickets_update_staff" ON tickets_suporte
  FOR UPDATE USING (get_user_role() IN ('almirante', 'equipe'));

-- presencas policies
CREATE POLICY "presencas_select_staff" ON presencas_oficina
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "presencas_select_own" ON presencas_oficina
  FOR SELECT USING (
    tripulante_id IN (SELECT id FROM tripulantes WHERE profile_id = auth.uid())
  );

CREATE POLICY "presencas_insert_staff" ON presencas_oficina
  FOR INSERT WITH CHECK (get_user_role() IN ('almirante', 'equipe'));

-- reunioes policies
CREATE POLICY "reunioes_select_staff" ON reunioes
  FOR SELECT USING (get_user_role() IN ('almirante', 'equipe'));

CREATE POLICY "reunioes_select_own" ON reunioes
  FOR SELECT USING (
    tripulante_id IN (SELECT id FROM tripulantes WHERE profile_id = auth.uid())
  );

CREATE POLICY "reunioes_insert_staff" ON reunioes
  FOR INSERT WITH CHECK (get_user_role() IN ('almirante', 'equipe'));

-- 6. Health Score Calculation Function

CREATE OR REPLACE FUNCTION calculate_health_score(p_tripulante_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score DECIMAL := 0;
  v_eixo_score DECIMAL;
  v_cadencia RECORD;
  v_count INTEGER;
  v_expected INTEGER;
  v_eixo_total_peso DECIMAL;
  v_eixo_weighted_sum DECIMAL;
  v_peso_servico DECIMAL := 50;
  v_peso_treinamento DECIMAL := 30;
  v_peso_tecnologia DECIMAL := 20;
  v_eixo_peso DECIMAL;
  v_final_score INTEGER;
  v_status health_status;
BEGIN
  -- Calculate score for each axis
  FOR v_eixo_peso IN
    SELECT unnest(ARRAY[v_peso_servico, v_peso_treinamento, v_peso_tecnologia])
  LOOP
    -- This loop is just for structure; we process each eixo below
    NULL;
  END LOOP;

  -- Process each eixo
  FOR v_eixo_score IN (
    WITH eixos AS (
      SELECT 'servico'::eixo_type AS eixo, 50.0 AS peso
      UNION ALL SELECT 'treinamento', 30.0
      UNION ALL SELECT 'tecnologia', 20.0
    )
    SELECT
      e.peso * COALESCE(
        (
          SELECT
            CASE WHEN SUM(c.peso_no_eixo) = 0 THEN 1
            ELSE
              SUM(
                c.peso_no_eixo * LEAST(
                  1.0,
                  COALESCE(delivery_counts.cnt, 0)::decimal /
                  GREATEST(1, c.quantidade_minima *
                    CASE c.frequencia
                      WHEN 'diaria' THEN 30
                      WHEN 'semanal' THEN 4
                      WHEN 'quinzenal' THEN 2
                      WHEN 'mensal' THEN 1
                    END
                  )
                )
              ) / NULLIF(SUM(c.peso_no_eixo), 0)
            END
          FROM cadencias c
          LEFT JOIN (
            SELECT tipo, COUNT(*) AS cnt
            FROM entregas
            WHERE tripulante_id = p_tripulante_id
              AND eixo = e.eixo
              AND delivered_at >= now() - INTERVAL '30 days'
            GROUP BY tipo
          ) delivery_counts ON delivery_counts.tipo = c.tipo
          WHERE c.eixo = e.eixo AND c.active = TRUE
        ),
        1.0
      ) AS eixo_contribution
    FROM eixos e
  )
  LOOP
    v_score := v_score + v_eixo_score;
  END LOOP;

  v_final_score := ROUND(v_score);
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  -- Determine status
  IF v_final_score >= 80 THEN
    v_status := 'verde';
  ELSIF v_final_score >= 50 THEN
    v_status := 'amarelo';
  ELSE
    v_status := 'vermelho';
  END IF;

  -- Update tripulante
  UPDATE tripulantes
  SET health_score = v_final_score,
      health_status = v_status
  WHERE id = p_tripulante_id;

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger: recalculate score after new entrega

CREATE OR REPLACE FUNCTION trigger_recalculate_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_health_score(NEW.tripulante_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_entregas_recalculate_score
  AFTER INSERT ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_score();

-- 8. Seed: Cadencias padrão do Instituto Veon

INSERT INTO cadencias (eixo, tipo, frequencia, quantidade_minima, peso_no_eixo, active) VALUES
  -- Eixo Serviço (pesos somam 100 dentro do eixo)
  ('servico', 'Otimização de campanha', 'semanal', 1, 30, TRUE),
  ('servico', 'Criativo produzido', 'quinzenal', 2, 25, TRUE),
  ('servico', 'Construção de oferta', 'mensal', 1, 15, TRUE),
  ('servico', 'Reunião de acompanhamento', 'quinzenal', 1, 20, TRUE),
  ('servico', 'Suporte pontual', 'semanal', 0, 10, TRUE),

  -- Eixo Treinamento (pesos somam 100 dentro do eixo)
  ('treinamento', 'Oficina (grupo)', 'semanal', 1, 50, TRUE),
  ('treinamento', 'Treinamento individual', 'mensal', 1, 35, TRUE),
  ('treinamento', 'Material disponibilizado', 'semanal', 1, 15, TRUE),

  -- Eixo Tecnologia (pesos somam 100 dentro do eixo)
  ('tecnologia', 'Implantação AGULHA', 'mensal', 0, 50, TRUE),
  ('tecnologia', 'Teste de perfil aplicado', 'mensal', 0, 30, TRUE),
  ('tecnologia', 'Suporte técnico', 'mensal', 0, 20, TRUE);
