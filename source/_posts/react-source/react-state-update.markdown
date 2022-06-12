---
layout: post
title: "react源码-react状态更新"
date: 2022-06-24 20:00
comments: true
tags:
  - react
  - 源码
---

> 人生最大的乐趣，在于答案没有正式揭晓前，什么都是可能的。

<!-- more -->

#### 流程

梳理一下目前已知流程

> 触发状态更新 -> render 阶段（`performSyncWorkOnRoot` 或 `performConcurrentWorkOnRoot`） -> commit 阶段（`commitRoot`）

##### 创建 update 对象

在 React 中，有如下几种方法会触发状态的更新：

- ReactDOM.render
- this.setState
- this.forceUpdate
- useState
- useReducer
  那么怎么做到全部触发状态更新：每次状态更新都会创建一个保存更新状态相关内容的对象，我们叫他 Update。在 render 阶段的 beginWork 中会根据 Update 计算新的 state

##### 从 fiber 到 root

现在触发状态更新的 fiber 上已经包含 Update 对象，render 阶段是从 rootFiber 开始向下遍历。那么如何从触发状态更新的 fiber 得到 rootFiber 呢？调用 markUpdateLaneFromFiberToRoot 方法。

> markUpdateLaneFromFiberToRoot: 该方法做的工作可以概括为：从触发状态更新的 fiber 一直向上遍历到 rootFiber，并返回 rootFiber

##### 调度更新

现在我们拥有一个 rootFiber，该 rootFiber 对应的 Fiber 树中某个 Fiber 节点包含一个 Update。接下来通知 Scheduler 根据更新的优先级，决定以同步还是异步的方式调度本次更新。

```js
if (newCallbackPriority === SyncLanePriority) {
  // 任务已经过期，需要同步执行render阶段
  newCallbackNode = scheduleSyncCallback(
    performSyncWorkOnRoot.bind(null, root)
  );
} else {
  // 根据任务优先级异步执行render阶段
  var schedulerPriorityLevel =
    lanePriorityToSchedulerPriority(newCallbackPriority);
  newCallbackNode = scheduleCallback(
    schedulerPriorityLevel,
    performConcurrentWorkOnRoot.bind(null, root)
  );
}
```

其中，scheduleCallback 和 scheduleSyncCallback 会调用 Scheduler 提供的调度方法根据优先级调度回调函数执行,其中调用`performSyncWorkOnRoot`和`performConcurrentWorkOnRoot`就是控制 render 阶段开始的调用了

此时的流程是

> 触发状态更新 -> 创建 Update 对象 -> 从 fiber 到 root（`markUpdateLaneFromFiberToRoot`） -> 调度更新（`ensureRootIsScheduled`） -> render 阶段（`performSyncWorkOnRoot` 或 `performConcurrentWorkOnRoot`）-> commit 阶段（`commitRoot`）

#### 心智模型

- 同步更新时：在 React 中，所有通过 ReactDOM.render 创建的应用。此时没有优先级概念，高优更新需要排在其他更新后面执行

- 异步更新时：在 React 中，通过 ReactDOM.createBlockingRoot 和 ReactDOM.createRoot 创建的应用会采用并发的方式更新状态。高优更新中断正在进行中的低优更新，先完成 render - commit 流程。待高优更新完成后，低优更新基于高优更新的结果重新更新。

#### update

下面是如何创建 update 对象，到更新的流程，首先说一下 Update 的结构

- ReactDOM.render —— HostRoot
- this.setState —— ClassComponent
- this.forceUpdate —— ClassComponent
- useState —— FunctionComponent
- useReducer —— FunctionComponent

所以总共可以分为三种组件出发更新（HostRoot | ClassComponent | FunctionComponent）
ClassComponent 与 HostRoot 共用一套 Update 结构，FunctionComponent 单独使用一种 Update 结构。先着重说下 ClassComponent 与 HostRoot

##### update 结构

