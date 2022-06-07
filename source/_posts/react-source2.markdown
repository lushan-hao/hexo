---
layout: draft
title: "架构篇之 render 阶段"
date: 2022-04-17 16:52
comments: true
tags:
  - react
  - 源码
  - 随笔
---

> 莫笑少年江湖梦，谁不年少梦江湖。曾经年少立志三千里，如今踌躇百步无寸功。懵懂半生，庸碌尘世中。转眼高堂皆白发，儿女蹒跚学堂中。碎银几两催人老，心仍少。皱纹却上眉目中，浮生醉酒回梦里。青春人依旧，只叹时光太匆匆。

<!-- more -->

#### 流程概览

render 阶段开始于 performSyncWorkOnRoot 或 performConcurrentWorkOnRoot 方法的调用。这取决于本次更新是同步更新还是异步更新。

```js
// performSyncWorkOnRoot会调用该方法  同步
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// performConcurrentWorkOnRoot会调用该方法  异步
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

这个两个函数的区别就是是否调用了 shouldYield，如果当前浏览器帧没有剩余时间，shouldYield 会中止循环，直到浏览器有空闲时间后再继续遍历。

- workInProgress 代表当前已创建的 workInProgress fiber。
- performUnitOfWork 方法会创建下一个 Fiber 节点并赋值给 workInProgress，并将 workInProgress 与已创建的 Fiber 节点连接起来构成 Fiber 树。

performUnitOfWork 的工作可以分为两部分：“递”和“归”

##### 递阶段

首先从 rootFiber 开始向下深度优先遍历。为遍历到的每个 Fiber 节点调用 beginWork 方法。

该方法会根据传入的 Fiber 节点创建子 Fiber 节点，并将这两个 Fiber 节点连接起来。

当遍历到叶子节点（即没有子组件的组件）时就会进入“归”阶段

##### 归阶段

在“归”阶段会调用 completeWork (opens new window)处理 Fiber 节点。

当某个 Fiber 节点执行完 completeWork（注意，是该节点的 completeWork 执行完，才会走到其兄弟节点），如果其存在兄弟 Fiber 节点（即 fiber.sibling !== null），会进入其兄弟 Fiber 的“递”阶段。

如果不存在兄弟 Fiber，会进入父级 Fiber 的“归”阶段。

“递”和“归”阶段会交错执行直到“归”到 rootFiber。至此，render 阶段的工作就结束了。

[流程图上，卡老师这个例子形象一点](https://react.iamkasong.com/process/reconciler.html#%E4%BE%8B%E5%AD%90)

**将 performUnitOfWork 转化为递归版本**

```js
function performUnitOfWork(fiber) {
  // 执行beginWork

  if (fiber.child) {
    performUnitOfWork(fiber.child);
  }

  // 执行completeWork

  if (fiber.sibling) {
    performUnitOfWork(fiber.sibling);
  }
}
```

#### beginWork

[源码位置](https://github.com/facebook/react/blob/1fb18e22ae66fdb1dc127347e169e73948778e5a/packages/react-reconciler/src/ReactFiberBeginWork.new.js#L3075)

beginWork 函数作用： 传入当前 Fiber 节点，创建子 Fiber 节点

```ts
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes
): Fiber | null {
  // ...
}
```

- current：当前组件对应的 Fiber 节点在上一次更新时的 Fiber 节点，即 workInProgress.alternate
- workInProgress：当前组件对应的 Fiber 节点
- renderLanes：优先级相关

由于双缓存机制，由于 mount 时不存在上一次对应的 fiber 节点，所以此时 currect 指向 null，而 update 阶段存在对应 Fiber 节点，所以可以通过 current === null 判断此时是 mount 阶段还是 update 阶段

因此 beginWork 分为两个部分

- `update`时: 在满足一定条件时可以复用 current 节点，这样就能克隆 current.child 作为 workInProgress.child，而不需要新建 workInProgress.child
- `mount`时: 根据 fiber.tag 不同，创建不同类型的子 Fiber 节点

深度优先遍历

##### 递阶段 mount 的过程

这里很简单: 根据 fiber.tag 不同，进入不同类型 Fiber 的创建逻辑

新建子 Fiber

```js
// mount时：根据tag不同，创建不同的Fiber节点
switch (workInProgress.tag) {
  case IndeterminateComponent:
  // ...省略
  case LazyComponent:
  // ...省略
  case FunctionComponent:
  // ...省略
  case ClassComponent:
  // ...省略
  case HostRoot:
  // ...省略
  case HostComponent:
  // ...省略
  case HostText:
  // ...省略
  // ...省略其他类型
}
```

每个里面都执行了对应的函数，点击进入到函数内部，发现最后大部分都会调用一个 `reconcileChildren` 函数

**reconcileChildren**

- 对于 mount 的组件，他会创建新的子 Fiber 节点

- 对于 update 的组件，他会将当前组件与该组件在上次更新时对应的 Fiber 节点比较（也就是俗称的 Diff 算法），将比较的结果生成新 Fiber 节点

```ts
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes
) {
  if (current === null) {
    // If this is a fresh new component that hasn't been rendered yet, we
    // won't update its child set by applying minimal side-effects. Instead,
    // we will add them all to the child before it gets rendered. That means
    // we can optimize this reconciliation pass by not tracking side-effects.
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes
    );
  } else {
    // If the current child is the same as the work in progress, it means that
    // we haven't yet started any work on these children. Therefore, we use
    // the clone algorithm to create a copy of all the current children.

    // If we had any progressed work already, that is invalid at this point so
    // let's throw it out.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}
```

> 值得一提的是，mountChildFibers 与 reconcileChildFibers 这两个方法的逻辑基本一致。唯一的区别是：reconcileChildFibers 会为生成的 Fiber 节点带上 effectTag 属性，而 mountChildFibers 不会。

**effectTag**
render 阶段的工作是在内存中进行，当工作结束后会通知 Renderer 需要执行的 DOM 操作。要执行 DOM 操作的具体类型就保存在 fiber.effectTag 中。

```js
// DOM需要插入到页面中
export const Placement = /*                */ 0b00000000000010;
// DOM需要更新
export const Update = /*                   */ 0b00000000000100;
// DOM需要插入到页面中并更新
export const PlacementAndUpdate = /*       */ 0b00000000000110;
// DOM需要删除
export const Deletion = /*                 */ 0b00000000001000;
```

> 在 mount 时只有 rootFiber 会赋值 Placement effectTag，在 commit 阶段只会执行一次插入操作。

##### 递阶段 update 的过程

```js
if (current !== null) {
  const oldProps = current.memoizedProps;
  const newProps = workInProgress.pendingProps;

  if (
    oldProps !== newProps ||
    hasLegacyContextChanged() ||
    (__DEV__ ? workInProgress.type !== current.type : false)
  ) {
    didReceiveUpdate = true;
  } else if (!includesSomeLane(renderLanes, updateLanes)) {
    didReceiveUpdate = false;
    switch (
      workInProgress.tag
      // 省略处理
    ) {
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  } else {
    didReceiveUpdate = false;
  }
} else {
  didReceiveUpdate = false;
}
```

可以看到，当 `current!== null` 此时，进入 update 中，当满足两个条件就会 `didReceiveUpdate === false` 此时返回克隆的 current.child 就可以了

- oldProps === newProps && workInProgress.type === current.type: props 与 fiber.type 不变
- !includesSomeLane(renderLanes, updateLanes): 当前 Fiber 节点优先级不够

##### 归阶段 mount 的过程

completeWork

##### 归阶段 update 的过程
