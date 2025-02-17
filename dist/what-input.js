/**
 * what-input - A global utility for tracking the current input method (mouse, keyboard or touch).
 * @version v6.0.0
 * @link https://github.com/ten1seven/what-input
 * @license MIT
 */
var p = Object.defineProperty;
var d = (o, t, e) => t in o ? p(o, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : o[t] = e;
var s = (o, t, e) => d(o, typeof t != "symbol" ? t + "" : t, e);
const i = class i {
  constructor() {
    s(this, "docElem");
    s(this, "currentElement", null);
    s(this, "currentInput", "initial");
    s(this, "currentIntent", "initial");
    s(this, "currentTimestamp", Date.now());
    s(this, "shouldPersist", !1);
    s(this, "formInputs", ["button", "input", "select", "textarea"]);
    s(this, "functionList", []);
    s(this, "ignoreMap", [16, 17, 18, 91, 93]);
    s(this, "specificMap", []);
    s(this, "isScrolling", !1);
    s(this, "mousePos", { x: null, y: null });
    s(this, "supportsPassive");
    if (typeof document == "undefined" || typeof window == "undefined")
      throw new Error("What Input requires a browser environment");
    this.docElem = document.documentElement, this.supportsPassive = this.checkPassiveSupport();
  }
  setUp() {
    const t = this.detectWheel();
    return Object.defineProperty(i.inputMap, t, { value: "mouse" }), this.addListeners(), this;
  }
  ask(t) {
    return t === "intent" ? this.currentIntent : this.currentInput;
  }
  element() {
    return this.currentElement;
  }
  ignoreKeys(t) {
    this.ignoreMap = [...t];
  }
  specificKeys(t) {
    this.specificMap = [...t];
  }
  registerOnChange(t, e = "input") {
    this.functionList.push({ fn: t, type: e });
  }
  unRegisterOnChange(t) {
    const e = this.functionList.findIndex((n) => n.fn === t);
    e !== -1 && this.functionList.splice(e, 1);
  }
  clearStorage() {
    var t;
    (t = window.sessionStorage) == null || t.clear();
  }
  addListeners() {
    const t = this.supportsPassive ? { passive: !0, capture: !0 } : !0;
    document.addEventListener("DOMContentLoaded", () => this.setPersist(), !0), window.PointerEvent ? (window.addEventListener("pointerdown", (e) => this.setInput(e), !0), window.addEventListener("pointermove", (e) => this.setIntent(e), !0)) : window.MSPointerEvent ? (window.addEventListener("MSPointerDown", (e) => this.setInput(e), !0), window.addEventListener("MSPointerMove", (e) => this.setIntent(e), !0)) : (window.addEventListener("mousedown", (e) => this.setInput(e), !0), window.addEventListener("mousemove", (e) => this.setIntent(e), !0), "ontouchstart" in window && (window.addEventListener("touchstart", (e) => this.setInput(e), t), window.addEventListener("touchend", (e) => this.setInput(e), !0))), window.addEventListener(this.detectWheel(), (e) => this.setIntent(e), t), window.addEventListener("keydown", (e) => this.setInput(e), !0), window.addEventListener("keyup", (e) => this.setInput(e), !0), window.addEventListener("focusin", (e) => this.setElement(e), !0), window.addEventListener("focusout", () => this.clearElement(), !0);
  }
  setInput(t) {
    if (!this.isInputEvent(t)) return;
    const e = "which" in t ? t.which : null;
    let n = i.inputMap[t.type];
    n === "pointer" && this.isPointerEvent(t) && (n = this.pointerType(t));
    const h = !this.specificMap.length && !this.ignoreMap.includes(e), a = this.specificMap.length && this.specificMap.includes(e);
    let u = n === "keyboard" && e && (h || a) || n === "mouse" || n === "touch";
    if (this.validateTouch(n) && (u = !1), u && this.currentInput !== n && (this.currentInput = n, this.persistInput("input", this.currentInput), this.doUpdate("input")), u && this.currentIntent !== n) {
      const r = document.activeElement;
      r && r.nodeName && (this.formInputs.indexOf(r.nodeName.toLowerCase()) === -1 || r.nodeName.toLowerCase() === "button" && !this.checkClosest(r, "form")) && (this.currentIntent = n, this.persistInput("intent", this.currentIntent), this.doUpdate("intent"));
    }
  }
  setIntent(t) {
    let e = i.inputMap[t.type];
    e === "pointer" && (e = this.pointerType(t)), this.detectScrolling(t), (!this.isScrolling && !this.validateTouch(e) || this.isScrolling && t.type === "wheel" || t.type === "mousewheel" || t.type === "DOMMouseScroll") && this.currentIntent !== e && (this.currentIntent = e, this.persistInput("intent", this.currentIntent), this.doUpdate("intent"));
  }
  setElement(t) {
    const e = t.target;
    if (!(e != null && e.nodeName)) {
      this.clearElement();
      return;
    }
    this.currentElement = e.nodeName.toLowerCase(), this.docElem.dataset.whatelement = this.currentElement, e.classList.length && (this.docElem.dataset.whatclasses = Array.from(e.classList).join(","));
  }
  clearElement() {
    this.currentElement = null, this.docElem.removeAttribute("data-whatelement"), this.docElem.removeAttribute("data-whatclasses");
  }
  persistInput(t, e) {
    var n;
    if (this.shouldPersist)
      try {
        (n = window.sessionStorage) == null || n.setItem(`what-${t}`, e);
      } catch (h) {
      }
  }
  pointerType(t) {
    return typeof t.pointerType == "number" ? i.pointerMap[t.pointerType] : t.pointerType === "pen" ? "touch" : t.pointerType;
  }
  validateTouch(t) {
    const e = Date.now(), n = t === "mouse" && this.currentInput === "touch" && e - this.currentTimestamp < 200;
    return this.currentTimestamp = e, n;
  }
  detectWheel() {
    let t = null;
    return "onwheel" in document.createElement("div") ? t = "wheel" : t = document.onmousewheel !== void 0 ? "mousewheel" : "DOMMouseScroll", t;
  }
  fireFunctions(t) {
    for (let e = 0, n = this.functionList.length; e < n; e++)
      this.functionList[e].type === t && this.functionList[e].fn.call(
        this,
        t === "input" ? this.currentInput : this.currentIntent
      );
  }
  doUpdate(t) {
    this.docElem.setAttribute(
      "data-what" + t,
      t === "input" ? this.currentInput : this.currentIntent
    ), this.fireFunctions(t);
  }
  setPersist() {
    if (this.shouldPersist = !(this.docElem.getAttribute("data-whatpersist") === "false" || document.body.getAttribute("data-whatpersist") === "false"), this.shouldPersist)
      try {
        window.sessionStorage.getItem("what-input") && (this.currentInput = window.sessionStorage.getItem("what-input") || "initial"), window.sessionStorage.getItem("what-intent") && (this.currentIntent = window.sessionStorage.getItem("what-intent") || this.currentInput);
      } catch (t) {
      }
    this.doUpdate("input"), this.doUpdate("intent");
  }
  detectScrolling(t) {
    this.mousePos.x !== t.screenX || this.mousePos.y !== t.screenY ? (this.isScrolling = !1, this.mousePos.x = t.screenX, this.mousePos.y = t.screenY) : this.isScrolling = !0;
  }
  checkClosest(t, e) {
    const n = window.Element.prototype;
    if (n.matches || (n.matches = n.msMatchesSelector || n.webkitMatchesSelector), n.closest)
      return t.closest(e);
    do {
      if (t.matches(e))
        return t;
      t = t.parentElement || t.parentNode;
    } while (t !== null && t.nodeType === 1);
    return null;
  }
  isInputEvent(t) {
    return "type" in t && t.type in i.inputMap;
  }
  isPointerEvent(t) {
    return "pointerType" in t;
  }
  checkPassiveSupport() {
    let t = !1;
    try {
      const e = Object.defineProperty({}, "passive", {
        get: () => (t = !0, !0)
      });
      window.addEventListener("test", null, e);
    } catch (e) {
    }
    return t;
  }
};
s(i, "inputMap", {
  keydown: "keyboard",
  keyup: "keyboard",
  mousedown: "mouse",
  mousemove: "mouse",
  MSPointerDown: "pointer",
  MSPointerMove: "pointer",
  pointerdown: "pointer",
  pointermove: "pointer",
  touchstart: "touch",
  touchend: "touch"
}), s(i, "pointerMap", {
  2: "touch",
  3: "touch",
  4: "mouse"
});
let c = i;
const l = () => new c().setUp(), w = l();
typeof window != "undefined" && (window.whatInput = w);
export {
  w as default,
  l as setUp
};
