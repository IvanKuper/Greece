require("dotenv").config();
const path = require("path");
const { createBackup } = require("../src/business-os");
const { encryptBackup, restoreTest } = require("../src/growth-platform");

createBackup(null)
  .then((backup) => {
    console.log(`Backup complete: storage/backups/${backup.filename}`);
    console.log(`SHA-256: ${backup.checksum}`);
    const source = path.join(__dirname, "..", "storage", "backups", backup.filename);
    const destination = path.join(__dirname, "..", "storage", "offsite", `${backup.filename}.aes`);
    encryptBackup(source, destination);
    console.log(`Encrypted offsite package: storage/offsite/${backup.filename}.aes`);
    const test = restoreTest(backup);
    if (test.status !== "passed") throw new Error(`Restore validation failed: ${test.error || "integrity check"}`);
    console.log(`Restore validation: ${test.integrity_result}`);
  })
  .catch((error) => {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  });
