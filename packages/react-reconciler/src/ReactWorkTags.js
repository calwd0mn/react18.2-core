export const FunctionComponent = 0;// 函数组件
export const ClassComponent = 1;
export const IndeterminateComponent = 2;// 不确定组件，函数组件和类组件都可以,在React中优先当做函数组件处理，如果函数组件执行后返回了一个类组件，就变成类组件
export const HostRoot = 3;// 表示宿主环境下的根节点=>RootFiber
export const HostComponent = 5;// 表示宿主环境下的原生组件=>HostComponentFiber 比如div span p等
export const HostText = 6;// 其他类型还有Fragment、ContextProvider、ContextConsumer等等，这里不一一列举了