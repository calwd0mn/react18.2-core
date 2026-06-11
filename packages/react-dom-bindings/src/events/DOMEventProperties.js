import { registerTwoPhaseEventTypes } from "./EventRegistry.js";

const simpleEventPluginEvents = ["click"]; // 实际上有很多事件，我们当前只处理一个

export const topLevelEventsToReactNames = new Map();

function registerSimpleEvent(domEventName, reactName) {
  topLevelEventsToReactNames.set(domEventName, reactName);
  registerTwoPhaseEventTypes(reactName, [domEventName]);
}

export function registerSimpleEvents(domEventName, reactName) {
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    const domEventName = eventName.toLowerCase();
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1);
    registerSimpleEvent(domEventName, "on" + capitalizeEvent);
  }
}
