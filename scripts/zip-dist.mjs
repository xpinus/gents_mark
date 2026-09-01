import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const name = pkg.name;
const version = pkg.version;
const outName = `${name}-v${version}.zip`;
const outPath = resolve(root, outName);
const distPath = resolve(root, 'dist');

if (!existsSync(distPath)) {
  console.error('dist/ not found. Run npm run build first.');
  process.exit(1);
}

const isWin = process.platform === 'win32';
try {
  if (isWin) {
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${distPath}\\*' -DestinationPath '${outPath}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distPath}" && zip -r "${outPath}" .`, { stdio: 'inherit' });
  }
  console.log(`Created ${outName}`);
} catch (error) {
  console.error('Failed to create zip:', error);
  process.exit(1);
}
