# What Input? 👆

> A lightweight (~3kB) utility for tracking the current input method (mouse, keyboard or touch) in modern browsers

[![npm version](https://badge.fury.io/js/what-input.svg)](https://badge.fury.io/js/what-input)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/what-input)](https://bundlephobia.com/package/what-input)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Key Features
- 🎯 Real-time detection of mouse, keyboard, and touch inputs
- 🔄 Automatic input method switching
- 🎨 CSS-friendly with data attributes
- 📦 Framework agnostic
- 💪 TypeScript support
- 🪶 Zero dependencies

## Table of Contents
- [How it works](#how-it-works)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [Acknowledgments](#acknowledgments)
- [License](#license)




- [TypeScript Support](#typescript-support)
- [API Reference](#api-reference)





## How it works

_What Input_ uses event bubbling on the `window` to watch for mouse, keyboard and touch events (via `mousedown`, `keydown` and `touchstart`). It then sets or updates a `data-whatinput` attribute.

Pointer Events are supported but note that `pen` inputs are remapped to `touch`. The script uses passive event listeners when supported for better performance, particularly for touch and wheel events.

_What Input_ also exposes a typed API that allows the developer to:
- Query the current input method (`ask()`)
- Get the currently focused element (`element()`)
- Set custom ignore keys (`ignoreKeys()`)
- Set specific trigger keys (`specificKeys()`)
- Set and remove custom callback functions (`registerOnChange()` and `unRegisterOnChange()`)

_What Input does not make assumptions about the input environment before the page is interacted with._ However, the `mousemove` and `pointermove` events are used to set a `data-whatintent="mouse"` attribute to indicate that a mouse is being used _indirectly_.

### Interacting with Forms

Since interacting with a form _always_ requires use of the keyboard, _What Input_ uses the `data-whatintent` attribute to display a "buffered" version of input events while form `<input>`s, `<select>`s, and `<textarea>`s are being interacted with (i.e. mouse user's `data-whatintent` will be preserved as `mouse` while typing).

The script maintains a list of form inputs (`['button', 'input', 'select', 'textarea']`) and provides special handling for buttons within forms to ensure consistent behavior.

## Demo

Check out the demo to see _What Input_ in action.

https://ten1seven.github.io/what-input

## Installation

Download the file directly or install via NPM:

```shell
npm install what-input
```

## Usage

There are three ways to initialize _What Input_:

### 1. Script Tag (Auto-initialized)

Include the script directly in your project:

```html
<script src="path/to/what-input.min.js"></script>
```

The global `window.whatInput` will be available immediately.

### 2. Module Import (Auto-initialized)

```typescript
// TypeScript/ES Modules - auto-initialized instance
import whatInput from 'what-input'

// CommonJS - auto-initialized instance
const whatInput = require('what-input')
```

### 3. Manual Initialization

For cases where you need more control over when _What Input_ starts:

```typescript
import { setUp } from 'what-input'

// Initialize when ready
const whatInput = setUp()
```

For legacy AMD/RequireJS usage:

```javascript
requirejs.config({
  paths: {
    whatInput: 'path/to/what-input',
  },
})

require(['whatInput'], function(whatInput) {
  // whatInput is ready to use
})
```

Once initialized, _What Input_ will start doing its thing while you do yours.

### Default Behavior

#### Persisting Input/Intent Across Pages

By default, _What Input_ uses [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) to persist the input and intent values across pages. The benefit is that once a visitor has interacted with the page, subsequent pages won't have to wait for interactions to know the input method.

This behavior can be disabled by adding a `data-whatpersist="false"` attribute on either the `<html>` or `<body>`.

```html
<html dir="ltr" lang="en" data-whatpersist="false">
  ...
</html>
```

or

```html
<body data-whatpersist="false">
  ...
</body>
```

Session storage can be cleared at any time with:

```javascript
whatInput.clearStorage()
```

### Basic Styling

```css
/*
 * only suppress the focus ring once what-input has successfully started
 */

/* suppress focus ring on form controls for mouse users */
[data-whatintent='mouse'] *:focus {
  outline: none;
}
```

**Note:** If you remove outlines with `outline: none;`, be sure to provide clear visual `:focus` styles so the user can see which element they are on at any time for greater accessibility. Visit [W3C's WCAG 2.0 2.4.7 Guideline](https://www.w3.org/TR/UNDERSTANDING-WCAG20/navigation-mechanisms-focus-visible.html) to learn more.

### API Reference

#### Core Methods

| Method | Return Type | Description |
|--------|------------|-------------|
| `ask()` | `InputType` | Returns current input method |
| `element()` | `string \| null` | Returns focused DOM element |
| `ignoreKeys()` | `void` | Set keys to ignore |
| `specificKeys()` | `void` | Set specific trigger keys |

#### Types
```typescript
type InputType = 'initial' | 'keyboard' | 'mouse' | 'pointer' | 'touch'
type EventType = 'input' | 'intent'
```

#### Current Input

```typescript
whatInput.ask() // returns InputType
whatInput.ask('intent') // returns InputType

myButton.addEventListener('click', () => {
  const input = whatInput.ask()
  if (input === 'mouse') {
    // do mousy things
  } else if (input === 'keyboard') {
    // do keyboard things
  }
})
```

#### Current Element

Ask _What Input_ the currently focused DOM element.

```javascript
whatInput.element() // returns a string, like `input` or null
```

#### Ignore Keys

Set a custom array of [keycodes](http://keycode.info/) that will be ignored (will not switch over to `keyboard`) when pressed. _A custom list will overwrite the default values._

### Events and Callbacks
```typescript
// Register callback for input changes
whatInput.registerOnChange((type: InputType) => {
  console.log(`Input changed to: ${type}`)
}, 'input')

// Unregister callback
whatInput.unRegisterOnChange(myFunction)
```

```javascript
/*
 * default ignored keys:
 * 16, // shift
 * 17, // control
 * 18, // alt
 * 91, // Windows key / left Apple cmd
 * 93  // Windows menu / right Apple cmd
 */

whatInput.ignoreKeys([1, 2, 3])
```

#### Specific Keys

Set a custom array of [keycodes](http://keycode.info/) that will trigger the keyboard pressed intent (will not switch to `keyboard` unless these keys are pressed). _This overrides ignoreKeys._

```javascript
// only listen to tab keyboard press
whatInput.specificKeys([9])
```

#### Custom Callbacks

```typescript
// TypeScript function signature
const myFunction = (type: InputType) => {
  console.log(type)
}

// Register for changes
whatInput.registerOnChange(myFunction, 'intent') // for intent changes
whatInput.registerOnChange(myFunction, 'input')  // for input changes

// Remove callback
whatInput.unRegisterOnChange(myFunction)
```

## Browser Support

_What Input_ works in all modern browsers.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```shell
# Install dependencies
npm install

# Run development server
npm run dev
```

## Changelog

### v5.3.0

- **Updated:** New build tools with Vite.
- **Updated:** README updates.

### v5.2.12

- **Fixed:** Improved detection and respect for of `data-whatpersist` before `DOMContentLoaded`. Fix via [FanFataL](https://github.com/FanFataL).

### v5.2.11

- **Fixed:** Adds `useCapture` so events can be detected before `preventDefault` cancels them on local listeners (h/t [jojo080889](https://github.com/jojo080889)).

### v5.2.8 - 5.2.10

- **Added:** TypeScript definitions via [greypants](https://github.com/greypants).

### v5.2.7

- **Fixed:** Moves sourcemap to sit next to JavaScript package.

### v5.2.6

- **Fixed:** adds `DOMContentLoaded` event before looking for `data-whatpersist` attribute on body.

### v5.2.5

- **Fixed:** Hotfix for shaky support of `dataset` in IE10.

### v5.2.4

- **Added:** Ability to add `data-whatpersist="false"` attribute to the `<html>` or `<body>` tag to disable usage of session storage to persist input/intent across pages.
- **Updated:** Build tools and added linting.

### v5.2.3

- **Fixed:** `activeElement` is null bug in IE is fixed (thanks @EasterPeanut).
- **Fixed:** Mousewheel event detection works correctly again.

### v5.2.1

- **Fixed:** iOS was occasionally reporting `mouse` because of event execution order.
- **Added:** `touchend` to input map
- **Added:** Allows buttons inside forms to be treated like other form inputs.
- **Added:** iTouch intent indicator in demo page (it worked all along, you just couldn't see it).

### v5.1.4

- **Fixed:** Increase buffering time by 20ms to fix iOS reporting mousedown
- **Fixed:** Adds `touchend` to input map

### v5.1.3

- **Added:** Sourcemap for the minified version.

### v5.1.2

- **Added:** `specificKeys` functionality to allow overriding of keyboard keys list. Fix via [bk3](https://github.com/bk3).

### v5.1.1

- **Fixed:** Browsers with cookies turned off would throw an error with session storage. Fix via [yuheiy](https://github.com/yuheiy).

### v5.1.0

- **Added:** Session variable stores last used input and intent so subsequent page loads don't have to wait for interactions to set the correct input and intent state.
- **Removed:** IE8 support.

### v5.0.7

- **Fixed:** `unRegisterOnChange` failed to unregister items at index 0.

### v5.0.5

- **Fixed:** Fail gracefully in non-DOM environments.

### v5.0.3

- **Fixed:** Event buffer for touch was not working correctly.

### Changes from v4

- **Added:** A the ability to add and remove custom callback function when the input or intent changes with `whatInput.registerOnChange` and `whatInput.unRegisterOnChange`.
- **Added:** A `data-whatelement` attribute exposes any currently focused DOM element (i.e. `data-whatelement="a"` or `data-whatelement="input"`).
- **Added:** A `data-whatclasses` attribute exposes any currently focused element's classes as a comma-separated list (i.e. `data-whatclasses="class1,class2"`).
- **Added:** An API option to provide a custom array of keycodes that will be ignored.
- **Changed:** Typing in form fields is no longer filtered out. The `data-whatinput` attribute immediately reflects the current input. The `data-whatintent` attribute now takes on the role of remembering mouse input prior to typing in or clicking on a form field.
- **Changed:** If you use the Tab key to move from one input to another one - the `data-whatinput` attribute reflects the current input (switches to "keyboard").
- **Removed:** `whatInput.types()` API option.
- **Removed:** Bower support.
- **Fixed:** Using mouse modifier keys (`shift`, `control`, `alt`, `cmd`) no longer toggles back to keyboard.

## Acknowledgments

Special thanks to [Viget](http://viget.com/) for their encouragement and commitment to open source projects. Visit [code.viget.com](http://code.viget.com/) to see more projects from [Viget](http://viget.com).

_What Input_ is written and maintained by [@ten1seven](https://github.com/ten1seven).

## License

_What Input_ is freely available under the [MIT License](http://opensource.org/licenses/MIT).
