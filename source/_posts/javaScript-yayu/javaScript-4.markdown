---
layout: post
title: "JavaScript 深入(10, 11, 12)"
date: 2022-07-18 20:00
comments: true
tags:
  - javaScript
---

> 你若盛开，蝴蝶自来；你若精彩，天自安排。

<!-- more -->

[本文为我在冴羽大佬 github 上学习](https://github.com/mqyqingfeng/Blog/issues/11)

接下来是我认为很重要的知识点了，call、apply、bind 和 new 了，go go go

#### JavaScript 深入之 call 和 apply 的模拟实现

[JavaScript 深入之参数按值传递](https://github.com/mqyqingfeng/Blog/issues/13)

> call() 方法在使用一个指定的 this 值和若干个指定的参数值的前提下调用某个函数或方法。

```js
var foo = {
  value: 1,
};

function bar() {
  console.log(this.value);
}

bar.call(foo); // 1
```

- 1.首先说一下 call 方法需要实现的三点； 1.调用 call 方法的时候，这个函数中的 this，指向第一个参数，并调用这个 bar 函数
  将函数设为对象的属性
  执行该函数
  删除该函数
- 2.call 方法可以给函数 bar 传参，从 call 方法中第二个参数至结束都是 bar 函数要接收的参数
  Arguments 对象中取值，取出第二个到最后一个参数，然后放到一个数组里， 然后用 eval 方法拼成一个函数，
- 3.this 参数可以传 null，当为 null 的时候，视为指向 window，函数是可以有返回值的

接下来按部署进行一下编写

```js
// 第一步
Function.prototype.myCall = function (context) {
  // 这里的this目前指向调用的，即bar这个函数
  context.fn = this;
  context.fn();
  delete context.fn;
};

// 测试一下
var foo = {
  value: 1,
};

function bar() {
  console.log(this.value);
}

bar.myCall(foo); // 1
```

第二步：arguments 对象中取值，取出第二个到最后一个参数，然后放到一个数组里， 然后用 eval 方法拼成一个函数，

```js
// 第二步 es6拓展运算符还是轻松啊，不过es3写法还是换一种
Function.prototype.myCall = function (context) {
  var arr = []; // 新增部分
  for (var i = 1; i < arguments.length; i++) {
    // 新增部分
    arr.push(arguments[i]);
  }
  context.fn = this;
  context.fn(...arr); // 新增部分
  delete context.fn;
};
```

> eval() 函数会将传入的字符串当做 JavaScript 代码进行执行。

```js
// 换个写法
Function.prototype.myCall = function (context) {
  context.fn = this;
  var args = [];
  for (var i = 1, len = arguments.length; i < len; i++) {
    // 执行后 args为 ["arguments[1]", "arguments[2]", "arguments[3]"]
    args.push("arguments[" + i + "]");
  }
  // 在eval中，args 自动调用 args.toString()方法，将这个数组变成函数的各个参数
  eval("context.fn(" + args + ")");
  delete context.fn;
};
```

```js
// 测试一下
var foo = {
  value: 1,
};

function bar(name, age) {
  console.log(name);
  console.log(age);
  console.log(this.value);
}

bar.myCall(foo, "ke, vin", 18);
```

第三步：this 参数可以传 null，当为 null 的时候，视为指向 window，函数是可以有返回值的

```js
// 修改如下
Function.prototype.myCall = function (context) {
  var context = context || window; // 新增
  context.fn = this;

  var args = [];
  for (var i = 1, len = arguments.length; i < len; i++) {
    args.push("arguments[" + i + "]");
  }

  var result = eval("context.fn(" + args + ")");

  delete context.fn;
  return result; // 新增
};
```

至此，call 方法完成了

**apply 方法和 call 类似，唯一不同的是 apply 仅接受两个参数，第二个参数是一个数组，数组每个值作为函数参数**
其实改变的就是对传参的取值，然后交给函数执行罢了

```js
Function.prototype.apply = function (context, arr) {
  // 严格模式下
  var context = Object(context) || window;
  context.fn = this;

  var result;
  if (!arr) {
    result = context.fn();
  } else {
    var args = [];
    for (var i = 0, len = arr.length; i < len; i++) {
      args.push("arr[" + i + "]");
    }
    result = eval("context.fn(" + args + ")");
  }

  delete context.fn;
  return result;
};
```

#### JavaScript 深入之 bind 的模拟实现

come on，bind 来了
