-- ============================================================
-- RADAR VEON v4 — Signup Trigger
-- Cria profile automaticamente quando auth.users é criado
-- Resolve erro "row violates RLS policy" no signup
-- ============================================================

-- Função que cria o profile automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_nome TEXT;
  v_obs TEXT;
  v_avatar TEXT;
BEGIN
  -- Se já existe profile pra esse user, não faz nada (idempotente)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Lê dados do raw_user_meta_data (passados no options.data do signUp)
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  v_obs := NEW.raw_user_meta_data->>'observacao_funcao';
  v_avatar := NEW.raw_user_meta_data->>'avatar_iniciais';

  -- Role: aceita do metadata, mas NUNCA permite almirante via signup
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenente'::user_role);
  IF v_role = 'almirante' THEN
    v_role := 'tenente';
  END IF;

  INSERT INTO profiles (
    id, nome, email, role, observacao_funcao, avatar_iniciais, approved
  ) VALUES (
    NEW.id,
    v_nome,
    NEW.email,
    v_role,
    v_obs,
    v_avatar,
    FALSE  -- Sempre inicia como não aprovado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger que dispara após novo signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Mantém a policy profiles_insert_self como fallback (caso trigger falhe)
-- Ela continua segura: força approved=false e nunca aceita almirante
-- Policy atualmente existente — não precisa alterar

-- ============================================================
-- FIM — v4 Signup Trigger
-- ============================================================
