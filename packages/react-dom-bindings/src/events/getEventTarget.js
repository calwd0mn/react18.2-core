function getEventTarget(nativeEvent) {
  // 兼容不同浏览器的事件对象,比如 IE 的 event 对象没有 target 属性,而是 srcElement 属性
  let target = nativeEvent.target || nativeEvent.srcElement || window;
  return target;
}

export default getEventTarget;
