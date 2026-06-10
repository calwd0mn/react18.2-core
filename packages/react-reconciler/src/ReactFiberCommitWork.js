import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { MutationMask, Placement } from "./ReactFiberFlags";
import {
  appendInitialChild,
  insertBefore,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";

function recursivelyTraverseMutationEffects(root, rootFiber) {
  if (rootFiber.subtreeFlags & MutationMask) {
    let child = rootFiber.child;
    while (child !== null) {
      {
        commitMutationEffectsOnFiber(child, root);
        child = child.sibling;
      }
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  if (flags & Placement) {
    // placement
    commitPlacement(finishedWork);
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
  return null;
}

// 找HostSibling,后续update等其他Effect也需要用到这个函数
function getHostSibling(fiber) {
  let node = fiber;
  sibling: while (true) {
    // 没兄弟，往回走
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    // 有兄弟，找兄弟
    node = node.sibling;
    // 找到Host节点
    while (node.tag !== HostComponent && node.tag !== HostText) {
      // 如果有Placement标记，说明这个节点还没有挂载到DOM上，不是我们要找的兄弟节点，继续往下找
      if (node.flags & Placement) {
        continue sibling;
      } else {
        node = node.child;
      }
      return node;
    }
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNode(node, before, parent) {
  const { tag } = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const { stateNode } = node;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendInitialChild(parent, stateNode);
    }
  } else {
    const { child } = node;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let { sibling } = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function commitPlacement(finishedWork) {
  // 找到可挂载的Host DOM节点
  const parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostComponent: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
    }
  }
}

export function commitMutationEffectsOnFiber(finishedWork, root) {
  switch (finishedWork.tag) {
    case HostComponent: {
      // 递归执行子节点的副作用
    }
    case HostText: {
      // 递归执行子节点的副作用
      recursivelyTraverseMutationEffects(finishedWork, root);
      commitReconciliationEffects(finishedWork);
      break;
    }
    case HostRoot: {
      // 递归执行子节点的副作用
    }
  }
}
