---
layout: draft
title: "react源码-架构篇之 render 阶段"
date: 2022-06-04 16:52
comments: true
tags:
  - react
  - 源码
---

> 莫笑少年江湖梦，谁不年少梦江湖。曾经年少立志三千里，如今踌躇百步无寸功。懵懂半生，庸碌尘世中。转眼高堂皆白发，儿女蹒跚学堂中。碎银几两催人老，心仍少。皱纹却上眉目中，浮生醉酒回梦里。青春人依旧，只叹时光太匆匆。

<!-- more -->

结尾处我理解的有更详细的流程梳理，可以先看，熟悉大概，也可以看到结尾，整合一下混乱的思维

#### 流程概览

render 阶段开始于 performSyncWorkOnRoot 或 performConcurrentWorkOnRoot 方法的调用。这取决于本次更新是同步更新还是异步更新

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

- current：当前组件对应的 Fiber 节点在上一次更新时的 Fiber 节点，即 workInProgress.alternate,也就是对应的 currecntFiber 的节点
- workInProgress：当前组件对应的 Fiber 节点
- renderLanes：优先级相关

由于双缓存机制，由于 mount 时不存在上一次对应的 fiber 节点，所以此时 currect 指向 null，而 update 阶段存在对应 Fiber 节点，所以可以通过 current === null 判断此时是 mount 阶段还是 update 阶段

因此 beginWork 分为两个部分

- `update`时: 在满足一定条件时可以复用 current 节点，这样就能克隆 current.child 作为 workInProgress.child，而不需要新建 workInProgress.child
- `mount`时: 根据 fiber.tag 不同，创建不同类型的子 Fiber 节点

深度优先遍历

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

可以看到，当 `current!== null` 此时，进入 update 中，当满足两个条件就会 `didReceiveUpdate === false` 此时返回克隆的 current.child 就可以了，即可以复用上一次更新的节点

- oldProps === newProps && workInProgress.type === current.type: props 与 fiber.type 不变
- !includesSomeLane(renderLanes, updateLanes): 当前 Fiber 节点优先级不够

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
// effectTag
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

> 还需要提一点的是，一个 FunctionComponent 含有 useEffect 或 useLayoutEffect，他对应的 Fiber 节点也会被赋值 effectTag。

#### completeWork

completeWork 也是针对不同 fiber.tag 调用不同的处理逻辑

```ts
function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      return null;
    case ClassComponent: {
      // ...省略
      return null;
    }
    case HostRoot: {
      // ...省略
      updateHostContainer(workInProgress);
      return null;
    }
    // 原生DOM组件对应的Fiber节点
    case HostComponent: {
      // ...省略
      return null;
    }
  // ...省略
```

##### HostComponent

```js
case HostComponent: {
  popHostContext(workInProgress);
  const rootContainerInstance = getRootHostContainer();
  const type = workInProgress.type;

  if (current !== null && workInProgress.stateNode != null) {
    // update的情况
    // ...省略
  } else {
    // mount的情况
    // ...省略
  }
  return null;
}
```

也是根据 current === null ?判断是 mount 还是 update。但是同时针对 HostComponent，判断 update 时我们还需要考虑 workInProgress.stateNode != null ?（即该 Fiber 节点是否存在对应的 DOM 节点）

##### 归阶段 update 的过程

当 update 时，Fiber 节点已经存在对应 DOM 节点，所以不需要生成 DOM 节点。需要做的主要是处理 props

```js
if (current !== null && workInProgress.stateNode != null) {
  // update的情况
  updateHostComponent(
    current,
    workInProgress,
    type,
    newProps,
    rootContainerInstance
  );
}
```

主要是调用 updateHostComponent 函数
在 updateHostComponent 内部，被处理完的 props 会被赋值给 workInProgress.updateQueue，并最终会在 commit 阶段被渲染在页面上。

##### 归阶段 mount 的过程

