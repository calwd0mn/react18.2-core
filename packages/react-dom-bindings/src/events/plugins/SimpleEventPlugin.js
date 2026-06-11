import {
  registerSimpleEvents,
  topLevelEventsToReactNames,
} from "../DOMEventProperties.js";
import { SyntheticMouseEvent } from "../SyntheticEvent";
import { accumulateSinglePhaseListeners } from "../DOMPluginEventSystem.js";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags.js";

function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer,
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
    nativeEvent.type,
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
