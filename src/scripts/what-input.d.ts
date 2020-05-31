declare const whatInput: {
  ask: (strategy?: Strategy) => InputMethod;
  element: () => string | null;
  ignoreKeys: (keyCodes: number[]) => void;
  specificKeys: (keyCodes: number[]) => void;
  registerOnChange: (callback: (type: InputMethod) => void, strategy?: Strategy) => void;
  unRegisterOnChange: (callback: (type: InputMethod) => void) => void;
  clearStorage: () => void;
};

export type InputMethod = "initial" | "pointer" | "keyboard" | "mouse" | "touch";

export type Strategy = "input" | "intent";

export default whatInput;
