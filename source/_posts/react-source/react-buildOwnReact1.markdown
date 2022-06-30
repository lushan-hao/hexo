---
layout: post
title: "react 源码-build-own-react（-）"
date: 2022-06-15 20:00
comments: true
tags:
  - react
  - 源码
---

> 在这个世界上，所有真性情的人，想法总是与众不同。
>
> <p align="right">——沈从文《边城》</p>

<!-- more -->

本文是我从 Rodrigo Pombo 的博客[Build your own React](https://pomb.us/build-your-own-react/) 学习所获，也包含一些网上搜索的不太懂的点

### 0、回顾

先看下面三行代码：

```jsx
const element = <h1 title="foo">Hello</h1>;
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

首先说 jsx，jsx 是一个语法糖，为我们提供了创建 React 元素方法`React.createElement(component, props, ...children)`
第一行先创建了一个 element（jsx 元素），然后通过 babel 编译变成 js，作为参数调用 React.creactElement 函数生成 React 元素

```js
//JSX语法编译过程
const element = <h1 title="foo">Hello</h1>
        |
        |
        V
const element = React.createElement("h1", { title: "foo" }, "Hello");
//最终函数生成的对象
const element = {
  // 是一个字符串，它指定我们要创建的 DOM 节点的类型， 而且还可以是function，对应的是函数组件的自身
  type: "h1",
  // 另一个对象，它具有 JSX 属性中的所有键和值。它还有一个特殊的属性：children.
  props: {
    title: "foo",
    // children在这种情况下是一个字符串，但它通常是一个包含更多元素的数组。
    children: "Hello",
  },
};
```

`ReactDOM.render(element, container);`也是 React 代码，render 的过程是 React 改变 DOM 的过程

> - To avoid confusion, I’ll use “element” to refer to React elements and “node” for DOM elements.
>   为了避免混淆，这里使用“element”代替 react 的元素，node 代替 DOM 的元素

```js
ReactDOM.render(element, container)
      |
      |
      V
const node = document.createElement(element.type); // 根据第一行中生成的element对象中的type属性创建DOM node,'h1'
node["title"] = element.props.title; // 'foo' 绑定各个属性

//创建node的children
//这里使用creatTextNode的方式而不是innerText的方式，保证我们接下来对其他类型的孩子元素也可以用相同的方式创建
const text = document.createTextNode("");
text["nodeValue"] = element.props.children;

//将构建的DOM nodes依次组装起来添加到定义的container中
node.appendChild(text);
container.appendChild(node);
```

至此，现在我们有了和以前一样的应用程序，但没有使用 React。

### 1、createElement 功能

编写自己的 createElement.
功能：传入 jsx，生成了一个包含 type 和 props 属性的 JS 对象

```js
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
        |
        |
        V
const element = React.createElement(
  "div",
  { id: "foo" },
  React.createElement("a", null, "bar"),
  React.createElement("b")
);

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    },
  };
}
```

上面 children 是一个数组，但是 element 的 children 可以是 element 或者 string 或者 number，在上面的代码中我们只包含了 element 的情况，还需要为字符串和数字类型的 children 创建一种生成方法。

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// 封装成我们自己的
const ownReact = {
  createElement,
};

// 调用
const element = ownReact.createElement(...)
```

### 2 render 实现

接下来，我们需要编写我们的 ReactDOM.render 函数版本。目前，我们只关心向 DOM 添加内容。我们稍后会处理更新和删除。

```js
function render(element, container) {
  // 我们首先使用元素类型创建 DOM 节点，然后将新节点附加到容器中。
  // const dom = document.createElement(element.type)
  // 上面的替换为下面，因为需要处理文本元素，如果元素类型是TEXT_ELEMENT我们创建一个文本节点而不是常规节点
  const dom = element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)

  // 元素道具分配给节点。
  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  // 递归地为每个孩子做相同的操作。
  element.props.children.forEach(child =>
    render(child, dom)
  )
​
  container.appendChild(dom)
}
```

