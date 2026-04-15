-- ============================================================
-- RADAR VEON v7 — Remove trigger problemático do signup
-- ============================================================
-- DIAGNÓSTICO: O trigger on_auth_user_created em auth.users estava
-- causando rollback do signup inteiro quando qualquer sub-operação
-- falhava (RLS, permissão, outro trigger, race condition).
--
-- SOLUÇÃO: Remover o trigger. O profile é criado pelo client logo
-- após signup via RPC ensure_profile(). Signup em auth.users fica
-- isolado e rápido. Se ensure_profile falhar, o user ainda está
-- criado — Almirante pode criar profile manualmente.
-- ============================================================

-- 1. Remove trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remove a função handle_new_user (não é mais usada)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 3. Garante que ensure_profile existe e funciona (idempotente)
CREATE OR REPLACE FUNCTION ensure_profile(
  p_nome TEXT,
  p_role TEXT,
  p_obs TEXT,
  p_avatar TEXT
)
RETURNS VOID AS $$
DECLARE
  v_role user_role;
  v_uid UUID;
  v_email TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Se já existe, atualiza só o que estiver vazio
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    UPDATE profiles SET
      nome = COALESCE(NULLIF(nome, ''), p_nome, nome),
      observacao_funcao = COALESCE(observacao_funcao, p_obs),
      avatar_iniciais = COALESCE(avatar_iniciais, p_avatar)
    WHERE id = v_uid;
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  IF LOWER(TRIM(p_role)) IN ('cabo', 'tenente', 'capitao') THEN
    v_role := LOWER(TRIM(p_role))::user_role;
  ELSE
    v_role := 'tenente'::user_role;
  END IF;

  INSERT INTO profiles (id, nome, email, role, observacao_funcao, avatar_iniciais, approved)
  VALUES (
    v_uid,
    COALESCE(NULLIF(TRIM(p_nome), ''), split_part(v_email, '@', 1)),
    v_email,
    v_role,
    NULLIF(p_obs, ''),
    NULLIF(p_avatar, ''),
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION ensure_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Garante a policy profiles_insert_self permissiva o suficiente
-- pra permitir o insert via client logo após signup
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND approved = FALSE
    AND role IN ('cabo', 'tenente', 'capitao')
  );

-- 5. Limpa órfãos novamente (qualquer auth.users sem profile das últimas 48h)
DELETE FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
  AND u.created_at > now() - INTERVAL '48 hours'
  AND u.email NOT IN (SELECT email FROM profiles WHERE role = 'almirante');

-- 6. Verifica que o trigger notify_access_request continua em profiles
-- (esse é importante e não problemático — dispara quando profile é criado)
-- Se não existir, cria:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_access_request'
  ) THEN
    CREATE TRIGGER trg_profiles_access_request
      AFTER INSERT ON profiles
      FOR EACH ROW EXECUTE FUNCTION notify_access_request();
  END IF;
END $$;

-- ============================================================
-- FIM v7 — Signup sem trigger = signup blindado
-- ============================================================
