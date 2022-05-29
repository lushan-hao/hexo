---
layout: draft
title: "diff算法流程概览"
date: 2022-04-17 16:52
comments: true
tags: 
    - react 
    - 源码 
    - 随笔
---

<!-- 今天去陪留守的小朋友一起画画，这是一个义工志愿者活动。

经游戏分组，我负责带5位小朋友，正巧是三胞胎和双胞胎。                     
杜晓凡、杜晓平、杜德俊（水饺）三兄妹，文殊琪、文殊曼（馒头）姐妹。混淆了好几次谁是馒头，谁是水饺后，我已经记住你们的名字了。                         
![5位小朋友](/assets/blogImg/volunteer1.jpg)                   -->

<!-- more -->

> 为了防止概念混淆，这里再强调下
> 一个DOM节点在某一时刻最多会有4个节点和他相关。
> current Fiber。如果该DOM节点已在页面中，current Fiber代表该DOM节点对应的Fiber节点。
> workInProgress Fiber。如果该DOM节点将在本次更新中渲染到页面中，workInProgress Fiber代表该DOM节点对应的Fiber节点。
> DOM节点本身。
> JSX对象。即ClassComponent的render方法的返回结果，或FunctionComponent的调用结果。JSX对象中包含描述DOM节点的信息。
> Diff算法的本质是对比1和4，生成2。

#### Diff的瓶颈以及React如何应对
由于Diff操作本身也会带来性能损耗，React文档中提到，即使在最前沿的算法中，将前后两棵树完全比对的算法的复杂程度为 O(n 3 )，其中n是树中元素的数量。

如果在React中使用了该算法，那么展示1000个元素所需要执行的计算量将在十亿的量级范围。这个开销实在是太过高昂。

为了降低算法复杂度，React的diff会预设三个限制：

只对同级元素进行Diff。如果一个DOM节点在前后两次更新中跨越了层级，那么React不会尝试复用他。

两个不同类型的元素会产生出不同的树。如果元素由div变为p，React会销毁div及其子孙节点，并新建p及其子孙节点。


#### Diff是如何实现的

入口: reconcileChildFibers()  

我们可以从同级的节点数量将Diff分为两类：

1. 当newChild类型为object、number、string，代表同级只有一个节点

2. 当newChild类型为Array，同级有多个节点


#### 单一节点的diff

还记得我们刚才提到的，React预设的限制么，

从代码可以看出，React通过先判断key是否相同，如果key相同则判断type是否相同，只有都相同时一个DOM节点才能复用。

这里有个细节需要关注下：

当child !== null且key相同且type不同时执行deleteRemainingChildren将child及其兄弟fiber都标记删除。

当child !== null且key不同时仅将child标记删除。


#### 多节点的diff

1. 节点更新

2. 节点新增或减少

3. 节点位置变化



第一轮遍历：处理更新的节点。

第二轮遍历：处理剩下的不属于更新的节点






