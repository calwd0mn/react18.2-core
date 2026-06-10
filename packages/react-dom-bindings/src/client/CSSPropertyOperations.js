export function setValueForStyle(node, styles) {
  const { style } = node;
  for (const styleName in styles) {
    // 非原型链上的属性
    if (styles.hasOwnProperty(styleName)) {
      const styleValue = styles[styleName];
      style[styleName] = styleValue;
    }
  }
}
