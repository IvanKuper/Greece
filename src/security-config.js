const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const storage = path.join(__dirname, "..", "storage");
const secretFile = path.join(storage, ".runtime-secrets.json");
fs.mkdirSync(storage, { recursive: true });

let persisted = {};
try {
  persisted = JSON.parse(fs.readFileSync(secretFile, "utf8"));
} catch {}

let changed = false;
for (const key of ["accessSecret", "refreshSecret", "backupSecret"]) {
  if (!persisted[key] || String(persisted[key]).length < 48) {
    persisted[key] = crypto.randomBytes(48).toString("base64url");
    changed = true;
  }
}
if (changed) {
  fs.writeFileSync(secretFile, JSON.stringify(persisted), { mode: 0o600 });
  try {
    fs.chmodSync(secretFile, 0o600);
  } catch {}
}

module.exports = {
  accessSecret: process.env.JWT_SECRET || persisted.accessSecret,
  refreshSecret: process.env.JWT_REFRESH_SECRET || persisted.refreshSecret,
  backupSecret: process.env.BACKUP_ENCRYPTION_KEY || persisted.backupSecret,
};
