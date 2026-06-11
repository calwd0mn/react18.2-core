import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork.js";
import { MutationMask } from "./ReactFiberFlags";
import { commitMutationEffectsOnFiber } from "./ReactFiberCommitWork.js";
import { NoFlags } from "./ReactFiberFlags";

let workInProgress = null;

export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

// 注册任务，计算优先级，此处用rIC模拟
function ensureRootIsScheduled(root) {
  scheduleCallback(performanceConcurrentWorkOnRoot.bind(null, root));
}

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
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffect || rootHasEffect) {
    // 递归执行副作用
    commitMutationEffectsOnFiber(finishedWork, root);
  }
  root.current = finishedWork;
}

function prepareFreshStack(root) {
  // 新建fiber树，并且把它赋值给workInProgress
  workInProgress = createWorkInProgress(root.current, null);
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
