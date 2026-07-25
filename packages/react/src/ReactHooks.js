import ReactCurrentDispatcher from "./ReactCurrentDispatcher.js";

function resolveDispatcher() {
  return ReactCurrentDispatcher.current;
}

export function useReducer(reducer, initialArg) {
  const dispacher = resolveDispatcher();
  return dispacher.useReducer(reducer, initialArg);
}

export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

export function useRef(initialValue) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

export function useMemo(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(create, deps);
}

export function useCallback(callback, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}

export function useEffect(create, deps){
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create,deps);
}

export function useLayoutEffect(create, deps){
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create,deps);
}
