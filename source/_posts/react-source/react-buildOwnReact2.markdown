---
layout: post
title: "react 源码-build-own-react（二）"
date: 2022-06-30 20:00
comments: true
tags:
  - react
  - 源码
---

> 不是所有坚持都有结果，但是总有一些坚持，能从一寸冰封的土地里，培育出十万朵怒放的蔷薇。

<!-- more -->

本文是我从 Rodrigo Pombo 的博客[Build your own React](https://pomb.us/build-your-own-react/) 学习所获，第二部分，上接更新和删除时的 render 部分

### 更新和删除时的 render

更新和删除时，就需要和上一次更新的 fiberTree 进行比较，所以需要上一次更新的 Fiber，currentFiber Tree，这对应的和之前说过的双缓存有关了，每一个 fiber 节点都有一个属性（源码中是 alternate），指向上一次更新的 currentFiber Tree 对应的该 Fiber 节点
所以新建一个全局变量指向上一次的 fiber tree root—>currentRoot，每次 commit 的时候都将当前 commit 的 fiber root 存到 currentRoot 中。

```js
function commitRoot() {
  commitWork(wipRoot.child);
  currentRoot = wipRoot; //新增，用于存上一次commit的fiber tree的root
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot, //新增，每一棵fiber tree都有一个属性指向上次commit的fiber tree root
  };
  nextUnitOfWork = wipRoot;
}

let nextUnitOfWork = null;
let currentRoot = null; //新增
let wipRoot = null;
```

接下来将 performUnitOfWork 创建新 Fiber 的代码拆出来，增加更新和删除的操作封装成一个函数
这其中 effectTag： 新增一个标志属性，在 commit 阶段使用

```js
function performUnitOfWork(fiber) {
  //1.创建DOM元素
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  //2.为当前fiber的children elements对比old fiber执行新增，更新和删除的操作
  const elements = fiber.props.children
  reconcileChildren(fiber, elements)
  //3.寻找下一个进入work unit的fiber：child-->sibling-->parent
    if (fiber.child) {
        return fiber.child
    }
  //找自己的兄弟节点
    let nextFiber = fiber
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling
      }
    //找父辈的兄弟节点
      nextFiber = nextFiber.parent
    }
}
function reconcileChildren(wipFiber, elements){
    //elements是我们当前想渲染到dom中的，oldFiber是上一次渲染到dom中的，我们需要迭代比较这两者来决定应该执行什么操作
    let index = 0
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null
    // 还有未遍历的存在对应的老节点则进行循环
    while (index < elements.length || oldFiber !=null) {
        const element = elements[index]
        const newFiber = null
        //如果旧的 Fiber 和新的元素是否具有相同的类型
        const sameType =
              oldFiber &&
              element &&
              element.type == oldFiber.type
        // 更新：如果存在相同的类型，我们可以保留 DOM 节点并使用新的 props 更新它，在实际的React中还用到了key值进行了比较操作，这一部分想见我之前的文章，diff算法一节，更详细（简单说就是单节点只有当Type和key值都相同才能复用， 多节点两次循环判断）
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE", // 更新的标志
          }
        }
        if (element && !sameType) {
          // 如果类型不同并且有一个新元素，则意味着我们需要创建一个新的 DOM 节点
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT", // 新增的标志
          }
        }
        if (oldFiber && !sameType) {
          // 如果类型不相同，并且存在老的Fiber节点，那么我们删除即可
          oldFiber.effectTag = "DELETION" // 删除的标志
      		deletions.push(oldFiber) // 但是当我们commit时是在wipRoot上，所以需要一个array跟踪这些fibers，这是因为新的当我们将Fiber Tree提交到 DOM 时，我们是从正在进行的工作根中进行的，它没有旧Fiber
        }
         if (index === 0) {
             wipFiber.child = newFiber
        else if (element) {
             prevSibling.sibling = newFiber
         }
        prevSibling = newFiber
        //按层比较
        if(oldFiber){
            oldFiber = oldFiber.sibling
        }
        index++
   }
}
let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null //新增，用于存储需要删除的node
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
```

commit 阶段，根据上个阶段，每个 fiber 上的 effectTag 进行操作， 而且 React 源码中还存了一个 effectTagList 的数组

```js
function commitRoot() {
  deletions.forEach(commitWork); // 当我们提交对 DOM 的更改时，我们还使用该数组中Fiber
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

//完善commitWork，根据每个fiber的effectTag做出相应反应
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  //domParent.appendChild(fiber.dom)

  // PLACEMENT: 新增node
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (
    // UPDATE: 更新node
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
    // DELETION: 删除
  } else if (fiber.effectTag === "DELETION") {
    //删除node
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

接下来，完善上面的 updateDom 这个函数
将旧 Fiber 的 props 与新 Fiber 的 props 进行比较，移除掉旧的 props，设置新的或更改的 props。并且我们需要注意 node 中事件的更新。事件的名称都以"on"开头，根据这个特性对事件属性进行过滤再相应处理。

```js
const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);
function updateDom(dom, prevProps, nextProps) {
  // 移除旧的props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  // 设置新的props
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // 如果事件处理程序发生更改，我们将其从节点中删除
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      (key) => !(key in nextProps) || isNew(prevProps, nextProps)(key) //change 需要先删除原有的listener
    )
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });
  // 然后我们添加新的处理程序。
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

