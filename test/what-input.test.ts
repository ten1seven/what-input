import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { default as WhatInput, InputMethod } from '../src/what-input.ts'

const html = () => document.documentElement

const pointer = (
  type: 'pointerdown' | 'pointermove',
  pointerType: string,
  init: PointerEventInit = {},
) => window.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType, ...init }))

const key = (type: 'keydown' | 'keyup', init: KeyboardEventInit, target: EventTarget = window) =>
  target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, composed: true, ...init }))

const tab = () => key('keydown', { key: 'Tab', code: 'Tab', keyCode: 9 })
const shift = () => key('keydown', { key: 'Shift', code: 'ShiftLeft', keyCode: 16 })

/** Imports a fresh, auto-started instance (the module is a singleton). */
const load = async (): Promise<typeof WhatInput> => {
  vi.resetModules()

  return (await import('../src/what-input.ts')).default
}

let whatInput: typeof WhatInput

beforeEach(async () => {
  document.body.innerHTML = ''
  html().removeAttribute('data-whatpersist')
  sessionStorage.clear()

  whatInput = await load()
})

afterEach(() => {
  whatInput.destroy()
  vi.unstubAllGlobals()
})

describe('initial state', () => {
  it('reports `initial` before any interaction', () => {
    expect(whatInput.ask()).toBe('initial')
    expect(whatInput.ask('intent')).toBe('initial')
    expect(whatInput.element()).toBeNull()
  })

  it('writes the data attributes immediately when the DOM is ready', () => {
    expect(html().getAttribute('data-whatinput')).toBe('initial')
    expect(html().getAttribute('data-whatintent')).toBe('initial')
  })

  it('waits for DOMContentLoaded while the document is still loading', async () => {
    whatInput.destroy()
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

    whatInput = await load()

    expect(html().hasAttribute('data-whatinput')).toBe(false)

    document.dispatchEvent(new Event('DOMContentLoaded'))

    expect(html().getAttribute('data-whatinput')).toBe('initial')
    vi.restoreAllMocks()
  })
})

describe('keyboard', () => {
  it('switches input and intent to `keyboard` on keydown', () => {
    tab()

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('keyboard')
    expect(html().getAttribute('data-whatinput')).toBe('keyboard')
    expect(html().getAttribute('data-whatintent')).toBe('keyboard')
  })

  it('also counts keyup (focus arriving from the browser chrome)', () => {
    key('keyup', { key: 'Tab', code: 'Tab', keyCode: 9 })

    expect(whatInput.ask()).toBe('keyboard')
  })

  it('ignores modifier keys by default', () => {
    pointer('pointerdown', 'mouse')
    shift()
    key('keydown', { key: 'Meta', code: 'MetaLeft', keyCode: 91 })
    key('keydown', { key: 'Alt', code: 'AltLeft', keyCode: 18 })
    key('keydown', { key: 'Control', code: 'ControlLeft', keyCode: 17 })
    key('keydown', { key: 'ContextMenu', code: 'ContextMenu', keyCode: 93 })

    expect(whatInput.ask()).toBe('mouse')
  })

  it('accepts legacy keyCodes in ignoreKeys()', () => {
    whatInput.ignoreKeys([9])
    tab()

    expect(whatInput.ask()).toBe('initial')

    // the default list has been replaced, so shift now counts
    shift()

    expect(whatInput.ask()).toBe('keyboard')
  })

  it('accepts key names and codes in ignoreKeys()', () => {
    whatInput.ignoreKeys(['Tab', 'KeyA'])
    tab()
    key('keydown', { key: 'a', code: 'KeyA', keyCode: 65 })

    expect(whatInput.ask()).toBe('initial')

    key('keydown', { key: 'b', code: 'KeyB', keyCode: 66 })

    expect(whatInput.ask()).toBe('keyboard')
  })

  it('only counts the keys passed to specificKeys()', () => {
    whatInput.specificKeys(['Tab'])
    key('keydown', { key: 'a', code: 'KeyA', keyCode: 65 })

    expect(whatInput.ask()).toBe('initial')

    tab()

    expect(whatInput.ask()).toBe('keyboard')
  })

  it('restores ignoreKeys() behavior when specificKeys() is emptied', () => {
    whatInput.specificKeys([9])
    whatInput.specificKeys([])
    key('keydown', { key: 'a', code: 'KeyA', keyCode: 65 })

    expect(whatInput.ask()).toBe('keyboard')
  })
})

