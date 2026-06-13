import ReactCurrentDispatcher from "./ReactCurrentDispatcher.js";

function resolveDispatcher() {
  return ReactCurrentDispatcher.current;
}

export function useReducer(reducer, initialArg) {
  const dispacher = resolveDispatcher();
  return dispacher.useReducer(reducer, initialArg);
}