```js
const update: Update<*> = {
  // eventTime：任务时间，通过performance.now()获取的毫秒数。由于该字段在未来会重构，当前我们不需要理解他。
  eventTime,
  // lane：优先级相关字段。当前还不需要掌握他，只需要知道不同Update优先级可能是不同的。
  lane,
  suspenseConfig,
  // 更新的类型，包括UpdateState | ReplaceState | ForceUpdate | CaptureUpdate。
  tag: UpdateState,
  // 更新挂载的数据，不同类型组件挂载的数据不同。对于ClassComponent，payload为this.setState的第一个传参。对于HostRoot，payload为ReactDOM.render的第一个传参。
  payload: null,
  // 更新的回调函数。即在commit 阶段的 layout 子阶段一节中提到的回调函数。
  callback: null,
  // 与其他Update连接形成链表
  next: null,
};
```

##### update 和 Fiber 联系

类似 Fiber 节点组成 Fiber 树，Fiber 节点上的多个 Update 会组成链表并被包含在 fiber.updateQueue 中。

> 什么情况下一个 Fiber 节点会存在多个 Update？
> 在一个 ClassComponent 中触发 this.onClick 方法，方法内部调用了两次 this.setState。这会在该 fiber 中产生两个 Update。

Fiber 节点最多同时存在两个 updateQueue：
-current fiber 保存的 updateQueue 即 current updateQueue
-workInProgress fiber 保存的 updateQueue 即 workInProgress updateQueue

在 commit 阶段完成页面渲染后，workInProgress Fiber 树变为 current Fiber 树，workInProgress Fiber 树内 Fiber 节点的 updateQueue 就变成 current updateQueue

##### updateQueue

下面就是 ClassComponent 与 HostRoot 使用的 UpdateQueue 结构

```js
const queue: UpdateQueue<State> = {
  baseState: fiber.memoizedState,
  firstBaseUpdate: null,
  lastBaseUpdate: null,
  shared: {
    pending: null,
  },
  effects: null,
};
```

