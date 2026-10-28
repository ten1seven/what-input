import { defineConfig } from 'vite'

// the demo site, deployed to GitHub Pages
export default defineConfig({
  root: 'demo',
  base: './',
  build: {
    outDir: '../build',
    emptyOutDir: true,
  },
})
