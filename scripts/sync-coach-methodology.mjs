// Sincroniza /Coach-ia.md (documento maestro editable por el cliente) hacia
// src/lib/coach/methodology.ts, para que el contenido quede BUNDLEADO en el build
// (Next standalone no incluye archivos sueltos de la raíz) y haya una sola fuente de verdad.
//
// Uso: npm run coach:sync   (correr cada vez que Iván edite Coach-ia.md)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcPath = join(root, 'Coach-ia.md')
const outPath = join(root, 'src/lib/coach/methodology.ts')

const md = readFileSync(srcPath, 'utf8')

// Escapar para incrustar como template literal seguro.
const escaped = md
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')

const out = `// ⚠️ AUTO-GENERADO desde /Coach-ia.md por scripts/sync-coach-methodology.mjs
// NO editar a mano. Edita Coach-ia.md (documento maestro) y corre: npm run coach:sync
/* eslint-disable */

/** Documento Maestro del Coach IA (método GSA de Iván Abad). Fuente: /Coach-ia.md */
export const GSA_METHODOLOGY = \`${escaped}\`
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, out)
console.log(`✓ methodology.ts generado (${md.length} chars) desde Coach-ia.md`)
