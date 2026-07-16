import { mergeLanes } from "./ReactFiberLane";
import { HostRoot } from "./ReactWorkTags";

const concurrentQueues = [];
let concurrentQueuesIndex = 0;

function getRootForUpdateFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}

// concurrentQueue中的对象是【引用】,直接修改对应值
export function finishedQueueingConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;
  let i = 0;
  while (i < endIndex) {
    const fiber = concurrentQueues[i++];
    const queue = concurrentQueues[i++];
    const update = concurrentQueues[i++];
    const lane = concurrentQueues[i++];
    if (queue !== null && update !== null) {
      // pending是一个环状链表，queue.pending指向最后一个更新对象，最后一个更新对象的next指向第一个更新对象
      const pending = queue.pending;
      if (pending === null) {
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
    markUpdateLaneFromFiberToRoot(fiber, lane);
  }
}

function enqueueUpdate(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
}

export function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdateFiber(fiber);
}

export function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
  enqueueUpdate(fiber, queue, update, lane);
  return getRootForUpdateFiber(fiber);
}

// 
/**
 * 从产生更新的 Fiber 向上标记更新车道，并返回所属的 FiberRoot。
 * @param {Fiber} sourceFiber - 产生本次更新的 Fiber。
 * @param {Lane} lane - 本次更新对应的优先级车道。
 * @returns {FiberRoot | null} root - 更新所属的根节点；未连接到 HostRoot 时返回 null。
 */
export function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  const alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }

  let node = sourceFiber;
  let parent = node.return;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    const parentAlternate = parent.alternate;
    if (parentAlternate !== null) {
      parentAlternate.childLanes = mergeLanes(parentAlternate.childLanes, lane);
    }
    node = parent;
    parent = parent.return;
  }
  if (node.tag === HostRoot) {
    return node.stateNode;
  }
  return null;
}
