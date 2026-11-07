const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'), env: process.env, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
