import {
  HostComponent,
  HostText,
  HostRoot,
  IndeterminateComponent,
  FunctionComponent,
} from "./ReactWorkTags";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { renderWithHooks } from "./ReactFiberHooks.js";

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

function updateHostRoot(current, workInProgress, renderLanes) {
  processUpdateQueue(workInProgress, null, renderLanes);
  const nextState = workInProgress.memoizedState;
  const nextChildren = nextState.element;
  reconcileChildren(current, workInProgress, nextChildren);
  // 在我们初始渲染的时候child为空，通过reconcileChildren生成child fiber树，之后的更新就会复用之前生成的fiber树
  return workInProgress.child;
}

/**
 * 挂载尚未确定类型的组件，本实现中直接按函数组件处理。
 * @param {Fiber | null} current 老的函数组件fiber
 * @param {Fiber} workInProgress 正在构建的函数组件fiber
 * @param {ComponentType} Component 函数组件
 * @returns {Fiber | null} child 函数组件渲染结果对应的第一个子fiber
 */
function mountIndeterminateComponent(
  current,
  workInProgress,
  Component,
  renderLanes,
) {
  const props = workInProgress.pendingProps;
  const value = renderWithHooks(
    current,
    workInProgress,
    Component,
    props,
    renderLanes,
  );
  // 此处实际上会进行判断(class/function),但是我们这里省略了，直接当做函数组件处理
  workInProgress.tag = FunctionComponent;
  reconcileChildren(current, workInProgress, value);
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

function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  props,
  renderLanes,
) {
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    props,
    renderLanes,
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

export function beginWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case FunctionComponent:{
      const Component = workInProgress.type;
      const props = workInProgress.pendingProps;
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        props,
        renderLanes,
      );
    }
    case HostText:
      return null;
    default:
      return null;
  }
}
