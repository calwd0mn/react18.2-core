import {
  HostRoot,
  HostComponent,
  IndeterminateComponent,
  HostText,
} from "./ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag; // fiber节点的类型
  this.key = key;
  this.type = null; // fiber节点所对应的虚拟DOM的类型
  this.stateNode = null;
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.memoizedState = null;
  this.updateQueue = null;
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.alternate = null;
  this.index = 0;
  this.lanes = NoLanes;
  this.deletions = null; // 存放需要删除的子节点
}

export function createFiber(tag, pendingProps, key) {
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber() {
  return createFiber(HostRoot, null, null);
}

/**
 * 基于 current 创建或复用 workInProgress fiber，并同步必要属性。
 * @param {Fiber} current - 当前 fiber
 * @param {ReactElement["props"] | null} pendingProps - 新 fiber 的待处理 props
 * @returns {Fiber} workInProgress - 创建或复用的 workInProgress fiber
 */
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 首次渲染，创建一个新的fiber树
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // update
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
  }
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  return workInProgress;
}

export function createFiberFromElement(element) {
  const { type, key, props: pendingProps } = element;
  return createFiberFromTypeAndProps(type, key, pendingProps);
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  let tag = IndeterminateComponent;
  if (typeof type === "string") {
    tag = HostComponent;
  }
  const fiber = createFiber(tag, pendingProps, key);
  fiber.type = type;
  return fiber;
}

export function createFiberFromText(content) {
  return createFiber(HostText, content, null);
}
