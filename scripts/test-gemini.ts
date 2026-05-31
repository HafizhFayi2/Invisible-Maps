import * as dotenv from 'dotenv';
import fetch from 'node-fetch'; // or global fetch if node 18+ is used, since tsx provides fetch/global context
dotenv.config();

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const primaryKey = process.env.GEMINI_API_KEY || '';
const backupKeysStr = process.env.GEMINI_BACKUP_KEYS || '';
const backupKeys = backupKeysStr.split(',').map(k => k.trim()).filter(Boolean);

const allKeys = [primaryKey, ...backupKeys].filter(Boolean);

async function testKey(key: string, label: string) {
  console.log(`\n--- Testing Key: ${label} (${key.substring(0, 10)}...) ---`);
  for (const model of models) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with ONLY the word "SUCCESS" if you receive this.' }] }]
        })
      });
      const status = res.status;
      const data: any = await res.json();
      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log(`[${model}] SUCCESS! Response: "${text}"`);
        return true;
      } else {
        console.log(`[${model}] FAILED (HTTP ${status}):`, data.error?.message || JSON.stringify(data));
      }
    } catch (err: any) {
      console.log(`[${model}] ERROR:`, err.message || err);
    }
  }
  return false;
}

async function run() {
  console.log('Found', allKeys.length, 'keys to test.');
  for (let i = 0; i < allKeys.length; i++) {
    const isPrimary = i === 0;
    await testKey(allKeys[i], isPrimary ? 'PRIMARY' : `BACKUP_${i}`);
  }
}

run();
