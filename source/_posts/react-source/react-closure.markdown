---
layout: post
title: "hooks 闭包陷阱"
date: 2022-06-28 19:00
comments: true
tags:
  - react
  - 源码
---

> 抱着希望，难免会失望。期盼奇迹，难免不如人意。很多时候，不是生活多么残酷，是我们总喜欢死磕那渺茫的希望。

<!-- more -->

以前有个需求是做一个弹窗，是一个倒计时，当时想法是

```js
import React, { useState, useEffect } from "react";

const App = () => {
  const [count, setCount] = useState(0);
  console.log(count);

  useEffect(() => {
    setInterval(() => {
      console.log("执行");
      setCount(count + 1);
    }, 1000);
  }, []);
  return <>{count}</>;
};

export default App;
```

咦，为什么页面上只显示从 0 -> 1, 看下控制台 0 -> 1 -> 1 ,剩下每秒输出一次'执行'
why，好像没啥问题，初始化执行定时器，每秒钟更新定时器，然后展示到页面上，这就涉及到 hooks 的一个闭包陷阱问题了

首先大家都或多或少听说过 react 的 Fiber 结构，它是一个链表，每一个节点存储（静态数据结构的属性， 连接其他 Fiber 的指针，一些动态工作单元的属性），而其中`memorizedState`属性就是存储相应节点的 hook（比如 useState、useEffect）,其中的 next 只想下一个 hook 结构如下
![react-closure-1](../../assets/blogImg/react-source/react-closure-1.png)

如本例中存在两个 hook，所以第三个为 null，这也是为什么不能将 hooks 写到 if else 语句中原因（当前 hooks 拿到的不是自己对应的 Hook 对象）

还得说一点就是组件 mount 时的 hook 与 update 时的 hook 来源于不同的对象，分别为 mountEffect 和 updateEffect

```js
function mountEffect(create, deps) {
  {
    if ("undefined" !== typeof jest) {
      warnIfNotCurrentlyActingEffectsInDEV(currentlyRenderingFiber$1);
    }
  }
  return mountEffectImpl(Update | Passive, Passive$1, create, deps);
}
function updateEffect(create, deps) {
  {
    if ("undefined" !== typeof jest) {
      warnIfNotCurrentlyActingEffectsInDEV(currentlyRenderingFiber$1);
    }
  }
  return updateEffectImpl(Update | Passive, Passive$1, create, deps);
}
```

接下来看 mountEffectImpl 和 updateEffectImpl 函数

![react-closure-2](../../assets/blogImg/react-source/react-closure-2.png)

可以看到 react 拿两个 deps 进行比较， 其中只要下一个依赖不等与 null 或这 undefined(因为 undefind 也被赋值为 null 了)，就会进入比较函数
下面可以看到之前的 deps 是 null，那就返回 false 也就是不相等，就会执行他的 hook

```js
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    {
      error(
        "%s received a final argument during this render, but not during " +
          "the previous render. Even though the final argument is optional, " +
          "its type cannot change between renders.",
        currentHookNameInDev
      );
    }
    return false;
  }
  {
    // hah，这个问题我出现过
    if (nextDeps.length !== prevDeps.length) {
      error(
        "The final argument passed to %s changed size between renders. The " +
          "order and size of this array must remain constant.\n\n" +
          "Previous: %s\n" +
          "Incoming: %s",
        currentHookNameInDev,
        "[" + prevDeps.join(", ") + "]",
        "[" + nextDeps.join(", ") + "]"
      );
    }
  }
  for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (objectIs(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
```

回到 pushEffect 这个函数, 重点需要注意的是 HasEffect | hookFlags

```js
var HasEffect = 1; // Represents the phase in which the effect (not the clean-up) fires.
// nextDeps为null或者mount时执行的是
hook.memoizedState = pushEffect(
  HasEffect | hookEffectTag,
  create,
  destroy,
  nextDeps
);
// 依赖发生该=改变执行的是
pushEffect(hookEffectTag, create, destroy, nextDeps);
```

区别在于有没有 HasEffect 的标记，没有就不会再执行

> 总结一下上面所说：
> 如果 useEffect 第二个参数传入 undefined 或者 null，那每次都会执行。如果传入了一个空数组，只会执行一次。否则会对比数组中的每个元素有没有改变，来决定是否执行。

接着看我们编写的那个组件，就知道因为传入的空数组，所以只会执行一次，但是执行一次没问题，定时器执行一次设置 count 就可以了，但是为什么设置不生效呢，这是因为我们这个 Effect 只执行了一次，但是他获取到的 state 永远是第一次的 state(0)，所以我们设置的 setState 永远是 1

怎么解决呢？将 count 增加到 useEffect 的第二个参数中，这样每次 state 变化了就会重新执行，但是尝试发现，打印太混乱了吧，为什么呢，定时器没清除啊，每秒创建一个定时器，然后修改 count，混乱

```js
import React, { useState, useEffect } from "react";

const App = () => {
  const [count, setCount] = useState(0);
  console.log(count);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [count]);
  return <>{count}</>;
};

export default App;
```

总算正常了，完美

闭包陷阱产生的原因就是 useEffect 等 hook 里用到了某个 state，但是没有加到 deps 数组里，这样导致 state 变了却没有执行新传入的函数，依然引用的之前的 state。

但是解决方法不唯一啊，而且上面每次都会创建定时器，然后销毁定时器，中间还需要代码的执行时间，导致定时器不准确，所以拿出利器-useRef，程序员上代码说话

> useRef 是在 memorizedState 链表中放一个对象，current 保存某个值。

![react-closure-3](../../assets/blogImg/react-source/react-closure-3.png)
初始化的时候创建了一个对象放在 memorizedState 上，后面始终返回这个对象。这样通过 useRef 保存回调函数，然后在 useEffect 里从 ref.current 来取函数再调用，避免了直接调用，也就没有闭包陷阱的问题了。（解决思想就是每次组件更新所生成的 ref 指向的都是同一片内存空间， 那么当然能够每次都拿到最新的值）

```js
import React, { useState, useEffect, useRef } from "react";
const App = () => {
  const [count, setCount] = useState(0);
  const addCount = () => {
    setCount(count + 1);
  };
  //
  const ref = useRef();
  // 每次都保存为addCount， 这样每秒都执行一次addCount这个函数
  ref.current = addCount;

  useEffect(() => {
    // 每秒都调用ref.current()， 没有依赖，不会存在闭包陷阱
    setInterval(() => ref.current(), 1000);
    // 也可以使用
    // setInterval(() => setCount((count) => count + 1), 1000);
  }, []);

  return <>{count}</>;
};
export default App;
```

执行正常了

推荐一个 ahooks 的 hooks，将上述逻辑封装了起来
[useLatest](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLatest/index.ts)

**五、参考资料**
[从根上理解 React Hooks 的闭包陷阱（续集）](https://juejin.cn/post/7093931163500150820)  
[从 react hooks“闭包陷阱”切入，浅谈 react hooks](https://juejin.cn/post/6844904193044512782)
[React 技术揭秘](https://react.iamkasong.com/)
