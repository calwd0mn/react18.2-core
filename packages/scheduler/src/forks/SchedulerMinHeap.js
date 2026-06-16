export function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  shiftUp(heap, node, index);
}

export function peek(heap) {
  return heap.length === 0 ? null : heap[0];
}

export function pop(heap) {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0];
  const last = heap.pop();
  if (last !== first) {
    heap[0] = last;
    shiftDown(heap, last, 0);
  }
  return first;
}

function shiftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    // 子节点优先级高于父节点
    if (compare(parent, node) > 0) {
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      break;
    }
  }
  heap[index] = node;
}

function shiftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index << 1) + 1;
    const rightIndex = leftIndex + 1;
    const left = heap[leftIndex];
    const right = heap[rightIndex];
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      return;
    }
  }
}

// >0 a优先级低于b
// <0 a优先级高于b
function compare(a, b) {
  // sortIndex是任务的到期时间(该任务允许执行的时间段的结束时间)，到期时间越早优先级越高
  const diff = a.sortIndex - b.sortIndex;
  // id是创建任务的自增索引
  return diff !== 0 ? diff : a.id - b.id;
}
