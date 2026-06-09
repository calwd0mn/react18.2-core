import { HostComponent, HostText, HostRoot } from "./ReactWorkTags";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";

function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    // mount
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // update
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
    );
  }
}

function updateHostRoot(current, workInProgress) {
  processUpdateQueue(workInProgress);
  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;
  reconcileChildren(current, workInProgress, nextChildren);
  // 在我们初始渲染的时候child为空，通过reconcileChildren生成child fiber树，之后的更新就会复用之前生成的fiber树
  return workInProgress.child;
}

function updateHostComponent(current, workInProgress) {
  // type为fiber对应虚拟DOM的类型
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;
  const isDiredctTextChild = shouldSetTextContent(type, nextProps);
  if (isDiredctTextChild) {
    nextChildren = null;
  }
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

export function beginWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case HostText:
      return null;
    default:
      return null;
  }
}
