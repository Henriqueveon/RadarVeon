-- ============================================================
-- RADAR VEON v3 — Patch de Segurança (rode no SQL Editor)
-- Corrige privilege escalation: usuário não pode se auto-aprovar
-- ou trocar seu próprio role
-- ============================================================

-- 1. Drop a policy fraca que permitia alterar qualquer coluna
DROP POLICY IF EXISTS profiles_update_self ON profiles;

-- 2. Recria com WITH CHECK travando role e approved
-- USING: quais linhas o usuário vê para editar (próprio perfil)
-- WITH CHECK: restringe o resultado após UPDATE —
--   role e approved NÃO podem mudar na própria linha
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Garante que role não foi alterado nesta atualização
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    -- Garante que approved não foi alterado
    AND approved = (SELECT approved FROM profiles WHERE id = auth.uid())
  );

-- 3. Almirante continua podendo atualizar TODO campo em qualquer linha
-- (policy profiles_update_almirante já existe e usa auth_role() = 'almirante')

-- 4. Cleanup de INSERT em profiles — só permite criar o próprio perfil
-- com role diferente de almirante (almirante só é criado por outro almirante)
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND approved = FALSE       -- Sempre entra como não aprovado
    AND role IN ('cabo', 'tenente', 'capitao')  -- Não pode se criar como almirante
  );

-- Almirante pode criar qualquer perfil (raro, mas disponível)
CREATE POLICY profiles_insert_almirante ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'almirante');

-- ============================================================
-- FIM — Patch v3
-- ============================================================
