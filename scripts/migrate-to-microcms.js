/*
 * 現在のLPに直書きされているカードデータ（scripts/data/*.json）を
 * microCMSへ一括アップロードする一回限りの移行スクリプト。
 *
 * 使い方:
 *   1. kanri/.env.local に MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY を設定
 *      （microCMS側で business / jobs / benefits / voices の4つのAPIを
 *       事前に作成しておくこと。フィールド定義は SETUP_MICROCMS.md を参照）
 *   2. node scripts/migrate-to-microcms.js            … 実際にアップロード
 *      node scripts/migrate-to-microcms.js --dry-run   … 送信内容の確認のみ
 *      node scripts/migrate-to-microcms.js --force     … 既にデータがあっても追加投入
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));

const DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;
const API_KEY = process.env.MICROCMS_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const TYPES = ['business', 'jobs', 'benefits', 'voices'];

// microCMSの「テキストエリア」フィールドは配列ではなく1本の文字列として保存されるため、
// data/*.json 内の配列はアップロード前に文字列へ変換する
const LIST_FIELDS = { business: ['items'], jobs: ['duties', 'qualificationNote', 'highlights'] };
const CSV_FIELDS = { jobs: ['tags'] };

function toMicrocmsPayload(type, item) {
  const payload = { ...item };
  for (const f of LIST_FIELDS[type] || []) {
    if (Array.isArray(payload[f])) payload[f] = payload[f].join('\n');
  }
  for (const f of CSV_FIELDS[type] || []) {
    if (Array.isArray(payload[f])) payload[f] = payload[f].join(', ');
  }
  return payload;
}

async function microcmsFetch(endpoint, options = {}) {
  const res = await fetch(`https://${DOMAIN}.microcms.io/api/v1/${endpoint}`, {
    ...options,
    headers: {
      'X-MICROCMS-API-KEY': API_KEY,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.message) || `HTTP ${res.status}`);
  }
  return data;
}

async function migrateType(type) {
  const file = path.join(__dirname, 'data', `${type}.json`);
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));

  console.log(`\n=== ${type} (${items.length}件) ===`);

  if (!DRY_RUN && !FORCE) {
    const existing = await microcmsFetch(`${type}?limit=1`);
    if (existing.totalCount > 0) {
      console.log(`  スキップ: 既に ${existing.totalCount} 件のデータがあります（--force を付けると追加投入します）`);
      return;
    }
  }

  for (const item of items) {
    const payload = toMicrocmsPayload(type, item);
    if (DRY_RUN) {
      console.log('  [dry-run]', JSON.stringify(payload));
      continue;
    }
    const created = await microcmsFetch(type, { method: 'POST', body: JSON.stringify(payload) });
    console.log(`  作成: ${created.id} - ${item.title || item.name}`);
  }
}

async function main() {
  if (!DOMAIN || !API_KEY) {
    console.error('MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていません。kanri/.env.local を確認してください。');
    process.exit(1);
  }
  if (typeof fetch === 'undefined') {
    console.error('Node.js 18以上が必要です（グローバルfetchを使用します）。');
    process.exit(1);
  }

  for (const type of TYPES) {
    await migrateType(type);
  }
  console.log('\n完了しました。');
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
