---
layout: post
title: "redux、react-redux"
date: 2022-05-14 11:21
comments: true
tags:
  - 面试
  - react
  - redux
---

> 我们都是一样的人，庸庸碌碌，看上去不配拥有出众的故事。然而，我们都有自己那个，独一无二的秘密。

<!-- more -->

有一说一，我之前绝对想把 redux、react-redux、redux-thunk 和 redux-saga 全在这篇文章中写出来，发现太多了，大家阅读也会累，所以这篇文章先讲 redux 和 react-redxu 吧

## redux

这篇文章存在的意义就是，公司内部对 dva 进行二次封装，操作简单了，但是使用时间久了，redux 及他的一些中间件已经记忆模糊了，巩固一下吧，简单说一下他的 What、Why 和 How 吧

### **一、简介**

**Why**:

有一说一,我前端开发的时间不算很长，以我的角度理解，如果说页面中涉及到的展示逻辑和操作逻辑不是很复杂，不需要过多的状态共享、数据层层下传过多的话的话，使用**redux**这种状态管理在我看来不是必须的，使用**context**或者**useContext**都是可以的  
([使用 context 有些需要考虑一些事情，这里不做过多描述，官网有比较好的说法](https://zh-hans.reactjs.org/docs/context.html))

> 那么说如果项目中需要管理的状态很多去控制页面的逻辑，跨层级分享，使用 redux 就是几种常用解决方案中相较 react 比较好的一个选择（状态管理很多，redux 不是唯一的方法，相较成熟、全面）

**What**:

React 只是在视图层帮助我们解决了 DOM 的渲染过程, state 由我们自己管理，redux 是 JavaScript 的状态容器, 提供了可预测的状态管理，简而言之，就是 react 只是帮助我们更多的管理视图，但是其中的 state 还是需要我们自己去管理，redux 就是更好的帮助我们管理 state

**How**:

有一说一，我之前就被这个 redux、react-redux 整混过，redux 甚至可以配合 Vue，不一定偏偏 React, react-redux 更严谨的说是 redux 官方发布的更好的基于 react 管理 redux 的一个库，区分好之后，就可以使用他们两个了，在使用之前，先需要明白 redux 的几个概念

### redux 核心

三个关键词：store、action、reducer

#### store

store 是 redux 的核心，负责整合 action 和 reducer

```js
创建：const store = createStore（reducer）
获取数据：store.getState()
更新数据：store.dispatch(action)
```

#### action

redux 要求我们通过 action 来更新 state, 这样也更方便我们进行数据追踪

- 所有数据的变化, 必须通过 dispatch 派发 action 更新
- action 是一个 js 对象，用来描述这次更新的 type 和 content

```js
{ type: 'CHANGE_NUMBER', data: { number: 1 } }
```

#### reducer

根据旧的 state 和 action， 产生新的 state 的纯函数

- reducer 是一个纯函数
- reducer 做的事情就是将传入的 state 和 action 结合起来来生成一个新的 state

```js
export default (state = defaultState, action) => {
  if (action.type === "CHANGE_NUMBER") {
    const newState = JSON.parse(JSON.stringify(state)); // 简单的深拷贝
    newState.number = action.value;
    return newState;
  }
  return state;
};
```

#### redux 的三大原则

- 单一数据源

整个应用程序的 state 被存储在一颗 object tree 中, 并且这个 object tree 只存储在一个 store  
单一的数据源可以让整个应用程序的 state 变得方便维护、追踪、修改

- State 是只读的

唯一修改 state 的方法一定是触发 action, 不要试图在其它的地方通过任何的方式来修改 state

- 使用纯函数来执行修改

通过 reducer 将旧 state 和 action 联系在一起, 并且返回一个新的 state
随着应用程序的复杂度增加，我们可以将 reducer 拆分成多个小的 reducers，分别操作不同 state tree 的一部分
但是所有的 reducer 都应该是纯函数，不能产生任何的副作用

> 这里我们比较常用的操作就是拷贝出一个新的 state，有时或许会使用{...state}，但是记住这是浅拷贝，有时会出现问题的

### redux

其实部分使用方法，已经在 redux 核心那一部分写过了，这里简单说一说流程（我图画的不好，网上有比较好的，直接用一用）

![redux流程](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4b8a429c6db8412e9b31e6983da75b0a~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)

这里类比一下可能比较好，
老板 -> react 的组件
（丢弃、购买）商品的指令 -> action
库房管理员 -> store
库房 -> reducer

老板要丢掉库房里面的一件物品，给（dispatch）库房管理员一个丢掉（type）的指令，库房管理员接收到丢弃的指令后，去库房丢掉了商品，并把库房现有的所有商品告诉给了老板

上面的换成 react 就是：

component -> action: dispatch（type， value） -> store -> reducer -> new State -> component

为什么要这么复杂呢，结合上面说的，我修改 state 只能通过 action（指令）去修改，确保数据的历史可以被追溯

```js
//  reducer.js文件
import { createStore } from "redux";

// 初始化state
const state = { number: 0 };

function reducer(newState = state, action = { num: 2 }) {
  switch (action.type) {
    case "ADD":
      return { number: newState.number - action.num };
    case "SUBTRACT":
      return { number: newState.number + action.num };
    default:
      return newState;
  }
}

export const store = createStore(reducer);
```

```js
// index.js文件
import { store } from "./reducer.js";
// 创建store

// 4.action
const action1 = { type: "ADD" };
const action2 = { type: "SUBTRACT", num: 2 };

// 5.订阅store的修改
store.subscribe(() => {
  console.log("state发生了改变: ", store.getState().number);
});

store.dispatch(action1);
store.dispatch(action2);
```

- createStore 可以用来创建 store 对象
- store.dispatch 用来派发 action , action 会传递给 store
- reducer 接收 action,reducer 计算出新的状态并返回它 (store 负责调用 reducer)
- store.getState() 这个方法可以帮助获取 store 里边所有的数据内容
- store.subscribe()方法可以让让我们订阅 store 的改变，只要 store 发生改变， store.subscribe 这个函数接收的这个回调函数就会被执行

### react-redux

#### 使用

```bash
npm install react-redux -g
```

在整个 react 组件的最外层注入 redux

```js
import { Provider } from "react-redux";
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
```

每个组件内部连接组件和数据

```js
import { connect } from "react-redux";
// 传递依赖的state和修改数据的disptach方法
export default connect(mapStateToProps, mapDispatchToProps)(MyComponent);
```

#### 作用

- connect 方法
  > 将组件和数据连接起来，connect 是一个高阶函数，接收两个参数，一个是 mapStateToProps（依赖的 state）和 mapDispatchToProps（修改 state 的方法），返回一个函数，这个函数接受一个参数，是我们写的组件

```js
class MyComponent extends PureComponent {
  render() {
    return <div></div>;
  }
}

const mapStateToProps = (state) => ({
  count: state.count,
});

const mapDispatchToProps = (dispatch) => ({
  add() {
    dispatch(addOne());
  },
});
export default connect(mapStateToProps, mapDispatchToProps)(MyComponent);
```

componentDidMount 阶段订阅数据发生变化， 修改数据，重新 render
componentWillUnmount 阶段取消取消订阅
将组件需要依赖的 state 和 dispatch 作为 props 进行传递

```
// 再多数两句, 内部做的几个事情


```

- <Provider>组件
  connect 生成的组件需要拿到 state 对象，使用 Provider 包裹，那么其子孙组件就可以拿到注入的 state 对象，利用 React 的 context 方法

- useSelector

简单说一下这个方法吧，作用：从 Redux 的 store 中取

```js
const count = useSelector((state) => state.count);
```

#####

##**五、参考资料**

- [一文总结 redux、react-redux、redux-thunk、redux-saga](https://juejin.cn/post/6880011662926364679#heading-19)
- [【React 学习笔记】Redux，React-redux，Redux-thunk 的使用](https://juejin.cn/post/6921905842337873928)
- [Redux 英雄指南](https://juejin.cn/post/6998087920515022884)