const ownReact = {
  createElement,
  render,
};
```

[测试链接](https://codesandbox.io/s/didact-6-96533)

### 函数式组件

接下来添加的是对函数组件的支持, 修改示例如下， 前面有说过函数式组件的 type 对应式 Function 组件本身

```js
/** @jsx ownReact.createElement */
function App(props) {
  return <h1>Hi {props.name}</h1>;
}
const element = <App name="foo" />;
const container = document.getElementById("root");
ownReact.render(element, container);
```

> 函数组件在两个方面有所不同：
>
> - 函数式组件生成的 fiber 没有 dom 这一属性
> - 函数式组件的 children 通过运行函数得到而不是直接从 fiber.props.children 得到

```js
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  //判断是否是函数式组件
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  //返回下一个work unit
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

//对函数式组件，则通过执行该函数，获得解析成原生元素组成的组件，再像对待普通元素一样reconcileChildren，即函数式组件需要先执行，取得返回值作为参数放到reconcileChildren中执行
function updateFunctionComponent(fiber) {
  //像这个例子中fiber.type是APP函数，执行它返回h1元素
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
//对原生元素则执行和之前一样的操作
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}
```

由于函数式组件没有 dom，而且我们需要改变的是 commitWork 函数。首先，要找到 DOM 节点的父节点，我们需要沿着 fiber 树向上查找，直到找到具有 DOM 节点的 fiber。并且当移除一个节点时，我们还需要继续，直到我们找到一个带有 DOM 节点的子节点。

fiber tree 中既有一般元素生成的 fiber 也有类式组件生成的 fiber。我们操作 DOM 是通过对比 fiber tree 实现的，因此删除和添加的时候都需要检测当前 fiber 是否存在 dom 才能相应对 DOM 进行操作。

```js
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  //新增，用于寻找存在dom的parent，将函数式组件中children的fiber的dom添加到其中
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    //删除node
    //domParent.removeChild(fiber.dom)
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
```

### 自定义实现 useState

实现如下代码功能

```js
const ownReact = {
  createElement,
  render,
  useState,
};

/**  ownReact.createElement */
function Counter() {
  const [state, setState] = ownReact.useState(1);
  return <h1 onClick={() => setState((c) => c + 1)}>Count: {state}</h1>;
}
const element = <Counter />;
const container = document.getElementById("root");
ownReact.render(element, container);
```

我们需要在 function component 的 fiber 中添加一个 hooks array 来实现同一个 component 中多次使用 useState

```js
let wipFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)]; //从头至尾运行函数
  reconcileChildren(fiber, children);
}
```

```js
//useState除了返回一个state外还返回一个更新这个函数的setState function
function useState(initial) {
  // 这里可以看出为什么hooks要求，每次执行的顺序和数量要相同，为了获取和上次对应的hooks
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  //下一次渲染时从oldHook取state和action，计算新state更新到newHook上
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    //每次setState，都设置一个新的wipRoot作为下一个work unit，workLoop就可以进入新的渲染
    //也就是说这样写每次setState都会触发渲染，在updateQueue里注册任务
    // 但是真实的React源码中，还有更新优化机制，比如batchUpdate（批更新）
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
```

以上就是`Build your own React`中的主要内容了，但是其中还是存在和真是 React 框架差异的地方的，比如：

1. 在例子中，我们在渲染阶段遍历整个树。相反，React 遵循一些提示和启发式方法来跳过没有任何变化的整个子树。
2. 我们还在提交阶段遍历整个树。React 保留了一个链表，其中仅包含具有效果的 fiber，并且仅访问这些 fiber。即上面所有的 effecttagList
3. 每次我们构建一个新的工作树时，我们都会为每个 fiber 创建新对象。React 从以前的树中回收 fiber。
4. 当 Didact 在渲染阶段收到新的更新时，它会丢弃正在进行的工作树并从根重新开始。React 使用过期时间戳标记每个更新，并使用它来决定哪个更新具有更高的优先级。这就是优先级部分了——lane

不过对于整个流程的梳理还是很有帮助的

### 链接

[Build your own React](https://pomb.us/build-your-own-react/)