[看完这个例子就会明白整个流程了](https://react.iamkasong.com/state/update.html#%E4%BE%8B%E5%AD%90)

总结来说存留着上次 render 阶段没有处理的优先级较低的 Update，存在 bfiber.updateQueue.baseUpdate 中，本次更新产生的新的 Update 会存储在 fiber.updateQueue.shared.pending 中形成环状链表， render 时剪开环，连接在 updateQueue.lastBaseUpdate 后面，接下来遍历 updateQueue.baseUpdate 链表，以 fiber.updateQueue.baseState 为初始 state，依次与遍历到的每个 Update 计算并产生新的 state

#### 深入理解优先级

状态更新由用户交互产生，用户心里对交互执行顺序有个预期。React 根据人机交互研究的结果中用户对交互的预期顺序为交互产生的状态更新赋予不同优先级。

- 生命周期方法：同步执行。
- 受控的用户输入：比如输入框内输入文字，同步执行。
- 交互事件：比如动画，高优先级执行。
- 其他：比如数据请求，低优先级执行。

##### 如何调度

具体到代码，每当需要调度任务时，React 会调用 Scheduler 提供的方法 runWithPriority。该方法接收一个优先级常量与一个回调函数作为参数。回调函数会以优先级高低为顺序排列在一个定时器中并在合适的时间触发。

![一个流程](../../assets/blogImg/react-source/update-process.png)

[这个例子看着还是有点生涩，回头多看几遍](https://react.iamkasong.com/state/priority.html#%E4%BE%8B%E5%AD%90)

##### 如何保证状态正确

有两个问题：

- render 阶段可能被中断。如何保证 updateQueue 中保存的 Update 不丢失？
  实际上 shared.pending 会被同时连接在 workInProgress updateQueue.lastBaseUpdate 与 current updateQueue.lastBaseUpdate 后面。当 render 阶段被中断后重新开始时，会基于 current updateQueue 克隆出 workInProgress updateQueue。由于 current updateQueue.lastBaseUpdate 已经保存了上一次的 Update，所以不会丢失。当 commit 阶段完成渲染，由于 workInProgress updateQueue.lastBaseUpdate 中保存了上一次的 Update，所以 workInProgress Fiber 树变成 current Fiber 树后也不会造成 Update 丢失。

- 有时候当前状态需要依赖前一个状态。如何在支持跳过低优先级状态的同时保证状态依赖的连续性？
  重点就是当某个 Update 由于优先级低而被跳过时，保存在 baseUpdate 中的不仅是该 Update，还包括链表中该 Update 之后的所有 Update。

#### ReactDOM.render

走一下 ReactDOM.render 完成页面渲染的整个流程

1. 首次执行 ReactDOM.render 会创建 fiberRootNode 和 rootFiber。其中 fiberRootNode 是整个应用的根节点，rootFiber 是要渲染组件所在组件树的根节点。
   这一步发生在调用 ReactDOM.render 后进入的 legacyRenderSubtreeIntoContainer 方法中。
2. legacyCreateRootFromDOMContainer 方法内部会调用 createFiberRoot 方法完成 fiberRootNode 和 rootFiber 的创建以及关联。并初始化 updateQueue
3. 等待创建 Update 来开启一次更新

再接上上面到达 render 阶段的流程

> 创建 fiberRootNode、rootFiber、updateQueue（`legacyCreateRootFromDOMContainer`） -> 创建 Update 对象（`updateContainer`） -> 从 fiber 到 root（`markUpdateLaneFromFiberToRoot`） -> 调度更新（`ensureRootIsScheduled`） -> render 阶段（`performSyncWorkOnRoot` 或 `performConcurrentWorkOnRoot`） -> commit 阶段（`commitRoot`）

##### React 的其他入口函数

- legacy，这是当前 React 使用的方式。当前没有计划删除本模式，但是这个模式可能不支持一些新功能。
- blocking，开启部分 concurrent 模式特性的中间模式。目前正在实验中。作为迁移到 concurrent 模式的第一个步骤。
- concurrent，面向未来的开发模式。任务中断/任务优先级都是针对 concurrent 模式。

可以通过不同的入口函数开启不同模式：

- legacy -- ReactDOM.render(<App />, rootNode)
- blocking -- ReactDOM.createBlockingRoot(rootNode).render(<App />)
- concurrent -- ReactDOM.createRoot(rootNode).render(<App />)

> 刚才看了一下，react18 已经使用`ReactDOM.createRoot(document.getElementById('root')).render()`去创建了，使用 concurrent 模式了

#### this.setState

this.setState 内会调用 this.updater.enqueueSetState 方法。在 enqueueSetState 方法中就是我们熟悉的从创建 update 到调度 update 的流程了

```js
enqueueSetState(inst, payload, callback) {
  // 通过组件实例获取对应fiber
  const fiber = getInstance(inst);
  const eventTime = requestEventTime();
  const suspenseConfig = requestCurrentSuspenseConfig();
  // 获取优先级
  const lane = requestUpdateLane(fiber, suspenseConfig);
  // 创建update
  const update = createUpdate(eventTime, lane, suspenseConfig);
  update.payload = payload;
  // 赋值回调函数
  if (callback !== undefined && callback !== null) {
    update.callback = callback;
  }
  // 将update插入updateQueue
  enqueueUpdate(fiber, update);
  // 调度update
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

##### this.forceUpdate

在 this.updater 上，除了 enqueueSetState 外，还存在 enqueueForceUpdate，当我们调用 this.forceUpdate 时会调用他。除了赋值 update.tag = ForceUpdate;以及没有 payload 外，其他逻辑与 this.setState 一致。

赋值 update.tag = ForceUpdate;有何作用呢？

```js
// 判断是否更新
const shouldUpdate =
  checkHasForceUpdateAfterProcessing() ||
  checkShouldComponentUpdate(
    workInProgress,
    ctor,
    oldProps,
    newProps,
    oldState,
    newState,
    nextContext
  );
```

- checkHasForceUpdateAfterProcessing：内部会判断本次更新的 Update 是否为 ForceUpdate。即如果本次更新的 Update 中存在 tag 为 ForceUpdate，则返回 true。
- checkShouldComponentUpdate：内部会调用 shouldComponentUpdate 方法。以及当该 ClassComponent 为 PureComponent 时会浅比较 state 与 props。

所以，当某次更新含有 tag 为 ForceUpdate 的 Update，那么当前 ClassComponent 不会受其他性能优化手段（shouldComponentUpdate|PureComponent）影响，一定会更新。
