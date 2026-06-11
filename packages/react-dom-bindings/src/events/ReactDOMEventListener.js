import getEventTarget from "./getEventTarget.js";
import { getClosestInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";

// wrapper 包装函数,在调用这个函数时,会自动传入这些参数
export function createEventListenerWrapperWithPriority(
  targetContainer,
  domEventName,
  eventSystemFlags,
) {
  const listenerWrapper = dispatchDiscreteEvent;
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
  dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
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
