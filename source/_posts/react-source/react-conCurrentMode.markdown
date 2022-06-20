---
layout: post
title: "react 源码-conCurrent Mode"
date: 2022-06-27 20:00
comments: true
tags:
  - react
  - 源码
---

> 天下只有两种人。比如一串葡萄到手，一种人挑最好的先吃，另一种人把最好的留到最后吃。照例第一种人应该乐观，因为他每吃一颗都是吃剩的葡萄里最好的；第二种人应该悲观，因为他每吃一颗都是吃剩的葡萄里最坏的。不过事实却适得其反，缘故是第二种人还有希望，第一种人只有回忆。
>
> <p align="right">——钱钟书《围城》</p>

<!-- more -->

#### 概览

Concurrent Mode 自底向上都包含哪些组成部分，

##### 底层架构 —— Fiber 架构

使用 Fiber，意义在于他将单个组件作为工作单元，使以组件为粒度的“异步可中断的更新”成为可能。

##### 架构的驱动力 —— Scheduler

使用 Fiber 配合时间切片，就能根据宿主环境性能，为每个工作单元分配一个可运行时间，实现“异步可中断的更新”。

##### 架构运行策略 —— lane 模型

React 可以控制更新在 Fiber 架构中运行/中断/继续运行， 后一次更新打断了前一次更新。这就是优先级的概念：需要一个模型控制不同优先级之间的关系与行为，于是 lane 模型诞生了

##### 上层实现

- batchedUpdates：之前的实现局限很多（脱离当前上下文环境的更新不会被合并）。在 Concurrent Mode 中，是以优先级为依据对更新进行合并的，使用范围更广。
- Suspense：Suspense (opens new window)可以在组件请求数据时展示一个 pending 状态。请求成功后渲染数据。本质上讲 Suspense 内的组件子树比组件树的其他部分拥有更低的优先级。
- useDeferredValue：返回一个延迟响应的值，内部会调用 useState 并触发一次更新，这次更新的优先级很低，但是当超过 timeoutMs（传参）后 useDeferredValue 产生的更新还没进行（由于优先级太低一直被打断），则会再触发一次高优先级更新。

#### Scheduler 时间切片原理

时间切片的本质是模拟实现 requestIdleCallback， requestIdleCallback 是在“浏览器重排/重绘”后如果当前帧还有空余时间时被调用的。

> 一个 task(宏任务) -- 队列中全部 job(微任务) -- requestAnimationFrame -- 浏览器重排/重绘 -- requestIdleCallback

唯一能精准控制调用时机的 API 是 requestAnimationFrame，他能让我们在“浏览器重排/重绘”之前执行 JS。所以在这个阶段执行动画
所以 Scheduler 的时间切片功能是通过 task（宏任务）实现的， 有个 task 比 setTimeout 执行时机更靠前，那就是 MessageChannel。所以 Scheduler 将需要被执行的回调函数作为 MessageChannel 的回调执行。如果当前宿主环境不支持 MessageChannel，则使用 setTimeout。

