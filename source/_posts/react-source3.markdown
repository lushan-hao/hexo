---
layout: draft
title: "commit阶段"
date: 2022-06-16 16:52
comments: true
tags:
  - react
  - 源码
---

> 莫任何人都是这样，处理别人的事情总是大刀阔斧一把抓住主要问题，轮到自己却沉浸在细枝末节不肯放手。

<!-- more -->

commit 阶段，会遍历归阶段的链表，操作叫做 mutation
对于 hooksComponents 来说 mutation 意味着 dom 节点的增删改

commit 阶段可分为

- before mutation 阶段（执行 DOM 操作前）
- mutation 阶段（执行 DOM 操作）
- layout 阶段（执行 DOM 操作后）

> 在 before mutation 阶段之前和 layout 阶段之后还有一些额外工作，涉及到比如 useEffect 的触发、优先级相关的重置、ref 的绑定/解绑

#### mutation 前 before mutation

遍历 effectList 并调用 commitBeforeMutationEffects 函数处理。

```js
// 保存之前的优先级，以同步优先级执行，执行完毕后恢复之前优先级
const previousLanePriority = getCurrentUpdateLanePriority();
setCurrentUpdateLanePriority(SyncLanePriority);

// 将当前上下文标记为CommitContext，作为commit阶段的标志
const prevExecutionContext = executionContext;
executionContext |= CommitContext;

// 处理focus状态
focusedInstanceHandle = prepareForCommit(root.containerInfo);
shouldFireAfterActiveInstanceBlur = false;

// beforeMutation阶段的主函数
commitBeforeMutationEffects(finishedWork);

focusedInstanceHandle = null;
```

##### commitBeforeMutationEffects

- 处理 DOM 节点渲染/删除后的 autoFocus、blur 逻辑。
- 调用 getSnapshotBeforeUpdate 生命周期钩子。
- 调度 useEffect。

**getSnapshotBeforeUpdate**

从 Reactv16 开始，componentWillXXX 钩子前增加了 UNSAFE\_前缀。原因是因为 Stack Reconciler 重构为 Fiber Reconciler 后，render 阶段的任务可能中断/重新开始，对应的组件在 render 阶段的生命周期钩子（即 componentWillXXX）可能触发多次。

为此，React 提供了替代的生命周期钩子 getSnapshotBeforeUpdate。我们可以看见，getSnapshotBeforeUpdate 是在 commit 阶段内的 before mutation 阶段调用的，由于 commit 阶段是同步的，所以不会遇到多次调用的问题。

会执行 commitBeforeMutationEffects()

**调度 useEffect**

```js
// 调度useEffect
if ((effectTag & Passive) !== NoEffect) {
  if (!rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = true;
    scheduleCallback(NormalSchedulerPriority, () => {
      // 触发useEffect
      flushPassiveEffects();
      return null;
    });
  }
}
```

commit 阶段是同步执行的，所以 useEffect 的回调函数函数是在 commit 执行结束后异步执行的

**如何异步调度**

effectList 中保存了需要执行副作用的 Fiber 节点。其中副作用包括插入、更新、删除，此外，如果当一个 FunctionComponent 含有 useEffect 或 useLayoutEffect，他对应的 Fiber 节点也会被赋值 effectTag

> 这里我还是没太啃懂，记录一下

- before mutation 阶段在 scheduleCallback 中调度 flushPassiveEffects
- layout 阶段之后将 effectList 赋值给 rootWithPendingPassiveEffects
- scheduleCallback 触发 flushPassiveEffects，flushPassiveEffects 内部遍历 rootWithPendingPassiveEffects

**为什么异步调度**

> 与 componentDidMount、componentDidUpdate 不同的是，在浏览器完成布局与绘制之后，传给 useEffect 的函数会延迟调用。这使得它适用于许多常见的副作用场景，比如设置订阅和事件处理等情况，因此不应在函数中执行阻塞浏览器更新屏幕的操作。

可见，useEffect 异步执行的原因主要是防止同步执行时阻塞浏览器渲染。

#### mutation

mutation 阶段也是遍历 effectList，执行函数。这里执行的是 commitMutationEffects

> mutation 阶段会遍历 effectList，依次执行 commitMutationEffects。该方法的主要工作为“根据 effectTag 调用不同的处理函数处理 Fiber。其中包括，重制节点，解绑等等

##### commitMutationEffects

commitMutationEffects 会遍历 effectList，对每个 Fiber 节点执行如下三个操作：

- 根据 ContentReset effectTag 重置文字节点
- 更新 ref
- 根据 effectTag 分别处理，其中 effectTag 包括(Placement | Update | Deletion | Hydrating) (Hydrating 作为服务端渲染相关，我们先不关注)

