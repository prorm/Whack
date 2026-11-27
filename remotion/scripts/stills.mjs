// Render sparse stills from one bundle: node scripts/stills.mjs <outDir> <scale> <frame,frame,...>
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
const [outDir, scale = '0.5', list] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const serveUrl = await bundle({ entryPoint: resolve('src/index.ts') })
const composition = await selectComposition({ serveUrl, id: process.env.COMP || 'ScrollProofLaunch' })
for (const f of list.split(',').map(Number)) {
  await renderStill({ serveUrl, composition, frame: f, output: `${outDir}/f${String(f).padStart(5, '0')}.png`, scale: Number(scale), chromiumOptions: { gl: 'angle' } })
  process.stdout.write(f + ' ')
}
