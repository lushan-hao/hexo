---
layout: post
title: "react一些知识点（持续补充）"
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

首先，我想问一下，什么是 jsx，React 官网对其描述

> JSX 是一个 JavaScript 的语法扩展。JSX 就是用来声明 React 当中的元素，React 使用 JSX 来描述用户界面。

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

例如：<p title="标签">1</p> -> React.createElement("p", { title: "标签" }, "1")

#### JSX 与 Fiber 节点

JSX 是一个语法糖，返回的是一种描述当前组件内容的对象，

有些信息不包括在 JSX 中，这而包含在 Fiber 节点中：

- 组件在更新中的优先级
- 组件的 state
- 组件被打上的用于 Renderer 的标记

在组件 mount 时，Reconciler 根据 JSX 描述的组件内容生成组件对应的 Fiber 节点。
在 update 时，Reconciler 将 JSX 与 Fiber 节点保存的数据对比，生成组件对应的 Fiber 节点，并根据对比结果为 Fiber 节点打上标记。
