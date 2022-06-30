---
layout: draft
title: "react源码-diff算法流程概览"
date: 2022-06-09 16:52
comments: true
tags:
  - react
  - 源码
---

> 吃饭果然是可以让人心情变好。也许是因为胃部距离心脏很近，当胃被撑得圆滚滚的时候，挤占了心脏的空间，所以心里不再那么空落落。

<!-- more -->

首先，需要明确 diff 算法发生在 beginWork 中的需要 uodate 的组件

> 1. current Fiber： 如果该 DOM 节点已在页面中，current Fiber 代表该 DOM 节点对应的 Fiber 节点
> 2. workInProgress Fiber： 如果该 DOM 节点将在本次更新中渲染到页面中，workInProgress Fiber 代表该 DOM 节点对应的 Fiber 节点。
> 3. DOM 节点本身。
> 4. JSX 对象。即 ClassComponent 的 render 方法的返回结果，或 FunctionComponent 的调用结果。JSX 对象中包含描述 DOM 节点的信息。
>    Diff 算法的本质是对比 1 和 4，生成 2。

换言之，根据当前页面渲染的该 DOM 对应的 Fiber 和 jsx 对象做对比，生成将要更新的、在内存中生成的 Fiber

#### Diff 的瓶颈以及 React 如何应对

由于 Diff 操作本身也会带来性能损耗，React 文档中提到，即使在最前沿的算法中，将前后两棵树完全比对的算法的复杂程度为 O(n 3 )，其中 n 是树中元素的数量。
所以 React 的 diff 有三个限制：

- 只对同级元素进行 Diff。如果一个 DOM 节点在前后两次更新中跨越了层级，那么 React 不会尝试复用他。
- 两个不同类型的元素会产生出不同的树。如果元素由 div 变为 p，React 会销毁 div 及其子孙节点，并新建 p 及其子孙节点。
- 开发者可以通过 key prop 来暗示哪些子元素在不同的渲染下能保持稳定

由于 key 的存在，如果出现位置顺序变换等，就不会每个重新销毁渲染，而是保留交换顺序进行复用

#### Diff 是如何实现的

入口函数: reconcileChildFibers()

```ts
// 根据newChild类型选择不同diff函数处理
function reconcileChildFibers(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChild: any
): Fiber | null {
  const isObject = typeof newChild === "object" && newChild !== null;
  if (isObject) {
    // object类型，可能是 REACT_ELEMENT_TYPE 或 REACT_PORTAL_TYPE
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE:
      // 调用 reconcileSingleElement 处理
      // // ...省略其他case
    }
  }
  if (typeof newChild === "string" || typeof newChild === "number") {
    // 调用 reconcileSingleTextNode 处理
    // ...省略
  }
  if (isArray(newChild)) {
    // 调用 reconcileChildrenArray 处理
    // ...省略
  }
  // 一些其他情况调用处理函数
  // ...省略
  // 以上都没有命中，删除节点
  return deleteRemainingChildren(returnFiber, currentFirstChild);
}
```

可以从同级的节点数量将 Diff 分为两类：

1.当 newChild 类型为 object、number、string，代表同级只有一个节点, 调用 reconcileSingleElement 或 reconcileSingleTextNode 处理

2.当 newChild 类型为 Array，同级有多个节点, 调用 reconcileChildrenArray 处理

#### 单一节点的 diff

reconcileSingleElement（）函数流程如下

![diff-reconcileSingleElement-1](/assets/blogImg/react-source/diff-reconcileSingleElement-1.png)

怎么判断是否可以复用呢？React 通过先判断 key 是否相同，如果 key 相同则判断 type 是否相同，只有都相同时一个 DOM 节点才能复用。

```js
function reconcileSingleElement(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  element: ReactElement
): Fiber {
  const key = element.key;
  let child = currentFirstChild;
  // 首先判断是否存在对应DOM节点
  while (child !== null) {
    // 上一次更新存在DOM节点，接下来判断是否可复用
    // 首先比较key是否相同
    if (child.key === key) {
      // key相同，接下来比较type是否相同
      switch (child.tag) {
        // ...省略case
        default: {
          if (child.elementType === element.type) {
            // type相同则表示可以复用
            // 返回复用的fiber
            return existing;
          }
          // type不同则跳出switch
          break;
        }
      }
      // 代码执行到这里代表：key相同但是type不同
      // 将该fiber及其兄弟fiber标记为删除
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      // key不同，将该fiber标记为删除
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }
  // 创建新Fiber，并返回 ...省略
}
```

有个细节需要关注下：

- 当 child !== null 且 key 相同且 type 不同时执行 deleteRemainingChildren 将 child 及其兄弟 fiber 都标记删除。
- 当 child !== null 且 key 不同时仅将 child 标记删除。

