import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "dist", "public", "index.html");
const dest = path.join(root, "api", "spa.html");

if (!fs.existsSync(src)) {
  console.error(`copy-spa-html: arquivo não encontrado: ${src}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copy-spa-html: ${src} → ${dest}`);
