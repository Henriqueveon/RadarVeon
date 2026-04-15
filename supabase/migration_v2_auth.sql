-- ============================================================
-- RADAR VEON v2 — Sistema de Auth + Dados Compartilhados
-- Rode este arquivo NO SQL EDITOR do Supabase
-- ============================================================

-- 1. Cleanup (se rodando novamente)
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS eventos_manuais CASCADE;
DROP TABLE IF EXISTS observacoes CASCADE;
DROP TABLE IF EXISTS criativos CASCADE;
DROP TABLE IF EXISTS reunioes CASCADE;
DROP TABLE IF EXISTS campanhas CASCADE;
DROP TABLE IF EXISTS tripulantes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS campanha_tipo CASCADE;
DROP TYPE IF EXISTS reuniao_status CASCADE;
DROP TYPE IF EXISTS animo_type CASCADE;
DROP TYPE IF EXISTS criativo_tipo CASCADE;
DROP TYPE IF EXISTS criativo_status CASCADE;
DROP TYPE IF EXISTS evento_tipo CASCADE;
DROP TYPE IF EXISTS tripulante_status CASCADE;
DROP TYPE IF EXISTS notif_tipo CASCADE;

-- 2. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Enums
CREATE TYPE user_role AS ENUM ('almirante', 'capitao', 'tenente', 'cabo');
CREATE TYPE campanha_tipo AS ENUM ('nova_campanha', 'otimizacao', 'ajuste_verba', 'pausa', 'reativacao');
CREATE TYPE reuniao_status AS ENUM ('realizada', 'agendada', 'cancelada');
CREATE TYPE animo_type AS ENUM ('muito_bem', 'bem', 'neutro', 'desmotivado', 'critico');
CREATE TYPE criativo_tipo AS ENUM ('imagem_estatica', 'carrossel', 'video', 'stories', 'outro');
CREATE TYPE criativo_status AS ENUM ('em_producao', 'aprovado', 'publicado', 'reprovado');
CREATE TYPE evento_tipo AS ENUM ('onboarding', 'marco', 'alerta_manual', 'observacao', 'oficina', 'venda');
CREATE TYPE tripulante_status AS ENUM ('ativo', 'inativo');
CREATE TYPE notif_tipo AS ENUM (
  'access_request',       -- novo usuário solicitando acesso
  'access_granted',       -- seu acesso foi aprovado
  'access_denied',        -- seu acesso foi negado
  'new_tripulante',       -- tripulante cadastrado
  'new_reuniao',          -- reunião criada
  'new_campanha',         -- campanha registrada
  'new_criativo',         -- criativo registrado
  'new_evento',           -- evento manual na jornada
  'tripulante_deleted'    -- tripulante excluído
);

-- 4. Profiles (usuários da plataforma)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'tenente',
  observacao_funcao TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_iniciais TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tripulantes
CREATE TABLE tripulantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  loja TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  uf TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  tenente TEXT DEFAULT '',
  plano TEXT DEFAULT 'Plano Completo',
  status tripulante_status NOT NULL DEFAULT 'ativo',
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  avatar TEXT,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Campanhas
CREATE TABLE campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo campanha_tipo NOT NULL,
  descricao TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  investimento NUMERIC DEFAULT 0,
  resultado TEXT DEFAULT '',
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Reuniões
CREATE TABLE reunioes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  tenente_id TEXT DEFAULT '',
  data DATE NOT NULL,
  horario TEXT NOT NULL DEFAULT '09:00',
  status reuniao_status NOT NULL DEFAULT 'agendada',
  animo animo_type DEFAULT 'neutro',
  produtiva BOOLEAN DEFAULT FALSE,
  vendas_declaradas BOOLEAN DEFAULT FALSE,
  valor_vendas NUMERIC,
  diagnostico_bussola BOOLEAN DEFAULT FALSE,
  transcricao TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  link_documento TEXT DEFAULT '',
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Criativos
CREATE TABLE criativos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo criativo_tipo NOT NULL,
  status criativo_status NOT NULL DEFAULT 'em_producao',
  responsavel TEXT DEFAULT '',
  link_arquivo TEXT DEFAULT '',
  descricao TEXT DEFAULT '',
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Observações
CREATE TABLE observacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Eventos Manuais (Jornada)
CREATE TABLE eventos_manuais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripulante_id UUID NOT NULL REFERENCES tripulantes(id) ON DELETE CASCADE,
  tipo evento_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  data DATE NOT NULL,
  responsavel TEXT DEFAULT '',
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Notificações
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- null = broadcast pra todos os almirantes (ex: pedido de acesso)
  tipo notif_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  link_entity TEXT,           -- ex: 'tripulantes/uuid-aqui' pra deep link
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Indexes
CREATE INDEX idx_tripulantes_autor ON tripulantes(autor_id);
CREATE INDEX idx_tripulantes_status ON tripulantes(status);
CREATE INDEX idx_campanhas_tripulante ON campanhas(tripulante_id);
CREATE INDEX idx_campanhas_data ON campanhas(data);
CREATE INDEX idx_reunioes_tripulante ON reunioes(tripulante_id);
CREATE INDEX idx_reunioes_data ON reunioes(data);
CREATE INDEX idx_criativos_tripulante ON criativos(tripulante_id);
CREATE INDEX idx_obs_tripulante ON observacoes(tripulante_id);
CREATE INDEX idx_eventos_tripulante ON eventos_manuais(tripulante_id);
CREATE INDEX idx_notif_recipient ON notificacoes(recipient_id, lida);
CREATE INDEX idx_notif_created ON notificacoes(created_at DESC);

