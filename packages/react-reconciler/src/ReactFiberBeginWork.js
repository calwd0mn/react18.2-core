import {
  HostComponent,
  HostText,
  HostRoot,
  IndeterminateComponent,
  FunctionComponent,
  MemoComponent,
} from "./ReactWorkTags";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { createFiberFromElement, createWorkInProgress } from "./ReactFiber";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { renderWithHooks } from "./ReactFiberHooks.js";
import { shallowEqual } from "shared/shallowEqual";
import { bailoutOnAlreadyFinishedWork } from "./ReactFiberBailout";
import { includesSomeLane } from "./ReactFiberLane";

/**
 * 根据是否存在 current Fiber，为父 Fiber 挂载或协调子 Fiber。
 * @param {Fiber | null} current - 当前已提交的父 Fiber；首次挂载时为 null。
 * @param {Fiber} workInProgress - 正在构建的父 Fiber。
 * @param {ReactNode} nextChildren - 父 Fiber 本轮渲染产生的新子节点。
 */
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

function updateMemoComponent(
  current,
  workInProgress,
  Component,
  nextProps,
  renderLanes,
) {
  if (current === null) {
    const child = createFiberFromElement({
      type: Component.type,
      key: null,
      props: nextProps,
    });
    child.return = workInProgress;
    workInProgress.child = child;
    return child;
  }

  const currentChild = current.child;
  const compare =
    Component.compare === null ? shallowEqual : Component.compare;
  if (
    compare(currentChild.memoizedProps, nextProps)
  ) {
    return bailoutOnAlreadyFinishedWork(
      current,
      workInProgress,
      renderLanes,
    );
  }

  const child = createWorkInProgress(currentChild, nextProps);
  child.return = workInProgress;
  workInProgress.child = child;
  return child;
}

export function beginWork(current, workInProgress, renderLanes) {
  if (
    current !== null &&
    current.memoizedProps === workInProgress.pendingProps &&
    !includesSomeLane(current.lanes, renderLanes)
  ) {
    return bailoutOnAlreadyFinishedWork(
      current,
      workInProgress,
      renderLanes,
    );
  }

  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    // FiberRoot.current
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
    case MemoComponent:
      return updateMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes,
      );
    case HostText:
      return null;
    default:
      return null;
  }
}
