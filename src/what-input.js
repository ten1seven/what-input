class WhatInput {
  // Core state
  docElem = document.documentElement;
  currentElement = null;
  currentInput = 'initial';
  currentIntent = this.currentInput;
  currentTimestamp = Date.now();
  shouldPersist = false;
  isScrolling = false;

  // Constants
  formInputs = ['button', 'input', 'select', 'textarea'];
  functionList = [];
  ignoreMap = [16, 17, 18, 91, 93]; // modifier keys
  specificMap = [];

  // Mouse position tracking
  mousePos = { x: null, y: null };

  // Event mappings
  inputMap = {
    keydown: 'keyboard',
    keyup: 'keyboard',
    mousedown: 'mouse',
    mousemove: 'mouse',
    MSPointerDown: 'pointer',
    MSPointerMove: 'pointer',
    pointerdown: 'pointer',
    pointermove: 'pointer',
    touchstart: 'touch',
    touchend: 'touch'
  };

  pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  };

  supportsPassive = this.checkPassiveSupport();

  constructor() {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return this.createStubAPI();
    }
  }

  createStubAPI() {
    return {
      ask: () => 'initial',
      element: () => null,
      ignoreKeys: () => {},
      specificKeys: () => {},
      registerOnChange: () => {},
      unRegisterOnChange: () => {},
      clearStorage: () => {}
    };
  }

  init() {
    this.inputMap[this.detectWheel()] = 'mouse';
    this.addListeners();
    return this;
  }

  // Public API methods
  ask = (opt) => opt === 'intent' ? this.currentIntent : this.currentInput;

  element = () => this.currentElement;

  ignoreKeys = (arr) => {
    this.ignoreMap = arr;
  };

  specificKeys = (arr) => {
    this.specificMap = arr;
  };

  registerOnChange = (fn, eventType) => {
    this.functionList.push({
      fn,
      type: eventType || 'input'
    });
  };

  unRegisterOnChange = (fn) => {
    const position = this.findFunctionPosition(fn);
    if (position || position === 0) {
      this.functionList.splice(position, 1);
    }
  };

  clearStorage = () => {
    window.sessionStorage.clear();
  };

  // Event handlers
  addListeners() {
    const options = this.supportsPassive ? { passive: true, capture: true } : true;

    document.addEventListener('DOMContentLoaded', () => this.setPersist(), true);

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      window.addEventListener('pointerdown', (e) => this.setInput(e), true);
      window.addEventListener('pointermove', (e) => this.setIntent(e), true);
    } else if (window.MSPointerEvent) {
      window.addEventListener('MSPointerDown', (e) => this.setInput(e), true);
      window.addEventListener('MSPointerMove', (e) => this.setIntent(e), true);
    } else {
      // mouse events
      window.addEventListener('mousedown', (e) => this.setInput(e), true);
      window.addEventListener('mousemove', (e) => this.setIntent(e), true);

      // touch events
      if ('ontouchstart' in window) {
        window.addEventListener('touchstart', (e) => this.setInput(e), options);
        window.addEventListener('touchend', (e) => this.setInput(e), true);
      }
    }

    // mouse wheel
    window.addEventListener(this.detectWheel(), (e) => this.setIntent(e), options);

    // keyboard events
    window.addEventListener('keydown', (e) => this.setInput(e), true);
    window.addEventListener('keyup', (e) => this.setInput(e), true);

    // focus events
    window.addEventListener('focusin', (e) => this.setElement(e), true);
    window.addEventListener('focusout', () => this.clearElement(), true);
  }

  setPersist() {
    this.shouldPersist = !(
      this.docElem.getAttribute('data-whatpersist') === 'false' ||
      document.body.getAttribute('data-whatpersist') === 'false'
    );

    if (this.shouldPersist) {
      try {
        if (window.sessionStorage.getItem('what-input')) {
          this.currentInput = window.sessionStorage.getItem('what-input');
        }

        if (window.sessionStorage.getItem('what-intent')) {
          this.currentIntent = window.sessionStorage.getItem('what-intent');
        }
      } catch (e) {
        // fail silently
      }
    }

    this.doUpdate('input');
    this.doUpdate('intent');
  }

  setInput(event) {
    const eventKey = event.which;
    let value = this.inputMap[event.type];

    if (value === 'pointer') {
      value = this.pointerType(event);
    }

    const ignoreMatch = !this.specificMap.length && this.ignoreMap.indexOf(eventKey) === -1;
    const specificMatch = this.specificMap.length && this.specificMap.indexOf(eventKey) !== -1;
    let shouldUpdate = (value === 'keyboard' && eventKey && (ignoreMatch || specificMatch)) ||
                      value === 'mouse' ||
                      value === 'touch';

    if (this.validateTouch(value)) {
      shouldUpdate = false;
    }

    if (shouldUpdate && this.currentInput !== value) {
      this.currentInput = value;
      this.persistInput('input', this.currentInput);
      this.doUpdate('input');
    }

    if (shouldUpdate && this.currentIntent !== value) {
      const activeElem = document.activeElement;
      const notFormInput = activeElem &&
        activeElem.nodeName &&
        (this.formInputs.indexOf(activeElem.nodeName.toLowerCase()) === -1 ||
          (activeElem.nodeName.toLowerCase() === 'button' &&
            !this.checkClosest(activeElem, 'form')));

      if (notFormInput) {
        this.currentIntent = value;
        this.persistInput('intent', this.currentIntent);
        this.doUpdate('intent');
      }
    }
  }

  setIntent(event) {
    let value = this.inputMap[event.type];

    if (value === 'pointer') {
      value = this.pointerType(event);
    }

    this.detectScrolling(event);

    if (
      ((!this.isScrolling && !this.validateTouch(value)) ||
        (this.isScrolling && event.type === 'wheel') ||
        event.type === 'mousewheel' ||
        event.type === 'DOMMouseScroll') &&
      this.currentIntent !== value
    ) {
      this.currentIntent = value;
      this.persistInput('intent', this.currentIntent);
      this.doUpdate('intent');
    }
  }

  setElement(event) {
    if (!event.target.nodeName) {
      this.clearElement();
      return;
    }

    this.currentElement = event.target.nodeName.toLowerCase();
    this.docElem.setAttribute('data-whatelement', this.currentElement);

    if (event.target.classList && event.target.classList.length) {
      this.docElem.setAttribute(
        'data-whatclasses',
        event.target.classList.toString().replace(' ', ',')
      );
    }
  }

  clearElement() {
    this.currentElement = null;
    this.docElem.removeAttribute('data-whatelement');
    this.docElem.removeAttribute('data-whatclasses');
  }

  // Utility methods
  checkPassiveSupport() {
    let supportsPassive = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: () => {
          supportsPassive = true;
        }
      });
      window.addEventListener('test', null, opts);
    } catch (e) {
      // fail silently
    }
    return supportsPassive;
  }

  persistInput(which, value) {
    if (this.shouldPersist) {
      try {
        window.sessionStorage.setItem(`what-${which}`, value);
      } catch (e) {
        // fail silently
      }
    }
  }

  pointerType(event) {
    if (typeof event.pointerType === 'number') {
      return this.pointerMap[event.pointerType];
    }
    return event.pointerType === 'pen' ? 'touch' : event.pointerType;
  }

  validateTouch(value) {
    const timestamp = Date.now();
    const touchIsValid = value === 'mouse' &&
      this.currentInput === 'touch' &&
      timestamp - this.currentTimestamp < 200;

    this.currentTimestamp = timestamp;
    return touchIsValid;
  }

  detectWheel() {
    if ('onwheel' in document.createElement('div')) {
      return 'wheel';
    }
    return document.onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll';
  }

  doUpdate(which) {
    this.docElem.setAttribute(
      `data-what${which}`,
      which === 'input' ? this.currentInput : this.currentIntent
    );
    this.fireFunctions(which);
  }

  fireFunctions(type) {
    for (let i = 0; i < this.functionList.length; i++) {
      if (this.functionList[i].type === type) {
        this.functionList[i].fn.call(
          this,
          type === 'input' ? this.currentInput : this.currentIntent
        );
      }
    }
  }

  findFunctionPosition(match) {
    return this.functionList.findIndex(item => item.fn === match);
  }

  detectScrolling(event) {
    if (this.mousePos.x !== event.screenX || this.mousePos.y !== event.screenY) {
      this.isScrolling = false;
      this.mousePos.x = event.screenX;
      this.mousePos.y = event.screenY;
    } else {
      this.isScrolling = true;
    }
  }

  checkClosest(elem, tag) {
    const ElementPrototype = window.Element.prototype;

    if (!ElementPrototype.matches) {
      ElementPrototype.matches =
        ElementPrototype.msMatchesSelector ||
        ElementPrototype.webkitMatchesSelector;
    }

    if (!ElementPrototype.closest) {
      do {
        if (elem.matches(tag)) {
          return elem;
        }
        elem = elem.parentElement || elem.parentNode;
      } while (elem !== null && elem.nodeType === 1);
      return null;
    }
    return elem.closest(tag);
  }
}

// Create instance and export
const whatInput = new WhatInput();
whatInput.init();

// Support both module imports and direct script tag inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = whatInput;
} else if (typeof define === 'function' && define.amd) {
  define([], () => whatInput);
} else {
  window.whatInput = whatInput;
}

export const setUp = () => whatInput.init();
export default whatInput;

