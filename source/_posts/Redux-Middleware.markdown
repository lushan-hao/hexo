---
layout: post
title: "Redux-Middleware中间件"
date: 2022-05-18
comments: true
tags:
  - 面试
  - react
  - redux
---

> 撒谎不算本事，如果能自欺欺人就更完美了。

<!-- more -->

好久没用了redux-thunk、redux-saga了，写这个的时候忘的差不多了，-_-
这里我仅仅写简要步骤，怎么安装使用， 官网还是很详细的
[redux-hunk](https://github.com/reduxjs/redux-thunk)
[redux-saga](https://github.com/superRaytin/redux-saga-in-chinese)

#### Why

之前说的redux更新数据的操作是同步的，但是有时需要将一些数据存在store中，常用方法是在componentDidMount这个生命周期中请求数据，然后进行存储，但是如果需要发好多请求呢，componentDidMount这个生命周期需要负责的太多了，并且请求的数据也是数据，请求数据操作放在redux中岂不更香，这时我们需要借助中间件来帮我助我们实现

> 中间件作用于 action 发起之后，到达 reducer 之前，帮我我们完成一些异步操作等等

上掘金图片

![Redux-Middleware](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/78d03b01ff7c4e6281a54ea0ae0a1fa3~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)

### redux-thunk

可以让我们的action返回的是一个函数，而且可以是异步函数

> redux-thunk可以dispatch的action是一个函数，该函数会被调用, 并且会传给这个函数两个参数: 一个dispatch函数和getState函数
* dispatch函数用于之后再次派发action
* getState函数可以获取之前的一些状态


#### 使用
```js
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
 const store = createStore(
  reducers, 
  applyMiddleware(thunk)
);
```
> 其中applyMiddleware()是Redux的一个原生方法，将所有中间件组成一个数组，依次执行。

```js
const getAsyncList = (id) => {
  return async (dispatch, getState) => {
    const res = await axios.get(`http://baidu.com/web/test?id=${id}`)
    dispatch({type: 'ADD', payload: res?.name ?? 'zs'})
  }
}

const postList = () => {
  const action = getAsyncList('id')
  store.dispatch(action) // 注入action
}
```
> 简单说一说redux-thunk做了什么, 接受一个返回函数的action creator。如果这个action creator 返回的是一个函数，就执行它，如果不是，就按照redux正常执行执行。正因为这个action creator可以返回一个函数，那么就可以在这个函数中执行一些异步的操作

### redux-saga

> saga实现的方式是使用Generator, 流程上来说，就是dispatch一个action，那么我不仅仅在reducer中可以获取到这个action，我也会在saga中拦截到（如果saga这种存在的话），然后在saga中拦截到就可以执行后面的函数，这个函数可以是异步的，可以进行统一处理一步操作

redux-saga中的api有take、put、all、select这些，在redux-saga中将这些api都定义为Effect。在Effect执行后，当函数resolved时返回一个描述对象，然后saga根据这个描述对象恢复执行generator中的函数。

redux-saga中监听到了原始js对象action，并不会马上执行副作用操作，会先通过Effect方法将其转化成一个描述对象，然后再将描述对象，作为标识，再恢复执行副作用函数。

* 注意一点，saga坚听的action不可以是saga监听后执行的函数中发出的action（即到达reducer的action），否则容易出现死循环

#### API

* takeEvery
  用来监听action，当被监听的action被触发式，执行后面的函数
* takeLatest
  不允许并发，dispatch 一个 action 时，如果在这之前已经有一个相同的 action 在处理中，那么处理中的 action 会被取消，只会执行当前的
* call
  call(apply)主要用于异步请求，和js中的类似， call 和 apply 非常适合返回 Promise 结果的函数
* put
  put这个Effect方法跟redux原始的dispatch相似，都是可以发出action，且发出的action都会被reducer监听到。
  ```js
  yield put({type:'login'})
  ```
* all
  可以在yield的时候put多个action，也可以开启all里面的所有saga
* delay
  延迟相应时间，并返回回调成功的promise

> 嗯...，api有点多放个链接吧[redux-saga中文版](https://redux-saga-in-chinese.js.org/docs/advanced/)

#### 使用
```bash
yarn add redux-saga
```
```js
// index.js
import { GET_USER_DATA } from './actionType'

const getUserState = () => ({
  type: GET_USER_DATA,
})

componentDidMount () {
  // 触发GET_USER_DATA操作，会在saga中拦截
  const action = getUserState();
  store.dispatch(action);
}

// actionType.js
 xport const GET_USER_DATA = 'get_user_data'
```

```js
// saga.js
import { takeEvery, put, all } from 'redux-saga/effects'
import { GET_USER_DATA } from './actionType'

function* getUserList(action) {
  try {
    const res = yield axios.get('http://www.baidu.com')
    yield put(initList(res.data))
  } catch (e) {
    console.error(e, '请求失败')
  }
}

function* mySaga() {
  // 拦截GET_USER_DATA，去执行getUserList函数
  yield takeEvery(GET_USER_DATA, getUserList)
}

export default mySaga
```

### 区别

总的来说，redux-thunk其实做的并不多，仅仅是一个判断而已，但是saga其中包含很多API，学习成本较高，但是对于大项目来说，比redux-thunk更加合适，下期我打算说一说dva