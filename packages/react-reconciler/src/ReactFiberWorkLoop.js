import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork.js";
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
} from "./ReactFiberCommitWork.js";
import { NoFlags, MutationMask, Passive } from "./ReactFiberFlags";
import { finishedQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";

let workInProgress = null;

// 全局变量
// 当前 commit 是否已经安排过 passive effect 的异步 flush 任务
let rootDoesHavePassiveEffect = false;
// 存储还有待执行 passive effect 的 FiberRoot，供异步 flushPassiveEffect 使用
let rootWithPendingPassiveEffects = null;

export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

// 注册任务，计算优先级，此处用rIC模拟
function ensureRootIsScheduled(root) {
  scheduleCallback(performanceConcurrentWorkOnRoot.bind(null, root));
}

/**
 *
 * @param {FiberRoot} root
 */
function performanceConcurrentWorkOnRoot(root) {
  // root = FiberRoot
  // 新建fiber树
  renderRootSync(root);
  // 更新完成后，拿到新fiber树
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
}

function renderRootSync(root) {
  prepareFreshStack(root);
  workLoopSync();
}

function commitRoot(root) {
  // root 为 FiberRoot
  // finishedWork为FiberRoot.current.alternate，也就是新fiber树的根节点，代表新fiber树已经处理完了
  const { finishedWork } = root;

  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    // 如果有useEffect的副作用，先执行useEffect的副作用
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true;
      scheduleCallback(flushPassiveEffect);
    }
  }

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
 */
function prepareFreshStack(root) {
  // 新建fiber树，并且把它赋值给workInProgress
  workInProgress = createWorkInProgress(root.current, null);
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
  const next = beginWork(current, unitOfWork);
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
}
