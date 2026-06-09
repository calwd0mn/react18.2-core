import { markUpdateLaneFromFiberToRoot } from "./ReactFiberConcurrentUpdates";
import {assign} from "shared/assign";

export function initialUpdateQueue(fiber) {
  const queue = {
    shared: {
      pending: null,
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate() {
  // update对象上可以存一些其他属性，比如说更新的类型，更新的优先级等等，这里先简单的创建一个空对象
  const update = {};
  return update;
}

export function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  const pending = updateQueue.shared.pending;
  // 形成一个环状链表 shared.pending指向最后一个更新对象，最后一个更新对象的next指向第一个更新对象
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  updateQueue.shared.pending = update;
  return markUpdateLaneFromFiberToRoot(fiber);
}

export function processUpdateQueue(workInProgress) {
  // 通过队尾拿到队尾和队头，进行链表遍历处理更新
  const queue = workInProgress.updateQueue;
  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    // 处理更新队列
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;

    lastPendingUpdate.next = null; // 断开环状链表
    let update = firstPendingUpdate;
    let newState = workInProgress.memoizedState;
    while (update !== null) {
      newState = getStateFromUpdate(update, newState);
      update = update.next;
    }
    workInProgress.memoizedState = newState;
  }
}

function getStateFromUpdate(update, prevState) {
  // 这里简单的把update对象上的payload属性作为新的状态，实际情况可能会更复杂，比如说update对象上可能会有一个type属性，表示更新的类型，不同的更新类型可能会有不同的处理方式
  // switch (update.type) {
  //   case 'replaceState':
  //     return update.payload;
  //     ....
  //}
  const { payload } = update;
  return assign({}, prevState, payload);
}
