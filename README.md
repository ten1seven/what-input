# What Input?

**A global utility for tracking the current input method (mouse, keyboard or touch).**

## _What Input_ is now v6

Rebuilt for the modern web: Pointer Events, `KeyboardEvent.key`, TypeScript, native ES modules, and an `EventTarget` API. The outputs are the same as v5, so it's a drop-in upgrade for existing sites. See the [changelog](#changelog) for the few things that changed.

_What Input_ adds data attributes to the `<html>` element based on the type of input being used. It also exposes a simple API that can be used for scripting interactions.

## How it works

_What Input_ listens on the `window` (in the capture phase, so local `stopPropagation()` calls don't hide anything) for:

- `pointerdown` – a direct interaction. `pointerType` decides whether it's `mouse` or `touch` (`pen` is reported as `touch`).
- `keydown` / `keyup` – a direct `keyboard` interaction, unless the key is on the ignore list (modifiers by default).
- `pointermove` / `wheel` – an _indirect_ signal that a mouse is present.
- `focusin` / `focusout` – which element currently has focus.

It then sets or updates these attributes on `<html>`:

| Attribute          | Values                                      | Updated by                                             |
| ------------------ | ------------------------------------------- | ------------------------------------------------------ |
| `data-whatinput`   | `initial`, `mouse`, `keyboard`, `touch`     | `pointerdown`, `keydown`, `keyup`                      |
| `data-whatintent`  | `initial`, `mouse`, `keyboard`, `touch`     | everything above plus `pointermove` and `wheel`        |
| `data-whatelement` | the focused element's tag name, e.g. `a`    | `focusin` / `focusout`                                 |
| `data-whatclasses` | the focused element's classes, e.g. `a,b,c` | `focusin` / `focusout` (only when the element has any) |

_What Input does not make assumptions about the input environment before the page is interacted with._ However, the `pointermove` and `wheel` events are used to set `data-whatintent="mouse"` to indicate that a mouse is being used _indirectly_.

### Interacting with forms

Since interacting with a form _always_ requires use of the keyboard, _What Input_ uses the `data-whatintent` attribute to display a "buffered" version of input events while `<input>`s, `<select>`s, `<textarea>`s, `contenteditable` elements, [form-associated custom elements](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) and `<button>`s inside a `<form>` are being interacted with (i.e. a mouse user's `data-whatintent` will be preserved as `mouse` while typing). `data-whatinput` always reflects the actual last input.

Checkboxes and radio buttons are toggled rather than typed into, so pressing a key on one _does_ switch the intent to `keyboard`.

The same buffering can be opted into for any other element by adding a `data-whatfreeze` attribute to it or to a container. This is handy for custom controls that are operated with the arrow keys, like a slider or a video scrubber, where pressing a key is not a change of intent:

```html
<div class="scrubber" data-whatfreeze>
  <div class="scrubber-handle" role="slider" tabindex="0" ...></div>
</div>
```

### Device hint

Before anyone interacts with the page, `data-whatinput` and `data-whatintent` are `initial` on purpose. When a best guess is still useful (sizing hit targets on first paint, say), the `data-whathint` attribute carries what the device's _primary_ pointer suggests, read from the [`pointer` interaction media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer):

| `data-whathint` | Media query         | Typically                    |
| --------------- | ------------------- | ---------------------------- |
| `touch`         | `(pointer: coarse)` | phones, tablets              |
| `mouse`         | `(pointer: fine)`   | desktops, laptops, trackpads |
| `unknown`       | neither             | keyboard-only devices, TVs   |

The hint follows the device live (a mouse paired with a tablet, a keyboard detached from one) and is never persisted. It is only a hint: an iPad with a trackpad still reports `touch`, and a touch-screen laptop reports `mouse`. `data-whatinput` and `data-whatintent` never use it.

### Isn't this what `:focus-visible` is for?

Partly. [`:focus-visible`](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) is a great default for focus rings and you should use it. _What Input_ is still useful when you want to:

- style anything other than focus (hover affordances, hit targets, tooltips) based on how the page is being used;
- know the input method from JavaScript;
- tell `mouse` and `touch` apart;
- remember the input method across page loads so the first render is already right.

## Demo

Check out the demo to see _What Input_ in action.

https://ten1seven.github.io/what-input

## Installing

Install via npm (or your package manager of choice):

```shell
npm install what-input
```

Or load it from a CDN:

```html
<script src="https://unpkg.com/what-input@6"></script>
```

Or download `dist/what-input.js` and include it directly.

## Usage

Include the script directly in your project. It exposes a global `whatInput`.

```html
<script src="path/to/what-input.js"></script>
```

Or import it. The package ships as an ES module (`dist/what-input.mjs`), as a UMD build (`dist/what-input.js`, which also covers CommonJS and AMD) and with TypeScript declarations.

```javascript
import 'what-input'

// or

import whatInput from 'what-input'

// or

const whatInput = require('what-input')
```

_What Input_ will start doing its thing while you do yours.

> **Bundlers:** importing the module has the side effect of starting _What Input_. The package declares `"sideEffects": true` so a bare `import 'what-input'` is never tree-shaken away.

### Default behavior

#### Persisting input/intent across pages

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

### Basic styling

```css
/*
 * only suppress the focus ring once what-input has successfully started
 */

/* suppress focus ring on form controls for mouse users */
[data-whatintent='mouse'] *:focus {
  outline: none;
}
```

A more modern take pairs _What Input_ with `:focus-visible` and only reaches for the data attributes where the browser heuristic isn't enough:

```css
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* bigger hit areas while a touch screen is being used */
[data-whatintent='touch'] .toolbar button {
  min-block-size: 44px;
}
```

**Note:** If you remove outlines with `outline: none;`, be sure to provide clear visual `:focus` styles so the user can see which element they are on at any time for greater accessibility. Visit [W3C's WCAG 2.2 2.4.7 Guideline](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) to learn more.

### Scripting

#### Current input

Ask _What Input_ what the current input method is. This works best if asked after the events _What Input_ is bound to (`pointerdown` and `keydown`).

```javascript
whatInput.ask() // returns `mouse`, `keyboard` or `touch`

myButton.addEventListener('click', () => {
  if (whatInput.ask() === 'mouse') {
    // do mousy things
  } else if (whatInput.ask() === 'keyboard') {
    // do keyboard things
  }
})
```

If it's necessary to know if `pointermove` is being used, use the `'intent'` option. For example:

```javascript
/*
 * nothing has happened but the mouse has moved
 */

whatInput.ask() // returns `initial` because the page has not been directly interacted with
whatInput.ask('intent') // returns `mouse` because mouse movement was detected

/*
 * the keyboard has been used, then the mouse was moved
 */

whatInput.ask() // returns `keyboard` because the keyboard was the last direct page interaction
whatInput.ask('intent') // returns `mouse` because mouse movement was the most recent action detected
```

Since `click` events are `PointerEvent`s in current browsers, a single click handler can also read `event.pointerType` directly: it's `mouse`, `pen` or `touch`, and empty when the click came from the keyboard.

#### Device hint

```javascript
whatInput.ask('hint') // returns `mouse`, `touch` or `unknown`
```

#### Current element

Ask _What Input_ the currently focused DOM element.

```javascript
whatInput.element() // returns a string, like `input`, or null
```

#### Ignore keys

Set a custom list of keys that will be ignored (will not switch over to `keyboard`) when pressed. Keys can be [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values) values, [`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) values or legacy [keycodes](https://www.toptal.com/developers/keycode). _A custom list will overwrite the default values._

```javascript
/*
 * default ignored keys:
 * 'Shift'
 * 'Control'
 * 'Alt'
 * 'Meta'        // Windows key / Apple cmd
 * 'ContextMenu' // Windows menu key
 */

whatInput.ignoreKeys(['Shift', 'CapsLock', 'F11'])

// legacy keycodes still work
whatInput.ignoreKeys([16, 20, 122])
```

#### Specific keys

Set a custom list of keys that will trigger the keyboard pressed intent (will not switch to `keyboard` unless these keys are pressed). _This overrides ignoreKeys._

```javascript
// only listen to tab keyboard press
whatInput.specificKeys(['Tab'])

// go back to using the ignore list
whatInput.specificKeys([])
```

#### Custom callbacks

Fire a function when the input or intent changes.

```javascript
// create a function to be fired
const myFunction = (type) => {
  console.log(type)
}

// fire `myFunction` when the intent changes
whatInput.registerOnChange(myFunction, 'intent')

// fire `myFunction` when the input changes
whatInput.registerOnChange(myFunction, 'input')

// fire `myFunction` when the device hint changes
whatInput.registerOnChange(myFunction, 'hint')

// remove custom event
whatInput.unRegisterOnChange(myFunction)
```

#### Events

`whatInput` is an [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget). It dispatches `input`, `intent` and `hint` [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)s whose `detail` is the new value, so all the usual listener options (`once`, `signal`, ...) are available.

```javascript
whatInput.addEventListener('intent', (event) => {
  console.log(event.detail) // `mouse`, `keyboard` or `touch`
})

// listen until a component unmounts
const controller = new AbortController()

whatInput.addEventListener('input', update, { signal: controller.signal })

controller.abort()
```

In browsers that ship the [Observable API](https://developer.mozilla.org/en-US/docs/Web/API/Observable), `whatInput.when('intent')` works too, for free.

#### Tearing down

Stop listening, remove the `data-what*` attributes and drop every callback. Mostly useful in tests and when an app is unmounted.

```javascript
whatInput.destroy()
```

### TypeScript

Types ship with the package.

```typescript
import whatInput, { type InputMethod, type Strategy } from 'what-input'

const current: InputMethod = whatInput.ask('intent')
```

### Server-side rendering

_What Input_ can be imported in Node, workers and other environments without a DOM. It won't observe anything, `ask()` always answers `initial` and `element()` always answers `null`.

### Shadow DOM

_What Input_ reports focus inside open shadow roots and knows when a keypress lands in a field inside one. The attributes still live on `<html>`, and selectors in the main document don't reach into a shadow tree, so style from inside the component instead. `:host-context()` works in Chromium and Safari; for every browser, mirror the state onto the host with the events:

```javascript
class MyField extends HTMLElement {
  connectedCallback() {
    this.controller = new AbortController()

    whatInput.addEventListener(
      'intent',
      (event) => this.setAttribute('data-whatintent', event.detail),
      { signal: this.controller.signal },
    )
  }

  disconnectedCallback() {
    this.controller.abort()
  }
}
```

```css
/* inside the shadow root */
:host([data-whatintent='mouse']) :focus {
  outline: none;
}
```

### Testing

The state only changes in response to real events, which is also the easiest way to drive it in tests. In a DOM test environment that implements `PointerEvent` (jsdom 22+, happy-dom, every browser):

```javascript
window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }))
whatInput.ask() // `touch`

window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
whatInput.ask() // `keyboard`
```

Or mock the module entirely:

```javascript
vi.mock('what-input', () => ({ default: { ask: () => 'touch' } }))
```

## Compatibility

_What Input_ v6 works in all evergreen browsers: Chrome and Edge 90+, Firefox 90+ and Safari 15+ (2021 and newer). It relies on Pointer Events, `AbortSignal` support in `addEventListener()`, `EventTarget` subclassing and class private fields, none of which are polyfilled.

If you need to support older browsers, stay on [v5](https://github.com/ten1seven/what-input/tree/v5.2.12).

## Contributing

```shell
npm install   # install dependencies
npm run dev   # run the demo with hot reloading
npm test      # build the library and run the tests
npm run lint  # prettier and type checks
npm run build # build the library and the demo site
```

## Changelog

### v6.0.0

A rewrite in TypeScript on modern browser APIs. The data attributes, the session storage keys, the API and the `dist/what-input.js` file path are unchanged, so for most sites this is a drop-in upgrade.

- **Breaking:** Drops support for Internet Explorer and other legacy browsers. The build targets ES2022 and is no longer transpiled.
- **Breaking:** Detection is built on Pointer Events only. The `mousedown`, `mousemove`, `touchstart`, `touchend`, `MSPointerDown`, `MSPointerMove`, `mousewheel` and `DOMMouseScroll` listeners (and the 200ms touch-versus-mouse buffer they required) are gone.
- **Breaking:** `clearStorage()` now removes only _What Input_'s own `what-input` and `what-intent` keys instead of wiping the entire session storage.
- **Breaking:** `pointerdown` now updates the intent as well as the input, even while a form field has focus. Only keyboard use inside form fields is buffered.
- **Breaking:** `unRegisterOnChange(fn)` removes `fn` from both the `input` and `intent` lists.
- **Breaking:** The `InputMethod` type no longer includes `pointer`, which was never actually reported.
- **Breaking:** Requires Node 20+ for development. The build uses esbuild, the demo uses Vite and the tests use Vitest; Gulp, Webpack, Babel, Sass and Yarn are gone.
- **Added:** A `data-whathint` attribute, `ask('hint')` and a `hint` event report what the device's primary pointer suggests (`mouse`, `touch` or `unknown`) from the `pointer` interaction media feature, before any interaction and live as devices are attached or removed. The existing attributes never use it.
- **Added:** A `data-whatfreeze` attribute opts any element (or container) into the same intent buffering that form fields get, for custom controls driven by the arrow keys ([#123](https://github.com/ten1seven/what-input/issues/123)).
- **Added:** An ES module build (`dist/what-input.mjs`) with a proper `exports` map, `module` and `unpkg` fields. The UMD build (`dist/what-input.js`) and the minified build remain for `<script>` tags, CommonJS and AMD.
- **Added:** `whatInput` is an `EventTarget` and dispatches `input` and `intent` events.
- **Added:** `whatInput.destroy()` tears everything down (listeners are bound with an `AbortController`).
- **Added:** `ignoreKeys()` and `specificKeys()` accept `KeyboardEvent.key` and `KeyboardEvent.code` strings alongside legacy keycodes. The defaults are now key names.
- **Added:** Typing inside `contenteditable` elements and form-associated custom elements no longer changes the intent, just like form fields.
- **Fixed:** Pressing a key on a checkbox or radio button switches the intent to `keyboard`; they are toggled, not typed into ([#128](https://github.com/ten1seven/what-input/issues/128)).
- **Fixed:** Long-presses in Firefox for Android no longer flash `data-whatintent="mouse"`, because the emulated mouse events are no longer listened to ([#94](https://github.com/ten1seven/what-input/issues/94)).
- **Added:** Focus inside open shadow roots is reported for the inner element (via `composedPath()`), and the active-element check follows shadow roots when deciding whether a keypress is text entry.
- **Added:** Persisted session storage values are validated before they are used.
- **Changed:** Type declarations are generated from the source and shipped in `dist/`.
- **Changed:** `pointerdown` and `keydown` are observed in the capture phase on `window`, so `whatInput.ask()` is already up to date inside any element's own event handler, even one that calls `preventDefault()` or `stopPropagation()` ([#80](https://github.com/ten1seven/what-input/issues/80)).
- **Changed:** When the script runs after `DOMContentLoaded` (dynamic `import()`, late-loaded scripts) the initial state is published immediately instead of never.
- **Changed:** An interaction that happens before `DOMContentLoaded` is no longer overwritten by the persisted value.
- **Fixed:** `data-whatclasses` separates _all_ classes with commas (`a,b,c`); previously only the first space was replaced.
- **Fixed:** `data-whatclasses` is removed when focus moves to an element without classes.

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

Special thanks to [Viget](https://viget.com/) for their encouragement and commitment to open source projects. Visit [code.viget.com](https://code.viget.com/) to see more projects from [Viget](https://viget.com).

Thanks to [mAAdhaTTah](https://github.com/mAAdhaTTah) for the initial conversion to Webpack. Thanks to [greypants](https://github.com/greypants) for adding TypeScript definitions.

_What Input_ is written and maintained by [@ten1seven](https://github.com/ten1seven).

## License

_What Input_ is freely available under the [MIT License](http://opensource.org/licenses/MIT).
