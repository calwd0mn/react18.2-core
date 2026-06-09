export const FunctionComponent = 0;// 函数组件
export const ClassComponent = 1;
export const IndeterminateComponent = 2;// 不确定组件，函数组件和类组件都可以
export const HostRoot = 3;// 表示宿主环境下的根节点=>RootFiber
export const HostComponent = 5;// 表示宿主环境下的原生组件=>HostComponentFiber 比如div span p等
export const HostText = 6;