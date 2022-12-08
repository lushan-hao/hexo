---
layout: post
title: 删除树结构某个节点
date: 2022-10-30 20:00
comments: true
tags:
  - javaScript
---

> 错把陈醋当成墨，写尽半生尽是酸，愿得清泉代烈酒，品后余生尽是甜

<!-- more -->

这篇文章产生的主要原因是之前遇到过一道 js 树结构的题，当时确实也花过一点时间，而且当时也没找到更好的办法。
后来突然看到一篇文章说把树结构打平，第一反应就想到这个题，下面说一下这道题

##### question

可以类比 antd 的 Tree 组件，

树结构数据如下

```js
const TREE_DATA = [
  {
    key: "a-1",
    children: [
      {
        key: "b-1",
        children: [
          {
            key: "c-1-1",
          },
          { key: "c-1-2" },
        ],
      },
      { key: "b-2" },
      { key: "b-3" },
    ],
  },
  {
    key: "a-2",
  },
];

function handleUncheck (treeData, sleKeyList, unSleKey) {
  ...
}

handleUncheck(TREE_DATA, ["a-1", "b-1", "b-2", "c-1-1"], "c-1-1"); // 'a-1', 'b-2']
handleUncheck(TREE_DATA, ["a-1", "b-1", "c-1-1", "a-2"], "b-1"); // ['a-1', 'a-2']
handleUncheck(TREE_DATA, ["a-1", "b-1", "c-1-1"], "c-1-1"); // []

```

需要编写 handleUncheck 函数，该函数接收三个参数，即
第一个参数：树结构数据；
第二个参数：选中的树节点数组；
第三个参数：取消选中的节点；

##### 举例

如 `handleUncheck(TREE_DATA, ["a-1", "b-1", "b-2", "c-1-1"], "c-1-1"); `

该树节点选中
![该树节点选中](../../assets/blogImg/js-TreeNode/demo1.png)
当我点击 `c-1-1` 节点，变为
![该树节点点击](../../assets/blogImg/js-TreeNode/demo2.png)

#### 实现

先说我看到文章之后的想法，第一反应将树结构打平，代码如下

```js
let newMap = new Map();

function MapArray(treeData, parentId) {
  treeData.forEach((p) => {
    // 这里其实title和parentId都没有使用上，不过如果需要完成其他功能，可能会需要使用
    newMap.set(p.key, {
      title: p.key,
      children: p.children ? p.children.map((p) => p.key) : null,
      parentId,
    });
    if (p.children) {
      MapArray(p.children, p.key);
    }
  });
}

function handleUncheck(treeData, sleKeyList, unSleKey) {
  MapArray(treeData, "", 0);
  console.log(newMap, "newMap");
}
```

之后删除要删除的节点及其子节点

```js
function deleteNode(sleKeyList, newMap, unSleKey) {
  const item = newMap.get(unSleKey);
  // 删除该节点
  const findIndex = sleKeyList.findIndex((p) => p === unSleKey);
  if (findIndex > -1) sleKeyList.splice(findIndex, 1);
  // 删除该节点下面的子节点
  if (item.children) {
    item.children.forEach((p) => {
      const findChildIndex = sleKeyList.findIndex((p1) => p1 === p);
      if (findChildIndex > -1) {
        sleKeyList.splice(findChildIndex, 1);
      }
    });
  }
  return sleKeyList;
}

function handleUncheck(treeData, sleKeyList, unSleKey) {
  MapArray(treeData, "", 0);
  console.log("newMap", newMap);
  const newSelList = deleteNode(sleKeyList, newMap, unSleKey);
  console.log("newSelList", newSelList);
}
```

最后就是通过 sleKeyList 去删除不存在 children 的节点，但是我们之前在 newMap 中存储了原先的结构，可以知道那些可以删除，哪些不用删除

