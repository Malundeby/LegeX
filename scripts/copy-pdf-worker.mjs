// Copies the pdf.js worker into public/ so it is served from our own domain
// (no extra connection to a CDN) under a versioned, long-cached name.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("pdfjs-dist/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const src = join(dirname(pkgPath), "legacy/build/pdf.worker.min.mjs");
const outDir = join(process.cwd(), "public/pdfjs");
const name = `pdf.worker-${version}.min.mjs`;

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f !== name) rmSync(join(outDir, f));
copyFileSync(src, join(outDir, name));
console.log(`pdf.js worker ${version} -> public/pdfjs/${name}`);
