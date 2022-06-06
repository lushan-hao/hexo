---
layout: post
title: "初学react源码"
date: 2022-05-27 20:00
comments: true
tags:
  - react
  - 源码
---

> 祝在座的各位永远保有士可杀不可辱的底气，不要在三十好几了，还因为能力问题被人骂得目光呆滞、像哈巴狗一样的时候却没有勇气来一句 fuck your money

<!-- more -->

<!--
第一层：掌握术语，基本实现思路
    例如fiber、render、commit
第二层：掌握整体工作流程，局部细节                                   独立的npm包，可以独立的使用
    schedule    调度    更新的优先级排序，高优先级的先进入到render    scheduler
    render      协调    根据更新决定渲染哪些视图                    reconclier                      fiber（操作的是和视图无关的节点）
    commit      渲染    把渲染的视图做改变的操作                    renderer                        浏览器环境： ReactDOM（不同环境操作的不同）
第三层：掌握关键流程细节
    scheduler 小顶堆 浏览器渲染原理
    render 深度优先遍历（dfs） 单向链表
    lane模型  优先级模型  二进制
    Fiber  react自己实现的并发模型
第四层：掌握思想
    classComponent  面向对象
    FunctionComponent   函数式编程

    state -> view  更适合函数式，编译时优化，有束缚
    代数效应：解决纯函数中有副作用问题    hooks只是代数效应在react中的实现
第五层：？


view视图                    软件、应用
    生命周期                           -> 符合人脑认知

hooks                      操作系统

React底层运行流程            硬件



流程：
diapatchAction这个函数，是react中useState中第二个更新数据的方法时 执行的方法
只有在commit阶段才会更新视图
commit阶段是一个同步的方式让视图更新的 -->

