-- Fix RLS recursion: create SECURITY DEFINER functions to get user role/empresa
-- without triggering recursive RLS checks on profiles table.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM profiles WHERE id = auth.uid();
$$;

-- Drop all existing policies and recreate using the new functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============ PROFILES ============
CREATE POLICY "Admin lê todos os profiles"
  ON profiles FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê próprio profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Usuário atualiza próprio profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin atualiza qualquer profile"
  ON profiles FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta profiles"
  ON profiles FOR DELETE USING (get_user_role() = 'admin');

-- ============ EMPRESAS ============
CREATE POLICY "Admin lê todas as empresas"
  ON empresas FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê própria empresa"
  ON empresas FOR SELECT USING (
    id = get_user_empresa_id() OR matriz_id = get_user_empresa_id()
  );

CREATE POLICY "Admin insere empresas"
  ON empresas FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin atualiza empresas"
  ON empresas FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta empresas"
  ON empresas FOR DELETE USING (get_user_role() = 'admin');

-- ============ UNIDADES CONSUMIDORAS ============
CREATE POLICY "Admin lê todas as UCs"
  ON unidades_consumidoras FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê UCs da sua empresa"
  ON unidades_consumidoras FOR SELECT USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Admin insere UCs"
  ON unidades_consumidoras FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin atualiza UCs"
  ON unidades_consumidoras FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta UCs"
  ON unidades_consumidoras FOR DELETE USING (get_user_role() = 'admin');

-- ============ DADOS GERAÇÃO ============
CREATE POLICY "Admin lê todos os dados de geração"
  ON dados_geracao FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê dados de geração das suas UCs"
  ON dados_geracao FOR SELECT USING (
    uc_id IN (SELECT id FROM unidades_consumidoras WHERE empresa_id = get_user_empresa_id())
  );

CREATE POLICY "Admin insere dados de geração"
  ON dados_geracao FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin atualiza dados de geração"
  ON dados_geracao FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta dados de geração"
  ON dados_geracao FOR DELETE USING (get_user_role() = 'admin');

-- ============ FATURAS ============
CREATE POLICY "Admin lê todas as faturas"
  ON faturas FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê faturas das suas UCs"
  ON faturas FOR SELECT USING (
    uc_id IN (SELECT id FROM unidades_consumidoras WHERE empresa_id = get_user_empresa_id())
  );

CREATE POLICY "Admin insere faturas"
  ON faturas FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Cliente insere faturas das suas UCs"
  ON faturas FOR INSERT WITH CHECK (
    uc_id IN (SELECT id FROM unidades_consumidoras WHERE empresa_id = get_user_empresa_id())
  );

CREATE POLICY "Admin atualiza faturas"
  ON faturas FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta faturas"
  ON faturas FOR DELETE USING (get_user_role() = 'admin');

-- ============ RELATÓRIOS ============
CREATE POLICY "Admin lê todos os relatórios"
  ON relatorios FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Cliente lê relatórios da sua empresa"
  ON relatorios FOR SELECT USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Admin insere relatórios"
  ON relatorios FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin atualiza relatórios"
  ON relatorios FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta relatórios"
  ON relatorios FOR DELETE USING (get_user_role() = 'admin');

-- ============ TARIFAS ============
CREATE POLICY "Usuários autenticados leem tarifas"
  ON tarifas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin insere tarifas"
  ON tarifas FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admin atualiza tarifas"
  ON tarifas FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin deleta tarifas"
  ON tarifas FOR DELETE USING (get_user_role() = 'admin');
