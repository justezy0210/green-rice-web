const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  // Handle commas inside quotes
  const parseRow = (row) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of row) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || null; });
    return obj;
  });
}

function toNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toBool(val) {
  if (val === null || val === undefined || val === '' || val === 'null') return null;
  return val === 'true';
}

function avg(...values) {
  const valid = values.map(toNum).filter((v) => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function toDocId(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function transformRow(row) {
  return {
    name: row['Cultivar'],
    daysToHeading: {
      early: avg(
        row["22' Early season Days to heading (days)"],
        row["23' early season Days to heading (days)"]
      ),
      normal: avg(row["23' normal season Days to heading (days)"]),
      late: avg(
        row["22' late season Days to heading (days)"],
        row["23' late season Days to heading (days)"]
      ),
    },
    morphology: {
      culmLength: toNum(row['Culm Length (cm)']),
      panicleLength: toNum(row['Panicle Length (cm)']),
      panicleNumber: toNum(row['Panicle Number']),
    },
    yield: {
      spikeletsPerPanicle: toNum(row['Spikelets per Panicle']),
      ripeningRate: toNum(row['Ripening Rate (%)']),
    },
    quality: {
      grainWeight: toNum(row['1,000-Grain Weight of Brown Rice (g)']),
      preHarvestSprouting: toNum(row['Pre-harvest Sprouting (%)']),
    },
    resistance: {
      bacterialLeafBlight: {
        k1: toBool(row['K1']),
        k2: toBool(row['K2']),
        k3: toBool(row['K3']),
        k3a: toBool(row['K3a']),
      },
    },
  };
}

async function migrate() {
  const csvPath = path.join(__dirname, '..', 'data', 'phenotype_table.csv');
  const rows = parseCSV(csvPath);

  console.log(`Found ${rows.length} cultivars. Migrating...\n`);

  for (const row of rows) {
    const data = transformRow(row);
    const docId = toDocId(data.name);
    await setDoc(doc(db, 'cultivars', docId), data);
    console.log(`✓ ${data.name} (${docId})`);
    console.log(`  daysToHeading: early=${data.daysToHeading.early}, normal=${data.daysToHeading.normal}, late=${data.daysToHeading.late}`);
  }

  console.log(`\nDone! ${rows.length} documents written to cultivars collection.`);
}

migrate().then(() => process.exit(0)).catch((e) => { console.error('Error:', e); process.exit(1); });
