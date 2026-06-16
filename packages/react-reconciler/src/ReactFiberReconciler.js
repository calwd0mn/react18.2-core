import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import { requestUpdateLane, scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

export function createContainer(containerInfo) {
  return createFiberRoot(containerInfo);
}

/**
 * @param {ReactElement} element
 * @param {FiberRoot} container
 */
export function updateContainer(element, container) {
  // 拿到当前的fiber树
  const current = container.current;
  const lane = requestUpdateLane(current);
  const update = createUpdate(lane);
  update.payload = { element };
  const root = enqueueUpdate(current, update, lane);
  scheduleUpdateOnFiber(root, current, lane);
}
