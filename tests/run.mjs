import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const directory = new URL('./', import.meta.url);
const files = readdirSync(directory).filter(name => name.endsWith('.test.mjs')).sort();
if (!files.length) throw new Error('Tidak ada tes ditemukan.');
for (const file of files) {
  console.log(`\nTEST ${file}`);
  const result = spawnSync(process.execPath, [new URL(file, directory).pathname], { stdio: 'inherit', timeout: 30000 });
  if (result.error || result.status !== 0) {
    console.error(`GAGAL ${file}: ${result.error?.message || result.signal || result.status}`);
    process.exit(1);
  }
}
console.log(`\nLULUS: ${files.length} berkas tes dieksekusi; tidak ada berkas .test.mjs dilewati.`);
