---
layout: draft
title: "架构篇之render阶段"
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
// performSyncWorkOnRoot会调用该方法
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// performConcurrentWorkOnRoot会调用该方法
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

#### beginWork

深度优先遍历

##### 递阶段 mount 的过程

首屏渲染 beginWork 会创建 fiber 节点

##### 归阶段 mount 的过程

completeWork

##### 递阶段 update 的过程

##### 归阶段 update 的过程
