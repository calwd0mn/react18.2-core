import getEventTarget from "./getEventTarget.js";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority,
} from "react-reconciler/src/ReactEventPriorities.js";

// wrapper 包装函数,在调用这个函数时,会自动传入这些参数
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags,
) {
  const eventPriority = getEventPriority(domEventName);
  let listenerWrapper;
  switch (eventPriority) {
    case DiscreteEventPriority:
      listenerWrapper = dispatchDiscreteEvent;
      break;
    case ContinuousEventPriority:
      listenerWrapper = dispatchContinuousEvent;
      break;
    default:
      listenerWrapper = dispatchEvent;
  }
  // 将来调用这个函数时,自带这些信息
  return listenerWrapper.bind(
    null,
    domEventName,
    eventSystemFlags,
    targetContainer,
  );
}

// nativeEvent 是原生事件对象,比如 click 事件的 event 对象,即事件源:event
function dispatchDiscreteEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent,
) {
  const previousPriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(DiscreteEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority);
  }
}

function dispatchContinuousEvent(
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent,
) {
  const previousPriority = getCurrentUpdatePriority();
  try {
    setCurrentUpdatePriority(ContinuousEventPriority);
    dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
  } finally {
    setCurrentUpdatePriority(previousPriority);
  }
}

function dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const targetInst = getClosestInstanceFromNode(nativeEventTarget); // 事件源对应的 fiber 实例
  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    container,
  );
}

export function getEventPriority(domEventName) {
  switch (domEventName) {
    case "click":
      return DiscreteEventPriority;
    case "drag":
      return ContinuousEventPriority;
    default:
      return DefaultEventPriority;
  }
}
