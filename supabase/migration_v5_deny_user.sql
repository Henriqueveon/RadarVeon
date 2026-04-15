-- ============================================================
-- RADAR VEON v5 — Função deny_user
-- Ao negar acesso, apaga auth.users E profile em cascata.
-- Permite que o mesmo email tente cadastro novamente.
-- ============================================================

CREATE OR REPLACE FUNCTION deny_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verifica que quem chama é Almirante
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'almirante' THEN
    RAISE EXCEPTION 'Apenas o Almirante pode negar acesso';
  END IF;

  -- Não permite negar a si próprio
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível negar o próprio acesso';
  END IF;

  -- Deleta de auth.users — CASCADE em profiles remove o profile também
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION deny_user(UUID) TO authenticated;

-- ============================================================
-- FIM — v5
-- ============================================================
