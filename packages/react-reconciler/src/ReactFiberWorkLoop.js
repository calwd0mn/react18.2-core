import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork.js";
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
  commitLayoutEffects,
} from "./ReactFiberCommitWork.js";
import { NoFlags, MutationMask, Passive } from "./ReactFiberFlags";
import { finishedQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import {
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  IdleEventPriority,
  lanesToEventPriority,
} from "./ReactEventPriorities";
import {
  DefaultLane,
  getHighestPriorityLane,
  getNextLanes,
  includesBlockingLane,
  markRootFinished,
  markRootUpdated,
  NoLane,
  NoLanes,
  SyncLane,
} from "./ReactFiberLane";
import {
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
  scheduleCallback,
  shouldYield,
} from "./Scheduler";
import {
  flushSyncCallbacks,
  scheduleSyncCallback,
} from "./ReactFiberSyncTaskQueue";

let workInProgress = null;
let workInProgressRoot = null;
let workInProgressRootRenderLanes = NoLanes;
const RootInProgress = 0;
const RootCompleted = 1;
let workInProgressRootExitStatus = RootInProgress;

// 全局变量
// 当前 commit 是否已经安排过 passive effect 的异步 flush 任务
let rootDoesHavePassiveEffect = false;
// 存储还有待执行 passive effect 的 FiberRoot，供异步 flushPassiveEffect 使用
let rootWithPendingPassiveEffects = null;

/**
 * 调度对 Fiber 的更新
 * @param {FiberRoot} root - FiberRoot 对象
 * @param {Fiber} fiber
 * @param {Lane} lane
 */
export function scheduleUpdateOnFiber(root, fiber, lane) {
  markRootUpdated(root, lane);
  ensureRootIsScheduled(root);
}

function performanceSyncWorkOnRoot(root) {
  const lanes = getNextLanes(root);
  renderRootSync(root, lanes);
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishedLanes = lanes;
  commitRoot(root);
  return null;
}

function ensureRootIsScheduled(root) {
  const nextLanes = getNextLanes(root);
  let newCallbackPriority = getHighestPriorityLane(nextLanes);
  let newCallbackNode = root.callbackNode;
  if (newCallbackPriority === SyncLane) {
    // 同步任务
    scheduleSyncCallback(performanceSyncWorkOnRoot.bind(null, root));
    queueMicrotask(flushSyncCallbacks);
  } else {
    // 异步任务
    let schedulerPriorityLevel;
    switch (lanesToEventPriority(newCallbackPriority)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
    }
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performanceConcurrentWorkOnRoot.bind(null, root),
    );
  }
  root.callbackNode = newCallbackNode;
}

/**
 * @param {FiberRoot} root
 * @param {boolean} didTimeout - 是否超时
 */
function performanceConcurrentWorkOnRoot(root, didTimeout) {
  const originalCallbackNode = root.callbackNode;
  const lanes = getNextLanes(root, NoLanes);
  if (lanes === NoLanes) {
    return null;
  }
  const shouldTimeSlice = !includesBlockingLane(lanes) && !didTimeout;
  // root = FiberRoot
  // 新建fiber树
  const existStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);
  if (existStatus !== RootInProgress) {
    // 更新完成后，拿到新fiber树
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    commitRoot(root);
  }
  if (root.callbackNode === originalCallbackNode) {
    return performanceConcurrentWorkOnRoot.bind(null, root);
  }
}

function renderRootConcurrent(root, renderLanes) {
  prepareFreshStack(root, renderLanes);
  workLoopConcurrent();
  if (workInProgress !== null) {
    return RootInProgress;
  }
  return workInProgressRootExitStatus;
}

function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

function renderRootSync(root, renderLanes) {
  prepareFreshStack(root, renderLanes);
  workLoopSync();
  return workInProgressRootExitStatus;
}

function commitRoot(root) {
  // root 为 FiberRoot
  // finishedWork为FiberRoot.current.alternate，也就是新fiber树的根节点，代表新fiber树已经处理完了
  const { finishedWork } = root;
  const finishedLanes = root.finishedLanes;
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  workInProgressRootExitStatus = RootInProgress;
  markRootFinished(root, root.pendingLanes & ~finishedLanes);

  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    // 如果有useEffect的副作用，先执行useEffect的副作用
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      scheduleCallback(NormalSchedulerPriority, flushPassiveEffect);
    }
  }
  root.callbackNode = null;
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffect || rootHasEffect) {
    // 递归执行副作用
    commitMutationEffectsOnFiber(finishedWork, root);
  }
  if (rootDoesHavePassiveEffect) {
    rootDoesHavePassiveEffect = false;
    rootWithPendingPassiveEffects = root;
  }
  root.current = finishedWork;
  commitLayoutEffects(finishedWork, root);
}

function flushPassiveEffect() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    commitPassiveUnmountEffects(root, root.current);
    commitPassiveMountEffects(root, root.current);
  }
}

/**
 * 为当前 FiberRootNode 准备一棵新的 workInProgress fiber 树。
 * @param {FiberRootNode} root React 应用根对象，root.current 才是 HostRoot fiber。
 * @param {Lanes} renderLanes 当前渲染的优先级
 */
function prepareFreshStack(root, renderLanes) {
  if (
    root !== workInProgressRoot ||
    workInProgressRootRenderLanes !== renderLanes
  ) {
    // 新建fiber树，并且把它赋值给workInProgress
    workInProgress = createWorkInProgress(root.current, null);
    // 标记正在工作的根的状态
    workInProgressRootExitStatus = RootInProgress;
  }
  workInProgressRoot = root;
  workInProgressRootRenderLanes = renderLanes;
  finishedQueueingConcurrentUpdates();
}

// 同步循环阶段
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next === null) {
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    // 该函数用于生成真实DOM节点，或者说是生成一个fiber树上对应的stateNode属性
    completeWork(current, completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}

export function requestUpdateLane() {
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }
  return DefaultLane;
}
