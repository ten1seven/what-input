/*! what-input.js v 0.0.1 | Author: Jeremy Fields [jeremy.fields@viget.com], 2015 | License: MIT */

var currentInput = null;

function setInput(value) {
  currentInput = value;
}

return {
  ask: function() { return currentInput; },
  set: setInput
};
