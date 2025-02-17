import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import * as terser from 'terser'
import { version } from './package.json'

const banner = `/**
 * what-input - A global utility for tracking the current input method (mouse, keyboard or touch).
 * @version v${version}
 * @link https://github.com/ten1seven/what-input
 * @license MIT
 */`

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    lib: {
      entry: 'src/app.js',
      name: 'WhatInput',
      formats: ['es'],
      fileName: 'what-input'
    },
    target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari13'],
    rollupOptions: {
      output: [
        {
          format: 'es',
          entryFileNames: 'what-input.js',
          minifyInternalExports: false,
          plugins: [{
            name: 'add-banner',
            renderChunk(code) {
              return `${banner}\n${code}`;
            }
          }]
        },
        {
          format: 'es',
          entryFileNames: 'what-input.min.js',
          plugins: [
            {
              name: 'terser',
              async renderChunk(code) {
                const result = await terser.minify(`${banner}\n${code}`, {
                  compress: true,
                  mangle: true,
                  format: {
                    preamble: banner,
                    comments: false
                  },
                  safari10: true
                });
                return result.code;
              }
            }
          ]
        }
      ]
    }
  }
})
