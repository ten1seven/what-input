// @vitest-environment node

import { describe, expect, it } from 'vitest'

describe('without a DOM', () => {
  it('imports and answers without throwing', async () => {
    expect(typeof document).toBe('undefined')

    const { default: whatInput } = await import('../src/what-input.ts')

    expect(whatInput.ask()).toBe('initial')
    expect(whatInput.ask('intent')).toBe('initial')
    expect(whatInput.element()).toBeNull()

    expect(() => {
      whatInput.ignoreKeys(['Tab'])
      whatInput.specificKeys([9])
      whatInput.registerOnChange(() => {})
      whatInput.unRegisterOnChange(() => {})
      whatInput.addEventListener('input', () => {})
      whatInput.clearStorage()
      whatInput.destroy()
    }).not.toThrow()
  })
})
