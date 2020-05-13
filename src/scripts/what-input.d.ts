export interface WhatInput {
  ask: (strategy?: "intent") => "pointer" | "keyboard" | "mouse" | "touch";
  element: () => string | null;
  ignoreKeys: (keyCodes: number[]) => void;
  specificKeys: (keyCodes: number[]) => void;
  registerOnChange: (callback: () => void, strategy?: "intent") => void;
  unRegisterOnChange: (callback: () => void) => void;
  clearStorage: () => void;
}

const whatInput: WhatInput;
export default whatInput;
