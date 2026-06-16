# React 18 Core

一个围绕 React 18.2 核心机制编写的学习型实现。

本项目的目标不是完整复刻 React，而是把面试和源码学习中最常见、最关键、最有辨识度的主链路跑通：从 JSX 创建元素，到 `createRoot().render()` 触发更新，再到 Fiber 协调、lane 调度、hooks 更新、commit DOM 和事件派发。

## 项目定位

这个仓库适合用来理解 React 18.2 的核心问题：

- JSX 最终会变成什么结构？
- `createRoot` 做了什么？
- Fiber 为什么要有 current 和 workInProgress 两棵树？
- render 阶段和 commit 阶段分别做什么？
- children diff 如何复用、插入和移动节点？
- `useState`、`useReducer`、`useEffect`、`useLayoutEffect` 的数据结构是什么？
- lane 如何表达更新优先级？
- React 的事件为什么是根容器委托，而不是直接绑在真实 DOM 上？

项目通过 Vite 运行示例，并用本地 `packages` 模拟 React 包结构：

```text
packages/
  react/                 React 对外导出、JSX runtime、hooks dispatcher
  react-dom/             createRoot 和 root.render 入口
  react-dom-bindings/    DOM 创建、属性更新、事件系统
  react-reconciler/      Fiber、协调、调度、commit、hooks、lane
  scheduler/             基于 MessageChannel 的任务调度器
  shared/                共享常量和工具函数
```

## 快速开始

```bash
npm install
npm run start
```

开发服务器默认运行在：

```text
http://localhost:8000
```

示例入口：

```text
index.html
packages/index.jsx
```

## 面试高频主链路

推荐先抓住这条链路：

```text
createRoot(container)
  -> createContainer(container)
  -> createFiberRoot(container)
  -> listenToAllSupportedEvents(container)

root.render(element)
  -> updateContainer(element, root)
  -> createUpdate(lane)
  -> enqueueUpdate(...)
  -> scheduleUpdateOnFiber(root, current, lane)
  -> ensureRootIsScheduled(root)
  -> renderRootSync / renderRootConcurrent
  -> commitRoot(root)
```

对应源码：

```text
packages/react-dom/client/ReactDOMRoot.js
packages/react-reconciler/src/ReactFiberReconciler.js
packages/react-reconciler/src/ReactFiberRoot.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
```

这条链路覆盖了 React 面试中最常被追问的几个点：更新从哪里来、如何进入 Fiber 树、如何选择优先级、render 阶段如何构建新树、commit 阶段如何把变化落到 DOM。

## 核心实现

### 1. JSX 和 ReactElement

从 JSX 开始看，重点不是语法糖本身，而是它最终会变成一个 ReactElement：

```text
{
  $$typeof,
  type,
  key,
  ref,
  props
}
```

这里最重要的是三个字段：`type` 决定后续创建哪类 fiber，`key` 参与 children diff，`props` 承载组件参数或 DOM 属性。

相关源码：

```text
packages/react/src/jsx/ReactJSXElement.js
packages/shared/ReactSymbols.js
```

### 2. Fiber 双缓存

Fiber 这部分重点看 current、workInProgress 和 `alternate` 的关系：

- current：当前已经 commit 到页面上的 Fiber 树。
- workInProgress：本轮 render 阶段正在构建的新 Fiber 树。
- alternate：两棵树之间互相引用，用于复用节点和保存上一次状态。

这是理解 React 可中断渲染、状态复用和 commit 原子切换的关键。

相关源码：

```text
packages/react-reconciler/src/ReactFiber.js
```

### 3. beginWork / completeWork / commit

渲染主流程可以按三个阶段理解：

- `beginWork`：根据 fiber 类型计算子节点，例如 HostRoot、HostComponent、FunctionComponent。
- `completeWork`：创建真实 DOM、处理属性更新 payload、冒泡 flags。
- `commitRoot`：根据 flags 执行 DOM 插入、属性更新、layout effect 和 passive effect。

这也是面试里最常见的 render 阶段和 commit 阶段区别。

相关源码：

```text
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactFiberCommitWork.js
```

### 4. children diff

children 协调重点看 React 如何判断“复用、插入、移动、删除”：

- 单个 ReactElement：优先比较 `key`，再比较 `type`。
- 文本节点：创建或复用 HostText fiber。
- 数组 children：先按顺序比较，再用 Map 处理剩余节点。
- 通过 `Placement` 标记新增或移动。
- 通过 `ChildDeletion` 记录需要删除的旧节点。

这部分对应面试高频问题：为什么列表需要 key，React 如何判断节点复用，数组 diff 为什么不是双端 diff。

相关源码：

```text
packages/react-reconciler/src/ReactChildFiber.js
```

### 5. lane 和调度

lane 可以先理解成“更新优先级的位图表示”。当前代码里最核心的几类 lane 是：

- `SyncLane`：同步更新。
- `InputContinuousLane`：连续输入事件。
- `DefaultLane`：默认更新。
- `IdleLane`：空闲更新。

