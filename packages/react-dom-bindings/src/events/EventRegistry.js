export const allNativeEvents = new Set();

export function registerTwoPhaseEventTypes(registerationName, dependencies) {
  registerDirectEvent(registerationName, dependencies);
  registerDirectEvent(registerationName + "Capture", dependencies);
}

export function registerDirectEvent(registerationName, dependencies) {
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}
