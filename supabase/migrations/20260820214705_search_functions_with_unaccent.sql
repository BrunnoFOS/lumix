-- Funções RPC para busca com unaccent

-- Buscar empresas ignorando acentos
CREATE OR REPLACE FUNCTION search_empresas_unaccent(search_term text)
RETURNS TABLE (
  id uuid,
  nome text,
  cnpj text,
  cidade text,
  estado text,
  ativa boolean,
  arquivada boolean
) AS $$
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

-- Buscar UCs ignorando acentos
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
) AS $$
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

-- Comentário: Estas funções permitem busca case-insensitive e sem acentos
-- Uso: SELECT * FROM search_empresas_unaccent('sao paulo');
-- Encontrará: "São Paulo", "SAO PAULO", "são paulo", etc.