```js
function workLoopConcurrent() {
  // render阶段，开启Concurrent Mode时，每次遍历前，都会通过Scheduler提供的shouldYield方法判断是否需要中断遍历，使浏览器有时间渲染
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

是否中断的依据，最重要的一点便是每个任务的剩余时间是否用, 在 Schdeduler 中，为任务分配的初始剩余时间为 5ms, 但是随着应用运行，会通过 fps 动态调整分配给任务的可执行时间。

##### 优先级调度

首先 Scheduler 是独立于 React 的包，所以他的优先级也是独立于 React 的优先级的， Scheduler 对外暴露了一个方法 unstable_runWithPriority（接受一个优先级与一个回调函数，在回调函数内部调用获取优先级的方法都会取得第一个参数对应的优先级）

```js
function unstable_runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    // commit阶段的起点commitRoot方法的优先级就是ImmediatePriority，最高优先级，立即执行
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}
```

##### 优先级意义

不同优先级意味着不同时长的任务过期时间， 其中如果一个任务的优先级是 ImmediatePriority，对应 IMMEDIATE_PRIORITY_TIMEOUT 为-1, 则该任务的过期时间比当前时间还短，表示他已经过期了，需要立即被执行。

```js
// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// 重点
var expirationTime = startTime - 1;
```

##### 不同优先级任务的排序

优先级意味着任务的过期时间。又因为任务可以被延迟，所以我们可以将这些任务按是否被延迟分为：

- 未就绪任务： 保存在 timerQueue(未就绪任务队列)
- 已就绪任务： 保存在 taskQueue(已就绪任务队列)

每当有新的未就绪的任务被注册，我们将其插入 timerQueue 并根据开始时间重新排列 timerQueue 中任务的顺序。当 timerQueue 中有任务就绪，即 startTime <= currentTime，我们将其取出并加入 taskQueue。取出 taskQueue 中最早过期的任务并执行他。

Scheduler 使用小顶堆（即每个结点的值都小于或等于其左右孩子结点的值）实现优先级队列，这样时间最小的就会在最顶上,使用 setTimeout 判断是否过期取出

// TODO：这里还不是很懂，先按下不表

> 所以那么当 shouldYield 为 true，以至于 performUnitOfWork 被中断后是如何重新启动的呢？
>
> ```js
> const continuationCallback = callback(didUserCallbackTimeout);
> currentTime = getCurrentTime();
> if (typeof continuationCallback === "function") {
>   // continuationCallback是函数
>   currentTask.callback = continuationCallback;
>   markTaskYield(currentTask, currentTime);
> } else {
>   if (enableProfiling) {
>     markTaskCompleted(currentTask, currentTime);
>     currentTask.isQueued = false;
>   }
>   if (currentTask === peek(taskQueue)) {
>     // 将当前任务清除
>     pop(taskQueue);
>   }
> }
> advanceTimers(currentTime);
> ```
>
> 当注册的回调函数执行后的返回值 continuationCallback 为 function，会将 continuationCallback 作为当前任务的回调函数。如果返回值不是 function，则将当前被执行的任务清除出 taskQueue。所以被中断后将自己返回，方便下一次调用启动

#### lane 模型

Concurrent Mode 开启情况：

- 过期任务或者同步任务使用同步优先级
- 用户交互产生的更新（比如点击事件）使用高优先级
- 网络请求产生的更新使用一般优先级
- Suspense 使用低优先级

所以 React 需要设计一套满足如下需要的优先级机制：

- 可以表示优先级的不同
- 可能同时存在几个同优先级的更新，所以还得能表示批的概念
- 方便进行优先级相关计算

##### lane 的模型

lane 模型使用 31 位的二进制表示，位数越小的优先级越高，某些相邻的位拥有相同优先级。

```js
// 同步占据第一位
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
```

其中有几个变量占用了几个位，这就是批的概念，被称作 lanes（区别于优先级的 lane）,例如：

```js
// “用户交互”触发更新会拥有的优先级范围
const InputDiscreteLanes: Lanes = /*                    */ 0b0000000000000000000000000011000;
// “请求数据返回后触发更新”拥有的优先级范围
export const DefaultLanes: Lanes = /*                   */ 0b0000000000000000000111000000000;
// uspense、useTransition、useDeferredValue拥有的优先级范围
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111110000000000000;
```

> 越低优先级的 lanes 占用的位越多, 原因在于：越低优先级的更新越容易被打断，导致积压下来，所以需要更多的位。相反，最高优的同步更新的 SyncLane 不需要多余的 lanes。

既然 lane 对应了二进制的位，那么优先级相关计算其实就是位运算。使用位运算可以更方便逻辑性计算

#### 异步可中断更新和饥饿问题

饥饿问题：低优先级的任务始终被高优先级的打断，没有机会执行
