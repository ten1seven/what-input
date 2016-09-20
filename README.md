# What Input?

__A global utility for tracking the current input method (mouse, keyboard or touch).__

## What Input is now v4

What Input adds data attributes and classes to the `<html>` tag based on the type of input device being used. It also exposes a simple API that can be used for scripting interactions.

### Changes from v3

## How it works

What Input uses event bubbling on the `<html>` tag to watch for mouse, keyboard and touch events (via `mousedown`, `keyup` and `touchstart`). It then sets or updates a `data-whatinput` attribute.

Where present, Pointer Events are supported, but note that `pen` inputs are remapped to `touch`.

What Input also exposes a tiny API that allows the developer to ask for or set the current input.

_What Input does not make assumptions about the input environment before the user makes their first interaction._ However, the `mousemove` and `pointermove` events are used to set a `data-whatintent="mouse"` attribute to indicate that a mouse is present and _might_ be used.

### Interacting with Forms

Since interacting with a form requires use of the keyboard, What Input _does not switch the input type while form `<input>`s and `<textarea>`s are being interacted with_, preserving the last detected input type.

## Installing

Download the file directly...

or install via Bower...

```shell
bower install what-input
```

or install via NPM...

```shell
npm install what-input
```

## Usage

Include the script directly in your project.

```html
<script src="assets/scripts/what-input.js"></script>
```

Or require with a script loader.

```javascript
require('what-input');

// or

var whatInput = require('what-input');
```

What Input will start doing its thing while you do yours.

### Example Styling

```css
/**
 * set a custom default :focus style
 */

/* default styling before what input executes */
:focus {

}

/* initial styling after what input has executed but before any interaction */
[data-whatinput="initial"] :focus {
  outline: none;
  border: dotted 2px black;
}

/* mouse */
[data-whatinput="mouse"] :focus {
  border-color: red;
}

/* keyboard */
[data-whatinput="keyboard"] :focus {
  border-color: green;
}

/* touch */
[data-whatinput="touch"] :focus {
  border-color: blue;
}
```
**note:** If you remove outlines with `outline: none;`, be sure to provide clear visual `:focus` styles so the user can see which element they are on at any time for greater accessibility. Visit [W3C's WCAG 2.0 2.4.7 Guideline](https://www.w3.org/TR/UNDERSTANDING-WCAG20/navigation-mechanisms-focus-visible.html) to learn more.

### Scripting

#### Current Input

Ask What Input what the current input method is. This works best if asked after the events What Input is bound to (`mousedown`, `keyup` and `touchstart`). Because `click` always executes last in the event tree, What Input will be able to answer with the event that _just_ happened.

```javascript
whatInput.ask(); // returns `mouse`, `keyboard` or `touch`

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

## Acknowledgments

Special thanks to [Viget](http://viget.com/) for their encouragement and commitment to open source projects. Visit [code.viget.com](http://code.viget.com/) to see more projects from [Viget](http://viget.com).

Thanks to [mAAdhaTTah](https://github.com/mAAdhaTTah) for the initial conversion to Webpack.

What Input is written and maintained by [@ten1seven](https://github.com/ten1seven).

## License

What Input is freely available under the [MIT License](http://opensource.org/licenses/MIT).