本文主要记录我在学习卡颂大佬的 React 技术揭秘一文的所得: [React 技术揭秘](https://react.iamkasong.com/)

#### 设计理念

> React 是用 JavaScript 构建**快速响应**的大型 Web 应用程序的首选方式

既然说 React 是实现快速响应，那就了解一下制约快速响应的因素

- 计算机的计算能力（cpu 瓶颈）
- 网络请求延迟（io 瓶颈）

React 解决方法

##### CPU 瓶颈

在说解决方法之前，说一些浏览器的知识：主流浏览器的刷新频率为 60HZ（可以理解 1000ms 刷新 60 张图片），即 16.7ms 浏览器刷新一次
在这 16.7ms 刷新一次时，浏览器中间执行了的操作：js 脚本，样式布局，样式绘制，当 js 执行时间过长，就没有时间执行样式布局、样式绘制，就会出现卡顿了

React 解决方法：在浏览器每一帧的时间中，预留一些时间给 JS 线程，React 利用这部分时间更新组件（可以看到，在[源码](https://github.com/facebook/react/blob/1fb18e22ae66fdb1dc127347e169e73948778e5a/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L119)中，预留的初始时间是 5ms）。当时间不够时就会渲染 UI，等下一帧再继续执行

> 这种将长任务分拆到每一帧中，像蚂蚁搬家一样一次执行一小段任务的操作，被称为时间切片（time slice）

所以，React 解决 CPU 瓶颈的关键是实现时间切片，而时间切片的关键是：将同步的更新变为可中断的异步更新。

##### IO 瓶颈

是[将人机交互研究的结果整合到真实的 UI 中](https://17.reactjs.org/docs/concurrent-mode-intro.html#putting-research-into-production)

对比 ios 系统中，ios 实现的方法是请求数据时，很短的时间内还是停留在当前页面，如果超过一个时间范围再现实 loading 状态，当时间范围比较短时，并且已经执行完请求，那么将会没有太多的感觉（，当前页面在时间范围内停留了一下）

React 实现了[Suspense](https://17.reactjs.org/docs/concurrent-mode-suspense.html)功能及配套的 hook——[useDeferredValue](https://17.reactjs.org/docs/concurrent-mode-reference.html#usedeferredvalue)。

为了支持这些特性，同样需要将同步的更新变为可中断的异步更新。

##### 设计理念总结

React 为了践行“构建快速响应的大型 Web 应用程序”理念做出的努力。其中的关键是解决 CPU 的瓶颈与 IO 的瓶颈。而落实到实现上，则需要将同步的更新变为可中断的异步更新

#### 架构的演讲史

##### React 老的架构（15）

- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

Reconciler 会做如下工作：
调用函数组件、或 class 组件的 render 方法，将返回的 JSX 转化为虚拟 DOM
将虚拟 DOM 和上次更新时的虚拟 DOM 对比
通过对比找出本次更新中变化的虚拟 DOM
通知 Renderer 将变化的虚拟 DOM 渲染到页面上

Renderer
浏览器环境中负责渲染的是 ReactDOM
在每次更新发生时，Renderer 接到 Reconciler 通知，将变化的组件渲染在当前宿主环境

**React15 的缺点**
在 Reconciler 中，mount 的组件会调用 mountComponent，update 的组件会调用 updateComponent 。这两个方法都会递归更新子组件
由于递归执行，所以更新一旦开始，中途就无法中断。当层级很深时，递归更新时间超过了 16ms，用户交互就会卡顿。
同步更新，没有什么问题 但是为了更快速的响应，中断操作，交给浏览器绘制，就会出现部分还没有执行 diff 算法，导致页面渲染出现问题（同步更新无法执行中断操作）

![更新流程图](https://react.iamkasong.com/img/v15.png)

##### React 新的架构 （16 及以后）

React16 架构可以分为三层：

- Scheduler（调度器）—— 调度任务的优先级，高优任务优先进入 Reconciler
- Reconciler（协调器）—— 负责找出变化的组件
- Renderer（渲染器）—— 负责将变化的组件渲染到页面上

调度器 -> 协调器 -> 渲染器

**Scheduler（调度器）**
Scheduler 是独立于 React 的库，当浏览器有剩余时间时执行，Scheduler 除了在空闲时触发回调的功能外，Scheduler 还提供了多种调度优先级供任务设置

**Reconciler（协调器）**
React15 中 Reconciler 是递归处理虚拟 DOM 的，React16 中更新工作从递归变成了可以中断的循环过程。每次循环都会调用 shouldYield 判断当前是否有剩余时间。

```js
function workLoopConcurrent() {
  // Perform work until Scheduler asks us to yield
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

还有一种情况，那就是如果中断操作时 DOM 渲染不完全：
在 React16 中，Reconciler 与 Renderer 不再是交替工作。当 Scheduler 将任务交给 Reconciler 后，Reconciler 会为变化的虚拟 DOM 打上代表增/删/更新的标记
整个 Scheduler 与 Reconciler 的工作都在内存中进行。只有当所有组件都完成 Reconciler 的工作，才会统一交给 Renderer。

**Renderer（渲染器）**
Renderer 根据 Reconciler 为虚拟 DOM 打的标记，同步执行对应的 DOM 操作。

![更新流程](https://react.iamkasong.com/img/process.png)
由于红框中的工作都在内存中进行，不会更新页面上的 DOM，所以即使反复中断，用户也不会看见更新不完全的 DOM。

##### 流程

调度器优先级排完，进入协调器，这是如果调度器出现优先级更高的更新，就会中断协调器进行的操作，执行更高的更新，然后交给渲染器进行渲染
调度器接收更新操作做，没有更高优先级，交给协调器，协调器创建虚拟 DOM，更新的地方，打上 update 标记，将标记好的虚拟 dom 交给渲染器，渲染器根据 update 标记执行更新 DOM 操作

#### React 协调器的新架构-Fiber

在 react 中践行代数效应，将副作用从函数中抽离 （例如 useState 中，state 是怎么更新不关注，放在 useState 中）
fiber： 纤程 类似于协程，是一种可以进行中断操作的，类似于 generator，generator 是协程，
react 异步可中断更新要求两个特点，一是更新可中断、继续 二是更新拥有不同更新，高优先级可以打断低优先级
为什么 react 需要写 fiber，不使用 generator
generator 足可中断操作，但是不满足第二点，并且 generator 和 async、await 一样存在传染性（即一个 async 函数，调用这个函数的也是 async 函数了）

#### Fiber 架构的心智模型

> 代数效应：将副作用从函数调用中分离， 代数效应能够将副作用从函数逻辑中分离，使函数关注点保持纯粹。

- 代数效应在 React 中的应用
  对于类似 useState、useReducer、useRef 这样的 Hook，我们不需要关注 FunctionComponent 的 state 在 Hook 中是如何保存的，React 会为我们处理

- 代数效应与 Generator
  React 更新一点是将老的同步更新的架构变为异步可中断更新。
  异步可中断更新可以理解为：更新在执行过程中可能会被打断（浏览器时间分片用尽或有更高优任务插队），当可以继续执行时恢复之前执行的中间状态。

react 异步可中断更新要求两个特点，一是更新可中断、继续 二是更新拥有不同更新，高优先级可以打断低优先级
为什么 react 需要写 fiber，不使用 generator
generator 足可中断操作，但是不满足第二点，并且 generator 和 async、await 一样存在传染性（即一个 async 函数，调用这个函数的也是 async 函数了）

##### Fiber

React Fiber 可以理解为：
React 内部实现的一套状态更新机制。支持任务不同优先级，可中断与恢复，并且恢复后可以复用之前的中间状态。
其中每个任务更新单元为 React Element 对应的 Fiber 节点。

#### Fiber 的实现原理

每个 Fiber 节点有个对应的 React element，多个 Fiber 节点连接形成树

作为静态的数据结构来说，每个 Fiber 节点对应一个 React element，保存了该组件的类型（函数组件/类组件/原生组件...）、对应的 DOM 节点等信息。

作为动态的工作单元来说，每个 Fiber 节点保存了本次更新中该组件改变的状态、要执行的工作（需要被删除/被插入页面中/被更新...）。

[这里看这个链接比较清楚,图文并貌](https://react.iamkasong.com/process/fiber.html#fiber%E7%9A%84%E7%BB%93%E6%9E%84)

#### Fiber 架构工作原理

> 双缓存： 在内存中构建并直接替换的技术

React 使用“双缓存”来完成 Fiber 树的构建与替换——对应着 DOM 树的创建与更新
在 React 中最多会同时存在两棵 Fiber 树。当前屏幕上显示内容对应的 Fiber 树称为 current Fiber 树，正在内存中构建的 Fiber 树称为 workInProgress Fiber 树。

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

React 应用的根节点通过使 current 指针在不同 Fiber 树的 rootFiber 间切换来完成 current Fiber 树指向的切换。

每一个 Fiber 节点代表一个组件
Fiber 的连接 FiberChildNode 的 current 指向 RootFiber（每一个 ReactDOM 创建一个 RootFiber） RootFiber 的 child 指向子节点，子节点的 sibling 指向兄弟节点，兄弟节点的 return 指向他的父节点 但是 RootFiber 的 stateNode 指向 FiberChildNode

![react-Fiber](/assets/img/react-fiber.jpg)

使用双缓存的机制 首屏渲染和更新是不太一样的，两棵 Fiber 树，一个 current Fiber 树，一个 workInProgess Fiber 树 两个树节点之间都有 alternate 这个属性连接

- 首屏渲染整体流程，我的理解是，先创建 fiberRootNode（整个应用的根结点）和 rootFiber（通过 render 创建的组件树），fiberRootNode 的 current 指向当前页面的 fiber 树，即 current Fiber 树，
- 然后 render 时，复用 current Fiber（初始化，所以为 kong）创建 workInProgress Fiber，
- commit 阶段将 fiberRootNode 的 current 指针指向 workInProgress Fiber 树使其变为 current Fiber 树
- uodate 时，新一轮的 render，创建一棵新的 workInProgress Fiber 树（可以复用 current Fiber 树对应的节点数据）
- commit 阶段渲染到页面上。渲染完毕后，iberRootNode 的 current 指针指向 workInProgress Fiber 树， workInProgress Fiber 树变为 current Fiber 树

[原文章，看得更清晰](https://react.iamkasong.com/process/doubleBuffer.html#%E5%8F%8C%E7%BC%93%E5%AD%98fiber%E6%A0%91)