> 这是因为，如果之前存在一组节点，现在替换成单一的节点，遍历原先的一组节点，先判断 key 是否相等，如果不想等，那么删除该节点即可，继续遍历改组下的其他节点，如果想等，代表此时已经找到，如果 type 仍然不相等，那么改组节点全部删除即可，后续不用再寻找了

#### 多节点的 diff

这里使用 reconcileChildrenArray 函数进行处理

更新前多个节点，更新后多个节点，会出现一下三种情况之一或组合

- 节点更新
- 节点新增或减少
- 节点位置变化

##### diff 思路

Diff 算法的整体逻辑会经历两轮遍历：

1. 第一轮遍历：处理更新的节点。
2. 第二轮遍历：处理剩下的不属于更新的节点

> 在我们做数组相关的算法题时，经常使用双指针从数组头和尾同时遍历以提高效率，但是这里却不行。
> 虽然本次更新的 JSX 对象 newChildren 为数组形式，但是和 newChildren 中每个组件进行比较的是 current fiber，同级的 Fiber 节点是由 sibling 指针链接形成的单链表，即不支持双指针遍历。
> 即 newChildren[0]与 fiber 比较，newChildren[1]与 fiber.sibling 比较。
> 所以无法使用双指针优化。

**第一轮遍历**

> 1.let i = 0，遍历 newChildren，将 newChildren[i]与 oldFiber 比较，判断 DOM 节点是否可复用。  
> 2.如果可复用，i++，继续比较 newChildren[i]与 oldFiber.sibling，可以复用则继续遍历。  
> 3.如果不可复用，分两种情况：
>
> - key 不同导致不可复用，立即跳出整个遍历，第一轮遍历结束。
> - key 相同 type 不同导致不可复用，会将 oldFiber 标记为 DELETION，并继续遍历
>
>   4.如果 newChildren 遍历完（即 i === newChildren.length - 1）或者 oldFiber 遍历完（即 oldFiber.sibling === null），跳出遍历，第一轮遍历结束。

**第二轮遍历**

此时，第一轮结束遍历后会出现四种情况

- newChildren 与 oldFiber 同时遍历完： 那就是最理想的情况：只需在第一轮遍历进行组件更新 (opens new window)。此时 Diff 结束。
- newChildren 没遍历完，oldFiber 遍历完： 此时所有已有节点都利用了，那么遍历剩余 newChildren，workInProgress fiber 依次标记 Placement（添加）即可
- newChildren 遍历完，oldFiber 没遍历完： 意味着本次更新比之前的节点数量少，有节点被删除了。所以需要遍历剩下的 oldFiber，依次标记 Deletion。
- newChildren 与 oldFiber 都没遍历完： 这意味着有节点在这次更新中改变了位置。

着重说一下第四种情况，此时索引位置发生了改变，我们需要使用 key

```js
const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
```

接下来遍历剩余的 newChildren，通过 newChildren[i].key 就能在 existingChildren 中找到 key 相同的 oldFiber

**标记节点是否移动**

```text
我们的参照物是：最后一个可复用的节点在oldFiber中的位置索引（用变量lastPlacedIndex表示）。

由于本次更新中节点是按newChildren的顺序排列。在遍历newChildren过程中，每个遍历到的可复用节点一定是当前遍历到的所有可复用节点中最靠右的那个，即一定在lastPlacedIndex对应的可复用的节点在本次更新中位置的后面。

那么我们只需要比较遍历到的可复用节点在上次更新时是否也在lastPlacedIndex对应的oldFiber后面，就能知道两次更新中这两个节点的相对位置改变没有。

我们用变量oldIndex表示遍历到的可复用节点在oldFiber中的位置索引。如果oldIndex < lastPlacedIndex，代表本次更新该节点需要向右移动。

lastPlacedIndex初始为0，每遍历一个可复用的节点，如果oldIndex >= lastPlacedIndex，则lastPlacedIndex = oldIndex。
```

上面总结来说就是第一轮遍历得到 newChildren 和 oldFiber，此时都存在，说明有位置发生了改变，接下来
lastPlacedIndex = 0，
将剩余 oldFiber 保存为 map， 继续遍历剩余 newChildren，拿到 newChildren 第一个元素的 key 值，在 map 表里寻找赋值给 oldIndex，
如果 oldIndex >= lastPlacedIndex 代表该可复用节点不需要移动
并将 lastPlacedIndex = oldIndex;
如果 oldIndex < lastplacedIndex 该可复用节点之前插入的位置索引小于这次更新需要插入的位置索引，代表该节点需要向右移动
这样的话就会找到移动的点，移动到相应位置，而他之后的点顺序不需要发生改变

> 注意，这样会出现一个问题，即 abcd 变为 dabc，那么 React 会保持 d 不变，将 acb 移动到最后， 所以说考虑性能，我们要尽量减少将节点从后面移动到前面的操作

[卡老师这两个 demo 看下去就会很清晰的明白了](https://react.iamkasong.com/diff/multi.html#demo1)