describe('pointer', () => {
  it('maps pointerdown by pointerType', () => {
    pointer('pointerdown', 'mouse')
    expect(whatInput.ask()).toBe('mouse')

    pointer('pointerdown', 'touch')
    expect(whatInput.ask()).toBe('touch')

    pointer('pointerdown', 'pen')
    expect(whatInput.ask()).toBe('touch')
  })

  it('sets intent as well as input on pointerdown', () => {
    tab()
    pointer('pointerdown', 'touch')

    expect(whatInput.ask('intent')).toBe('touch')
  })

  it('ignores pointers of unknown type', () => {
    pointer('pointerdown', '')

    expect(whatInput.ask()).toBe('initial')
  })

  it('only changes intent on pointermove', () => {
    pointer('pointermove', 'mouse', { screenX: 10, screenY: 10 })

    expect(whatInput.ask()).toBe('initial')
    expect(whatInput.ask('intent')).toBe('mouse')
    expect(html().getAttribute('data-whatintent')).toBe('mouse')
  })

  it('ignores pointermove that did not move (scrolling under the pointer)', () => {
    pointer('pointermove', 'mouse', { screenX: 10, screenY: 10 })
    tab()
    pointer('pointermove', 'mouse', { screenX: 10, screenY: 10 })

    expect(whatInput.ask('intent')).toBe('keyboard')

    pointer('pointermove', 'mouse', { screenX: 11, screenY: 10 })

    expect(whatInput.ask('intent')).toBe('mouse')
  })

  it('treats the wheel as mouse intent', () => {
    tab()
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('mouse')
  })
})

describe('typing into form fields', () => {
  const focusAndType = (element: HTMLElement) => {
    element.focus()
    key('keydown', { key: 'a', code: 'KeyA', keyCode: 65 }, element)
  }

  it.each(['input', 'select', 'textarea'])('preserves the intent while typing in a <%s>', (tag) => {
    const field = document.createElement(tag) as HTMLElement
    document.body.append(field)

    pointer('pointerdown', 'mouse')
    focusAndType(field)

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('mouse')
  })

  it('preserves the intent for a button inside a form', () => {
    const form = document.createElement('form')
    const button = document.createElement('button')
    form.append(button)
    document.body.append(form)

    pointer('pointerdown', 'mouse')
    focusAndType(button)

    expect(whatInput.ask('intent')).toBe('mouse')
  })

  it('does not preserve the intent for a button outside a form', () => {
    const button = document.createElement('button')
    document.body.append(button)

    pointer('pointerdown', 'mouse')
    focusAndType(button)

    expect(whatInput.ask('intent')).toBe('keyboard')
  })

  it('preserves the intent inside a contenteditable element', () => {
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.tabIndex = 0
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    document.body.append(editor)

    pointer('pointerdown', 'mouse')
    focusAndType(editor)

    expect(whatInput.ask('intent')).toBe('mouse')
  })

  it('looks through shadow roots for the active element', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    const field = document.createElement('input')
    root.append(field)
    document.body.append(host)

    pointer('pointerdown', 'mouse')
    focusAndType(field)

    expect(document.activeElement).toBe(host)
    expect(whatInput.ask('intent')).toBe('mouse')
  })
})

describe('focused element', () => {
  it('exposes the focused element and its classes', () => {
    const link = document.createElement('a')
    link.href = '#'
    link.className = 'one two three'
    document.body.append(link)

    link.focus()

    expect(whatInput.element()).toBe('a')
    expect(html().getAttribute('data-whatelement')).toBe('a')
    expect(html().getAttribute('data-whatclasses')).toBe('one,two,three')

    link.blur()

    expect(whatInput.element()).toBeNull()
    expect(html().hasAttribute('data-whatelement')).toBe(false)
    expect(html().hasAttribute('data-whatclasses')).toBe(false)
  })

  it('omits data-whatclasses for elements without classes', () => {
    const button = document.createElement('button')
    document.body.append(button)

    button.focus()

    expect(html().getAttribute('data-whatelement')).toBe('button')
    expect(html().hasAttribute('data-whatclasses')).toBe(false)
  })

  it('reports the element inside an open shadow root', () => {
    const host = document.createElement('my-field')
    const root = host.attachShadow({ mode: 'open' })
    const field = document.createElement('textarea')
    field.className = 'inner'
    root.append(field)
    document.body.append(host)

    field.focus()

    expect(whatInput.element()).toBe('textarea')
    expect(html().getAttribute('data-whatclasses')).toBe('inner')
  })
})

