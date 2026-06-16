import { peek, pop, push } from "./SchedulerMinHeap";
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from "./SchedulerPriorities";

const IMMEDIATE_PRIORITY_TIMEOUT = -1;
const USER_BLOCKING_PRIORITY_TIMEOUT = 250;
const NORMAL_PRIORITY_TIMEOUT = 5000;
const LOW_PRIORITY_TIMEOUT = 10000;
const maxSigned31BitInt = 1073741823;
const IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;
let taskIdCounter = 1;
let taskQueue = [];
let currentTask = null; // 正在执行的任务
let scheduledHostCallback = null; // 正在调度的任务
const frameInterval = 5;
let startTime = -1;
const channel = new MessageChannel();
let port2 = channel.port2;
let port1 = channel.port1;
port1.onmessage = performWorkUntilDeadline;

function getCurrentTime() {
  return performance.now();
}

//
export function scheduleCallback(priorityLevel, callback) {
  const currentTime = getCurrentTime();
  const startTime = currentTime;
  let timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  const expirationTime = startTime + timeout;
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: expirationTime,
  };
  push(taskQueue, newTask);
  requestHostCallback(workLoop);
  return newTask;
}

function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  // 任务执行时间超过5ms就让出控制权
  if (timeElapsed >= frameInterval) {
    return true;
  }
  return false;
}

function workLoop(startTime) {
  let currentTime = startTime;
  currentTask = peek(taskQueue);
  while (currentTask !== null) {
    // 还没超时且需要让权,退出循环
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      // 是否过期(超时)
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      //
      const continuationCallback = callback(didUserCallbackTimeout);
      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
        return true;
      }
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue);
      }
    } else {
      pop(taskQueue);
    }
    // 更新当前任务
    currentTask = peek(taskQueue);
  }
  if (currentTask !== null) {
    return true;
  }
  return false;
}

function requestHostCallback(workLoop) {
  // 保存任务进度
  scheduledHostCallback = workLoop;
  schedulePerformWorkUntilDeadline();
}

function schedulePerformWorkUntilDeadline() {
  // 相当于将port1.onmessage = performWorkUntilDeadline;放在了宏任务队列中，等到当前执行栈清空后才会执行performWorkUntilDeadline
  port2.postMessage(null);
}

function performWorkUntilDeadline() {
  if (scheduledHostCallback) {
    startTime = getCurrentTime();
    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(startTime);
    } finally {
      if (hasMoreWork) {
        // 继续调度performWorkUntilDeadline
        schedulePerformWorkUntilDeadline();
      } else {
        scheduledHostCallback = null;
      }
    }
  }
}

export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
};
