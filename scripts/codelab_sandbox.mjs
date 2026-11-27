// Runs one CodeLab submission in an isolated child process. The parent starts it with Node's permission
// model (no file writes, no child processes, no workers, read access to this file and the harness only),
// a small heap, string code generation disabled for the whole process, and a hard wall-clock kill. Learner code is compiled in a fresh vm context without
// `process`, `require` or `import`. This is defence in depth for a local demo, not a hardened multi-tenant sandbox.
import vm from 'node:vm'
import { runSuite, testCases } from '../app/src/os/codelab.ts'

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => { input += chunk; if (input.length > 20_000) process.exit(3) })
process.stdin.on('end', () => {
  const { code, variant, seed } = JSON.parse(input)
  const load = (source) => {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } })
    vm.runInContext(`"use strict";\n${source}\n;this.__handler = typeof handleWebhook === 'function' ? handleWebhook : null`, context, { timeout: 500 })
    return context.__handler
  }
  process.stdout.write(JSON.stringify(runSuite(code, testCases(variant, seed, load), load)))
})
