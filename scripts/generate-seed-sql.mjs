import fs from 'fs';

const PIZZA_FILE = '/home/i-appreciate-it/Documents/prof-engineering/www/startups/outbidwatch-project/vanilla-web/.wtf/experiments/v1/pizza.yml';
const SEED_FILE = '/home/i-appreciate-it/Documents/prof-engineering/www/startups/outbidwatch-project/vanilla-web/seed.sql';

const pizzaRaw = fs.readFileSync(PIZZA_FILE, 'utf8');
const sites = [];
let cur = null;

for (const line of pizzaRaw.split("\n")) {
  const t = line.trim();
  if (t.startsWith("- id:")) {
    if (cur) sites.push(cur);
    cur = { id: t.replace("- id:", "").trim().replace(/"/g, "") };
  } else if (cur && t.includes(":")) {
    const idx = t.indexOf(":");
    const k = t.slice(0, idx).trim();
    let v = t.slice(idx + 1).trim();
    if (v.startsWith("\"") && v.endsWith("\"")) v = v.slice(1, -1);
    if (v === "null") v = null;
    cur[k] = v;
  }
}
if (cur) sites.push(cur);

console.log(`Generating seed.sql from ${sites.length} verified pizza.yml sites with raw_title & raw_description...`);

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- Outbidwatch Master Database Seed v1.2.0
-- Generated from verified pizza.yml (${sites.length} pure outbid platforms)
-- Includes raw website title and meta description from original landing pages

`;

for (const s of sites) {
  sql += `INSERT OR REPLACE INTO sites (
  id, slug, domain, site_name, raw_title, raw_description, url, category, founder_x_handle,
  founder_location, country_name, country_code, country_flag,
  location_provenance, location_notes, summary_256,
  domain_registration_date, logo_url, currency, status,
  workflow_status, date_found, created_at, updated_at
) VALUES (
  ${escapeSql(s.id)},
  ${escapeSql(s.slug)},
  ${escapeSql(s.domain)},
  ${escapeSql(s.site_name || s.domain)},
  ${escapeSql(s.raw_title || s.site_name || s.domain)},
  ${escapeSql(s.raw_description || s.summary_256)},
  ${escapeSql(s.url)},
  ${escapeSql(s.category)},
  ${escapeSql(s.founder_x_handle)},
  ${escapeSql(s.founder_location || 'Global')},
  ${escapeSql(s.country_name || 'Global')},
  ${escapeSql(s.country_code || 'GLOBAL')},
  ${escapeSql(s.country_flag || '🌐')},
  ${escapeSql(s.location_provenance || 'unspecified')},
  ${escapeSql(s.location_notes || null)},
  ${escapeSql(s.summary_256)},
  ${escapeSql(s.domain_registration_date)},
  ${escapeSql(s.logo_url || `/api/logos/${encodeURIComponent(s.domain)}.png`)},
  ${escapeSql(s.currency || 'USD')},
  ${escapeSql(s.status || 'live')},
  ${escapeSql(s.workflow_status || 'complete')},
  ${escapeSql(s.date_found || new Date().toISOString())},
  datetime('now'),
  datetime('now')
);\n\n`;
}

fs.writeFileSync(SEED_FILE, sql);
console.log(`Successfully wrote ${sites.length} site inserts to ${SEED_FILE}!`);
