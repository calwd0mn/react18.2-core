import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";

let workInProgress = null;

export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

// 注册任务，计算优先级，此处用rIC模拟
function ensureRootIsScheduled(root) {
  scheduleCallback(performanceConcurrentWorkOnRoot.bind(null, root));
}

function performanceConcurrentWorkOnRoot(root) {
  // 新建fiber树
  renderRootSync(root);
  // 更新完成后，拿到新fiber树
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  // commitRoot(root);
}

function renderRootSync(root) {
  prepareFreshStack(root);
  workLoopSync();
}

function prepareFreshStack(root) {
  // 新建fiber树，并且把它赋值给workInProgress
  workInProgress = createWorkInProgress(root.current, null);
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  const next = beginWork(current, unitOfWork);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  workInProgress = null; //TODO: 这里先把workInProgress置空，后续会在beginWork中根据情况重新赋值
  //   if (next === null) {
  //     completeUnitOfWork(unitOfWork);
  //   } else {
  //     workInProgress = next;
  //   }
}

function completeUnitOfWork(unitOfWork) {}
