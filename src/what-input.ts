/**
 * What Input?
 *
 * A global utility for tracking the current input method (mouse, keyboard or
 * touch). It writes `data-whatinput`, `data-whatintent`, `data-whatelement`
 * and `data-whatclasses` attributes to the `<html>` element and exposes a
 * small API for scripting against the same information.
 */

/** The input methods What Input can report. */
export type InputMethod = 'initial' | 'mouse' | 'keyboard' | 'touch'

/**
 * `input` is the last *direct* interaction (`pointerdown`, `keydown`).
 * `intent` also includes *indirect* signals (`pointermove`, `wheel`) and is
 * preserved while typing into form fields.
 */
export type Strategy = 'input' | 'intent'

/**
 * What the device's *primary* pointer suggests before (or regardless of) any
 * interaction, read from the `pointer` interaction media feature. It is a
 * hint only: `data-whatinput` and `data-whatintent` never use it.
 */
export type Hint = 'mouse' | 'touch' | 'unknown'

/** A callback registered with `registerOnChange()`. */
export type ChangeCallback = (type: InputMethod) => void

/** A callback registered with `registerOnChange(callback, 'hint')`. */
export type HintCallback = (hint: Hint) => void

type Channel = Strategy | 'hint'

type Callback = ChangeCallback | HintCallback

/**
 * A key to ignore or require. Strings are matched against `KeyboardEvent.key`
 * and `KeyboardEvent.code` (`'Shift'`, `'Tab'`, `'KeyA'`); numbers are matched
 * against the legacy `KeyboardEvent.keyCode` for backwards compatibility.
 */
export type KeyMatcher = string | number

/** The events dispatched by the `whatInput` EventTarget. */
export interface WhatInputEventMap {
  input: CustomEvent<InputMethod>
  intent: CustomEvent<InputMethod>
  hint: CustomEvent<Hint>
}

const ATTRIBUTE_PREFIX = 'data-what'

const STORAGE_KEYS: Record<Strategy, string> = {
  input: 'what-input',
  intent: 'what-intent',
}

const INPUT_METHODS: ReadonlySet<string> = new Set<InputMethod>([
  'initial',
  'mouse',
  'keyboard',
  'touch',
])

/** `PointerEvent.pointerType` → input method. Pens are reported as touch. */
const POINTER_TYPES: Readonly<Record<string, InputMethod | undefined>> = {
  mouse: 'mouse',
  pen: 'touch',
  touch: 'touch',
}

/**
 * Modifier keys that are commonly used together with a pointer (shift-click,
 * cmd-click, ...) and must not flip the input method to `keyboard`.
 */
const DEFAULT_IGNORED_KEYS: readonly KeyMatcher[] = [
  'Shift',
  'Control',
  'Alt',
  'Meta', // Windows key / Apple command
  'ContextMenu', // Windows menu key
]

/** Elements where typing is expected and must not change the intent. */
const TEXT_ENTRY_ELEMENTS: ReadonlySet<string> = new Set(['input', 'select', 'textarea'])

/** `<input>` types that are toggled, not typed into. */
const TOGGLE_INPUT_TYPES: ReadonlySet<string> = new Set(['checkbox', 'radio'])

/** Opt-in attribute: hold the intent while focus is inside the element. */
const FREEZE_SELECTOR = '[data-whatfreeze]'

/** Interaction media features describing the device's primary pointer. */
const HINT_QUERIES: Readonly<Record<Exclude<Hint, 'unknown'>, string>> = {
  touch: '(pointer: coarse)',
  mouse: '(pointer: fine)',
}

const hasDom = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined'

const isInputMethod = (value: unknown): value is InputMethod =>
  typeof value === 'string' && INPUT_METHODS.has(value)

/** Follows `activeElement` through open shadow roots. */
const deepActiveElement = (): Element | null => {
  let element = document.activeElement

  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement
  }

  return element
}

/** True when keyboard use is for text entry rather than navigation. */
const isTextEntry = (element: Element | null): boolean => {
  if (!element) return false

  const tag = element.localName

  if (tag === 'input') return !TOGGLE_INPUT_TYPES.has((element as HTMLInputElement).type)
  if (TEXT_ENTRY_ELEMENTS.has(tag)) return true
  if (tag === 'button' && element.closest('form') !== null) return true
  if ((element as HTMLElement).isContentEditable === true) return true
  if (element.closest(FREEZE_SELECTOR) !== null) return true

  // form-associated custom elements (`static formAssociated = true`)
  return (element.constructor as { formAssociated?: boolean }).formAssociated === true
}

/** The media query lists behind the hint, when the browser has `matchMedia`. */
const hintQueries = (): MediaQueryList[] =>
  typeof window.matchMedia === 'function'
    ? Object.values(HINT_QUERIES).map((query) => window.matchMedia(query))
    : []

