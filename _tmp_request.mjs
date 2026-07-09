import { config } from 'dotenv';
config({ path: 'env/.env.local' });

const user = process.env.N8N_API_USER;
const password = process.env.N8N_API_PASSWORD;

if (!user || !password) {
  console.log('Credenciais N8N não encontradas no env/.env.local');
  process.exit(1);
}

const credentials = Buffer.from(`${user}:${password}`).toString('base64');
const url = 'https://n8n-n8n.nt4zcb.easypanel.host/webhook/geracao-mensal-sungrow?month=2026-05&station_id=123456789&data_inicio=2026-04-08&data_fim=2026-05-11';

console.log('URL:', url);
console.log('');

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15000),
  });

  console.log('Status:', res.status);
  const text = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
} catch (err) {
  console.log('Erro:', err.message);
}
