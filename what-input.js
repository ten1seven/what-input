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
    root['WhatInput'] = factory();
  }
}(this, function () {

/*! what-input.js v 0.0.1 | Author: Jeremy Fields [jeremy.fields@viget.com], 2015 | License: MIT */

var currentInput = null;

function setInput(value) {
  currentInput = value;
}

return {
  ask: function() { return currentInput; },
  set: setInput
};


}));
