import { createWorkInProgress } from "./ReactFiber";
import { includesSomeLane } from "./ReactFiberLane";

function cloneChildFibers(current, workInProgress) {
  let currentChild = current.child;
  let previousChild = null;

  while (currentChild !== null) {
    const clonedChild = createWorkInProgress(
      currentChild,
      currentChild.pendingProps,
    );
    clonedChild.return = workInProgress;
    if (previousChild === null) {
      workInProgress.child = clonedChild;
    } else {
      previousChild.sibling = clonedChild;
    }
    previousChild = clonedChild;
    currentChild = currentChild.sibling;
  }

  if (previousChild !== null) {
    previousChild.sibling = null;
  }
}

export function bailoutOnAlreadyFinishedWork(
  current,
  workInProgress,
  renderLanes,
) {
  if (!includesSomeLane(current.childLanes, renderLanes)) {
    return null;
  }
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}
