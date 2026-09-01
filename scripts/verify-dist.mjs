import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));

const refs = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...Object.values(manifest.icons ?? {})
].filter(Boolean);

const missingRefs = refs.filter((ref) => !fs.existsSync(path.join(dist, ref)));
if (missingRefs.length > 0) {
  console.error(`Missing manifest references: ${missingRefs.join(', ')}`);
  process.exit(1);
}

const sourceFiles = ['src/popup/main.ts', 'src/background/index.ts'];
const used = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(path.resolve(file), 'utf8');
  const pattern = /(?:t|tArgs|getMessage)\(['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(pattern)) {
    used.add(match[1]);
  }
}

for (const locale of ['zh_CN', 'en']) {
  const file = path.join('_locales', locale, 'messages.json');
  const messages = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const missing = [...used].filter((key) => !(key in messages));
  if (missing.length > 0) {
    console.error(`${locale} is missing keys: ${missing.join(', ')}`);
    process.exit(1);
  }
}

console.log(`Verified ${refs.length} manifest references and i18n keys for zh_CN/en.`);
