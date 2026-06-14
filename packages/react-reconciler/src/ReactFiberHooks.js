import ReactSharedInternals from "shared/ReactSharedInternals";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from "./ReactHookEffectTags.js";

const { ReactCurrentDispatcher } = ReactSharedInternals;

/** @type {Fiber | null} 当前正在执行 hooks 渲染的 workInProgress fiber。 */
let currentlyRenderingFiber = null;

/** @type {Hook | null} 当前正在构建的新 hook 链表尾节点。 */
let workInProgressHook = null;

/** @type {Hook | null} update 阶段正在读取的老 hook 节点。 */
let currentHook = null;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
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

function baseStateReducer(state, action) {
  // setState(callback/newState),判定function为了兼容callback情况
  return typeof action === "function" ? action(state) : action;
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps,
  );
  hook.queue = {
    tag: hookFlags,
  };
}

function pushEffect(tag, create, destroy, deps) {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null,
  };
  // fiber.memoizedState 存储 Hook 链表；
  // fiber.updateQueue 存储函数组件本次 render 收集到的 effect 环形链表，以及一些函数组件相关队列。
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  // 对updateQueue进行链表构建
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}

function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    // 用于状态计算，在 update 阶段会用到
    lastRenderedReducer: baseStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  const dispatch = dispatchSetStateAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  );
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}

function dispatchSetStateAction(fiber, queue, action) {
  const update = {
    action,
    // 是否有可复用的与计算state
    hasEagerState: false,
    // 预计算出来的新state暂时为空
    eagerState: null,
    next: null,
  };
  const { lastRenderedReducer, lastRenderedState } = queue;
  const eagerState = lastRenderedReducer(lastRenderedState, action);
  update.eagerState = eagerState;
  update.hasEagerState = true;
  if (Object.is(eagerState, lastRenderedState)) {
    return;
  }
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
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

function updateState() {
  return updateReducer(baseStateReducer);
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null;
  for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy =
    hook.memoizedState !== null ? hook.memoizedState.destroy : undefined;
  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  currentlyRenderingFiber.flags |= fiberFlags; // passive effect
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps,
  );
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
  // 按 hook 调用顺序，从 current fiber 的老 hook 链表中取出当前 hook节点
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  // 克隆老hook节点
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };
  // 连接fiber中新的hook链表
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

/**
 * 使用 hooks 规则执行函数组件，并返回组件渲染出的子节点。
 * @param {Fiber | null} current 当前函数组件对应的老 fiber。
 * @param {Fiber} workInProgress 当前正在构建的函数组件 fiber。
 * @param {ComponentType} Component 函数组件。
 * @param {Props} props 函数组件接收的 props。
 * @returns {ReactNode} children 函数组件渲染出的子节点。
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress;
  // 对Effet的处理
  workInProgress.updateQueue = null;
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