const readHint = (): Hint => {
  if (typeof window.matchMedia !== 'function') return 'unknown'

  for (const [hint, query] of Object.entries(HINT_QUERIES) as Array<[Hint, string]>) {
    if (window.matchMedia(query).matches) return hint
  }

  return 'unknown'
}

/** The element that actually received a (possibly retargeted) event. */
const eventTarget = (event: Event): Element | null => {
  const target = event.composedPath()[0] ?? event.target

  return target instanceof Element ? target : null
}

class WhatInput extends EventTarget {
  private _state: { input: InputMethod; intent: InputMethod; hint: Hint } = {
    input: 'initial',
    intent: 'initial',
    hint: 'unknown',
  }
  private _focusedElement: string | null = null
  private _persist = false
  private _ignoredKeys: readonly KeyMatcher[] = DEFAULT_IGNORED_KEYS
  private _requiredKeys: readonly KeyMatcher[] = []
  private _callbacks: Record<Channel, Set<Callback>> = {
    input: new Set(),
    intent: new Set(),
    hint: new Set(),
  }
  private _controller: AbortController | null = null
  private _lastPointerPosition = { x: NaN, y: NaN }

  constructor() {
    super()

    // bail out in non-DOM environments (SSR, workers, tests); the API still
    // answers, it just never observes an interaction
    if (hasDom()) this._start()
  }

  /*
   * api
   */

  /**
   * The current input method.
   *
   * - `'input'` (default): the same value as the `data-whatinput` attribute
   * - `'intent'`: the same value as the `data-whatintent` attribute
   * - `'hint'`: the same value as the `data-whathint` attribute
   */
  ask(strategy?: Strategy): InputMethod
  ask(strategy: 'hint'): Hint
  ask(strategy: Channel = 'input'): InputMethod | Hint {
    return this._state[strategy]
  }

  /** The tag name of the currently focused element, or `null`. */
  element(): string | null {
    return this._focusedElement
  }

  /**
   * Replaces the list of keys that are ignored (do not switch to `keyboard`)
   * when pressed. Defaults to the modifier keys.
   */
  ignoreKeys(keys: readonly KeyMatcher[]): void {
    this._ignoredKeys = [...keys]
  }

  /**
   * Replaces the list of keys that are the *only* keys that switch to
   * `keyboard`. When set, this overrides `ignoreKeys()`. Pass an empty array
   * to restore the `ignoreKeys()` behavior.
   */
  specificKeys(keys: readonly KeyMatcher[]): void {
    this._requiredKeys = [...keys]
  }

  /** Fires `callback` whenever the input (default), intent or hint changes. */
  registerOnChange(callback: ChangeCallback, strategy?: Strategy): void
  registerOnChange(callback: HintCallback, strategy: 'hint'): void
  registerOnChange(callback: Callback, strategy: Channel = 'input'): void {
    this._callbacks[strategy].add(callback)
  }

  /** Removes a callback added with `registerOnChange()`. */
  unRegisterOnChange(callback: Callback): void {
    for (const callbacks of Object.values(this._callbacks)) {
      callbacks.delete(callback)
    }
  }

