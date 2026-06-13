import ReactSharedInternals from "shared/ReactSharedInternals";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";

const { ReactCurrentDispatcher } = ReactSharedInternals;
/** @type {Fiber | null} 当前正在执行 hooks 渲染的 workInProgress fiber。 */
let currentlyRenderingFiber = null;
/** @type {Hook | null} 当前正在构建的新 hook 链表尾节点。 */
let workInProgressHook = null;
/** @type {Hook | null} update 阶段正在读取的老 hook 节点。 */
let currentHook = null;
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
};

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // 存储当前状态
    queue: null, // 存储更新队列
    next: null, // 指向下一个hook
  };
  // 连接hooks链表
  if (workInProgressHook === null) {
    // mount阶段第一个hook
    currentlyRenderingFiber.memoizedState = hook;
    workInProgressHook = hook;
  } else {
    // mount阶段后续的hook
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }
  return workInProgressHook;
}

function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;
  const queue = {
    pending: null,
  };
  hook.queue = queue;
  const dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  );
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}

function updateReducer(reducer) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  const current = currentHook;
  const pendingQueue = queue.pending;
  let newState = current.memoizedState;
  // 这里的逻辑类似于processUpdateQueue，遍历更新队列，计算新的状态，然后把新的状态赋值给hook.memoizedState，最后返回新的状态和dispatch函数
  if (pendingQueue !== null) {
    // 断开环形链表
    queue.pending = null;
    const firstUpdate = pendingQueue.next;
    let update = firstUpdate;

    do {
      const action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== firstUpdate);
  }
  hook.memoizedState = newState;
  return [hook.memoizedState, queue.dispatch];
}

function updateWorkInProgressHook() {
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = newHook;
    workInProgressHook = newHook;
  } else {
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }
  return workInProgressHook;
}

function dispatchReducerAction(fiber, queue, action) {
  const update = {
    action,
    next: null,
  };
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}

export function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress;
  ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  const children = Component(props);
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  return children;
}