接下来就可以使用了[自定义 Didact](https://codesandbox.io/s/didact-2-k6rbj?file=/src/index.js)
本地想验证的话，可以使用 create-react-app 把 index.js 替换就好了，但是会报一下的错误，因为不加的话 runtime 默认为 automatic，jsx 不会加载我们自己的代码。首行添加一行代码就好了

```
报错如下：
// Module build failed (from ./node_modules/babel-loader/lib/index.js):
// SyntaxError: 文件路径\my-app\src\index.js: pragma and pragmaFrag cannot be set when runtime is automatic.
引用自己代码，开头添加如下：
/** @jsxRuntime classic */
```

### 3 并发模式

继续完善这个 render，因为这个递归调用有问题。一旦我们开始渲染，我们不会停止，直到我们渲染了完整的元素树。如果元素树很大，可能会阻塞主线程太久。以我们将这整个 render 过程分成许多小单元(unit)，每个小单元执行完如果主线程有操作需要执行，则将会允许中断渲染。

```js
let nextUnitOfWork = null;

function workLoop(deadline) {
  let shouldYield = false;
  //render整个过程被分为许多unit，每执行完一个unit判断是否到允许中断的时间
  //当render完毕（没有unit）或到系统中断时间跳出循环
  while (nextUnitOfWork && !shouldYield) {
    //操作当前unit并返回下一个work unit
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  //用来做一个循环，浏览器会在主线程空闲时运行回调
  requestIdleCallback(workLoop);
}

//可以看作是一个没有明确时延的setTimeout，当主线程空闲时它将会执行回调函数
requestIdleCallback(workLoop); //react现在用scheduler package代替了这个方法，但是他们在思想上是一致的

function performUnitOfWork(nextUnitOfWork) {
  // TODO
}
```

其中的`performUnitOfWork`和`requestIdleCallback`是不是有一些熟悉,前面的文章有提过，我甚至感觉是不是先阅读这篇文章更能熟悉流程

### 4 fiber

为了实现上一步中 units 式的工作，我们需要新建一个数据结构–Fiber 树。每个 element 对应一个 fiber，一个 work unit 内操作一个 fiber。（这里的 fiber 节点对应的应该是 element，即以 jsx 为结构的树，而不是 dom）

fiber 的连接，之前也说过，所以需要在 element 上增加三个属性，分别是

- child：第一个子元素
- sibling：兄弟元素
- parent：父元素

> 这样就能连接上，遍历的流程就是以前文章说的 beginWork（创建 fiber、复用 fiber） 自上向下-> 没有子元素的话，该节点执行 completeWork（workInProgressRoot 中生成 DOM，这个是不展示在页面的 DOM 树，处理 props），然后遍历兄弟的 beginWork，没有兄弟遍历父母的 completeWork，直到到达 root（根）

接下来，看我们写的 react，在 render 中我们只执行创建 root fiber 然后将它赋值给 nextUnitOfWork 的操作 剩下的工作将发生在 performUnitOfWork 函数上，我们将为每个 Fiber 做三件事：

- 将元素添加到 DOM
- 为元素的子元素创建 fiber
- 选择下一个 unit of work

nextUnitOfWork 被赋值后，requestIdleCallback(workLoop)调用 workLoop，workLoop 内将从当前 nextUnitOfWork 执行操作，以 unit 式的工作方式，创建整棵 DOM 树。现在添加进我们的代码

```js
//上次实现时render中的create DOM node的部分
function render(element, container) {
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)
​
  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })
​
  element.props.children.forEach(child =>
    render(child, dom)
  )
  container.appendChild(dom)
}

function render(element, container) {
   nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}
​
let nextUnitOfWork = null
```

##### 实现 performUnitOfWork

这个函数每个 fiber 我们会做以下三件事

- 创建 node 并添加到 DOM 中
- 为这个 fiber 的 children（这里是 props 内的 children array，而不是首孩子 child“指针”）建立 fibers
- 选择下一个 fiber 进入 work unit（这里的顺序是 child => sibling => parent, 直到找到 root）。

```js
function performUnitOfWork(fiber) {
  //1.创建node并添加到DOM中
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  //2.为当前fiber的childrens创建fiber
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber, //每个fiber对象都有指向parent的“指针”
      dom: null,
    };

    //构建"父子指针"，如果是首孩子，则当前fiber的child指向这个新建的fiber
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      //构建“兄弟指针”,前一个children fiber的sibling指向当前children fiber
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  //3.寻找下一个进入work unit的fiber：child-->sibling-->uncle
  if (fiber.child) {
    return fiber.child;
  }
  //找自己的兄弟节点
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    //找父辈的兄弟节点
    nextFiber = nextFiber.parent;
  }
}
```

### 渲染和提交阶段

因为每个 unit 中都会添加一个新的 node 到 DOM 中，但是在我们构建并渲染完整棵树前，每次 unit 结束浏览器主线程都可能会打断渲染，这样用户可能看到不完整的 UI。
所以我们希望整棵 DOM 树都构建完成再提交渲染。首先不能在每个 unit 中生成一个 node 就将它添加到 DOM 中，因此我们删除 performUnitOfWork 中每生成一个新 node 就添加进 DOM 中的操作。

```js
//删除 performUnitOfWork中以下几行
if (fiber.parent) {
  fiber.parent.dom.appendChild(fiber.dom);
}
```

然后我们用一个全局变量 workInProgressRoot 跟踪（保存）当前正构建的树的根节点的 fiber。在 workLoop 内探测到整棵树都渲染完成（没有下一个 work unit)则从 root fiber 开始遍历，添加每个 fiber 内保存在 fiber.dom 中创建的 DOM nodes 到 DOM 树中。(这里就是 commit 阶段，将内存中的 DOM 树渲染到页面上)

```js
function render(element, container) {
   nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}
let nextUnitOfWork = null
         |
         |
         V
function render(element, container) {
    //保存当前正在构建的树的根节点的fiber
  workInProgressRoot = {
    dom: container,
    props: {
      children: [element],
    },
  }
  nextUnitOfWork = workInProgressRoot
}

let nextUnitOfWork = null
/**新增： work in progress root 保存当前正在构建的树的根节点***/
let workInProgressRoot = null
/*******/

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  /**新增：整棵树都渲染完成则commit***/
  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot()
  }
  /*****/
  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function commitRoot() {
  commitWork(workInProgressRoot.child)
  workInProgressRoot = null
}

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  commitWork(fiber.child)//第一个孩子
  commitWork(fiber.sibling)//兄弟节点
}
```

其中 commitRoot 函数执行，就代表着进入到了 commit 阶段，commit 阶段的主要子阶段有 before mutation、mutation、layout

### 链接

[Build your own React](https://pomb.us/build-your-own-react/)
