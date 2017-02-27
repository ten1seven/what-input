module.exports = (() => {
  /*
   * variables
   */

  // cache document.documentElement
  const docElem = document.documentElement

  // last used input type
  let currentInput = 'initial'

  // last used input intent
  let currentIntent = null

  // form input types
  const formInputs = [
    'input',
    'select',
    'textarea'
  ]

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  const ignoreMap = [
    16, // shift
    17, // control
    18, // alt
    91, // Windows key / left Apple cmd
    93  // Windows menu / right Apple cmd
  ]

  // mapping of events to input types
  const inputMap = {
    'keyup': 'keyboard',
    'mousedown': 'mouse',
    'mousemove': 'mouse',
    'MSPointerDown': 'pointer',
    'MSPointerMove': 'pointer',
    'pointerdown': 'pointer',
    'pointermove': 'pointer',
    'touchstart': 'touch'
  }

  // array of all used input types
  let inputTypes = []

  // boolean: true if touch buffer is active
  let isBuffering = false

  // boolean: true if the page is being scrolled
  let isScrolling = false

  // store current mouse position
  let mousePos = {
    'x': null,
    'y': null
  }

  // map of IE 10 pointer events
  const pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  }

  /*
   * set up
   */

  const setUp = () => {
    // add correct mouse wheel event mapping to `inputMap`
    inputMap[detectWheel()] = 'mouse'

    addListeners()
    setInput()
  }

  /*
   * events
   */

  const addListeners = () => {
    // `pointermove`, `MSPointerMove`, `mousemove` and mouse wheel event binding
    // can only demonstrate potential, but not actual, interaction
    // and are treated separately

    // pointer events (mouse, pen, touch)
    if (window.PointerEvent) {
      docElem.addEventListener('pointerdown', updateInput)
      docElem.addEventListener('pointermove', setIntent)
    } else if (window.MSPointerEvent) {
      docElem.addEventListener('MSPointerDown', updateInput)
      docElem.addEventListener('MSPointerMove', setIntent)
    } else {
      // mouse events
      docElem.addEventListener('mousedown', updateInput)
      docElem.addEventListener('mousemove', setIntent)

      // touch events
      if ('ontouchstart' in window) {
        docElem.addEventListener('touchstart', touchBuffer)
        docElem.addEventListener('touchend', touchBuffer)
      }
    }

    // mouse wheel
    docElem.addEventListener(detectWheel(), setIntent)

    // keyboard events
    docElem.addEventListener('keydown', updateInput)
    docElem.addEventListener('keyup', updateInput)
  }

  // checks conditions before updating new input
  const updateInput = (event) => {
    // only execute if the touch buffer timer isn't running
    if (!isBuffering) {
      let eventKey = event.which
      let value = inputMap[event.type]
      if (value === 'pointer') value = pointerType(event)

      if (
        currentInput !== value ||
        currentIntent !== value
      ) {
        let activeElem = document.activeElement
        let activeInput = false

        if (
          activeElem &&
          activeElem.nodeName &&
          formInputs.indexOf(activeElem.nodeName.toLowerCase()) === -1
        ) {
          activeInput = true
        }

        if (
          value === 'touch' ||

          // ignore mouse modifier keys
          (value === 'mouse' && ignoreMap.indexOf(eventKey) === -1) ||

          // don't switch if the current element is a form input
          (value === 'keyboard' && activeInput)
        ) {
          // set the current and catch-all variable
          currentInput = currentIntent = value

          setInput()
        }
      }
    }
  }

  // updates the doc and `inputTypes` array with new input
  const setInput = () => {
    docElem.setAttribute('data-whatinput', currentInput)
    docElem.setAttribute('data-whatintent', currentInput)

    if (inputTypes.indexOf(currentInput) === -1) {
      inputTypes.push(currentInput)
      docElem.className += ' whatinput-types-' + currentInput
    }
  }

  // updates input intent for `mousemove` and `pointermove`
  const setIntent = (event) => {
    // test to see if `mousemove` happened relative to the screen
    // to detect scrolling versus mousemove
    if (
      mousePos['x'] !== event.screenX ||
      mousePos['y'] !== event.screenY
    ) {
      isScrolling = false

      mousePos['x'] = event.screenX
      mousePos['y'] = event.screenY
    } else {
      isScrolling = true
    }

    // only execute if the touch buffer timer isn't running
    // or scrolling isn't happening
    if (!isBuffering && !isScrolling) {
      let value = inputMap[event.type]
      if (value === 'pointer') value = pointerType(event)

      if (currentIntent !== value) {
        currentIntent = value

        docElem.setAttribute('data-whatintent', currentIntent)
      }
    }
  }

  // buffers touch events because they frequently also fire mouse events
  const touchBuffer = (event) => {
    if (event.type === 'touchstart') {
      isBuffering = false

      // set the current input
      updateInput(event)
    } else {
      isBuffering = true
    }
  }

  /*
   * utilities
   */

  const pointerType = (event) => {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType]
    } else {
      // treat pen like touch
      return (event.pointerType === 'pen') ? 'touch' : event.pointerType
    }
  }

  // detect version of mouse wheel event to use
  // via https://developer.mozilla.org/en-US/docs/Web/Events/wheel
  const detectWheel = () => {
    let wheelType

    // Modern browsers support "wheel"
    if ('onwheel' in document.createElement('div')) {
      wheelType = 'wheel'
    } else {
      // Webkit and IE support at least "mousewheel"
      // or assume that remaining browsers are older Firefox
      wheelType = (document.onmousewheel !== undefined) ? 'mousewheel' : 'DOMMouseScroll'
    }

    return wheelType
  }

  /*
   * init
   */

  // don't start script unless browser cuts the mustard
  // (also passes if polyfills are used)
  if (
    'addEventListener' in window &&
    Array.prototype.indexOf
  ) {
    setUp()
  }

  /*
   * api
   */

  return {
    // returns string: the current input type
    // opt: 'loose'|'strict'
    // 'strict' (default): returns the same value as the `data-whatinput` attribute
    // 'loose': includes `data-whatintent` value if it's more current than `data-whatinput`
    ask: (opt) => { return (opt === 'loose') ? currentIntent : currentInput },

    // returns array: all the detected input types
    types: () => { return inputTypes }
  }
})()
