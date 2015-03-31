(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (factory());
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['whatInput'] = factory();
  }
}(this, function () {

/*
 * variables
 */

// cache document.body
var body = document.body;

// boolean: true if touch buffer timer is running
var buffer = false;

// the last used input type
var currentInput = null;

// array of form elements that take keyboard input
var formInputs = [
  'input',
  'select',
  'textarea'
];

// mapping of events to input types
var inputMap = {
  'keydown': 'keyboard',
  'mousedown': 'mouse',
  'touchstart': 'touch',
  'pointerdown': 'pointer',
  'MSPointerDown': 'pointer'
};

// array of all used input types
var inputTypes = [];

// touch buffer timer
var timer;


/*
 * functions
 */

function bufferInput(event) {
  clearTimeout(timer);

  setInput(event);

  buffer = true;
  timer = setTimeout(function() {
    buffer = false;
  }, 1000);
}

function regularInput(event) {
  if (!buffer) setInput(event);
}

function setInput(event) {
  var key = event.which || event.keyCode;
  var target = event.target || event.srcElement;
  var value = inputMap[event.type];

  if (currentInput !== value) {

    if (
      // only if currentInput has a value
      currentInput &&

      // only if the input is `keyboard`
      value === 'keyboard' &&

      // not if the key is `TAB`
      key !== 9 &&

      // only if the target is one of the elements in `formInputs`
      formInputs.indexOf(target.nodeName.toLowerCase()) >= 0
    ) {
      // ignore keyboard typing on form elements
    } else {
      currentInput = value;
      body.setAttribute('data-whatinput', currentInput);

      if (inputTypes.indexOf(currentInput) === -1) inputTypes.push(currentInput);
    }
  }
}


/*
 * init
 */

(function() {

  // The Golden Pattern for Handling Touch Input
  // via http://www.stucox.com/blog/the-golden-pattern-for-handling-touch-input/
  var pointerPrefix = 'onmspointerdown' in window ? 'ms' : '';
  if ('on' + pointerPrefix + 'pointerdown' in window) {
    var pointerdown = pointerPrefix + 'pointerdown';
    body.addEventListener(pointerdown, regularInput);
  } else {
    body.addEventListener('mousedown', regularInput);

    if ('ontouchstart' in window) body.addEventListener('touchstart', bufferInput);
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


}));