-- 13. Helper Functions

-- Retorna role do usuário logado
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna se o usuário logado está aprovado
CREATE OR REPLACE FUNCTION auth_approved()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT approved FROM profiles WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 14. Row Level Security

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripulantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE criativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_manuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- PROFILES: todo logado lê todos os perfis (pra ver nome/cargo de quem fez). Atualiza só o próprio. Almirante atualiza qualquer (para aprovar).
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_self ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_self ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update_almirante ON profiles FOR UPDATE TO authenticated USING (auth_role() = 'almirante');
CREATE POLICY profiles_delete_almirante ON profiles FOR DELETE TO authenticated USING (auth_role() = 'almirante');

-- DATA TABLES: só aprovados acessam. Todos os aprovados fazem tudo.
CREATE POLICY tripulantes_all ON tripulantes FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());
CREATE POLICY campanhas_all ON campanhas FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());
CREATE POLICY reunioes_all ON reunioes FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());
CREATE POLICY criativos_all ON criativos FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());
CREATE POLICY observacoes_all ON observacoes FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());
CREATE POLICY eventos_all ON eventos_manuais FOR ALL TO authenticated USING (auth_approved()) WITH CHECK (auth_approved());

-- NOTIFICATIONS:
-- SELECT: vê as próprias (recipient_id = uid) OU broadcasts sem recipient (só almirante vê essas)
CREATE POLICY notif_select_self ON notificacoes FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY notif_select_broadcast ON notificacoes FOR SELECT TO authenticated USING (recipient_id IS NULL AND auth_role() = 'almirante');
-- INSERT: qualquer usuário aprovado pode criar notificações (pra registrar suas ações)
-- Usuário novo (não aprovado) também pode inserir notif de tipo access_request
CREATE POLICY notif_insert ON notificacoes FOR INSERT TO authenticated WITH CHECK (
  auth_approved() OR tipo = 'access_request'
);
-- UPDATE: marcar como lida — só a própria
CREATE POLICY notif_update_self ON notificacoes FOR UPDATE TO authenticated USING (
  recipient_id = auth.uid() OR (recipient_id IS NULL AND auth_role() = 'almirante')
);
-- DELETE: a própria
CREATE POLICY notif_delete_self ON notificacoes FOR DELETE TO authenticated USING (
  recipient_id = auth.uid() OR auth_role() = 'almirante'
);

-- 15. Triggers — updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tripulantes_touch BEFORE UPDATE ON tripulantes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_reunioes_touch BEFORE UPDATE ON reunioes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 16. Trigger — quando novo profile é criado, notifica almirantes
CREATE OR REPLACE FUNCTION notify_access_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved = FALSE THEN
    INSERT INTO notificacoes (recipient_id, tipo, titulo, descricao, link_entity, autor_id)
    VALUES (
      NULL,  -- broadcast pra almirantes
      'access_request',
      'Nova solicitação de acesso',
      NEW.nome || ' (' || NEW.email || ') pediu acesso como ' || NEW.role::text,
      'profile/' || NEW.id::text,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_access_request
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION notify_access_request();

-- 17. Trigger — quando profile é aprovado, notifica o usuário
CREATE OR REPLACE FUNCTION notify_access_granted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved = TRUE AND OLD.approved = FALSE THEN
    INSERT INTO notificacoes (recipient_id, tipo, titulo, descricao, autor_id)
    VALUES (
      NEW.id,
      'access_granted',
      'Acesso aprovado!',
      'Bem-vindo ao RADAR VEON. Sua conta foi aprovada pelo Almirante.',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_access_granted
AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION notify_access_granted();

-- 18. Realtime — habilitar broadcast das tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE tripulantes;
ALTER PUBLICATION supabase_realtime ADD TABLE campanhas;
ALTER PUBLICATION supabase_realtime ADD TABLE reunioes;
ALTER PUBLICATION supabase_realtime ADD TABLE criativos;
ALTER PUBLICATION supabase_realtime ADD TABLE observacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE eventos_manuais;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- 19. Garantir que você (Nicholas) vira Almirante aprovado
-- Execute ISSO separadamente depois de criar sua conta:
-- UPDATE profiles SET role = 'almirante', approved = true WHERE email = 'ninobr112@gmail.com';

-- ============================================================
-- FIM — Schema v2 pronto
-- ============================================================