调度流程会从 root 的 `pendingLanes` 中选择最高优先级 lane。同步任务进入微任务队列，其他任务交给 scheduler，通过 MessageChannel 和时间切片执行。

相关源码：

```text
packages/react-reconciler/src/ReactFiberLane.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/scheduler/src/forks/Scheduler.js
```

### 6. hooks

hooks 这部分重点看两个链表：fiber 上的 hook 链表，以及 hook queue 里的 update 环形链表：

- hook 通过链表挂在函数组件 fiber 的 `memoizedState` 上。
- mount 阶段创建 hook，update 阶段按调用顺序复用 hook。
- `useState` 本质上是内置 reducer 的 `useReducer`。
- update 通过环形链表保存，再根据当前 renderLanes 决定执行或跳过。
- effect 通过环形链表挂在函数组件 fiber 的 `updateQueue.lastEffect` 上。

这部分适合理解几个常见问题：hooks 为什么不能写在条件语句里，setState 为什么可以函数式更新，effect 的 destroy 和 create 在什么时候执行。

相关源码：

```text
packages/react/src/ReactHooks.js
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberConcurrentUpdates.js
```

### 7. DOM 与事件系统

DOM 绑定层可以分成两条线看：一条是 commit DOM，另一条是事件委托。

- 创建 DOM 节点并把 DOM 与 fiber 互相关联。
- 对比 oldProps 和 newProps，生成 updatePayload。
- commit 阶段更新 style、children 和普通属性。
- 在 root container 上统一监听事件。
- 根据事件源 DOM 找到最近的 fiber，收集捕获或冒泡阶段的监听器。
- 用 SyntheticEvent 包装原生事件。

这部分对应面试高频问题：React 事件为什么能冒泡到组件树、事件对象为什么是合成事件、事件优先级如何影响更新。

相关源码：

```text
packages/react-dom-bindings/src/client/ReactDOMHostConfig.js
packages/react-dom-bindings/src/client/ReactDOMComponent.js
packages/react-dom-bindings/src/events/DOMPluginEventSystem.js
packages/react-dom-bindings/src/events/ReactDOMEventListener.js
packages/react-dom-bindings/src/events/plugins/SimpleEventPlugin.js
```

## 与 React 18.2 核心源码的关键差异

### 1. createRoot：本项目保留主链路，官方实现包含完整边界

本项目重点保留：

```text
createRoot -> createContainer -> listenToAllSupportedEvents -> root.render
```

React 18.2 官方实现还会处理：

- container 合法性校验。
- root 是否重复创建的标记。
- `unmount`。
- `hydrateRoot`。
- StrictMode、identifierPrefix、recoverable error、transition callbacks 等 root options。

本项目没有展开这些边界，因为它们不是理解 Fiber 主流程的第一优先级。

### 2. WorkLoop：本项目保留 render/commit 骨架，官方实现处理大量中断和恢复

本项目重点保留：

- `scheduleUpdateOnFiber` 标记 root 更新。
- `ensureRootIsScheduled` 根据 lane 安排任务。
- `renderRootSync` 和 `renderRootConcurrent` 构建 workInProgress 树。
- `performUnitOfWork` 串联 beginWork 和 completeWork。
- `commitRoot` 提交 DOM 和 effects。

React 18.2 官方实现还会处理：

- executionContext。
- render phase update。
- Suspense 挂起、ping 和重试。
- 错误捕获与恢复。
- nested update 限制。
- Profiler、DevTools、StrictEffects。
- hydration 和 Offscreen。

这些能力很重要，但它们建立在主 WorkLoop 之上。当前项目先把主干跑通，更适合入门和面试复盘。

### 3. lane：本项目实现优先级雏形，官方实现是完整并发调度模型

本项目 lane 主要用于回答：

- 更新为什么有优先级？
- 事件优先级如何映射到更新优先级？
- 高优先级任务如何先被选择？
- 低优先级 update 如何被跳过并留到后续 render？

React 18.2 官方 lane 还包含：

- TransitionLanes。
- RetryLanes。
- SelectiveHydrationLane。
- suspendedLanes、pingedLanes、expiredLanes。
- entangled lanes。
- eventTime 和 expirationTime。

所以本项目更像 lane 的最小可理解版本，而不是完整并发特性实现。

### 4. children diff：本项目覆盖核心复用，官方实现覆盖更多节点类型和删除细节

本项目已经覆盖面试最常见的 diff 主线：

- key 相同再看 type。
- type 相同复用 fiber。
- type 不同创建新 fiber。
- 数组 children 先顺序比较，再 Map 查找。
- 用 `Placement` 标记插入或移动。

React 18.2 官方实现还处理：

- Fragment。
- Portal。
- Lazy。
- Iterator children。
- 更完整的 deletion commit。
- ref 处理。
- hydration 场景下的协调。

当前项目的价值在于能把 key、type、fiber 复用和 Placement 的关系讲清楚。

### 5. hooks：本项目覆盖状态和 effect 主链路，官方实现包含完整 hooks 生态

本项目已经实现：

- `useState`。
- `useReducer`。
- `useEffect`。
- `useLayoutEffect`。
- mount/update dispatcher 切换。
- hook 链表。
- update 环形队列。
- eager state。
- effect 环形链表。

