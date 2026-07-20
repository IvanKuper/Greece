const fs = require("fs");
const path = require("path");

const backendOrigin = process.argv[2];
if (!backendOrigin) {
  console.error("Usage: npm run package:netlify -- https://your-backend.onrender.com");
  process.exit(1);
}

let backend;
try {
  backend = new URL(backendOrigin);
} catch {
  console.error("The backend URL must be a complete HTTPS URL.");
  process.exit(1);
}
if (backend.protocol !== "https:" || backend.pathname !== "/" || backend.search || backend.hash) {
  console.error("Use only an HTTPS origin with no path, query, or hash.");
  process.exit(1);
}

const root = path.resolve(__dirname, ".."),
  source = path.join(root, "public"),
  output = path.join(root, "dist", "netlify");
if (!fs.existsSync(source)) throw new Error("Public website folder is missing.");
if (!output.startsWith(path.join(root, "dist") + path.sep))
  throw new Error("Unsafe output path.");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(source, output, { recursive: true });

const origin = backend.origin;
fs.writeFileSync(
  path.join(output, "_redirects"),
  `# Keep the visitor on the Netlify domain while the persistent backend handles CRM data.\n/api/*  ${origin}/api/:splat  200!\n/crm/*  ${origin}/crm/:splat  200!\n/crm  ${origin}/crm  200!\n/dashboard  ${origin}/dashboard  200!\n/login  ${origin}/login  200!\n/register  ${origin}/register  200!\n/forgot-password  ${origin}/forgot-password  200!\n/reset-password  ${origin}/reset-password  200!\n/*  /index.html  200\n`,
);
fs.writeFileSync(
  path.join(output, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: DENY\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/*.html\n  Cache-Control: no-cache\n`,
);
fs.writeFileSync(
  path.join(output, "DEPLOYMENT-READY.txt"),
  `Upload this entire folder to Netlify with manual deploy.\nBackend: ${origin}\nGenerated: ${new Date().toISOString()}\nDo not upload .env or storage data.\n`,
);
console.log(`Netlify upload folder created: ${output}`);