##### Placement effect

当 Fiber 节点含有 Placement effectTag，意味着该 Fiber 节点对应的 DOM 节点需要插入到页面中。

会做三个工作

- 获取父级 DOM 节点。其中 finishedWork 为传入的 Fiber 节点
- 获取 Fiber 节点的 DOM 兄弟节点
- 根据 DOM 兄弟节点是否存在决定调用 parentNode.insertBefore 或 parentNode.appendChild 执行 DOM 插入操作。

##### Update effect

意味着该 Fiber 节点需要更新。调用的方法为 commitWork，他会根据 Fiber.tag 分别处理。

**FunctionComponent mutation**
当 fiber.tag 为 FunctionComponent，会调用 commitHookEffectListUnmount。该方法会遍历 effectList，执行所有 useLayoutEffect hook 的销毁函数。
在 mutation 阶段会执行 useLayoutEffect 的销毁函数。

**HostComponent mutation**
当 fiber.tag 为 HostComponent，会调用 commitUpdate。
最终会在 updateDOMProperties (opens new window)中将 render 阶段 completeWork (opens new window)中为 Fiber 节点赋值的 updateQueue 对应的内容渲染在页面上

##### Deletion effect

意味着该 Fiber 节点对应的 DOM 节点需要从页面中删除。调用的方法为 commitDeletion。

- 递归调用 Fiber 节点及其子孙 Fiber 节点中 fiber.tag 为 ClassComponent 的 componentWillUnmount (opens new window)生命周期钩子，从页面移除 Fiber 节点对应 DOM 节点
- 解绑 ref
- 调度 useEffect 的销毁函数

> 之后会在 layout 阶段之前，执行一段代码
> `root.current = finishedWork`
> 双缓存中，完成渲染后 指针的 current 会从 current Fiber 树 指向 workInProgress Fiber 树

#### mutation 后 layout 阶段

该阶段之所以称为 layout，因为该阶段的代码都是在 DOM 渲染完成（mutation 阶段完成）后执行的。

> 该阶段触发的生命周期钩子和 hook 可以直接访问到已经改变后的 DOM，即该阶段是可以参与 DOM layout 的阶段。

layout 阶段也是遍历 effectList，执行函数。执行的函数是 commitLayoutEffects。

##### commitLayoutEffects

- commitLayoutEffectOnFiber（调用生命周期钩子和 hook 相关操作）
- commitAttachRef（赋值 ref）

```ts
function commitLayoutEffects(root: FiberRoot, committedLanes: Lanes) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;

    // 调用生命周期钩子和hook
    if (effectTag & (Update | Callback)) {
      const current = nextEffect.alternate;
      commitLayoutEffectOnFiber(root, current, nextEffect, committedLanes);
    }

    // 赋值ref
    if (effectTag & Ref) {
      commitAttachRef(nextEffect);
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

##### commitLayoutEffectOnFiber

- 对于 ClassComponent，他会通过 current === null?区分是 mount 还是 update，调用 componentDidMount (opens new window)或 componentDidUpdate(触发状态更新的 this.setState 如果赋值了第二个参数回调函数，也会在此时调用)
- 对于 FunctionComponent 及相关类型，他会调用 useLayoutEffect hook 的回调函数，调度 useEffect 的销毁与回调函数

> 会先执行上一次的销毁函数，才会继续执行这一次的调用函数

![useEffect和useLayoutEffect区别](/assets/img/useEffect和useLayoutEffect.jpg)

由上图也可以看出部分区别
useLayoutEffect hook 从上一次更新的销毁函数调用到本次更新的回调函数调用是同步执行的。
而 useEffect 则需要先调度，在 Layout 阶段完成后再异步执行。

##### commitAttachRef

获取 DOM 实例，更新 ref

```js
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;

    // 获取DOM实例
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }

    if (typeof ref === "function") {
      // 如果ref是函数形式，调用回调函数
      ref(instanceToUse);
    } else {
      // 如果ref是ref实例形式，赋值ref.current
      ref.current = instanceToUse;
    }
  }
}
```

##### current Fiber 树切换

```js
//  双缓存中的切换树
root.current = finishedWork;
```

上面说过，执行是在在 mutation 阶段结束后，layout 阶段开始前
componentWillUnmount 会在 mutation 阶段执行。此时 current Fiber 树还指向前一次更新的 Fiber 树，在生命周期钩子内获取的 DOM 还是更新前的。
componentDidMount 和 componentDidUpdate 会在 layout 阶段执行。此时 current Fiber 树已经指向更新后的 Fiber 树，在生命周期钩子内获取的 DOM 就是更新后的。
