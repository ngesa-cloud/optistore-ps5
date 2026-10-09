#!/usr/bin/env node
// ==============================================================================
// OPTISTORE5 — AUTOMATED CATALOG SYNC & VALIDATOR TOOL
// ==============================================================================

const https = require('https');
const fs = require('fs');
const path = require('path');

const SOURCES = {
  dlps:  'https://optistore.vercel.app/dlps.json',
  pippo: 'https://optistore.vercel.app/pippo.json',
  pfs:   'https://optistore.vercel.app/pfs.json'
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('[*] Starting OptiStore5 Catalog Sync...');
  const rootDir = path.resolve(__dirname, '..');

  for (const [id, url] of Object.entries(SOURCES)) {
    try {
      console.log(`[*] Fetching ${id} from ${url}...`);
      const data = await fetchJson(url);
      const pkgCount = data.packages ? (Array.isArray(data.packages) ? data.packages.length : Object.keys(data.packages).length) : 0;
      console.log(`[+] Success! Parsed ${pkgCount} packages for ${id}.`);

      const targetPath = path.join(rootDir, `${id}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
      console.log(`[+] Saved to ${targetPath}`);
    } catch (err) {
      console.error(`[-] Error syncing ${id}:`, err.message);
    }
  }
  console.log('[*] Sync complete.');
}

run();
