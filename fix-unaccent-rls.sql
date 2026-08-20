-- ============================================
-- CORREÇÃO: Adicionar SECURITY DEFINER às funções RPC
-- Isso permite que as funções ignorem RLS temporariamente
-- ============================================

-- Recriar função de busca para empresas com SECURITY DEFINER
CREATE OR REPLACE FUNCTION search_empresas_unaccent(search_term text)
RETURNS TABLE (
  id uuid,
  nome text,
  cnpj text,
  cidade text,
  estado text,
  ativa boolean,
  arquivada boolean
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.cnpj,
    e.cidade,
    e.estado,
    e.ativa,
    e.arquivada
  FROM empresas e
  WHERE
    unaccent(lower(e.nome)) LIKE unaccent(lower('%' || search_term || '%'))
    OR e.cnpj LIKE '%' || search_term || '%'
  ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql STABLE;

-- Recriar função de busca para UCs com SECURITY DEFINER
CREATE OR REPLACE FUNCTION search_ucs_unaccent(search_term text)
RETURNS TABLE (
  id uuid,
  empresa_id uuid,
  codigo_uc text,
  titular text,
  cidade text,
  estado text,
  distribuidora text,
  potencia_instalada_kwp decimal,
  ativa boolean,
  arquivada boolean
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id,
    uc.empresa_id,
    uc.codigo_uc,
    uc.titular,
    uc.cidade,
    uc.estado,
    uc.distribuidora,
    uc.potencia_instalada_kwp,
    uc.ativa,
    uc.arquivada
  FROM unidades_consumidoras uc
  WHERE
    uc.codigo_uc LIKE '%' || search_term || '%'
    OR unaccent(lower(uc.titular)) LIKE unaccent(lower('%' || search_term || '%'))
    OR unaccent(lower(uc.cidade)) LIKE unaccent(lower('%' || search_term || '%'))
  ORDER BY uc.codigo_uc;
END;
$$ LANGUAGE plpgsql STABLE;

-- Dar permissões de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION search_empresas_unaccent(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_ucs_unaccent(text) TO authenticated;

-- ============================================
-- FIM DA CORREÇÃO
-- ============================================
