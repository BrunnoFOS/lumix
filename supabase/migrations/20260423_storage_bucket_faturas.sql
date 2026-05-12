-- Bucket público para armazenar imagens/PDFs de faturas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('faturas', 'faturas', true, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']);

-- Qualquer pessoa pode ler (bucket público)
CREATE POLICY "Leitura pública de faturas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'faturas');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Upload de faturas por autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'faturas');

-- Usuários autenticados podem atualizar (upsert)
CREATE POLICY "Update de faturas por autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'faturas');
