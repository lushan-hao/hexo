---
layout: post
title: "JavaScript 深入(7,8,9)"
date: 2022-07-17 20:00
comments: true
tags:
  - javaScript
---

> 你若盛开，蝴蝶自来；你若精彩，天自安排。

<!-- more -->

[本文为我在冴羽大佬 github 上学习](https://github.com/mqyqingfeng/Blog/issues/8)

#### JavaScript 深入之执行上下文

前面文章说过执行上下文有三个属性：1. 变量对象(VO), 2. 作用域链(Scope chain), 3.this

```js
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f();
}
checkscope();
```

接下来具体分析这一块代码

1.执行全局代码，创建全局执行上下文，全局上下文被压入执行上下文栈

```js
ECStack = [globalContext];
```

2.1 全局上下文初始化

```js
globalContext = {
  VO: [global],
  Scope: [globalContext.VO],
  this: globalContext.VO,
};
```

2.2 初始化的同时，checkscope 函数被创建，保存作用域链到函数的内部属性[[scope]]

```js
    checkscope.[[scope]] = [
      globalContext.VO
    ];
```

3.执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 函数执行上下文被压入执行上下文栈

```js
ECStack = [checkscopeContext, globalContext];
```

4.checkscope 函数执行上下文初始化：

- 复制函数 [[scope]] 属性创建作用域链，
- 用 arguments 创建活动对象，
- 初始化活动对象，即加入形参、函数声明、变量声明，
- 将活动对象压入 checkscope 作用域链顶端。
- 同时 f 函数被创建，保存作用域链到 f 函数的内部属性[[scope]]

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0
    },
    scope: undefined,
    f: reference to function f(){}
  },
  Scope: [AO, globalContext.VO],
  this: undefined
}
```

5.执行 f 函数，创建 f 函数执行上下文，f 函数执行上下文被压入执行上下文栈

```js
ECStack = [fContext, checkscopeContext, globalContext];
```

6.f 函数执行上下文初始化, 以下跟第 4 步相同：

- 复制函数 [[scope]] 属性创建作用域链
- 用 arguments 创建活动对象
- 初始化活动对象，即加入形参、函数声明、变量声明
- 将活动对象压入 f 作用域链顶端

```js
fContext = {
  AO: {
    arguments: {
      length: 0,
    },
  },
  Scope: [AO, checkscopeContext.AO, globalContext.VO],
  this: undefined,
};
```

7.f 函数执行，沿着作用域链查找 scope 值，返回 scope 值

8.f 函数执行完毕，f 函数上下文从执行上下文栈中弹出

```js
ECStack = [checkscopeContext, globalContext];
```

9.checkscope 函数执行完毕，checkscope 执行上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

接下来我尝试模拟一下第二段代码的执行过程。

```js
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f;
}
checkscope()();
```

1.首先上面 1. 2. 3. 4 步还是一样的

```js
// 执行全局代码，创建全局执行上下文，全局上下文被压入执行上下文栈
ECStack = [
    globalContext
];
// 全局上下文初始化
globalContext = {
  VO: [global],
  Scope: [globalContext.VO],
  this: globalContext.VO
}
// 初始化的同时，checkscope 函数被创建，保存作用域链到函数的内部属性[[scope]]
checkscope.[[scope]] = [
  globalContext.VO
];
// 执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 函数执行上下文被压入执行上下文栈
ECStack = [
  checkscopeContext,
  globalContext
];
// 复制函数 [[scope]] 属性创建作用域链，
// 用 arguments 创建活动对象，
// 初始化活动对象，即加入形参、函数声明、变量声明，
// 将活动对象压入 checkscope 作用域链顶端。
// 同时 f 函数被创建，保存作用域链到 f 函数的内部属性[[scope]]
checkscopeContext = {
  AO: {
    arguments: {
        length: 0
    },
    scope: undefined,
    f: reference to function f(){}
  },
  Scope: [AO, globalContext.VO],
  this: undefined
}

f.[[scope]] = [AO, checkscopeContext.AO, globalContext.VO];
```

注意是这里函数里定义了 f 函数，所以创建时会把其创建时的作用域链存在[[scope]]中

2. 接下来就不同了，checkscope 执行上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

3. 然后将 f 函数压入栈

```js
ECStack = [fContext, globalContext];
```

4. f 函数执行上下文初始化, 更之前操作一样

```js
//复制函数 [[scope]] 属性创建作用域链
// 用 arguments 创建活动对象
// 初始化活动对象，即加入形参、函数声明、变量声明
// 将活动对象压入 f 作用域链顶端
fContext = {
  AO: {
    arguments: {
      length: 0,
    },
  },
  Scope: [AO, checkscopeContext.AO, globalContext.VO],
  this: undefined,
};
```

5.f 函数执行，沿着作用域链查找 scope 值，返回 scope 值
6.f 函数执行完毕，f 函数上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

#### JavaScript 深入之闭包

> 自由变量是指在函数中使用的，但既不是函数参数也不是函数的局部变量的变量。

> MDN 定义：闭包是指那些能够访问自由变量的函数。

所以推断出： 闭包 = 函数 + 函数能够访问的自由变量
所以下面例子也是个闭包

```js
var a = 1;
function foo() {
  console.log(a);
}
foo();
```

emm，颠覆认知了，但是别慌，ECMAScript 中，闭包指的是：

- 从理论角度：所有的函数。因为它们都在创建的时候就将上层上下文的数据保存起来了。哪怕是简单的全局变量也是如此，因为函数中访问全局变量就相当于是在访问自由变量，这个时候使用最外层的作用域。
- 从实践角度：以下函数才算是闭包：
  即使创建它的上下文已经销毁，它仍然存在（比如，内部函数从父函数中返回）
  在代码中引用了自由变量

上一节中，为什么 checkscope 函数上下文已经出栈了，但是 f 还可以获取其中的变量对象呢，就是因为 f 函数声明时会将作用域链先存储起来，这也是闭包为什么会存储对应值的原因，将传参用来声明形参并赋值，将这个值存储在闭包的匿名函数中。

```js
var data = [];

