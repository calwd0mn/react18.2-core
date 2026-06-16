import { NoLanes, mergeLanes } from "./ReactFiberLane";
import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import { assign } from "shared/assign";
import { isSubsetOfLanes } from "./ReactFiberLane";

export function initialUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState, // baseState指是处理 firstBaseUpdate 之前的状态基准。
    firstBaseUpdate: null, // firstBaseUpdate指向更新队列中第一个更新对象
    lastBaseUpdate: null, // lastBaseUpdate指向更新队列中最后一个更新对象
    shared: {
      pending: null, // 新产生,尚未被render阶段合并处理的update的尾节点
    },
  };
  fiber.updateQueue = queue;
}

export function createUpdate(lane) {
  const update = {
    lane,
    payload: null,
    next: null,
  };
  return update;
}

export function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue;

  // 有Lane版本
  const sharedQueue = updateQueue.shared;
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);

  // 无Lane版本
  // const pending = updateQueue.shared.pending;
  // // 形成一个环状链表 shared.pending指向最后一个更新对象，最后一个更新对象的next指向第一个更新对象
  // if (pending === null) {
  //   update.next = update;
  // } else {
  //   update.next = pending.next;
  //   pending.next = update;
  // }
  // updateQueue.shared.pending = update;
  // return markUpdateLaneFromFiberToRoot(fiber);
}

export function processUpdateQueue(workInProgress, nextProps, renderLanes) {
  // 无Lane版本
  // // 通过队尾拿到队尾和队头，进行链表遍历处理更新
  // const queue = workInProgress.updateQueue;
  // const pendingQueue = queue.shared.pending;
  // if (pendingQueue !== null) {
  //   // 处理更新队列
  //   queue.shared.pending = null;
  //   const lastPendingUpdate = pendingQueue;
  //   const firstPendingUpdate = lastPendingUpdate.next;
  //   lastPendingUpdate.next = null; // 断开环状链表
  //   let update = firstPendingUpdate;
  //   let newState = workInProgress.memoizedState;
  //   while (update !== null) {
  //     newState = getStateFromUpdate(update, newState);
  //     update = update.next;
  //   }
  //   workInProgress.memoizedState = newState;
  // }

  // 有Lane版本
  const queue = workInProgress.updateQueue;
  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;
  const pendingQueue = queue.shared.pending;
  // 合并新update到本轮更新中
  if (pendingQueue !== null) {
    queue.shared.pending = null;
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    // 把环状链表断开成单链表,方便遍历
    lastPendingUpdate.next = null;
    if (lastBaseUpdate === null) {
      // 没有未处理的更新，直接把新的更新添加到baseUpdate上
      firstBaseUpdate = firstPendingUpdate;
    } else {
      // 有未处理的更新，把新的更新添加到baseUpdate的末尾
      lastBaseUpdate.next = firstPendingUpdate;
    }
  }
  if (firstBaseUpdate !== null) {
    let newState = queue.baseState;
    let newLanes = NoLanes;
    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;
    let update = firstBaseUpdate;
    do {
      const updateLane = update.lane;
      // renderLanes当前渲染的车道
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 该更新不属于本次更新的车道，跳过
        const clone = {
          id: update.id,
          payload: update.payload,
          lane: updateLane,
          next: null,
        };
        // 维护未处理更新的队列
        if (newLastBaseUpdate === null) {
          // 下一轮更新队列还是空的，clone就是第一个更新对象
          newLastBaseUpdate = clone;
          newFirstBaseUpdate = clone;
          newBaseState = newState;
        } else {
          newLastBaseUpdate.next = clone;
          newLastBaseUpdate = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        // 该更新属于本次更新的车道，执行更新
        if (newLastBaseUpdate !== null) {
          // 下一轮更新队列不空，把该更新对象添加到下一轮更新队列的末尾
          const clone = {
            id: update.id,
            payload: update.payload,
            lane: NoLanes,
            next: null,
          };
          newLastBaseUpdate.next = clone;
          newLastBaseUpdate = clone;
        }
        newState = getStateFromUpdate(update, newState);
      }
      update = update.next;
    } while (update);
    if (newLastBaseUpdate === null) {
      queue.baseState = newState;
    } else {
      queue.baseState = newBaseState;
    }
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;
    workInProgress.memoizedState = newState;
    workInProgress.lanes = newLanes;
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
