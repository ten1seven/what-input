/*
 * Entry point for the UMD build. The wrapper in build.mjs declares
 * `__whatInput` in the factory function and returns it; assigning to it here
 * avoids esbuild's module-interop boilerplate that `globalName` would emit.
 */

import whatInput from '../src/what-input.ts'

declare let __whatInput: typeof whatInput

__whatInput = whatInput
