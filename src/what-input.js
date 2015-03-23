/*
 * variables
 */

// cache document.body
var body = document.body;

//
var buffer = false;
var currentInput = null;
var inputMap = {
  'keydown': 'keyboard',
  'mousedown': 'mouse',
  'touchstart': 'touch',
  'pointerdown': 'pointer',
  'MSPointerDown': 'pointer'
};
var inputTypes = [];
var timer;


/*
 * functions
 */

function bufferInput(event) {
  clearTimeout(timer);

  setInput(inputMap[event.type]);

  buffer = true;
  timer = setTimeout(function() {
    buffer = false;
  }, 1000);
}

function regularInput(event) {
  if (!buffer) setInput( inputMap[event.type] );
}

function setInput(value) {
  if (currentInput !== value) {
    currentInput = value;
    body.setAttribute('data-whatinput', currentInput);

    if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
  }
}


/*
 * init
 */

(function() {

  // touch
  if ('ontouchstart' in document.documentElement) body.addEventListener('touchstart', bufferInput);

  // pointer/mouse
  if (window.PointerEvent) {
    body.addEventListener('pointerdown', regularInput);
  } else if (window.MSPointerEvent) {
    body.addEventListener('MSPointerDown', regularInput);
  } else {
    body.addEventListener('mousedown', regularInput);
  }

  // keyboard
  body.addEventListener('keydown', regularInput);

})();


/*
 * api
 */

return {

  // returns a string of the current input type
  ask: function() { return currentInput; },

  // returns an array of all the detected input types
  types: function() { return inputTypes; },

  // manually set the input type
  set: setInput
};
