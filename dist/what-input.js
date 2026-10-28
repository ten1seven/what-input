/**
 * what-input - A global utility for tracking the current input method (mouse, keyboard or touch).
 * @version v6.0.0
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
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) {
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
    const target = event.composedPath()[0] ?? event.target;
    return target instanceof Element ? target : null;
  };
  var WhatInput = class extends EventTarget {
    #state = {
      input: "initial",
      intent: "initial",
      hint: "unknown"
    };
    #element = null;
    #persist = false;
    #ignoredKeys = DEFAULT_IGNORED_KEYS;
    #specificKeys = [];
    #callbacks = {
      input: /* @__PURE__ */ new Set(),
      intent: /* @__PURE__ */ new Set(),
      hint: /* @__PURE__ */ new Set()
    };
    #controller = null;
    #lastPointerPosition = { x: NaN, y: NaN };
    constructor() {
      super();
      if (hasDom()) this.#start();
    }
    ask(strategy = "input") {
      return this.#state[strategy];
    }
    /** The tag name of the currently focused element, or `null`. */
    element() {
      return this.#element;
    }
    /**
     * Replaces the list of keys that are ignored (do not switch to `keyboard`)
     * when pressed. Defaults to the modifier keys.
     */
    ignoreKeys(keys) {
      this.#ignoredKeys = [...keys];
    }
    /**
     * Replaces the list of keys that are the *only* keys that switch to
     * `keyboard`. When set, this overrides `ignoreKeys()`. Pass an empty array
     * to restore the `ignoreKeys()` behavior.
     */
    specificKeys(keys) {
      this.#specificKeys = [...keys];
    }
    registerOnChange(callback, strategy = "input") {
      this.#callbacks[strategy].add(callback);
    }
    /** Removes a callback added with `registerOnChange()`. */
    unRegisterOnChange(callback) {
      for (const callbacks of Object.values(this.#callbacks)) {
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
      this.#controller?.abort();
      this.#controller = null;
      for (const callbacks of Object.values(this.#callbacks)) {
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
    #start() {
      const controller = new AbortController();
      const { signal } = controller;
      this.#controller = controller;
      const options = { capture: true, passive: true, signal };
      window.addEventListener("pointerdown", this.#onPointerDown, options);
      window.addEventListener("keydown", this.#onKey, options);
      window.addEventListener("keyup", this.#onKey, options);
      window.addEventListener("pointermove", this.#onPointerMove, options);
      window.addEventListener("wheel", this.#onWheel, options);
      window.addEventListener("focusin", this.#onFocusIn, options);
      window.addEventListener("focusout", this.#onFocusOut, options);
      for (const query of hintQueries()) {
        query.addEventListener("change", this.#onHintChange, { signal });
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", this.#init, { once: true, signal });
      } else {
        this.#init();
      }
    }
    /** Restores persisted state (if allowed) and publishes the initial state. */
    #init = () => {
      const { documentElement, body } = document;
      this.#persist = documentElement.dataset.whatpersist !== "false" && body?.dataset.whatpersist !== "false";
      if (this.#persist) {
        for (const strategy of ["input", "intent"]) {
          const stored = this.#restore(strategy);
          if (stored && this.#state[strategy] === "initial") {
            this.#state[strategy] = stored;
          }
        }
      }
      this.#state.hint = readHint();
      this.#publish("input");
      this.#publish("intent");
      this.#publish("hint");
    };
    /*
     * events
     */
    #onPointerDown = (event) => {
      const value = POINTER_TYPES[event.pointerType];
      if (!value) return;
      this.#set("input", value);
      this.#set("intent", value);
    };
    #onPointerMove = (event) => {
      const value = POINTER_TYPES[event.pointerType];
      if (!value) return;
      const { x, y } = this.#lastPointerPosition;
      this.#lastPointerPosition = { x: event.screenX, y: event.screenY };
      if (event.screenX === x && event.screenY === y) return;
      this.#set("intent", value);
    };
    #onWheel = () => {
      this.#set("intent", "mouse");
    };
    #onHintChange = () => {
      this.#set("hint", readHint());
    };
    #onKey = (event) => {
      if (!this.#isCountedKey(event)) return;
      this.#set("input", "keyboard");
      if (!isTextEntry(deepActiveElement())) {
        this.#set("intent", "keyboard");
      }
    };
    #onFocusIn = (event) => {
      const target = eventTarget(event);
      if (!target) {
        this.#onFocusOut();
        return;
      }
      const html = document.documentElement;
      this.#element = target.localName;
      html.setAttribute(ATTRIBUTE_PREFIX + "element", this.#element);
      if (target.classList.length) {
        html.setAttribute(ATTRIBUTE_PREFIX + "classes", Array.from(target.classList).join(","));
      } else {
        html.removeAttribute(ATTRIBUTE_PREFIX + "classes");
      }
    };
    #onFocusOut = () => {
      const html = document.documentElement;
      this.#element = null;
      html.removeAttribute(ATTRIBUTE_PREFIX + "element");
      html.removeAttribute(ATTRIBUTE_PREFIX + "classes");
    };
    /*
     * state
     */
    #isCountedKey(event) {
      const matches = (key) => typeof key === "number" ? key === event.keyCode : key === event.key || key === event.code;
      return this.#specificKeys.length ? this.#specificKeys.some(matches) : !this.#ignoredKeys.some(matches);
    }
    #set(channel, value) {
      if (this.#state[channel] === value) return;
      this.#state[channel] = value;
      this.#store(channel, value);
      this.#publish(channel);
    }
    /** Writes the attribute, runs the callbacks and dispatches the event. */
    #publish(channel) {
      const value = this.#state[channel];
      document.documentElement.setAttribute(ATTRIBUTE_PREFIX + channel, value);
      for (const callback of this.#callbacks[channel]) {
        ;
        callback(value);
      }
      this.dispatchEvent(new CustomEvent(channel, { detail: value }));
    }
    #store(channel, value) {
      if (channel === "hint" || !this.#persist) return;
      try {
        window.sessionStorage.setItem(STORAGE_KEYS[channel], value);
      } catch {
      }
    }
    #restore(strategy) {
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
