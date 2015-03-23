# What Input?

__A global utility for tracking the current input method (mouse/pointer, keyboard or touch).__

## How it works

What Input uses event bubbling on the `<body>` to watch for mouse, keyboard and touch events (via `mousedown`/`pointerdown`, `keydown` and `touchstart`). It then sets or updates a `data-whatinput` on the `<body>`.

What Input also exposes a tiny API that allows the developer to ask for or set the current input.

_What Input does not make assumptions about the input environment before the user makes their first interaction._

## Usage

Install via Bower.

```shell
bower install what-input
```

Include the script directly in your project.

```html
<script src="assets/scripts/what-input.js"></script>
```

Or require with a script loader (What Input is AMD compatible).

```javascript
require('what-input');
```

What Input will start doing its thing while you do yours.

### Styling

Style page elements based on the current input.

```css
[data-whatinput="keyboard"] button:focus {
  outline: 2px solid #4183C4;
}

[data-whatinput="mouse"] button:focus {
  outline: none;
}
```

### Scripting

Ask What Input what the current input method is. This works best if asked after the events What Input is bound to (`mousedown`/`pointerdown`, `keydown` and `touchstart`). Because `click` always executes last in the event tree, What Input will be able to answer with the event that _just_ happened.

```javascript
whatInput.ask(); // returns `mouse`, `pointer`, `keyboard` or `touch`

myButton.addEventListener('click', function() {

  if (whatInput.ask() === 'mouse') {
    // do mousy things
  } else if (whatInput.ask() === 'keyboard') {
    // do keyboard things
  }

});
```

Ask What Input to return an array of all the input types that have been used _so far_.

```javascript
whatInput.types(); // ex. returns ['mouse', 'keyboard']
```

Tell What Input what's being used. This can be useful if you'd like to set an input method before the user has actually interacted with the page. What Input is not so assumptive on its own.

```javascript
whatInput.set('hampster');

whatInput.ask(); // 'hampster'
```

## Compatibility

What Input works in all modern browsers. For compatibility with IE8, polyfills are required for:

* addEventListener
* IndexOf

Add your own, or grab the bundle included here.

```html
<!--[if lte IE 8]>
  <script src="lte-IE8.js"></script>
<![endif]-->
```

## Demo

Check out the demo to see What Input in action.

http://ten1seven.github.io/what-input
