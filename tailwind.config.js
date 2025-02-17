const plugin = require('tailwindcss/plugin')

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {},
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('mouse-input', '[data-whatinput="mouse"] &')
      addVariant('keyboard-input', '[data-whatinput="keyboard"] &')
      addVariant('touch-input', '[data-whatinput="touch"] &')
      addVariant('mouse-intent', '[data-whatintent="mouse"] &')
      addVariant('keyboard-intent', '[data-whatintent="keyboard"] &')
      addVariant('touch-intent', '[data-whatintent="touch"] &')
    }),
  ],
}
