/**
 * Script de importação dos dados de GHI (Global Horizontal Irradiance) por município.
 * Lê o Excel com dados do Atlas Brasileiro de Energia Solar e gera SQL para inserção.
 *
 * Uso: node scripts/import-ghi.js > scripts/ghi-data.sql
 */

const path = require("path");
const XLSX = require("xlsx");

// Mapa direto das strings brutas do Excel para UF.
// Inclui tanto estados sem acento quanto os com mojibake exatamente como aparecem no arquivo.
const STATE_TO_UF = {
  // Sem acentos
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAZONAS: "AM",
  BAHIA: "BA",
  "DISTRITO FEDERAL": "DF",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PERNAMBUCO: "PE",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  SERGIPE: "SE",
  TOCANTINS: "TO",
  // Com mojibake (strings exatas do Excel)
  "AMAP\u00c3\u0081": "AP",       // AMAPÁ
  "CEAR\u00c3\u0081": "CE",       // CEARÁ
  "ESP\u00c3\u008dRITO SANTO": "ES", // ESPÍRITO SANTO
  "GOI\u00c3\u0081S": "GO",       // GOIÁS
  "MARANH\u00c3\u0192O": "MA",    // MARANHÃO
  "PAR\u00c3\u0081": "PA",        // PARÁ
  "PARA\u00c3\u008dBA": "PB",     // PARAÍBA
  "PARAN\u00c3\u0081": "PR",      // PARANÁ
  "PIAU\u00c3\u008d": "PI",       // PIAUÍ
  "ROND\u00c3\u201dNIA": "RO",    // RONDÔNIA
  "S\u00c3\u0192O PAULO": "SP",   // SÃO PAULO
};

function fixMojibake(str) {
  if (!str || typeof str !== "string") return str;
  try {
    return Buffer.from(str, "latin1").toString("utf-8");
  } catch {
    return str;
  }
}

function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  const fixed = fixMojibake(name);
  return fixed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveUF(rawState) {
  if (!rawState || typeof rawState !== "string") return null;
  const uf = STATE_TO_UF[rawState];
  if (!uf) {
    console.error(`WARN: Could not resolve UF for state: "${rawState}"`);
  }
  return uf || null;
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

function main() {
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

  console.log("-- GHI data import");
  console.log(
    "-- Source: Atlas Brasileiro de Energia Solar (INPE) - global_horizontal_means_sedes-munic.xlsx"
  );
  console.log(`-- Total rows in source: ${data.length}`);
  console.log(`-- Generated: ${new Date().toISOString()}`);
  console.log("");
  console.log(
    "INSERT INTO ghi_municipios (nome, uf, lat, lon, jan, fev, mar, abr, mai, jun, jul, ago, set_, out, nov, dez, anual) VALUES"
  );

  const values = [];
  let skipped = 0;

  for (const row of data) {
    const rawName = row.NAME;
    if (!rawName || typeof rawName !== "string") {
      skipped++;
      continue;
    }

    const uf = resolveUF(row.STATE);
    if (!uf) {
      skipped++;
      continue;
    }

    const nome = normalizeName(rawName);
    if (!nome) {
      skipped++;
      continue;
    }

    // Validate GHI values - skip rows with clearly invalid data
    const jan = Number(row.JAN);
    if (isNaN(jan) || jan < 0 || jan > 10000) {
      skipped++;
      continue;
    }

    const lat = row.LAT ? (Number(row.LAT) / 10000).toFixed(6) : "NULL";
    const lon = row.LON ? (Number(row.LON) / 10000).toFixed(6) : "NULL";

    values.push(
      `('${escapeSql(nome)}', '${uf}', ${lat}, ${lon}, ${row.JAN}, ${row.FEB}, ${row.MAR}, ${row.APR}, ${row.MAY}, ${row.JUN}, ${row.JUL}, ${row.AUG}, ${row.SEP}, ${row.OCT}, ${row.NOV}, ${row.DEC}, ${row.ANNUAL})`
    );
  }

  // Print in batches to avoid huge single statements
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    if (i > 0) {
      console.log(";");
      console.log("");
      console.log(
        "INSERT INTO ghi_municipios (nome, uf, lat, lon, jan, fev, mar, abr, mai, jun, jul, ago, set_, out, nov, dez, anual) VALUES"
      );
    }
    const batch = values.slice(i, i + BATCH);
    console.log(batch.join(",\n"));
  }
  console.log(";");
  console.log("");
  console.log(`-- Inserted: ${values.length}, Skipped: ${skipped}`);
}

main();