  /** Removes the persisted input and intent from session storage. */
  clearStorage(): void {
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        window.sessionStorage.removeItem(key)
      }
    } catch {
      // storage can be unavailable (cookies disabled, sandboxed frames)
    }
  }

  /**
   * Stops listening, removes the `data-what*` attributes from `<html>` and
   * drops every registered callback. Useful for tests and app teardown.
   */
  destroy(): void {
    this._controller?.abort()
    this._controller = null

    for (const callbacks of Object.values(this._callbacks)) {
      callbacks.clear()
    }

    if (!hasDom()) return

    const html = document.documentElement

    for (const name of ['input', 'intent', 'hint', 'element', 'classes']) {
      html.removeAttribute(ATTRIBUTE_PREFIX + name)
    }
  }

  /*
   * set up
   */

  private _start(): void {
    const controller = new AbortController()
    const { signal } = controller

    this._controller = controller

    // capture so the events are seen even when a local listener stops
    // propagation, passive because nothing here ever calls `preventDefault()`
    const options: AddEventListenerOptions = { capture: true, passive: true, signal }

    // direct interactions
    window.addEventListener('pointerdown', this._onPointerDown, options)
    window.addEventListener('keydown', this._onKey, options)
    window.addEventListener('keyup', this._onKey, options)

    // indirect interactions (potential, not actual, input)
    window.addEventListener('pointermove', this._onPointerMove, options)
    window.addEventListener('wheel', this._onWheel, options)

    // focus tracking
    window.addEventListener('focusin', this._onFocusIn, options)
    window.addEventListener('focusout', this._onFocusOut, options)

    // device hint (a keyboard detached from a tablet, a mouse paired with one)
    for (const query of hintQueries()) {
      query.addEventListener('change', this._onHintChange, { signal })
    }

    // `<body data-whatpersist>` can only be read once the body exists
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this._init, { once: true, signal })
    } else {
      this._init()
    }
  }

  /** Restores persisted state (if allowed) and publishes the initial state. */
  private _init = (): void => {
    const { documentElement, body } = document

    this._persist =
      documentElement.dataset.whatpersist !== 'false' && body?.dataset.whatpersist !== 'false'

    if (this._persist) {
      for (const strategy of ['input', 'intent'] as const) {
        const stored = this._restore(strategy)

        // an interaction that happened before `DOMContentLoaded` wins
        if (stored && this._state[strategy] === 'initial') {
          this._state[strategy] = stored
        }
      }
    }

    this._state.hint = readHint()

    // always publish so at least the `initial` state is set
    this._publish('input')
    this._publish('intent')
    this._publish('hint')
  }

  /*
   * events
   */

  private _onPointerDown = (event: PointerEvent): void => {
    const value = POINTER_TYPES[event.pointerType]

    if (!value) return

    this._set('input', value)
    this._set('intent', value)
  }

  private _onPointerMove = (event: PointerEvent): void => {
    const value = POINTER_TYPES[event.pointerType]

    if (!value) return

    // browsers dispatch synthetic `pointermove` events while the page scrolls
    // under a stationary pointer; those are not evidence of intent
    const { x, y } = this._lastPointerPosition

    this._lastPointerPosition = { x: event.screenX, y: event.screenY }

    if (event.screenX === x && event.screenY === y) return

    this._set('intent', value)
  }

  private _onWheel = (): void => {
    this._set('intent', 'mouse')
  }

  private _onHintChange = (): void => {
    this._set('hint', readHint())
  }

  private _onKey = (event: KeyboardEvent): void => {
    if (!this._isCountedKey(event)) return

    this._set('input', 'keyboard')

    // typing into a form field is not a change of intent: a mouse user that
    // fills in a form is still a mouse user
    if (!isTextEntry(deepActiveElement())) {
      this._set('intent', 'keyboard')
    }
  }

  private _onFocusIn = (event: FocusEvent): void => {
    const target = eventTarget(event)

    if (!target) {
      this._onFocusOut()
      return
    }

    const html = document.documentElement

    this._focusedElement = target.localName
    html.setAttribute(ATTRIBUTE_PREFIX + 'element', this._focusedElement)

    if (target.classList.length) {
      html.setAttribute(ATTRIBUTE_PREFIX + 'classes', Array.from(target.classList).join(','))
    } else {
      html.removeAttribute(ATTRIBUTE_PREFIX + 'classes')
    }
  }

  private _onFocusOut = (): void => {
    const html = document.documentElement

    this._focusedElement = null
    html.removeAttribute(ATTRIBUTE_PREFIX + 'element')
    html.removeAttribute(ATTRIBUTE_PREFIX + 'classes')
  }

  /*
   * state
   */

  private _isCountedKey(event: KeyboardEvent): boolean {
    const matches = (key: KeyMatcher): boolean =>
      typeof key === 'number' ? key === event.keyCode : key === event.key || key === event.code

    return this._requiredKeys.length
      ? this._requiredKeys.some(matches)
      : !this._ignoredKeys.some(matches)
  }

  /** Updates, persists and publishes a value when it actually changed. */
  private _set(channel: Strategy, value: InputMethod): void
  private _set(channel: 'hint', value: Hint): void
  private _set(channel: Channel, value: InputMethod | Hint): void {
    if (this._state[channel] === value) return

    this._state[channel] = value as never
    this._store(channel, value)
    this._publish(channel)
  }

  /** Writes the attribute, runs the callbacks and dispatches the event. */
  private _publish(channel: Channel): void {
    const value = this._state[channel]

    document.documentElement.setAttribute(ATTRIBUTE_PREFIX + channel, value)

    for (const callback of this._callbacks[channel]) {
      ;(callback as (value: string) => void)(value)
    }

    this.dispatchEvent(new CustomEvent(channel, { detail: value }))
  }

  private _store(channel: Channel, value: InputMethod | Hint): void {
    // the hint is live from the device and never persisted
    if (channel === 'hint' || !this._persist) return

    try {
      window.sessionStorage.setItem(STORAGE_KEYS[channel], value)
    } catch {
      // storage can be unavailable (cookies disabled, sandboxed frames)
    }
  }

  private _restore(strategy: Strategy): InputMethod | null {
    try {
      const value = window.sessionStorage.getItem(STORAGE_KEYS[strategy])

      return isInputMethod(value) ? value : null
    } catch {
      return null
    }
  }
}

/** Typed listeners for the `input`, `intent` and `hint` events (types only). */
interface WhatInput {
  addEventListener<K extends keyof WhatInputEventMap>(
    type: K,
    listener: ((this: WhatInput, event: WhatInputEventMap[K]) => void) | null,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener<K extends keyof WhatInputEventMap>(
    type: K,
    listener: ((this: WhatInput, event: WhatInputEventMap[K]) => void) | null,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void
}

export type { WhatInput }

/** The shared What Input instance. It starts observing as soon as it is imported. */
const whatInput = new WhatInput()

export default whatInput
