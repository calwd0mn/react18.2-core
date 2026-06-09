export const NoFlags = 0b00000000000000000000000000000000; // 没有任何副作用
export const Placement = 0b00000000000000000000000000000010; // 插入
export const Update = 0b00000000000000000000000000000100; // 删除
export const Deletion = 0b00000000000000000000000000001000; // 代表更新
export const MutationMask = Placement | Update | Deletion; // 代表所有的副作用

// 代表需要执行的副作用
// 二进制位运算，按位与方便计算存在的操作，比如：flags = Placement | Update => flags & Placement => Placement
