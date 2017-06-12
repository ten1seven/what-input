module.exports = (() => {
  /*
   * variables
   */

  // last used input type
  let currentInput = 'initial'

  // last used input intent
  let currentIntent = null

  // cache document.documentElement
  const doc = document.documentElement

  // form input types
  const formInputs = ['input', 'select', 'textarea']

  let functionList = []

  // list of modifier keys commonly used with the mouse and
  // can be safely ignored to prevent false keyboard detection
  let ignoreMap = [
    16, // shift
    17, // control
    18, // alt
    91, // Windows key / left Apple cmd
    93 // Windows menu / right Apple cmd
  ]

  // mapping of events to input types
  const inputMap = {
    keydown: 'keyboard',
    mousedown: 'mouse',
    mousemove: 'mouse',
    MSPointerDown: 'pointer',
    MSPointerMove: 'pointer',
    pointerdown: 'pointer',
    pointermove: 'pointer',
    touchstart: 'touch'
  }

  // array of all used input types
  let inputTypes = []

  // boolean: true if touch buffer is active
  let isBuffering = false

  // boolean: true if the page is being scrolled
  let isScrolling = false

  // store current mouse position
  let mousePos = {
    x: null,
    y: null
  }

  // map of IE 10 pointer events
  const pointerMap = {
    2: 'touch',
    3: 'touch', // treat pen like touch
    4: 'mouse'
  }

  let supportsPassive = false

  try {
    let opts = Object.defineProperty({}, 'passive', {
      get: () => {
        supportsPassive = true
      }
    })

    window.addEventListener('test', null, opts)
  } catch (e) {}

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
      doc.addEventListener('pointerdown', updateInput)
      doc.addEventListener('pointermove', setIntent)
    } else if (window.MSPointerEvent) {
      doc.addEventListener('MSPointerDown', updateInput)
      doc.addEventListener('MSPointerMove', setIntent)
    } else {
      // mouse events
      doc.addEventListener('mousedown', updateInput)
      doc.addEventListener('mousemove', setIntent)

      // touch events
      if ('ontouchstart' in window) {
        doc.addEventListener('touchstart', touchBuffer)
        doc.addEventListener('touchend', touchBuffer)
      }
    }

    // mouse wheel
    doc.addEventListener(
      detectWheel(),
      setIntent,
      supportsPassive ? { passive: true } : false
    )

    // keyboard events
    doc.addEventListener('keydown', updateInput)
  }

  // checks conditions before updating new input
  const updateInput = event => {
    // only execute if the touch buffer timer isn't running
    if (!isBuffering) {
      let eventKey = event.which
      let value = inputMap[event.type]
      if (value === 'pointer') value = pointerType(event)

      if (currentInput !== value || currentIntent !== value) {
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
          value === 'mouse' ||
          // don't switch if the current element is a form input
          (value === 'keyboard' &&
            eventKey &&
            activeInput &&
            ignoreMap.indexOf(eventKey) === -1)
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
    doc.setAttribute('data-whatinput', currentInput)
    doc.setAttribute('data-whatintent', currentInput)

    if (inputTypes.indexOf(currentInput) === -1) {
      inputTypes.push(currentInput)
      doc.className += ' whatinput-types-' + currentInput
    }

    fireFunctions('input')
  }

  // updates input intent for `mousemove` and `pointermove`
  const setIntent = event => {
    // test to see if `mousemove` happened relative to the screen
    // to detect scrolling versus mousemove
    if (mousePos['x'] !== event.screenX || mousePos['y'] !== event.screenY) {
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

        doc.setAttribute('data-whatintent', currentIntent)

        fireFunctions('intent')
      }
    }
  }

  // buffers touch events because they frequently also fire mouse events
  const touchBuffer = event => {
    if (event.type === 'touchstart') {
      isBuffering = false

      // set the current input
      updateInput(event)
    } else {
      isBuffering = true
    }
  }

  const fireFunctions = type => {
    for (let i = 0, len = functionList.length; i < len; i++) {
      if (functionList[i].type === type) {
        functionList[i].function.call(this, currentIntent)
      }
    }
  }

  /*
   * utilities
   */

  const pointerType = event => {
    if (typeof event.pointerType === 'number') {
      return pointerMap[event.pointerType]
    } else {
      // treat pen like touch
      return event.pointerType === 'pen' ? 'touch' : event.pointerType
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
      wheelType = document.onmousewheel !== undefined
        ? 'mousewheel'
        : 'DOMMouseScroll'
    }

    return wheelType
  }

  /*
   * init
   */

  // don't start script unless browser cuts the mustard
  // (also passes if polyfills are used)
  if ('addEventListener' in window && Array.prototype.indexOf) {
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
    ask: opt => {
      return opt === 'loose' ? currentIntent : currentInput
    },

    // returns array: all the detected input types
    types: () => {
      return inputTypes
    },

    // overwrites ignored keys with provided array
    ignoreKeys: arr => {
      ignoreMap = arr
    },

    // attach functions to input and intent "events"
    // funct: function to fire on change
    // eventType: 'input'|'intent'
    onChange: (funct, eventType) => {
      functionList.push({
        function: funct,
        type: eventType
      })
    }
  }
})()
