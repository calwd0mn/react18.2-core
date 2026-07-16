import { REACT_MEMO_TYPE } from "shared/ReactSymbols";

export function memo(type, compare) {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  };
}
