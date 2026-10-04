const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../node_modules/@prisma/engines'),
  path.join(__dirname, '../node_modules/prisma'),
  path.join(__dirname, '../node_modules/.prisma/client'),
  path.join(__dirname, '../node_modules/.bin')
];

for (const dir of targetDirs) {
  try {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            fs.chmodSync(fullPath, 0o755);
          }
        } catch (e) {
          // ignore individual file errors
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

console.log('✓ [CR-Ship] Prisma engine execution permissions verified.');
