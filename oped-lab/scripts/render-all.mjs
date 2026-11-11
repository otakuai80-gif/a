// すべての試作を out/ に書き出す。追加の引数はそのまま remotion render に渡す。
// 例: npm run render:all            例: npm run render:all -- --scale=0.5
import {spawnSync} from 'node:child_process';

const ids = ['YT-OP', 'YT-ED', 'ANIME-OP', 'CORP-OPENER'];
const extra = process.argv.slice(2);
for (const id of ids) {
  console.log(`\n=== ${id}`);
  const r = spawnSync('npx', ['remotion', 'render', id, `out/${id}.mp4`, ...extra], {stdio: 'inherit', shell: process.platform === 'win32'});
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