```js
function deleteNullChildrenNode(newSelList) {
  for (let i = 0; i < newSelList.length; i++) {
    const ItemMap = newMap.get(newSelList[i]);
    if (
      ItemMap.children &&
      ItemMap.children.every((ele) => !newSelList.includes(ele))
    ) {
      newSelList.splice(i, 1);
      newSelList = deleteNullChildrenNode(newSelList);
      // 删除完一个立即打断
      break;
    }
  }
  // 上面的可以立即打断，下面的不可以
  // newSelList.forEach((p, index) => {
  //   const ItemMap = newMap.get(p);
  //   if (ItemMap.children && ItemMap.children.every(ele => !newSelList.includes(ele))) {
  //     newSelList.splice(index, 1);
  //     newSelList = deleteNullChildrenNode(newSelList)
  //   }
  // })
  return newSelList;
}

function handleUncheck(treeData, sleKeyList, unSleKey) {
  MapArray(treeData, "", 0);
  console.log("newMap", newMap);
  const newSelList = deleteNode(sleKeyList, newMap, unSleKey);
  console.log("newSelList", newSelList);
  const result = deleteNullChildrenNode(newSelList);
  console.log("result", result);
  return result;
}
```

##### 完整代码如下

```js
let newMap = new Map();

function MapArray(treeData, parentId) {
  treeData.forEach((p) => {
    newMap.set(p.key, {
      title: p.key,
      children: p.children ? p.children.map((p) => p.key) : null,
      parentId,
    });
    if (p.children) {
      MapArray(p.children, p.key);
    }
  });
}

function deleteNode(sleKeyList, newMap, unSleKey) {
  const item = newMap.get(unSleKey);
  // 删除该节点
  const findIndex = sleKeyList.findIndex((p) => p === unSleKey);
  if (findIndex > -1) sleKeyList.splice(findIndex, 1);
  // 删除该节点下面的子节点
  if (item.children) {
    item.children.forEach((p) => {
      const findChildIndex = sleKeyList.findIndex((p1) => p1 === p);
      if (findChildIndex > -1) {
        sleKeyList.splice(findChildIndex, 1);
      }
    });
  }
  return sleKeyList;
}

function deleteNullChildrenNode(newSelList) {
  for (let i = 0; i < newSelList.length; i++) {
    const ItemMap = newMap.get(newSelList[i]);
    if (
      ItemMap.children &&
      ItemMap.children.every((ele) => !newSelList.includes(ele))
    ) {
      newSelList.splice(i, 1);
      newSelList = deleteNullChildrenNode(newSelList);
      // 删除完一个立即打断
      break;
    }
  }
  return newSelList;
}

function handleUncheck(treeData, sleKeyList, unSleKey) {
  console.time("1");
  MapArray(treeData, "", 0);
  console.log("newMap", newMap);
  const newSelList = deleteNode(sleKeyList, newMap, unSleKey);
  console.log("newSelList", newSelList);
  const result = deleteNullChildrenNode(newSelList);
  console.log("result", result);
  console.timeEnd("1");
  return result;
}

const TREE_DATA = [
  {
    key: "a-1",
    children: [
      {
        key: "b-1",
        children: [
          {
            key: "c-1-1",
          },
          { key: "c-1-2" },
        ],
      },
      { key: "b-2" },
      { key: "b-3" },
    ],
  },
  {
    key: "a-2",
  },
];

handleUncheck(TREE_DATA, ["a-1", "b-1", "b-2", "c-1-1"], "c-1-1"); // 'a-1', 'b-2']
handleUncheck(TREE_DATA, ["a-1", "b-1", "c-1-1", "a-2"], "b-1"); // ['a-1', 'a-2']
handleUncheck(TREE_DATA, ["a-1", "b-1", "c-1-1"], "c-1-1"); // []
```

##### 思考

说实话，我感觉我的思路被固定住了，前两步操作其实之前就实现，但是后面的通过 sleKeyList 进行过滤，之前确实没想到，而且我感觉我写的有些复杂，肯定存在更好的、清晰的思路，以后找到更好的方法再添加进这篇文章， 或者之后看看 antd 的部分源码，学习一下

**五、参考资料**
[我被骂了，但我学会了如何构造高性能的树状结构](https://juejin.cn/post/7142649750402121742)
