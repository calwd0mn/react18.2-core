import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { hasOwnProperty } from "shared/hasOwnProperty";

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function ReactElement(type, key, ref, props) {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: ref,
    props: props,
  };
  return element;
}

function hasValidKey(config) {
  return config.key !== undefined;
}

function hasValidRef(config) {
  return config.ref !== undefined;
}

export function jsxDev(type, config, maybeKey) {
  const props = {};
  let key = null;
  let ref = null;
  if (typeof maybeKey !== "undefined") {
    key = maybeKey;
  }
  // config.key 优先级别高于 maybeKey
  if (hasValidKey(config)) {
    key = "" + config.key;
  }
  if (hasValidRef(config)) {
    ref = config.ref;
  }
  for (const propName in config) {
    // 过滤掉保留属性
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }
  return ReactElement(
    type,
    key,
    ref,
    props,
  );
}
