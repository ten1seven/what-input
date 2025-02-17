declare class WhatInput {
  // Core state
  private docElem: HTMLElement;
  private currentElement: string | null;
  private currentInput: string;
  private currentIntent: string;
  private currentTimestamp: number;
  private shouldPersist: boolean;
  private isScrolling: boolean;

  // Properties
  private formInputs: string[];
  private functionList: Array<{ fn: (type: string) => void; type: string }>;
  private ignoreMap: number[];
  private specificMap: number[];
  private mousePos: { x: number | null; y: number | null };
  private inputMap: { [key: string]: string };
  private pointerMap: { [key: number]: string };
  private supportsPassive: boolean;

  constructor();

  // Public API methods
  ask(opt: 'intent' | 'input'): string;
  element(): string | null;
  ignoreKeys(arr: number[]): void;
  specificKeys(arr: number[]): void;
  registerOnChange(fn: (type: string) => void, eventType?: 'input' | 'intent'): void;
  unRegisterOnChange(fn: (type: string) => void): void;
  clearStorage(): void;
  init(): WhatInput;
}

declare const whatInput: WhatInput;

export const setUp: () => WhatInput;
export default whatInput;

// Global declaration
declare global {
  interface Window {
    whatInput: WhatInput;
  }
}