for (var i = 0; i < 3; i++) {
  data[i] = function () {
    console.log(i);
  };
}
data[0]();
data[1]();
data[2]();
```

结果都是 3，分析一下

1.当执行到 data[0] 函数之前，此时全局上下文的 VO 为：

```js
globalContext = {
    VO: {
        data: [...],
        i: 3 // 当执行到data[0]函数的时候，for循环已经执行完了，i是全局变量，此时的值为3
    }
}
```

2.当执行 data[0] 函数的时候，data[0] 函数的作用域链为：

```js
data[0]Context = {
    Scope: [AO, globalContext.VO]
}
```

3. data[0]Context 的 AO 并没有 i 值，所以会从 globalContext.VO 中查找，i 为 3，所以打印的结果就是 3。

改成闭包看看：

```js
var data = [];

for (var i = 0; i < 3; i++) {
  data[i] = (function (i) {
    return function () {
      console.log(i);
    };
  })(i);
}

data[0]();
data[1]();
data[2]();
```

1.当执行到 data[0] 函数之前，此时全局上下文的 VO 为：跟没改之前一模一样。

```js
globalContext = {
    VO: {
        data: [...],
        i: 3
    }
}
```

2.当执行 data[0] 函数的时候，data[0] 函数的作用域链发生了改变：

```js
data[0]Context = {
    Scope: [AO, 匿名函数Context.AO globalContext.VO]
}
```

3. 匿名函数执行上下文的 AO 为：

```js
匿名函数Context = {
  AO: {
    arguments: {
      0: 0,
      length: 1,
    },
    i: 0,
  },
};
```

data[0]Context 的 AO 并没有 i 值，所以会沿着作用域链从匿名函数 Context.AO 中查找，这时候就会找 i 为 0，找到了就不会往 globalContext.VO 中查找了，即使 globalContext.VO 也有 i 的值(值为 3)，所以打印的结果就是 0。data[1] 和 data[2] 是一样的道理。所以闭包就可以把当前值存储下来

#### JavaScript 深入之参数按值传递

> ECMAScript 中所有函数的参数都是按值传递的。也就是说，把函数外部的值复制给函数内部的参数，就和把值从一个变量复制到另一个变量一样。

看三个例子

```js
// 按值传递
var value = 1;
function foo(v) {
  v = 2;
  console.log(v); //2
}
foo(value);
console.log(value); // 1
```

```js
// 引用传递
var obj = {
  value: 1,
};
function foo(o) {
  o.value = 2;
  console.log(o.value); //2
}
foo(obj);
console.log(obj.value); // 2
```

```js
var obj = {
  value: 1,
};
function foo(o) {
  o = 2;
  console.log(o); //2
}
foo(obj);
console.log(obj.value); // 1
// 共享传递
```

第一个例子按照上面的解释很好理解，传进一个 value 为 1，相当于拷贝了一份 value， 修改了拷贝的值，不会对传参修改

第二个例子传进的是一个引用数据类型就发生改变了，这好像引用传递一样，共用的一个对象，函数更改实参其内部，实参发生了改变(其实看到这里，一瞬间想到了之前说的纯函数了，正常情况一定不要改传参哈)
注意：js 函数不是引用传递，只是说这个例子像引用传递一样

第三个例子，没有实参内部的值，而是直接改变，此时不改变实参，其实这就是共享传递，共享传递是指，在传递对象的时候，传递对象的引用的副本。**按引用传递是传递对象的引用，而按共享传递是传递对象的引用的副本！**

所以总结可以理解为：

- 参数如果是基本类型是按值传递，如果是引用类型按共享传递。

** 按值传递拷贝了原值，按共享传递拷贝了引用，都是拷贝值，所以可以理解成都是按值传递。**

怎么验证自己学没学会，看 github 评论区，有人评论一篇文章，看一看可以加强学习，最起码可以验证一下学会否[https://juejin.cn/post/7083119474114560007/](https://juejin.cn/post/7083119474114560007/)

[JavaScript 深入之参数按值传递](https://github.com/mqyqingfeng/Blog/issues/10)
