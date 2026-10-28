/*
 * Builds the distributable files:
 *
 *   dist/what-input.js         UMD (global `whatInput`, CommonJS, AMD)
 *   dist/what-input.min.js     minified UMD + source map
 *   dist/what-input.mjs        ES module
 *   dist/what-input.d.ts       TypeScript declarations (CommonJS/UMD)
 *   dist/what-input.d.mts      TypeScript declarations (ES module)
 */

import { build } from 'esbuild'
import { execFile } from 'node:child_process'
import { copyFile, readFile, rm } from 'node:fs/promises'
import { promisify } from 'node:util'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

const banner = [
  '/**',
  ` * ${pkg.name} - ${pkg.description}`,
  ` * @version v${pkg.version}`,
  ` * @link ${pkg.homepage}`,
  ` * @license ${pkg.license}`,
  ' */',
].join('\n')

/*
 * esbuild has no UMD output, so the IIFE build is wrapped by hand. The entry
 * in umd-entry.ts assigns the instance to `__whatInput`, declared below in the
 * factory function, so `require('what-input')`, `define(['whatInput'])` and
 * `window.whatInput` all receive the instance itself.
 */
const umdHeader = `${banner}
;(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory()
  } else if (typeof define === 'function' && define.amd) {
    define('whatInput', [], factory)
  } else {
    root.whatInput = factory()
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this,
  function () {
    var __whatInput`

const umdFooter = `return __whatInput
  },
)`

/** @type {import('esbuild').BuildOptions} */
const shared = {
  entryPoints: ['src/what-input.ts'],
  bundle: true,
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
}

/**
 * The UMD build targets ES2019 so that older bundlers (webpack 4 and friends,
 * still common in Foundation-era projects) can parse it. The browser
 * requirements are unchanged; only the syntax is transpiled.
 */
/** @type {import('esbuild').BuildOptions} */
const umd = {
  ...shared,
  entryPoints: ['scripts/umd-entry.ts'],
  format: 'iife',
  target: 'es2019',
  banner: { js: umdHeader },
  footer: { js: umdFooter },
}

await rm('dist', { recursive: true, force: true })

await Promise.all([
  build({ ...umd, outfile: 'dist/what-input.js' }),
  build({
    ...umd,
    outfile: 'dist/what-input.min.js',
    minify: true,
    sourcemap: true,
    // private members are prefixed with `_` so they can be shortened safely
    mangleProps: /^_/,
  }),
  build({ ...shared, format: 'esm', banner: { js: banner }, outfile: 'dist/what-input.mjs' }),
  promisify(execFile)('npx', ['tsc', '-p', 'tsconfig.build.json']),
])

await copyFile('dist/what-input.d.ts', 'dist/what-input.d.mts')
