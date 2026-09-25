import { JuniorHighSchool, Student } from '../types';

// The dataset is shipped encrypted (public/data.enc.json, produced by
// scripts/encrypt_data.mjs) because GitHub Pages serves everything publicly.
// The passcode derives the AES key; without it the file is unreadable.

export interface Dataset {
  schools: JuniorHighSchool[];
  students: Student[];
}

interface EncryptedFile {
  v: number;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

const KEY_STORAGE_KEY = 'juniorHighMap.dataKey.v1';

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

let encryptedFilePromise: Promise<EncryptedFile> | null = null;

function loadEncryptedFile(): Promise<EncryptedFile> {
  encryptedFilePromise ??= fetch(`${import.meta.env.BASE_URL}data.enc.json`, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`data.enc.json: HTTP ${r.status}`);
    return r.json();
  });
  return encryptedFilePromise;
}

async function decryptWithKey(file: EncryptedFile, key: CryptoKey): Promise<Dataset> {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(file.iv) }, key, fromB64(file.data));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// Throws on a wrong passcode (AES-GCM authentication fails).
export async function unlockWithPasscode(passcode: string): Promise<Dataset> {
  const file = await loadEncryptedFile();
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(file.salt), iterations: file.iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );
  const dataset = await decryptWithKey(file, key);
  try {
    // Remember the derived key (not the passcode) so reloads skip the prompt.
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify({ salt: file.salt, key: toB64(raw) }));
  } catch {
    // localStorage unavailable — the user just has to re-enter next time.
  }
  return dataset;
}

// Returns null when there is no remembered key or it no longer matches the
// published file (e.g. the data was re-encrypted with a new passcode).
export async function unlockWithStoredKey(): Promise<Dataset | null> {
  let stored: { salt: string; key: string } | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(KEY_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
  if (!stored) return null;
  const file = await loadEncryptedFile();
  if (stored.salt !== file.salt) {
    forgetStoredKey();
    return null;
  }
  try {
    const key = await crypto.subtle.importKey('raw', fromB64(stored.key), 'AES-GCM', false, ['decrypt']);
    return await decryptWithKey(file, key);
  } catch {
    forgetStoredKey();
    return null;
  }
}

export function forgetStoredKey() {
  try {
    localStorage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
