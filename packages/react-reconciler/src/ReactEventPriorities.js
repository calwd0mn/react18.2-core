import {
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  IdleLane,
  NoLane,
  includesNonIdleWork,
  getHighestPriorityLane,
} from "./ReactFiberLane";

/** 离散事件优先级,与SyncLane相关联 */
export const DiscreteEventPriority = SyncLane;
/** 连续事件优先级,与InputContinuousLane相关联 */
export const ContinuousEventPriority = InputContinuousLane;
/** 默认事件优先级,与DefaultLane相关联 */
export const DefaultEventPriority = DefaultLane;
/** 空闲事件优先级,与IdleLane相关联 */
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane; // 当前更新优先级,初始值为 NoLane,表示没有优先级

export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority;
}

// 事件优先级是否高于车道优先级
export function isHigherEventPriority(eventPriority, lane) {
  return eventPriority !== NoLane && eventPriority < lane;
}

export function lanesToEventPriority(lanes) {
  let lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}
