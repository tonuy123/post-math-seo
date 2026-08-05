/**
 * scripts/deploy-ftp.js
 *
 * Upload thư mục build-public (output của generate-static.js) lên hosting
 * cPanel qua FTP. Chỉ đụng tới các thư mục/file của blog:
 *   - blog/
 *   - assets/blog/
 *   - sitemap.xml
 *   - robots.txt
 * KHÔNG xoá/sửa file nào khác của landing page hiện tại.
 *
 * Cách dùng:
 *   node scripts/generate-static.js && node scripts/deploy-ftp.js
 *   node scripts/deploy-ftp.js --source ./build-public
 *   node scripts/deploy-ftp.js --clean   # xoá blog cũ trên host trước khi upload
 */
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function parseArgs() {
  const args = { source: path.join(__dirname, '..', 'build-public'), clean: false };
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--source=')) args.source = path.resolve(a.slice(9));
    if (a === '--clean') args.clean = true;
  });
  return args;
}

/** Walk local directory, upload from to to. */
async function uploadDir(client, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`;
    if (entry.isDirectory()) {
      await client.ensureDir(remotePath);
      await uploadDir(client, localPath, remotePath);
    } else if (entry.isFile()) {
      await client.uploadFrom(localPath, remotePath);
      console.log(`[ftp] upload ${remotePath}`);
    }
  }
}

async function main() {
  const { source, clean } = parseArgs();
  if (!fs.existsSync(source)) {
    console.error(`[ftp] source dir not found: ${source}`);
    console.error('[ftp] chạy node scripts/generate-static.js trước.');
    process.exit(1);
  }

  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const pass = process.env.FTP_PASS;
  const root = process.env.FTP_ROOT || '/';
  const port = Number(process.env.FTP_PORT) || 21;

  if (!host || !user || !pass) {
    console.error('[ftp] Thiếu FTP_HOST / FTP_USER / FTP_PASS trong .env');
    process.exit(1);
  }

  const client = new ftp.Client(60000);
  client.ftp.verbose = false;
  try {
    await client.access({ host, user, password: pass, port, secure: false });
    console.log(`[ftp] connected to ${host}`);

    if (clean) {
      for (const p of ['blog', 'assets/blog', 'sitemap.xml', 'robots.txt']) {
        try { await client.removeDir(`${root}/${p}`); console.log(`[ftp] removed ${root}/${p}`); } catch { /* not exists */ }
      }
    }

    await uploadDir(client, source, root.replace(/\/+$/, ''));
    console.log('[ftp] deploy hoàn tất.');
  } catch (err) {
    console.error('[ftp] FAILED:', err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
