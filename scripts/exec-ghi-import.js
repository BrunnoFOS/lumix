/**
 * Executa a importação dos dados GHI no Supabase.
 * Uso: node scripts/exec-ghi-import.js
 */

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://ukobyfxffhtlywzmtaiq.supabase.co";
const SERVICE_ROLE_KEY = fs
  .readFileSync(path.join(__dirname, "..", "env", ".env.local"), "utf-8")
  .split("\n")
  .find((l) => l.startsWith("SUPABASE_SERVICE_ROLE_KEY="))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim();

if (!SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in env/.env.local");
  process.exit(1);
}

async function executeSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error: ${res.status} ${text}`);
  }
  return res.json();
}

async function executeSqlDirect(sql) {
  // Use the pg endpoint directly
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  // Read all mini batch files
  const batchFiles = fs
    .readdirSync(path.join(__dirname))
    .filter((f) => f.startsWith("ghi-mini-") && f.endsWith(".sql"))
    .sort(
      (a, b) =>
        parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])
    );

  console.log(`Found ${batchFiles.length} batch files`);

  // Use Supabase JS client via REST API for bulk insert
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Read all data from the Excel-generated SQL and parse into objects
  const XLSX = require("xlsx");
  const filePath = path.join(
    "C:",
    "Users",
    "brunn",
    "Downloads",
    "global_horizontal_means_sedes-munic (3).xlsx"
  );
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  // State mapping (raw Excel -> UF)
  const STATE_TO_UF = {
    ACRE: "AC", ALAGOAS: "AL", AMAZONAS: "AM", BAHIA: "BA",
    "DISTRITO FEDERAL": "DF", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG", PERNAMBUCO: "PE", "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", RORAIMA: "RR",
    "SANTA CATARINA": "SC", SERGIPE: "SE", TOCANTINS: "TO",
    "AMAP\u00c3\u0081": "AP", "CEAR\u00c3\u0081": "CE",
    "ESP\u00c3\u008dRITO SANTO": "ES", "GOI\u00c3\u0081S": "GO",
    "MARANH\u00c3\u0192O": "MA", "PAR\u00c3\u0081": "PA",
    "PARA\u00c3\u008dBA": "PB", "PARAN\u00c3\u0081": "PR",
    "PIAU\u00c3\u008d": "PI", "ROND\u00c3\u201dNIA": "RO",
    "S\u00c3\u0192O PAULO": "SP",
  };

  function fixMojibake(str) {
    if (!str || typeof str !== "string") return str;
    try { return Buffer.from(str, "latin1").toString("utf-8"); } catch { return str; }
  }

  function normalizeName(name) {
    if (!name || typeof name !== "string") return "";
    const fixed = fixMojibake(name);
    return fixed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  const rows = [];
  let skipped = 0;

  for (const row of data) {
    if (!row.NAME || typeof row.NAME !== "string") { skipped++; continue; }
    const uf = STATE_TO_UF[row.STATE];
    if (!uf) { skipped++; continue; }
    const nome = normalizeName(row.NAME);
    if (!nome) { skipped++; continue; }
    const jan = Number(row.JAN);
    if (isNaN(jan) || jan < 0 || jan > 10000) { skipped++; continue; }

    rows.push({
      nome,
      uf,
      lat: row.LAT ? Number(row.LAT) / 10000 : null,
      lon: row.LON ? Number(row.LON) / 10000 : null,
      jan: row.JAN, fev: row.FEB, mar: row.MAR, abr: row.APR,
      mai: row.MAY, jun: row.JUN, jul: row.JUL, ago: row.AUG,
      set_: row.SEP, out: row.OCT, nov: row.NOV, dez: row.DEC,
      anual: row.ANNUAL,
    });
  }

  console.log(`Parsed ${rows.length} rows (skipped ${skipped})`);

  // Insert in batches of 500
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("ghi_municipios").insert(batch);
    if (error) {
      console.error(`Error at batch starting at row ${i}:`, error.message);
      // Try one by one for this batch to find the problematic row
      for (const row of batch) {
        const { error: rowErr } = await supabase.from("ghi_municipios").insert(row);
        if (rowErr) {
          console.error(`  Failed row: ${row.nome}, ${row.uf} - ${rowErr.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} (${inserted} total)`);
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch(console.error);
