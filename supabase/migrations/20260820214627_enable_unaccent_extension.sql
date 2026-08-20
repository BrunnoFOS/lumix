-- Habilitar extensão unaccent para busca sem acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Comentário: Esta extensão permite buscar texto ignorando acentos
-- Exemplo: unaccent('São Paulo') retorna 'Sao Paulo'
-- Uso em queries: WHERE unaccent(nome) ILIKE unaccent('%search%')
