import whatInput from '../src/what-input.ts'

// `whatInput.ask()` and `whatInput.element()`
for (const control of document.querySelectorAll('.well a, .well button')) {
  control.addEventListener('click', (event) => {
    console.log(`[script test] ${whatInput.ask()} ${whatInput.element()}`)

    event.preventDefault()
  })
}

for (const control of document.querySelectorAll('input, textarea, select')) {
  control.addEventListener('click', () => {
    console.log(`[script test] ${whatInput.ask()} ${whatInput.element()}`)
  })
}

// legacy callbacks: `whatInput.registerOnChange()`
whatInput.registerOnChange((type) => console.log(`input: ${type}`))
whatInput.registerOnChange((type) => console.log(`intent: ${type}`), 'intent')

// modern events: `whatInput.addEventListener()`
const readout = (name: string) => document.querySelector(`[data-readout="${name}"]`)

whatInput.addEventListener('input', (event) => {
  readout('input')!.textContent = event.detail
})

whatInput.addEventListener('intent', (event) => {
  readout('intent')!.textContent = event.detail
})

whatInput.addEventListener('hint', (event) => {
  readout('hint')!.textContent = event.detail
})

// the initial state was published at import, before these listeners existed
readout('input')!.textContent = whatInput.ask()
readout('intent')!.textContent = whatInput.ask('intent')
readout('hint')!.textContent = whatInput.ask('hint')

// mirror the focus attributes
const html = document.documentElement

new MutationObserver(() => {
  readout('element')!.textContent = html.getAttribute('data-whatelement') ?? '–'
  readout('classes')!.textContent = html.getAttribute('data-whatclasses') ?? '–'
}).observe(html, { attributeFilter: ['data-whatelement', 'data-whatclasses'] })

// don't let the form submit because it's not real
document.querySelector('form')?.addEventListener('submit', (event) => event.preventDefault())

// alert functionality
for (const trigger of document.querySelectorAll<HTMLElement>('[data-module="alert"]')) {
  trigger.addEventListener('click', (event) => {
    alert(trigger.dataset.message)
    event.preventDefault()
  })
}
