// GTA VI trophy guide entry (Node 22, standard library only).
// The guide itself is plain static files under app/ — index.html, style.css, app.js
// and data/trophies.json plus data/roadmap.json — served by any static server with
// app/ at its root, and readable offline in desktop Chrome. Nothing here is built:
// main.ts only hands the finished guide in.
//
// What this program does, run from the repository root:
//   1. copies app/ and screenshots/ into the output directory, and
//   2. writes output/dossier.json with buildDossier from the vendored make.fun
//      library, which is the summary the judge reads.
//
// The grader runs it twice in a container with /output writable and this
// repository read-only; locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// vendor/makefun-frontend.ts must stay exactly as the kit shipped it: the scorer
// rebuilds the dossier with its own copy and compares the two byte for byte.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Caps from the gate (reference/gate.json): at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and directories and 48 MiB in all. The text cap
// shapes the dossier's bytes; the rest refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
