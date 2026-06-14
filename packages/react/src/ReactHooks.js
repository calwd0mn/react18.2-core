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

export function useEffect(create, deps){
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create,deps);
}
