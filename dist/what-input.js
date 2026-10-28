/**
 * what-input - A global utility for tracking the current input method (mouse, keyboard or touch).
 * @version v6.0.1
 * @link https://github.com/ten1seven/what-input
 * @license MIT
 */
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
    var __whatInput
"use strict";
(() => {
  // src/what-input.ts
  var ATTRIBUTE_PREFIX = "data-what";
  var STORAGE_KEYS = {
    input: "what-input",
    intent: "what-intent"
  };
  var INPUT_METHODS = /* @__PURE__ */ new Set([
    "initial",
    "mouse",
    "keyboard",
    "touch"
  ]);
  var POINTER_TYPES = {
    mouse: "mouse",
    pen: "touch",
    touch: "touch"
  };
  var DEFAULT_IGNORED_KEYS = [
    "Shift",
    "Control",
    "Alt",
    "Meta",
    // Windows key / Apple command
    "ContextMenu"
    // Windows menu key
  ];
  var TEXT_ENTRY_ELEMENTS = /* @__PURE__ */ new Set(["input", "select", "textarea"]);
  var TOGGLE_INPUT_TYPES = /* @__PURE__ */ new Set(["checkbox", "radio"]);
  var FREEZE_SELECTOR = "[data-whatfreeze]";
  var HINT_QUERIES = {
    touch: "(pointer: coarse)",
    mouse: "(pointer: fine)"
  };
  var hasDom = () => typeof window !== "undefined" && typeof document !== "undefined";
  var isInputMethod = (value) => typeof value === "string" && INPUT_METHODS.has(value);
  var deepActiveElement = () => {
    var _a;
    let element = document.activeElement;
    while ((_a = element == null ? void 0 : element.shadowRoot) == null ? void 0 : _a.activeElement) {
      element = element.shadowRoot.activeElement;
    }
    return element;
  };
  var isTextEntry = (element) => {
    if (!element) return false;
    const tag = element.localName;
    if (tag === "input") return !TOGGLE_INPUT_TYPES.has(element.type);
    if (TEXT_ENTRY_ELEMENTS.has(tag)) return true;
    if (tag === "button" && element.closest("form") !== null) return true;
    if (element.isContentEditable === true) return true;
    if (element.closest(FREEZE_SELECTOR) !== null) return true;
    return element.constructor.formAssociated === true;
  };
  var hintQueries = () => typeof window.matchMedia === "function" ? Object.values(HINT_QUERIES).map((query) => window.matchMedia(query)) : [];
  var readHint = () => {
    if (typeof window.matchMedia !== "function") return "unknown";
    for (const [hint, query] of Object.entries(HINT_QUERIES)) {
      if (window.matchMedia(query).matches) return hint;
    }
    return "unknown";
  };
  var eventTarget = (event) => {
    var _a;
    const target = (_a = event.composedPath()[0]) != null ? _a : event.target;
    return target instanceof Element ? target : null;
  };
  var WhatInput = class extends EventTarget {
    constructor() {
      super();
      this._state = {
        input: "initial",
        intent: "initial",
        hint: "unknown"
      };
      this._focusedElement = null;
      this._persist = false;
      this._ignoredKeys = DEFAULT_IGNORED_KEYS;
      this._requiredKeys = [];
      this._callbacks = {
        input: /* @__PURE__ */ new Set(),
        intent: /* @__PURE__ */ new Set(),
        hint: /* @__PURE__ */ new Set()
      };
      this._controller = null;
      this._lastPointerPosition = { x: NaN, y: NaN };
      /** Restores persisted state (if allowed) and publishes the initial state. */
      this._init = () => {
        const { documentElement, body } = document;
        this._persist = documentElement.dataset.whatpersist !== "false" && (body == null ? void 0 : body.dataset.whatpersist) !== "false";
        if (this._persist) {
          for (const strategy of ["input", "intent"]) {
            const stored = this._restore(strategy);
            if (stored && this._state[strategy] === "initial") {
              this._state[strategy] = stored;
            }
          }
        }
        this._state.hint = readHint();
        this._publish("input");
        this._publish("intent");
        this._publish("hint");
      };
      /*
       * events
       */
      this._onPointerDown = (event) => {
        const value = POINTER_TYPES[event.pointerType];
        if (!value) return;
        this._set("input", value);
        this._set("intent", value);
      };
      this._onPointerMove = (event) => {
        const value = POINTER_TYPES[event.pointerType];
        if (!value) return;
        const { x, y } = this._lastPointerPosition;
        this._lastPointerPosition = { x: event.screenX, y: event.screenY };
        if (event.screenX === x && event.screenY === y) return;
        this._set("intent", value);
      };
      this._onWheel = () => {
        this._set("intent", "mouse");
      };
      this._onHintChange = () => {
        this._set("hint", readHint());
      };
      this._onKey = (event) => {
        if (!this._isCountedKey(event)) return;
        this._set("input", "keyboard");
        if (!isTextEntry(deepActiveElement())) {
          this._set("intent", "keyboard");
        }
      };
      this._onFocusIn = (event) => {
        const target = eventTarget(event);
        if (!target) {
          this._onFocusOut();
          return;
        }
        const html = document.documentElement;
        this._focusedElement = target.localName;
        html.setAttribute(ATTRIBUTE_PREFIX + "element", this._focusedElement);
        if (target.classList.length) {
          html.setAttribute(ATTRIBUTE_PREFIX + "classes", Array.from(target.classList).join(","));
        } else {
          html.removeAttribute(ATTRIBUTE_PREFIX + "classes");
        }
      };
      this._onFocusOut = () => {
        const html = document.documentElement;
        this._focusedElement = null;
        html.removeAttribute(ATTRIBUTE_PREFIX + "element");
        html.removeAttribute(ATTRIBUTE_PREFIX + "classes");
      };
      if (hasDom()) this._start();
    }
    ask(strategy = "input") {
      return this._state[strategy];
    }
    /** The tag name of the currently focused element, or `null`. */
    element() {
      return this._focusedElement;
    }
    /**
     * Replaces the list of keys that are ignored (do not switch to `keyboard`)
     * when pressed. Defaults to the modifier keys.
     */
    ignoreKeys(keys) {
      this._ignoredKeys = [...keys];
    }
    /**
     * Replaces the list of keys that are the *only* keys that switch to
     * `keyboard`. When set, this overrides `ignoreKeys()`. Pass an empty array
     * to restore the `ignoreKeys()` behavior.
     */
    specificKeys(keys) {
      this._requiredKeys = [...keys];
    }
    registerOnChange(callback, strategy = "input") {
      this._callbacks[strategy].add(callback);
    }
    /** Removes a callback added with `registerOnChange()`. */
    unRegisterOnChange(callback) {
      for (const callbacks of Object.values(this._callbacks)) {
        callbacks.delete(callback);
      }
    }
    /** Removes the persisted input and intent from session storage. */
    clearStorage() {
      try {
        for (const key of Object.values(STORAGE_KEYS)) {
          window.sessionStorage.removeItem(key);
        }
      } catch {
      }
    }
    /**
     * Stops listening, removes the `data-what*` attributes from `<html>` and
     * drops every registered callback. Useful for tests and app teardown.
     */
    destroy() {
      var _a;
      (_a = this._controller) == null ? void 0 : _a.abort();
      this._controller = null;
      for (const callbacks of Object.values(this._callbacks)) {
        callbacks.clear();
      }
      if (!hasDom()) return;
      const html = document.documentElement;
      for (const name of ["input", "intent", "hint", "element", "classes"]) {
        html.removeAttribute(ATTRIBUTE_PREFIX + name);
      }
    }
    /*
     * set up
     */
    _start() {
      const controller = new AbortController();
      const { signal } = controller;
      this._controller = controller;
      const options = { capture: true, passive: true, signal };
      window.addEventListener("pointerdown", this._onPointerDown, options);
      window.addEventListener("keydown", this._onKey, options);
      window.addEventListener("keyup", this._onKey, options);
      window.addEventListener("pointermove", this._onPointerMove, options);
      window.addEventListener("wheel", this._onWheel, options);
      window.addEventListener("focusin", this._onFocusIn, options);
      window.addEventListener("focusout", this._onFocusOut, options);
      for (const query of hintQueries()) {
        query.addEventListener("change", this._onHintChange, { signal });
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", this._init, { once: true, signal });
      } else {
        this._init();
      }
    }
    /*
     * state
     */
    _isCountedKey(event) {
      const matches = (key) => typeof key === "number" ? key === event.keyCode : key === event.key || key === event.code;
      return this._requiredKeys.length ? this._requiredKeys.some(matches) : !this._ignoredKeys.some(matches);
    }
    _set(channel, value) {
      if (this._state[channel] === value) return;
      this._state[channel] = value;
      this._store(channel, value);
      this._publish(channel);
    }
    /** Writes the attribute, runs the callbacks and dispatches the event. */
    _publish(channel) {
      const value = this._state[channel];
      document.documentElement.setAttribute(ATTRIBUTE_PREFIX + channel, value);
      for (const callback of this._callbacks[channel]) {
        ;
        callback(value);
      }
      this.dispatchEvent(new CustomEvent(channel, { detail: value }));
    }
    _store(channel, value) {
      if (channel === "hint" || !this._persist) return;
      try {
        window.sessionStorage.setItem(STORAGE_KEYS[channel], value);
      } catch {
      }
    }
    _restore(strategy) {
      try {
        const value = window.sessionStorage.getItem(STORAGE_KEYS[strategy]);
        return isInputMethod(value) ? value : null;
      } catch {
        return null;
      }
    }
  };
  var whatInput = new WhatInput();
  var what_input_default = whatInput;

  // scripts/umd-entry.ts
  __whatInput = what_input_default;
})();
return __whatInput
  },
)
