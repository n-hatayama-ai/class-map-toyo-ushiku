// Encrypts src/data/schoolsData.json + studentsData.json into
// public/data.enc.json so the dataset can be served from a public GitHub
// Pages site without being readable to anyone who lacks the passcode.
//
// Usage (from the project root):
//   MAP_PASSCODE='…' node scripts/encrypt_data.mjs
// or, with the passcode stored in the macOS keychain:
//   MAP_PASSCODE="$(security find-generic-password -s class-map-toyo-ushiku -w)" node scripts/encrypt_data.mjs
//
// Must match the decryption parameters in src/utils/secureData.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 600_000;

const passcode = process.env.MAP_PASSCODE;
if (!passcode || passcode.length < 12) {
  console.error('MAP_PASSCODE (12文字以上) を環境変数で指定してください。');
  process.exit(1);
}

const schools = JSON.parse(readFileSync('src/data/schoolsData.json', 'utf8'));
const students = JSON.parse(readFileSync('src/data/studentsData.json', 'utf8'));
const plaintext = new TextEncoder().encode(JSON.stringify({ schools, students }));

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
);
const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
mkdirSync('public', { recursive: true });
writeFileSync(
  'public/data.enc.json',
  JSON.stringify({ v: 1, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(ciphertext) }) + '\n'
);
console.log(`public/data.enc.json を書き出しました（${schools.length}校 / ${students.length}名）`);
