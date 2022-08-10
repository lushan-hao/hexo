---
layout: post
title: "JavaScript 深入(10, 11, 12)"
date: 2022-07-18 20:00
comments: true
tags:
  - javaScript
---

> 凡事都有偶然的凑巧，结果却又如宿命的必然。

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

> bind() 方法会创建一个新函数。当这个新函数被调用时，bind() 的第一个参数将作为它运行时的 this，之后的一序列参数将会在传递的实参前传入作为它的参数。(来自于 MDN )

确定 bind 函数两个特点：

- 返回一个函数
- 可以传入参数

进行一步一步实现：

```js
// 例子
var foo = {
  value: 1,
};
function bar() {
  console.log(this.value);
}
// 返回了一个函数
var bindFoo = bar.bind(foo);
bindFoo(); // 1
```

```js
// myBind
Function.prototype.myBind = function (context) {
  // 此时this指向调用bind方法的函数，即上面例子中的bar函数
  var self = this;
  // 此时返回函数，是为了防止函数自执行
  return function () {
    // 返回函数，执行时改变this指向
    return self.apply(context);
  };
};
```

上面那个例子写的时候我还有一点疑问，就是 return 的执行 call 是不是也可以，为什么使用 apply 呢，后来我更改成使用 call，发现结果是一样的，所以我感觉可能是 apply 相对于 call 基于 es5 传参,可能更方便一些，利于理解

第二步，函数传参，因为 bind 可以绑定 this 时进行一次传参，然后执行时进行一次传下，例子如下

```js
// 例子
var foo = {
  value: 1,
};
function bar(name, age) {
  console.log(this.value); // 1
  console.log(name); // daisy
  console.log(age); // 18
}
var bindFoo = bar.bind(foo, "daisy");
bindFoo("18");
```

函数需要传 name 和 age 两个参数，竟然还可以在 bind 的时候，只传一个 name，在执行返回的函数的时候，再传另一个参数 age。

```js
// 使用arguments进行实现
// 第二版
Function.prototype.myBind = function (context) {
  var self = this;
  // 这里是因为arguments不存在slice方法，所以需要使用call方法去执行
  var args = Array.prototype.slice.call(arguments, 1);
  return function () {
    // 这个同理，并且注意因为在这个函数中，所以和上面的arguments是不相同的
    var bindArgs = Array.prototype.slice.call(arguments);
    return self.apply(context, args.concat(bindArgs));
  };
};
```

最后一步，当 bind 返回的函数作为构造函数的时候，bind 时指定的 this 值会失效，但传入的参数依然生效。

> 一个绑定函数也能使用 new 操作符创建对象：这种行为就像把原函数当成构造器。提供的 this 值被忽略，同时调用时的参数被提供给模拟函数。

```js
// 例子
var value = 2;

var foo = {
  value: 1,
};

function bar(name, age) {
  this.habit = "shopping";
  console.log(this.value);
  console.log(name);
  console.log(age);
}

bar.prototype.friend = "kevin";

var bindFoo = bar.bind(foo, "daisy");

var obj = new bindFoo("18");
// undefined
// daisy
// 18
console.log(obj.habit);
console.log(obj.friend);
// shopping
// kevin
```

尽管在全局和 foo 中都声明了 value 值，最后依然返回了 undefind，说明绑定的 this 失效了，由于 new 方法， this 已经指向了 obj。
怎么实现呢？通过判断 this instanceof 函数

```js
// 使用arguments进行实现
// 第二版
Function.prototype.myBind = function (context) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  // 将这个函数给这个判断，方便后面判断绑定完bind的函数是否作为构造函数
  var fn = function () {
    var bindArgs = Array.prototype.slice.call(arguments);
    // 当作为构造函数时，this 指向实例，此时结果为 true，将绑定函数的 this 指向该实例，可以让实例获得来自绑定函数的值
    return self.apply(
      this instanceof fn ? this : context,
      args.concat(bindArgs)
    );
  };
  // 这一步是将例子中bar方法的原型上的属性继承过来
  fn.prototype = this.prototype;
  return fn;
};
```

1. 但是在这个写法中，直接将 fBound.prototype = this.prototype，直接修改 fBound.prototype 的时候，也会直接修改绑定函数的 prototype。这个时候，可以通过一个空函数来进行中转
2. 调用 bind 的不是函数咋办？需要报错

所以优化后

```js
// 优化后
Function.prototype.myBind = function (context) {
  if (typeof this !== "function") {
    throw new Error(
      "Function.prototype.bind - what is trying to be bound is not callable"
    );
  }
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  // 创建一个空函数来进行中转
  var fNOP = function () {};
  var fn = function () {
    var bindArgs = Array.prototype.slice.call(arguments);
    // 当作为构造函数时，this 指向实例，此时结果为 true，将绑定函数的 this 指向该实例，可以让实例获得来自绑定函数的值
    return self.apply(
      this instanceof fNOP ? this : context,
      args.concat(bindArgs)
    );
  };
  fNOP.prototype = this.prototype;
  fn.prototype = new fNOP();
  return fn;
};
```

#### JavaScript 深入之 new 的模拟实现

接下来开始有点难懂，又很让人着迷的 new 方法了

> new 运算符创建一个用户定义的对象类型的实例或具有构造函数的内置对象类型之一

```js
// 例子
function Otaku(name, age) {
  this.name = name;
  this.age = age;

  this.habit = "Games";
}

Otaku.prototype.strength = 60;

Otaku.prototype.sayYourName = function () {
  console.log("I am " + this.name);
};

var person = new Otaku("Kevin", "18");

console.log(person.name); // Kevin
console.log(person.habit); // Games
console.log(person.strength); // 60

person.sayYourName(); // I am Kevin
```

从这个例子中，我们可以看到，实例 person 可以：

- 访问到 Otaku 构造函数里的属性
- 访问到 Otaku.prototype 中的属性

使用函数来模拟 new 方法, 像下面这样

```js
function Otaku (参数) {
  ……
}
var person = objectFactory(Otaku, ……)
```

为 new 的结果是一个新对象，所以在模拟实现的时候，我们也要建立一个新对象，假设这个对象叫 obj，因为 obj 会具有 Otaku 构造函数里的属性，想想经典继承的例子，我们可以使用 Otaku.apply(obj, arguments)来给 obj 添加新的属性。
那实例怎么访问原型上的属性呢？实例的 proto 属性会指向构造函数的 prototype，也正是因为建立起这样的关系，实例可以访问原型上的属性。

```js
// 第一版代码
function objectFactory() {
  var obj = new Object(),
    Constructor = [].shift.call(arguments);

  obj.__proto__ = Constructor.prototype;

  Constructor.apply(obj, arguments);

  return obj;
}
```

- 用 new Object() 的方式新建了一个对象 obj
- 取出第一个参数，就是我们要传入的构造函数。此外因为 shift 会修改原数组，所以 arguments 会被去除第一个参数
- 将 obj 的原型指向构造函数，这样 obj 就可以访问到构造函数原型中的属性
- 使用 apply，改变构造函数 this 的指向到新建的对象，这样 obj 就可以访问到构造函数中的属性
- 返回 obj

优化：我们还需要判断返回的值是不是一个对象，如果是一个对象，我们就返回这个对象，如果没有，我们该返回什么就返回什么。

```js
// 最终版本
function objectFactory() {
  var obj = new Object();
  Constructor = [].shift.call(arguments);

  obj.__proto__ = Constructor.prototype;

  var ret = Constructor.apply(obj, arguments);

  return typeof ret === "object" ? ret : obj;
}
```
