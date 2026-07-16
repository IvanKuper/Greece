require("dotenv").config();
const { createBackup } = require("../src/business-os");

createBackup(null)
  .then((backup) => {
    console.log(`Backup complete: storage/backups/${backup.filename}`);
    console.log(`SHA-256: ${backup.checksum}`);
  })
  .catch((error) => {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  });
