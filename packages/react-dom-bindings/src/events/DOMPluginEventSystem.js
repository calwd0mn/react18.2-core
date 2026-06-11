import { allNativeEvents } from "./EventRegistry";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { IS_CAPTURE_PHASE } from "./EventSystemFlags";
import {
  addEventCaptureListener,
  addEventBubbleListener,
} from "./EventListener.js";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener.js";
import getEventTarget from "./getEventTarget";
import getListener from "./getListener.js";
import { HostComponent } from "react-reconciler/src/ReactWorkTags";


SimpleEventPlugin.registerEvents();
const listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
export function listenToAllSupportedEvents(rootContainerElement) {
  // 保证只绑定一次
  if (!rootContainerElement[listeningMarker]) {
    // rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach((domEventName) => {
      listenToNativeEvent(domEventName, false, rootContainerElement);
      listenToNativeEvent(domEventName, true, rootContainerElement);
    });
  }
}

function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
  let eventSystemFlags = 0;
  if (isCapturePhaseListener) {
    // 上标记
    eventSystemFlags |= IS_CAPTURE_PHASE; // Capture phase
  }
  // 绑定被捕获的事件监听器
  addTrappedEventListener(
    target,
    domEventName,
    eventSystemFlags,
    isCapturePhaseListener,
  );
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener,
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags,
  );
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}

/**
 * @param {string} domEventName 原生事件名，比如 click
 * @param {number} eventSystemFlags 事件系统标记，比如是否处于捕获阶段
 * @param {Event} nativeEvent 浏览器原生事件对象
 * @param {object | null} targetInst 事件源 DOM 对应的 fiber 实例
 * @param {EventTarget} targetContainer 绑定事件监听的根容器
 */
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer,
) {
  dispatchEventForPlugin(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer,
  );
}

export function accumulateSinglePhaseListeners(
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase,
) {
  const captureName = reactName + "Capture";
  const reactEventName = isCapturePhase ? captureName : reactName;
  const listeners = [];
  let instance = targetFiber;
  while (instance !== null) {
    // tag 是 fiber 节点的类型，只有 HostComponent 类型的 fiber 节点才会有事件监听器
    const { stateNode, tag } = instance;
    if (tag === HostComponent && stateNode !== null) {
      const listener = getListener(instance, reactEventName);
      if (listener != null) {
        listeners.push(createDispatchListener(instance, listener, stateNode));
      }
    }
    instance = instance.return;
  }
  return listeners;
}
function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget };
}

function dispatchEventForPlugin(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer,
) {
  // 获取事件源
  const nativeEventTarget = getEventTarget(nativeEvent);
  // 事件提取，得到合成事件对象和对应的监听器列表
  const dispatchQueue = [];
  extractEvent(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer,
  );
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}

function extractEvent(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer,
) {
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer,
  );
}

function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i];
    processDispatchQueueItemsInOrder(event, listeners, isCapturePhase);
  }
}

function processDispatchQueueItemsInOrder(event, listeners, isCapturePhase) {
  if (isCapturePhase) {
    // 捕获阶段，监听器按照从外到内的顺序执行
    for (let i = listeners.length - 1; i >= 0; i--) {
      // currentTarget => 事件监听器所在的 DOM 元素
      const { listener, currentTarget } = listeners[i];
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  } else {
    // 冒泡阶段，监听器按照从内到外的顺序执行(事件收集的时候也是冒泡收集)
    for (let i = 0; i < listeners.length; i++) {
      const { listener, currentTarget } = listeners[i];
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  }
}

function executeDispatch(event, listener, currentTarget) {
  event.currentTarget = currentTarget;
  listener(event);
}
