/**
 * What Input?
 *
 * A global utility for tracking the current input method (mouse, keyboard or
 * touch). It writes `data-whatinput`, `data-whatintent`, `data-whatelement`
 * and `data-whatclasses` attributes to the `<html>` element and exposes a
 * small API for scripting against the same information.
 */
/** The input methods What Input can report. */
export type InputMethod = 'initial' | 'mouse' | 'keyboard' | 'touch';
/**
 * `input` is the last *direct* interaction (`pointerdown`, `keydown`).
 * `intent` also includes *indirect* signals (`pointermove`, `wheel`) and is
 * preserved while typing into form fields.
 */
export type Strategy = 'input' | 'intent';
/**
 * What the device's *primary* pointer suggests before (or regardless of) any
 * interaction, read from the `pointer` interaction media feature. It is a
 * hint only: `data-whatinput` and `data-whatintent` never use it.
 */
export type Hint = 'mouse' | 'touch' | 'unknown';
/** A callback registered with `registerOnChange()`. */
export type ChangeCallback = (type: InputMethod) => void;
/** A callback registered with `registerOnChange(callback, 'hint')`. */
export type HintCallback = (hint: Hint) => void;
type Callback = ChangeCallback | HintCallback;
/**
 * A key to ignore or require. Strings are matched against `KeyboardEvent.key`
 * and `KeyboardEvent.code` (`'Shift'`, `'Tab'`, `'KeyA'`); numbers are matched
 * against the legacy `KeyboardEvent.keyCode` for backwards compatibility.
 */
export type KeyMatcher = string | number;
/** The events dispatched by the `whatInput` EventTarget. */
export interface WhatInputEventMap {
    input: CustomEvent<InputMethod>;
    intent: CustomEvent<InputMethod>;
    hint: CustomEvent<Hint>;
}
declare class WhatInput extends EventTarget {
    #private;
    constructor();
    /**
     * The current input method.
     *
     * - `'input'` (default): the same value as the `data-whatinput` attribute
     * - `'intent'`: the same value as the `data-whatintent` attribute
     * - `'hint'`: the same value as the `data-whathint` attribute
     */
    ask(strategy?: Strategy): InputMethod;
    ask(strategy: 'hint'): Hint;
    /** The tag name of the currently focused element, or `null`. */
    element(): string | null;
    /**
     * Replaces the list of keys that are ignored (do not switch to `keyboard`)
     * when pressed. Defaults to the modifier keys.
     */
    ignoreKeys(keys: readonly KeyMatcher[]): void;
    /**
     * Replaces the list of keys that are the *only* keys that switch to
     * `keyboard`. When set, this overrides `ignoreKeys()`. Pass an empty array
     * to restore the `ignoreKeys()` behavior.
     */
    specificKeys(keys: readonly KeyMatcher[]): void;
    /** Fires `callback` whenever the input (default), intent or hint changes. */
    registerOnChange(callback: ChangeCallback, strategy?: Strategy): void;
    registerOnChange(callback: HintCallback, strategy: 'hint'): void;
    /** Removes a callback added with `registerOnChange()`. */
    unRegisterOnChange(callback: Callback): void;
    /** Removes the persisted input and intent from session storage. */
    clearStorage(): void;
    /**
     * Stops listening, removes the `data-what*` attributes from `<html>` and
     * drops every registered callback. Useful for tests and app teardown.
     */
    destroy(): void;
}
/** Typed listeners for the `input`, `intent` and `hint` events (types only). */
interface WhatInput {
    addEventListener<K extends keyof WhatInputEventMap>(type: K, listener: ((this: WhatInput, event: WhatInputEventMap[K]) => void) | null, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof WhatInputEventMap>(type: K, listener: ((this: WhatInput, event: WhatInputEventMap[K]) => void) | null, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}
export type { WhatInput };
/** The shared What Input instance. It starts observing as soon as it is imported. */
declare const whatInput: WhatInput;
export default whatInput;
