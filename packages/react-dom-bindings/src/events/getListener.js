import { getFiberCurrentPropsFromNode } from "../client/ReactDOMComponentTree.js";

export default function getListener(instance, registrationName) {
  const { stateNode } = instance;
  if (stateNode === null) {
    return null;
  }
  const props = getFiberCurrentPropsFromNode(stateNode);
  if (props === null) {
    return null;
  }
  const listener = props[registrationName];
  return listener;
}
