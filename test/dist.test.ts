/*
 * Smoke tests for the built files in `dist/` (run `npm run build:lib` first).
 * These guard the drop-in contract: the same file paths, the global
 * `whatInput`, CommonJS, AMD and ESM entry points all hand out the instance.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'
import { afterEach, describe, expect, it } from 'vitest'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const require = createRequire(import.meta.url)
const umd = readFileSync(resolve(dist, 'what-input.js'), 'utf8')
const minified = readFileSync(resolve(dist, 'what-input.min.js'), 'utf8')

type Api = { ask: (s?: string) => string; destroy: () => void }

const instances: Api[] = []

afterEach(() => {
  for (const instance of instances.splice(0)) instance.destroy()
  delete (globalThis as { whatInput?: unknown }).whatInput
})

describe('dist/what-input.js (UMD)', () => {
  it('starts with the package banner', () => {
    expect(umd.startsWith('/**\n * what-input - ')).toBe(true)
    expect(umd).toContain('@version v')
    expect(minified.startsWith('/**\n * what-input - ')).toBe(true)
  })

  it('parses as ES2019 so older bundlers such as webpack 4 can consume it', () => {
    expect(() => parse(umd, { ecmaVersion: 2019 })).not.toThrow()
    expect(() => parse(minified, { ecmaVersion: 2019 })).not.toThrow()
  })

  it('exposes a global `whatInput` when loaded as a plain script', () => {
    new Function(umd).call(globalThis)

    const api = (globalThis as { whatInput?: Api }).whatInput!
    instances.push(api)

    expect(api.ask()).toBe('initial')
    expect(document.documentElement.getAttribute('data-whatinput')).toBe('initial')
  })

  it('exposes the instance to CommonJS consumers', () => {
    const api = require('../dist/what-input.js') as Api
    instances.push(api)

    expect(api.ask).toBeTypeOf('function')
    expect(api.ask()).toBe('initial')
  })

  it('registers a named AMD module', () => {
    const defined: Array<[string, unknown[], () => Api]> = []
    const define = Object.assign(
      (name: string, deps: unknown[], factory: () => Api) => {
        defined.push([name, deps, factory])
      },
      { amd: {} },
    )

    new Function('define', umd).call(globalThis, define)

    expect(defined).toHaveLength(1)

    const [name, deps, factory] = defined[0]!
    const api = factory()
    instances.push(api)

    expect(name).toBe('whatInput')
    expect(deps).toEqual([])
    expect(api.ask()).toBe('initial')
  })

  it('minified build works and links its source map', () => {
    new Function(minified).call(globalThis)

    const api = (globalThis as { whatInput?: Api }).whatInput!
    instances.push(api)

    expect(api.ask()).toBe('initial')
    expect(minified.trimEnd().endsWith('//# sourceMappingURL=what-input.min.js.map')).toBe(true)
  })
})

describe('dist/what-input.mjs (ESM)', () => {
  it('default-exports the instance', async () => {
    const { default: api } = (await import('../dist/what-input.mjs')) as { default: Api }
    instances.push(api)

    expect(api.ask()).toBe('initial')
  })
})