describe('callbacks and events', () => {
  it('runs registerOnChange callbacks for the chosen strategy', () => {
    const onInput = vi.fn()
    const onIntent = vi.fn()

    whatInput.registerOnChange(onInput)
    whatInput.registerOnChange(onIntent, 'intent')

    pointer('pointermove', 'mouse', { screenX: 1, screenY: 1 })

    expect(onInput).not.toHaveBeenCalled()
    expect(onIntent).toHaveBeenCalledWith('mouse')

    tab()

    expect(onInput).toHaveBeenCalledWith('keyboard')
    expect(onIntent).toHaveBeenLastCalledWith('keyboard')
  })

  it('does not run callbacks when the value did not change', () => {
    const onInput = vi.fn()
    whatInput.registerOnChange(onInput)

    tab()
    tab()

    expect(onInput).toHaveBeenCalledTimes(1)
  })

  it('removes callbacks with unRegisterOnChange', () => {
    const callback = vi.fn()

    whatInput.registerOnChange(callback)
    whatInput.registerOnChange(callback, 'intent')
    whatInput.unRegisterOnChange(callback)

    tab()

    expect(callback).not.toHaveBeenCalled()
  })

  it('runs callbacks with the initial state on start', async () => {
    whatInput.destroy()
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    whatInput = await load()

    const callback = vi.fn()
    whatInput.registerOnChange(callback)

    document.dispatchEvent(new Event('DOMContentLoaded'))

    expect(callback).toHaveBeenCalledWith('initial')
    vi.restoreAllMocks()
  })

  it('dispatches `input` and `intent` CustomEvents', () => {
    const seen: Array<[string, InputMethod]> = []

    whatInput.addEventListener('input', (event) => seen.push(['input', event.detail]))
    whatInput.addEventListener('intent', (event) => seen.push(['intent', event.detail]), {
      once: true,
    })

    pointer('pointerdown', 'touch')
    tab()

    expect(seen).toEqual([
      ['input', 'touch'],
      ['intent', 'touch'],
      ['input', 'keyboard'],
    ])
  })
})

describe('persistence', () => {
  it('persists input and intent to session storage', () => {
    pointer('pointerdown', 'touch')

    expect(sessionStorage.getItem('what-input')).toBe('touch')
    expect(sessionStorage.getItem('what-intent')).toBe('touch')
  })

  it('restores persisted values on the next load', async () => {
    sessionStorage.setItem('what-input', 'keyboard')
    sessionStorage.setItem('what-intent', 'mouse')

    whatInput.destroy()
    whatInput = await load()

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('mouse')
    expect(html().getAttribute('data-whatinput')).toBe('keyboard')
    expect(html().getAttribute('data-whatintent')).toBe('mouse')
  })

  it('ignores corrupt persisted values', async () => {
    sessionStorage.setItem('what-input', 'hologram')

    whatInput.destroy()
    whatInput = await load()

    expect(whatInput.ask()).toBe('initial')
  })

  it.each(['html', 'body'])(
    'can be disabled with data-whatpersist="false" on <%s>',
    async (tag) => {
      sessionStorage.setItem('what-input', 'keyboard')
      ;(tag === 'html' ? html() : document.body).setAttribute('data-whatpersist', 'false')

      whatInput.destroy()
      whatInput = await load()

      expect(whatInput.ask()).toBe('initial')

      pointer('pointerdown', 'touch')

      expect(sessionStorage.getItem('what-input')).toBe('keyboard')
    },
  )

  it('clearStorage() removes only its own keys', () => {
    sessionStorage.setItem('unrelated', 'keep me')
    pointer('pointerdown', 'mouse')

    whatInput.clearStorage()

    expect(sessionStorage.getItem('what-input')).toBeNull()
    expect(sessionStorage.getItem('what-intent')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('keep me')
  })

  it('survives storage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => pointer('pointerdown', 'mouse')).not.toThrow()
    expect(() => whatInput.clearStorage()).not.toThrow()
    expect(whatInput.ask()).toBe('mouse')

    vi.restoreAllMocks()
  })
})

