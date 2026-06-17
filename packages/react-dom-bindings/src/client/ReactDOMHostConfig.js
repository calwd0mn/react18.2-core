import {
  setInitialProperties,
  diffProperties,
  updateProperties,
} from "./ReactDOMComponent";
import { precacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree";

export function shouldSetTextContent(type, props) {
  return (
    typeof props.children === "string" || typeof props.children === "number"
  );
}

export function createTextInstance(content) {
  return document.createTextNode(content);
}

export function createInstance(type, props, internalInstanceHandle) {
  const domElement = document.createElement(type);
  precacheFiberNode(internalInstanceHandle, domElement);
  updateFiberProps(domElement, props);
  return domElement;
}

export function appendInitialChild(parent, child) {
  parent.appendChild(child);
}

export function finalizeInitialChildren(domElement, type, props) {
  setInitialProperties(domElement, type, props);
}

export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}

export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}

export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}

/**
 * 对比原生 DOM 节点的新旧 props，生成 commit 阶段需要执行的属性更新载荷。
 * @param {Element} domElement 需要更新的真实 DOM 节点
 * @param {string} type DOM 节点类型
 * @param {Props} oldProps 老 props
 * @param {Props} newProps 新 props
 * @returns {UpdatePayload | null} updatePayload 属性差异更新载荷，没有差异时返回 null。
 */
export function prepareUpdate(domElement, type, oldProps, newProps) {
  return diffProperties(domElement, type, oldProps, newProps);
}

export function commitUpdate(
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps,
) {
  updateProperties(domElement, updatePayload, type, oldProps, newProps);
  updateFiberProps(domElement, newProps);
}
