import { createHostRootFiber } from "./ReactFiber";
import { initialUpdateQueue } from "./ReactFiberClassUpdateQueue";

function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo; // 容器信息，如div#root
  // containerInfo       真实 DOM 容器，比如 #root
  // current             当前已经渲染完成的 RootFiber
  // pendingLanes        当前根上还有哪些优先级任务待处理
  // suspendedLanes      哪些任务被挂起
  // pingedLanes         哪些挂起任务又被唤醒
  // callbackNode        当前调度任务
  // callbackPriority    当前调度优先级
  // context             根上下文
  // pendingContext      待更新上下文
  // hydrate 信息        服务端渲染水合相关
  // 错误处理回调        onCaughtError / onRecoverableError 等
  // 缓存信息            cache / pooledCache
}

export function createFiberRoot(containerInfo) {
  const root = new FiberRootNode(containerInfo);
  const uninitializedFiber = createHostRootFiber();
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;
  initialUpdateQueue(uninitializedFiber);
  return root;
}
