const simpleEventPluginEvents = ['click']
import { regiterTwoPhaseEvent } from "./EventRegistry";
export const topLevelEventsToReactNames = new Map();

function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents(domEventName, reactName) {
  for(let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    const domEventName = eventName.toLowerCase();
    const capitalizeEvent = eventName[0].toUpperCase() + eventName.slice(1);
    registerSimpleEvent(domEventName, 'on' + capitalizeEvent);
  }
}