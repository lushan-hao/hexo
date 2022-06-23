<!--
 * @LastEditors: haols
-->

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

### 5、更新和删除时的 render

更新和删除时，就需要和上一次更新的 fiberTree 进行比较，所以需要上一次更新额 Fiber，currentFiber Tree，这对应的和之前说过的双缓存有关了，每一个 fiber 节点都有一个属性（源码中是 alternate），指向上一次更新的 currentFiber Tree 对应的该 Fiber 节点

```js
function commitRoot() {
  commitWork(wipRoot.child);
  currentRoot = wipRoot; //新增，用于存上一次commit的fiber tree的root
  wipRoot = null;
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

接下来提取 performUnitOfWork 创建新 Fiber 的代码

### 链接

[Build your own React](https://pomb.us/build-your-own-react/)
