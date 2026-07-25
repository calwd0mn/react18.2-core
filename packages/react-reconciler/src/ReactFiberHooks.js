import ReactSharedInternals from "shared/ReactSharedInternals";
import { requestUpdateLane, scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
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
import { NoLane, NoLanes, isSubsetOfLanes, mergeLanes } from "./ReactFiberLane";

const { ReactCurrentDispatcher } = ReactSharedInternals;

/** @type {Fiber | null} 当前正在执行 hooks 渲染的 workInProgress fiber。 */
let currentlyRenderingFiber = null;

/** @type {Hook | null} 当前正在构建的新 hook 链表尾节点。 */
let workInProgressHook = null;

/** @type {Hook | null} update 阶段正在读取的老 hook 节点。 */
let currentHook = null; 

/** @type {Lanes} 当前正在渲染的优先级。 */
let currentlyRenderingRenderLanes = NoLanes;

const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useRef: mountRef,
  useMemo: mountMemo,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
};
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useRef: updateRef,
  useMemo: updateMemo,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
};

function throwInvalidHookError() {
  throw new Error(
    "Invalid hook call. Hooks can only be called inside of the body of a function component.",
  );
}

const ContextOnlyDispatcher = {
  useReducer: throwInvalidHookError,
  useState: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
};

/**
 * 为挂载阶段分配 Hook 节点，并将其追加到当前 Fiber 的 Hook 链表。
 *
 * Hook 依赖调用顺序关联状态，因此必须在创建时同步维护链表尾节点，
 * 才能让更新阶段按相同顺序读取对应的旧 Hook。
 *
 * @returns {Hook} 当前创建的 work-in-progress Hook。
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // 存储当前状态
    baseState: null, // 重放baseQueue之前的state,当有update被跳过,他就为被跳过update之前的state
    baseQueue: null, // 优先级不够被跳过下一轮要重放的update链表尾节点
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

/**
 * 挂载副作用 Hook：创建 Effect，标记当前 Fiber，并将 Effect 加入函数组件的副作用链表。
 * @param {number} fiberFlags - Fiber 上用于标记副作用类型的 flags。
 * @param {number} hookFlags - Effect 上用于标记 Hook 类型的 flags。
 * @param {() => void | (() => void)} create - 副作用创建函数，可返回清理函数。
 * @param {Array | undefined} deps - 副作用依赖数组；省略时每次更新都执行。
 */
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,// 挂载阶段还没有
    nextDeps,
  );
}

/**
 * 创建 Effect 并将其加入当前函数组件的副作用环形链表(Fiber.updateQueue)。
 * @param {number} tag - Effect 的类型和执行标记。
 * @param {() => void | (() => void)} create - Effect 创建函数，可返回清理函数。
 * @param {(() => void) | undefined} destroy - 上一次 Effect 的清理函数。
 * @param {Array | null} deps - Effect 的依赖数组。
 * @returns {object} effect - 创建并加入链表的 Effect。
 */
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
  hook.baseState = initialState;
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

function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

function updateRef() {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function mountMemo(create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo(create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (
    nextDeps !== null &&
    areHookInputsEqual(nextDeps, prevState[1])
  ) {
    return prevState[0];
  }
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function dispatchSetStateAction(fiber, queue, action) {
  const lane = requestUpdateLane();
  const update = {
    lane,
    action,
    // 是否有可复用的与计算state
    hasEagerState: false,
    // 预计算出来的新state暂时为空
    eagerState: null,
    next: null,
  };
  const alternate = fiber.alternate;
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes === NoLanes)
  ) {
    const { lastRenderedReducer, lastRenderedState } = queue;
    const eagerState = lastRenderedReducer(lastRenderedState, action);
    update.eagerState = eagerState;
    update.hasEagerState = true;
    if (Object.is(eagerState, lastRenderedState)) {
      return;
    }
  }
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  scheduleUpdateOnFiber(root, fiber, lane);
}

function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;
  hook.baseState = initialArg;
  const queue = {
    pending: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialArg,
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
  const pendingQueue = queue.pending;
  let baseQueue = hook.baseQueue;
  // 合并新update到本轮更新中
  if (pendingQueue !== null) {
    queue.pending = null;
    if (baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingQueue.next = baseFirst;
    }
    baseQueue = pendingQueue;
  }

  let newState = hook.baseState;
  // 与处理HostRoot逻辑类似
  if (baseQueue !== null) {
    const firstUpdate = baseQueue.next;
    let update = firstUpdate;
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let newLanes = NoLanes;

    do {
      const updateLane = update.lane;
      if (!isSubsetOfLanes(currentlyRenderingRenderLanes, updateLane)) {
        const clone = {
          lane: updateLane,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        newLanes = mergeLanes(newLanes, updateLane);
      } else {
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast.next = clone;
          newBaseQueueLast = clone;
        }
        const action = update.action;
        newState =
          update.hasEagerState === true
            ? update.eagerState
            : reducer(newState, action);
      }
      update = update.next;
    } while (update !== null && update !== firstUpdate);

    if (newBaseQueueLast === null) {
      hook.baseQueue = null;
      hook.baseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
      hook.baseQueue = newBaseQueueLast;
      hook.baseState = newBaseState;
    }

    currentlyRenderingFiber.lanes = mergeLanes(
      currentlyRenderingFiber.lanes,
      newLanes,
    );
  }
  hook.memoizedState = newState;
  queue.lastRenderedState = newState;
  return [hook.memoizedState, queue.dispatch];
}



/**
 * 更新阶段按 Hook 的调用顺序读取 current Fiber 上的旧 Hook，
 * 克隆出新的 Hook 节点并连接到 work-in-progress Fiber 的 Hook 链表中。
 *
 * @returns {Hook} 当前正在处理的 work-in-progress Hook。
 */
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
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue,
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
  const lane = requestUpdateLane();
  const update = {
    lane,
    action,
    next: null,
  };
  const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  scheduleUpdateOnFiber(root, fiber, lane);
}

/**
 * 使用 hooks 规则执行函数组件，并返回组件渲染出的子节点。
 * @param {Fiber | null} current 当前函数组件对应的老 fiber。
 * @param {Fiber} workInProgress 当前正在构建的函数组件 fiber。
 * @param {ComponentType} Component 函数组件。
 * @param {Props} props 函数组件接收的 props。
 * @param {Lanes} renderLanes 当前渲染的优先级。
 * @returns {ReactNode} children 函数组件渲染出的子节点。
 */
export function renderWithHooks(
  current,
  workInProgress,
  Component,
  props,
  renderLanes,
) {
  currentlyRenderingFiber = workInProgress;
  currentlyRenderingRenderLanes = renderLanes;
  workInProgress.lanes = NoLanes;
  // 对Effet的处理
  workInProgress.updateQueue = null;
  ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  try {
    return Component(props);
  } finally {
    ReactCurrentDispatcher.current = ContextOnlyDispatcher;
    currentlyRenderingFiber = null;
    workInProgressHook = null;
    currentHook = null;
    currentlyRenderingRenderLanes = NoLanes;
  }
}
