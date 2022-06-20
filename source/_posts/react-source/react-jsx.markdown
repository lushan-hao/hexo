---
layout: post
title: "react 源码-react 一些知识点（持续补充）"
date: 2022-05-31 20:00
comments: true
tags:
  - react
  - jsx
---

> 【稻城亚丁】
> “我希望有个如你一般的人，如山间清爽的风，如古城温暖的光。从清晨到夜晚，由山野到书房。等待不怕岁月蹉跎，不怕路途遥远。只要最后是你，就好”。
>
> <p align="right">___张嘉佳</p>

<!-- more -->

#### JSX

想起一个问题，什么是 jsx，大家好像都知道，但是却又不是能够特别清晰的描述出来，

> React 官网对其描述：JSX 是一个 JavaScript 的语法扩展。JSX 就是用来声明 React 当中的元素，React 使用 JSX 来描述用户界面。

JSX 在编译时会被 Babel 编译为 React.createElement 方法。所以在每个使用 JSX 的 JS 文件中，需要显式的声明`import React from 'react';`（React17 以后不需要了，[链接](https://zh-hans.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)）

```js
export function createElement(type, config, children) {
  let propName;

  const props = {};

  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  );
}

const ReactElement = function (type, key, ref, self, source, owner, props) {
  const element = {
    // 标记这是个 React Element
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: ref,
    props: props,
    _owner: owner,
  };

  return element;
};
```

React.createElement 最终会调用 ReactElement 方法返回一个包含组件数据的对象，该对象有个参数`$$typeof: REACT_ELEMENT_TYPE`标记了该对象是个 React Element。
在 react 中，只要返回的 jsx 不是不是 null（通过 React.createElement()），那么返回的都是 React Element

例如：`<p title="标签">1</p> -> React.createElement("p", { title: "标签" }, "1")`

#### JSX 与 Fiber 节点

JSX 是一种描述当前组件内容的数据结构，他不包含组件 schedule、reconcile、render 所需的相关信息。

有些信息不包括在 JSX 中，这而包含在 Fiber 节点中：

- 组件在更新中的优先级
- 组件的 state
- 组件被打上的用于 Renderer 的标记

在组件 mount 时，Reconciler 根据 JSX 描述的组件内容生成组件对应的 Fiber 节点。
在 update 时，Reconciler 将 JSX 与 Fiber 节点保存的数据对比，生成组件对应的 Fiber 节点，并根据对比结果为 Fiber 节点打上标记。

#### componentWillXXX 为什么 UNSAFE

以下三个生命周期被标记 UNSAFE

- componentWillMount
- componentWillRecieveProps
- componentWillUpdate

先说两个可以替代这三个生命周期的方法

> - getDerivedStateFromProps: 会在调用 render 方法之前调用，即在渲染 DOM 元素之前会调用，并且在初始挂载及后续更新时都会被调用。getDerivedStateFromProps 的存在只有一个目的：让组件在 props 变化时更新 state。该方法返回一个对象用于更新 state，如果返回 null 则不更新任何内容。
> - 在最近一次渲染输出（提交到 DOM 节点）之前调用。它使得组件能在发生更改之前从 DOM 中捕获一些信息（例如，滚动位置）。此生命周期方法的任何返回值将作为参数传递给 componentDidUpdate()。不常用

为什么 componentWillXXX 被标记 UNSAFE？

```js
// unresolvedOldProps为组件上次更新时的props，而unresolvedNewProps则来自ClassComponent调用this.render返回的JSX中的props参数。可见他们的引用是不同的。所以他们全等比较为false。所以每次父组件更新都会触发当前组件的componentWillRecieveProps
if (unresolvedOldProps !== unresolvedNewProps || oldContext !== nextContext) {
  // callComponentWillReceiveProps方法会调用componentWillRecieveProps
  callComponentWillReceiveProps(
    workInProgress,
    instance,
    newProps,
    nextContext
  );
}
```

React 更新后最主要的区别是将同步的更新机制重构为异步可中断的更新。
因为变为异步可中断的更新，所以就会出现调度的问题，react 中高优先级的会先执行，低优先级的会下一次执行，但是有可能顺序不同，例如`A1 - B2 - C1 - D2`, 执行时会先执行 A1 - C1 ，下一次执行低优先级，但是可能 C1 依赖于 B2，所以 C1 还会再执行一次，所以 C2 可能会执行 2 次，所以在 componentWillReceiveProps 可能会执行两次，这也就是为什么 componentWillXXX 被标记为 UNSAFE
