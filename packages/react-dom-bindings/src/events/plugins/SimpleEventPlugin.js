import {
  registerSimpleEvents,
  topLevelEventsToReactNames,
} from "../DOMEventProperties.js";
import { SyntheticMouseEvent } from "../SyntheticEvent";
import { accumulateSinglePhaseListeners } from "../DOMPluginEventSystem.js";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags.js";


/**
 * 从原生事件中提取对应的合成事件，并将合成事件和监听器列表加入分发队列。
 * @param {Array<{event: SyntheticEvent, listeners: Array}>} dispatchQueue 合成事件分发队列。
 * @param {string} domEventName 原生事件名，比如 click。
 * @param {FiberNode | null} targetInst 事件源 DOM 对应的 fiber 实例。
 * @param {Event} nativeEvent 浏览器原生事件对象。
 * @param {EventTarget | null} nativeEventTarget 原生事件目标。
 * @param {number} eventSystemFlags 事件系统标记，比如是否处于捕获阶段。
 * @returns {void}
 */
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
) {
  const reactName = topLevelEventsToReactNames.get(domEventName);
  let SyntheticEventCtor;
  switch (domEventName) {
    case "click":
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    case "keypress":
      // SyntheticEventCtor = SyntheticKeyboardEvent;
      break;
    default:
      // SyntheticEventCtor = SyntheticEvent;
      break;
  }
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    reactName,
    isCapturePhase,
  );
  // 如果有监听器,就创建合成事件对象,并将事件对象和监听器列表加入分发队列
  if (listeners.length > 0) {
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget,
    );
    dispatchQueue.push({
      event,
      listeners,
    });
  }
}

export { registerSimpleEvents as registerEvents, extractEvents };
