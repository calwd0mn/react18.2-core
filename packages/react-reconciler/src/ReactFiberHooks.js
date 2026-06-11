export function renderWithHooks(current, workInProgress,Component, props) {
  // 这里我们直接调用函数组件的函数，获取函数组件的返回值，也就是React元素
  const children = Component(props);
  return children;
}