describe('destroy()', () => {
  it('stops listening and removes the attributes', () => {
    const link = document.createElement('a')
    link.href = '#'
    document.body.append(link)
    link.focus()
    tab()

    const callback = vi.fn()
    whatInput.registerOnChange(callback)

    whatInput.destroy()

    for (const name of ['input', 'intent', 'hint', 'element', 'classes']) {
      expect(html().hasAttribute(`data-what${name}`)).toBe(false)
    }

    pointer('pointerdown', 'mouse')

    expect(whatInput.ask()).toBe('keyboard')
    expect(html().hasAttribute('data-whatinput')).toBe(false)
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('keys on non-text controls', () => {
  const focusAndPress = (element: HTMLElement, init: KeyboardEventInit) => {
    element.focus()
    key('keydown', init, element)
  }

  it.each(['checkbox', 'radio'])('does not buffer keys on <input type="%s">', (type) => {
    const field = document.createElement('input')
    field.type = type
    document.body.append(field)

    pointer('pointerdown', 'mouse')
    focusAndPress(field, { key: ' ', code: 'Space', keyCode: 32 })

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('keyboard')
  })

  it('holds the intent inside an element with data-whatfreeze', () => {
    const slider = document.createElement('div')
    slider.setAttribute('data-whatfreeze', '')
    const handle = document.createElement('div')
    handle.tabIndex = 0
    slider.append(handle)
    document.body.append(slider)

    pointer('pointerdown', 'mouse')
    focusAndPress(handle, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 })

    expect(whatInput.ask()).toBe('keyboard')
    expect(whatInput.ask('intent')).toBe('mouse')
  })

  it('holds the intent for form-associated custom elements', () => {
    customElements.define(
      'x-field',
      class extends HTMLElement {
        static formAssociated = true
      },
    )

    const field = document.createElement('x-field')
    field.tabIndex = 0
    document.body.append(field)

    pointer('pointerdown', 'mouse')
    focusAndPress(field, { key: 'a', code: 'KeyA', keyCode: 65 })

    expect(whatInput.ask('intent')).toBe('mouse')
  })
})

describe('hint', () => {
  /** Stubs matchMedia with controllable, change-dispatching query lists. */
  const mockMatchMedia = (initial: Record<string, boolean>) => {
    const matches = { ...initial }
    const lists = new Map<string, EventTarget>()

    vi.stubGlobal('matchMedia', (query: string) => {
      let list = lists.get(query)

      if (!list) {
        list = new EventTarget()
        Object.defineProperty(list, 'matches', { get: () => matches[query] ?? false })
        lists.set(query, list)
      }

      return list
    })

    return (query: string, value: boolean) => {
      matches[query] = value
      lists.get(query)?.dispatchEvent(new Event('change'))
    }
  }

  it('is `unknown` when matchMedia is unavailable', () => {
    expect(whatInput.ask('hint')).toBe('unknown')
    expect(html().getAttribute('data-whathint')).toBe('unknown')
  })

  it('reports touch for a coarse primary pointer', async () => {
    mockMatchMedia({ '(pointer: coarse)': true })
    whatInput.destroy()
    whatInput = await load()

    expect(whatInput.ask('hint')).toBe('touch')
    expect(html().getAttribute('data-whathint')).toBe('touch')
  })

  it('reports mouse for a fine primary pointer', async () => {
    mockMatchMedia({ '(pointer: fine)': true })
    whatInput.destroy()
    whatInput = await load()

    expect(whatInput.ask('hint')).toBe('mouse')
  })

  it('follows media query changes without touching input, intent or storage', async () => {
    const update = mockMatchMedia({ '(pointer: fine)': true })
    whatInput.destroy()
    whatInput = await load()

    const callback = vi.fn()
    const listener = vi.fn()
    whatInput.registerOnChange(callback, 'hint')
    whatInput.addEventListener('hint', (event) => listener(event.detail))

    update('(pointer: fine)', false)
    update('(pointer: coarse)', true)

    expect(whatInput.ask('hint')).toBe('touch')
    expect(html().getAttribute('data-whathint')).toBe('touch')
    expect(callback).toHaveBeenLastCalledWith('touch')
    expect(listener).toHaveBeenLastCalledWith('touch')
    expect(whatInput.ask()).toBe('initial')
    expect(whatInput.ask('intent')).toBe('initial')
    expect(sessionStorage.length).toBe(0)
  })

  it('stops following changes after destroy()', async () => {
    const update = mockMatchMedia({ '(pointer: fine)': true })
    whatInput.destroy()
    whatInput = await load()
    whatInput.destroy()

    update('(pointer: coarse)', true)

    expect(whatInput.ask('hint')).toBe('mouse')
  })
})
