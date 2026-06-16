import { allowConcurrentByDefault } from "shared/ReactFeatureFlags.js";

/** 总车道数量 */
export const TotalLanes = 31;
/** 无车道 */
export const NoLanes = 0b0000000000000000000000000000000;
/** 无车道 */
export const NoLane = 0b0000000000000000000000000000000;
/** 同步车道 */
export const SyncLane = 0b0000000000000000000000000000001;
/** 输入连续水合车道 */
export const InputContinuousHydrationLane = 0b0000000000000000000000000000010;
/** 输入连续车道 */
export const InputContinuousLane = 0b0000000000000000000000000000100;
/** 默认水合车道 */
export const DefaultHydrationLane = 0b0000000000000000000000000001000;
/** 默认车道 */
export const DefaultLane = 0b0000000000000000000000000010000;
/** 选择水合车道 */
export const SelectHydrationLane = 0b0001000000000000000000000000000;
/** 空闲水合车道 */
export const IdleHydrationLane = 0b0010000000000000000000000000000;
/** 空闲车道 */
export const IdleLane = 0b0100000000000000000000000000000;
/** 离屏车道 */
export const OffscreenLane = 0b1000000000000000000000000000000;
const NonIdleLanes = 0b00011111111111111111111111111111111;

export function markRootUpdated(root, updateLane) {
  root.pendingLanes |= updateLane;
}

export function markRootFinished(root, remainingLanes) {
  root.pendingLanes = remainingLanes;
}

export function getNextLanes(root) {
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLane) {
    return NoLane;
  }
  const nextLanes = getHighestPriorityLanes(pendingLanes);
  return nextLanes;
}

export function getHighestPriorityLanes(lanes) {
  return getHighestPriorityLane(lanes);
}

export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}

export function includesNonIdleWork(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes;
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}

export function mergeLanes(a, b) {
  return a | b;
}

export function includesBlockingLane(lanes) {
  if (allowConcurrentByDefault) {
    return false;
  }
  const SyncDefaultLanes = InputContinuousLane | DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLanes;
}