- 为 Fiber 节点生成对应的 DOM 节点
- 将子孙 DOM 节点插入刚生成的 DOM 节点中
- 与 update 逻辑中的 updateHostComponent 类似的处理 props 的过程

```js
const currentHostContext = getHostContext();
// 为fiber创建对应DOM节点
const instance = createInstance(
  type,
  newProps,
  rootContainerInstance,
  currentHostContext,
  workInProgress
);
// 将子孙DOM节点插入刚生成的DOM节点中
appendAllChildren(instance, workInProgress, false, false);
// DOM节点赋值给fiber.stateNode
workInProgress.stateNode = instance;

// 与update逻辑中的updateHostComponent类似的处理props的过程
if (
  finalizeInitialChildren(
    instance,
    type,
    newProps,
    rootContainerInstance,
    currentHostContext
  )
) {
  markUpdate(workInProgress);
}
```

##### effectList

commit 阶段需要找到所有有 effectTag 的 Fiber 节点并依次执行 effectTag 对应操作
在 commit 阶段不需要再遍历一遍了， completeWork 的上层函数 completeUnitOfWork 中，每个执行完 completeWork 且存在 effectTag 的 Fiber 节点会被保存在一条被称为 effectList 的单向链表中
effectList 中第一个 Fiber 节点保存在 fiber.firstEffect，最后一个元素保存在 fiber.lastEffect。
类似 appendAllChildren，在“归”阶段，所有有 effectTag 的 Fiber 节点都会被追加在 effectList 中，最终形成一条以 rootFiber.firstEffect 为起点的单向链表

#### 重重重重重点，梳理流程

> - beginWork mount：根据 fiber.tag 的不同，创建不同的 fiber 节点，执行 mountChildFibers（生成新的子 Fiber 节点并赋值给 workInProgress.child）这里所有节点不会存在 effectTag
> - beginWork update：执行 diff 算法，满足一定条件时可以复用 current 节点，使用 reconcileChildFibers 生成新的子 Fiber 节点并赋值给 workInProgress.child）但是这里会为生成的 Fiber 节点带上 effectTag 属性
>   原生 DOM：
> - completeWork mount：为 Fiber 节点生成对应的 DOM 节点，将子孙 DOM 节点插入刚生成的 DOM 节点中，处理 props，
>   其中存在 appendAllChildren 方法，由于 completeWork 属于“归”阶段调用的函数，每次调用 appendAllChildren 时都会将已生成的子孙 DOM 节点插入当前生成的 DOM 节点下。那么当“归”到 rootFiber 时，我们已经有一个构建好的离屏 DOM 树
> - completeWork update：主要是处理 props，比如：onClick、onChange 等回调函数的注册，被处理完的 props 会被赋值给 workInProgress.updateQueue，并最终会在 commit 阶段被渲染在页面上。

> - 在“归”阶段，所有有 effectTag 的 Fiber 节点都会被追加在 effectList 中，最终形成一条以 rootFiber.firstEffect 为起点的单向链表。（就是发生更改的一个链表）
> - completeWork mount 中 appendAllChildren 作用：要通知 Renderer 将 Fiber 节点对应的 DOM 节点插入页面中，mount 阶段 fiber 节点没有 effectTag 属性，每个都更新？
> - 假设 mountChildFibers 也会赋值 effectTag，那么可以预见 mount 时整棵 Fiber 树所有节点都会有 Placement effectTag。那么 commit 阶段在执行 DOM 操作时每个节点都会执行一次插入操作，这样大量的 DOM 操作是极低效的。
> - 为了解决这个问题，在 mount 时只有 rootFiber 会赋值 Placement effectTag，在 commit 阶段只会执行一次插入操作。

有问题，可以评论一下，互相学习

#### 结尾

至此，render 阶段全部工作完成。在 performSyncWorkOnRoot 函数中 fiberRootNode 被传递给 commitRoot 方法，开启 commit 阶段工作流程。

本文主要记录我在学习卡颂大佬的 React 技术揭秘一文的所得: [React 技术揭秘](https://react.iamkasong.com/)
