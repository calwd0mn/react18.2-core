import { HostComponent, HostText, HostRoot } from "./ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";
import {
  createInstance,
  appendInitialChild,
  finalizeInitialChildren,
  createTextInstance,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";

// 该函数只负责有真实DOM的节点的挂载，其他的比如说函数组件、类组件等等是没有真实DOM的不归他管
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node !== null) {
    // 1. 原生直接追加
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // 2.非原生且有子节点，不能直接挂载，需要继续往下找，直到找到原生节点
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }
    // 4. node为真实节点，且没有子节点，一直想上找找到有兄弟节点的父节点，然后走向其兄弟节点
    while (node.sibling === null) {
      // 如果找到了根节点还没有找到，说明没有兄弟节点了，直接返回
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }
    // 3.不能直接挂载且子节点为空，向兄弟节点寻找
    node = node.sibling;
  }
}

export function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      bubbleProperties(workInProgress);
      break;
    case HostComponent:
      const { type } = workInProgress;
      const instance = createInstance(type, newProps, workInProgress);
      appendAllChildren(instance, workInProgress);
      workInProgress.stateNode = instance;
      finalizeInitialChildren(instance, type, newProps); // 挂属性
      bubbleProperties(workInProgress);
      break;
    case HostText:
      const newText = newProps;
      workInProgress.stateNode = createTextInstance(newText);
      bubbleProperties(workInProgress);
      break;
    default:
      bubbleProperties(workInProgress);
      break;
  }
}

function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    // |=有1就是1，&=有0就是0
    // 把子节点的flags和subtreeFlags都冒泡到父节点上，这样父节点就可以知道它的子树中有哪些副作用需要处理
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags = subtreeFlags;
}
