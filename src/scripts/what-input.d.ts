declare const whatInput: {
  ask: (strategy?: "intent") => "pointer" | "keyboard" | "mouse" | "touch";
  element: () => string | null;
  ignoreKeys: (keyCodes: number[]) => void;
  specificKeys: (keyCodes: number[]) => void;
  registerOnChange: (callback: () => void, strategy?: "intent") => void;
  unRegisterOnChange: (callback: () => void) => void;
  clearStorage: () => void;
};

export default whatInput;