React 18.2 官方实现还包括：

- hook 顺序 DEV 校验。
- render phase update 和 re-render limit。
- `useMemo`、`useCallback`、`useRef`、`useContext`。
- `useTransition`、`useDeferredValue`。
- `useSyncExternalStore`、`useId`。
- StrictMode 下 effect 的额外校验行为。

本项目已经足够支撑面试中最常见的 hooks 原理问题，但还不是完整 hooks 实现。

### 6. commit：本项目覆盖插入、更新和 effect，官方实现覆盖完整副作用生命周期

本项目已经实现：

- Placement 插入 DOM。
- Update 更新 DOM 属性。
- layout effect 同步执行。
- passive effect 异步执行。

React 18.2 官方 commit 阶段还包括：

- before mutation 阶段。
- ref attach / detach。
- deletion 子树完整卸载。
- passive unmount 更完整的边界。
- Suspense、Offscreen、Profiler 相关 commit 行为。

因此，当前 commit 更适合看清 mutation/layout/passive 三类主效果，不适合当成完整卸载流程参考。

### 7. 事件系统：本项目覆盖委托和派发，官方实现覆盖完整插件体系

本项目已经实现：

- 根容器事件委托。
- 根据 DOM 找 fiber。
- 收集捕获和冒泡监听器。
- SyntheticEvent。
- click / drag 等事件优先级映射。

React 18.2 官方实现还包含：

- 多事件插件协作。
- ChangeEventPlugin。
- BeforeInputEventPlugin。
- EnterLeaveEventPlugin。
- SelectEventPlugin。
- non-delegated events。
- passive listener。
- 事件重放和 hydration 相关逻辑。

当前实现保留的是面试最常问的事件模型主干。

## 下一步优化方向

### 1. 补完整删除流程

当前 `ReactChildFiber` 已经会标记 `ChildDeletion`，但 commit 阶段对删除 DOM、递归卸载子树、执行 effect destroy 的处理还可以继续补。

这是最值得优先补的点，因为它能串起 diff、flags、commit mutation 和 passive cleanup。

### 2. 补 HostText 更新

当前文本节点创建已经具备，但文本更新可以继续对齐 React 的思路：complete 阶段比较文本变化，commit 阶段更新 nodeValue。

这个优化很小，但能让 DOM update 流程更完整。

### 3. 完善数组 diff 的边界用例

可以围绕下面场景补示例或测试：

- 头部插入。
- 中间插入。
- 尾部追加。
- key 稳定时移动。
- key 改变导致重建。
- type 改变导致不能复用。

这些场景最适合验证 `lastPlacedIndex`、`Placement` 和 Map 查找逻辑。

### 4. 补 `useRef`、`useMemo`、`useCallback`

这三个 hooks 比较适合作为下一阶段：

- `useRef` 可以帮助理解 hook 链表上的稳定对象。
- `useMemo` 和 `useCallback` 可以复用 effect deps 的比较逻辑。
- 它们比 `useTransition` 更小，更适合在当前代码结构上自然扩展。

### 5. 扩展 transition lane

在已有 lane 基础上，可以再补 TransitionLanes 的简化版，用来解释 React 18 并发更新中 urgent update 和 transition update 的区别。

这个方向适合在已经理解 SyncLane、DefaultLane 和 scheduler 后继续推进。

### 6. 增加核心调试案例

建议保留几个最小案例，方便断点观察：

- 首次 mount。
- 点击触发 `useState` 更新。
- children 数组重排。
- props/style/text 更新。
- `useEffect` 和 `useLayoutEffect` 的执行顺序。
- 捕获和冒泡事件顺序。

项目不一定需要复杂测试框架，先有稳定的调试入口就很有价值。

## 推荐阅读顺序

```text
packages/index.jsx
packages/react/src/jsx/ReactJSXElement.js
packages/react-dom/client/ReactDOMRoot.js
packages/react-reconciler/src/ReactFiberReconciler.js
packages/react-reconciler/src/ReactFiberRoot.js
packages/react-reconciler/src/ReactFiberWorkLoop.js
packages/react-reconciler/src/ReactFiberBeginWork.js
packages/react-reconciler/src/ReactFiberCompleteWork.js
packages/react-reconciler/src/ReactChildFiber.js
packages/react-reconciler/src/ReactFiberHooks.js
packages/react-reconciler/src/ReactFiberCommitWork.js
packages/react-dom-bindings/src/events/DOMPluginEventSystem.js
```

## 参考的 React 18.2 官方源码

```text
https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/client/ReactDOMRoot.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactFiberWorkLoop.new.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactFiberLane.new.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactChildFiber.new.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactFiberHooks.new.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-reconciler/src/ReactFiberCommitWork.new.js
https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/events/DOMPluginEventSystem.js
```

## 注意事项

- 本项目用于学习 React 18.2 核心链路，不等价于官方 React。
- 当前重点是主流程可读、可调试、可解释，而不是完整兼容 React 行为。
- 阅读时建议配合断点，从一次点击更新一路跟到 lane、render、commit 和 effect。
