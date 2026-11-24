import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** The curated concept pack is part of the shell. Optional media is loaded separately. */
function offlinePrecache(): Plugin {
  return {
    name: 'capable-offline-precache',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle).map((f) => '/' + f)
      const urls = Array.from(new Set(['/index.html', ...built, '/favicon.svg', '/precache-manifest.json']))
        .filter((u) => u !== '/sw.js')
        .sort()
      const template = readFileSync(join(import.meta.dirname, 'sw-template.js'), 'utf8')
      const version = createHash('sha256').update(urls.join('|') + template).digest('hex').slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify({ version, urls }, null, 1) })
      const sw = template
        .replace('__VERSION__', version)
        .replace('__URLS__', JSON.stringify(urls))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    },
  }
}

export default defineConfig({
  plugins: [react(), offlinePrecache()],
})

