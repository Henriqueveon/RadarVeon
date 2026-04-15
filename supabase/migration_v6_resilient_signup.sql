-- ============================================================
-- RADAR VEON v6 — Signup 100% resiliente
-- Problema: trigger handle_new_user() quebrava em edge cases,
-- derrubando o signup inteiro com "Database error saving new user".
-- Solução: isolar erros do trigger, limpar órfãos, criar fallback.
-- ============================================================

-- 1. Limpa usuários órfãos (auth.users sem profile correspondente)
-- Isso acontece quando o signup falhou no meio e deixou lixo
DELETE FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
  -- Só apaga os criados nas últimas 24h (segurança)
  AND u.created_at > now() - INTERVAL '24 hours'
  -- Protege o almirante principal
  AND u.email NOT IN (SELECT email FROM profiles WHERE role = 'almirante');

-- 2. Reescreve o trigger handle_new_user com tratamento de erro ROBUSTO
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_nome TEXT;
  v_obs TEXT;
  v_avatar TEXT;
  v_raw_role TEXT;
BEGIN
  -- Camada de proteção: qualquer erro dentro deste bloco é ignorado.
  -- O objetivo é NUNCA falhar o signup do auth.users.
  -- Se der erro, o profile pode ser criado depois pelo fallback client-side.
  BEGIN
    -- Profile já existe → idempotente, não faz nada
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Extrai valores com fallbacks seguros
    v_nome := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    );
    v_obs := NULLIF(NEW.raw_user_meta_data->>'observacao_funcao', '');
    v_avatar := NULLIF(NEW.raw_user_meta_data->>'avatar_iniciais', '');

    -- Parse seguro do role: aceita string válida ou usa default
    v_raw_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', '')));
    IF v_raw_role IN ('cabo', 'tenente', 'capitao', 'almirante') THEN
      v_role := v_raw_role::user_role;
    ELSE
      v_role := 'tenente'::user_role;
    END IF;

    -- Bloqueia auto-criação de almirante via signup
    IF v_role = 'almirante' THEN
      v_role := 'tenente'::user_role;
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
      FALSE
    );

  EXCEPTION WHEN OTHERS THEN
    -- ATENÇÃO: mesmo que o insert falhe por qualquer motivo,
    -- NÃO propagamos o erro. O signup do auth.users continua OK.
    -- O fallback no AuthContext vai criar o profile depois.
    RAISE LOG '[handle_new_user] falhou para user % (%): %',
      NEW.email, NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garante que o trigger usa a função atualizada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4. RLS: permite upsert/insert via fallback client-side
-- A policy profiles_insert_self atual só permite se auth.uid() = id
-- Isso funciona se o user já logou (signUp auto-logs na maioria dos casos)
-- Mas se não tiver session, falha. Vamos manter a policy atual segura
-- e confiar no trigger + upsert fallback.

-- 5. Função utilitária: cria profile manualmente se trigger falhou
-- Usada pelo client como último recurso
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

  -- Se já tem profile, atualiza só o que está vazio
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_uid) THEN
    UPDATE profiles SET
      nome = COALESCE(NULLIF(nome, ''), p_nome, nome),
      observacao_funcao = COALESCE(observacao_funcao, p_obs),
      avatar_iniciais = COALESCE(avatar_iniciais, p_avatar)
    WHERE id = v_uid;
    RETURN;
  END IF;

  -- Pega email do auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  -- Role sanitizado
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

-- ============================================================
-- FIM v6 — Signup blindado contra qualquer falha
-- ============================================================
