---
layout: post
title: "JavaScript 深入(1, 2, 3)"
date: 2022-07-13 20:00
comments: true
tags:
  - javaScript
---

> 我默默地收藏青春岁月里一个又一个琐碎而隐秘的瞬间，像小孩藏在口袋里的最后一颗糖，沮丧时才会撕开糖纸闻一闻，告诉自己，还有明天 还有明天。

<!-- more -->

[本文为我在冴羽大佬 github 上学习](https://github.com/mqyqingfeng/Blog/issues/2)

#### JavaScirpt 深入之从原型到原型链

1. 构造函数创建对象

```js
function Person() {} // 构造函数
var person = new Person(); // person为实例化对象
person.name = "Kevin";
```

例子中，就是定义了一个函数，也叫做构造函数，然后通过 new 方法实例了一个 person 对象

2. prototype
   每个函数都有一个 prototype 属性

> 注意： 记住 prototype 是函数才会有的属性，你可以发现 Object 也有这个属性，控制台打印一下你会发现 Object 是一个函数

![javaScript-prototype1](../../assets/blogImg/javaScript/javaScript-prototype1.png)

```js
function Person() {}
Person.prototype.name = "Kevin";
var person1 = new Person();
console.log(person1.name); // Kevin
```

函数的 prototype 属性指向了一个对象，这个对象正是调用该构造函数(Person)而创建的实例(person1)的原型，也就是这个例子中的 person1 的原型。
那什么是原型呢？你可以这样理解：每一个 JavaScript 对象(null 除外)在创建的时候就会与之关联另一个对象，这个对象就是我们所说的原型，每一个对象都会从原型"继承"属性。

```text
                                                prototype
person(实例化对象)  <----------  Person(构造函数) ----------> Person.prototype(实例原型)
```

3. proto
   每一个 JavaScript 对象(除了 null )都具有的一个属性，叫 proto，这个属性会指向该对象的原型。

```js
function Person() {}
var person = new Person();
console.log(person.__proto__ === Person.prototype); // true
```

![javaScript-proto](../../assets/blogImg/javaScript/javaScript-proto.png)

4.constructor
因为一个构造函数可以生成多个实例，但是原型指向构造函数倒是有的，这就要讲到第三个属性：constructor，每个原型都有一个 constructor 属性指向关联的构造函数。最开始的图片上可以看到

```js
function Person() {}
console.log(Person === Person.prototype.constructor); // true
```

更新逻辑图
![javaScript-constructor1](../../assets/blogImg/javaScript/javaScript-constructor1.png)

并且有一个 ES5 的方法,可以获得对象的原型`console.log(Object.getPrototypeOf(person) === Person.prototype) // true`

5. 实例和原型关系

当读取实例的属性时，如果找不到，就会查找与对象关联的原型中的属性，如果还查不到，就去找原型的原型，一直找到最顶层为止。(熟悉吗？原型链吗不是)

```js
function Person() {}

Person.prototype.name = "Kevin";

var person = new Person();

console.log(person.name); // Kevin
```

例子中 person 没有 name 属性，但是原型上有，所以顺着原型就找到了 name 属性， 万一没找到呢，原型的原型又是什么呢？

6. 原型的原型

```js
var obj = new Object();
obj.name = "Kevin";
console.log(obj.name); // Kevin
```

其实原型对象就是通过 Object 构造函数生成的，结合之前所讲，实例的 proto 指向构造函数的 prototype ，再更新下关系图：

![javaScript-prototype-prototype](../../assets/blogImg/javaScript/javaScript-prototype-prototype.png)

7. 原型链

```js
console.log(Object.prototype.__proto__ === null); // true, Object的proto就为null了
```

> null 表示“没有对象”，即该处不应该有值。所以代表 Object.prototype 没有原型

![javaScript-prototype2](../../assets/blogImg/javaScript/javaScript-prototype2.png)

图中由相互关联的原型组成的链状结构就是原型链，也就是蓝色的这条线

8. 补充：

```js
function Person() {}
var person = new Person();
console.log(person.constructor === Person); // true
console.log(person.constructor === Person.prototype.constructor); // true
```

- 当获取 person.constructor 时，其实 person 中并没有 constructor 属性,当不能读取到 constructor 属性时，会从 person 的原型也就是 Person.prototype 中读取，正好原型中有该属性
- proto ，绝大部分浏览器都支持这个非标准的方法访问原型，然而它并不存在于 Person.prototype 中，实际上，它是来自于 Object.prototype ，与其说是一个属性，不如说是一个 getter/setter，当使用 obj.proto 时，可以理解成返回了 Object.getPrototypeOf(obj)。(这里还是有点懵懵懂懂)

**以上就是 JavaScript 深入之从原型到原型链**

#### JavaScript 深入之词法作用域和动态作用域

1. 作用域
   作用域是指程序源代码中定义变量的区域，JavaScript 采用词法作用域(lexical scoping)，也就是静态作用域。

2. 静态作用域与动态作用域
   这里看的有一些混乱，所以我直接说结果吧

- 静态作用域：函数的作用域函数定义的时候就决定了（js）
- 动态作用域：函数的作用域在函数调用的时候才决定的（bash 语言）

```js
var value = 1;

function foo() {
  console.log(value);
}
function bar() {
  var value = 2;
  foo();
}
bar(); // 1
```

静态作用域：定义的时候就决定了，所以我执行时执行的 foo()，foo 的 value 自身不存在，所以使用的定义时位置上面的全局的 value
动态作用域：函数调用的时候才决定的，我执行 bar()，然后函数内部定义了一个 value，执行 foo 方法，没有 value，就找上一级的 bar 方法里面的

3. 思考

```js
// 1.
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f();
}
checkscope();
// 2.
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

都会打印：local scope,因为执行时会从函数自身定义位置往上去寻找

> JavaScript 函数的执行用到了作用域链，这个作用域链是在函数定义的时候创建的。嵌套的函数 f() 定义在这个作用域链里，其中的变量 scope 一定是局部变量，不管何时何地执行函数 f()，这种绑定在执行 f() 时依然有效。
>
> <p align="right">《JavaScript 权威指南》</p>

emm，可能还是有点懵，看看下面的

#### JavaScript 深入之执行上下文栈

先说明一点曾经的误区，javaScript 不是严格意义上顺序执行的，而是顺序的一段一段地分析执行

```js
function foo() {
  console.log("foo1");
}
foo(); // foo2
function foo() {
  console.log("foo2");
}
foo(); // foo2
```

都是 foo2，为什么呢？这其中涉及到了变量提升和函数提升，这个之后说，先继续“一段一段”执行

1. 可执行代码
   JavaScript 的可执行代码(executable code)的类型：
   全局代码、函数代码、eval 代码， 当执行到一个函数的时候，就会进行准备工作，这里的“准备工作”，也叫做"执行上下文(execution context)"。

2. 执行上下文
   JavaScript 引擎创建了执行上下文栈（Execution context stack，ECS）来管理执行上下文， 栈： 先进后出
   试想当 JavaScript 开始要解释执行代码的时候，最先遇到的就是全局代码，所以初始化的时候首先就会向执行上下文栈压入一个全局执行上下文，我们用 globalContext 表示它，并且只有当整个应用程序结束的时候，ECStack 才会被清空，所以程序结束之前， ECStack 最底部永远有个 globalContext：

```js
ECStack = [globalContext];
```

```js
// 于是模拟一下下面流程
function fun3() {
  console.log("fun3");
}
function fun2() {
  fun3();
}
function fun1() {
  fun2();
}
fun1();
```

```js
// 模拟-伪代码
// fun1()
ECStack.push(<fun1> functionContext);

// fun1中竟然调用了fun2，还要创建fun2的执行上下文
ECStack.push(<fun2> functionContext);

// 擦，fun2还调用了fun3！
ECStack.push(<fun3> functionContext);

// fun3执行完毕
ECStack.pop();

// fun2执行完毕
ECStack.pop();

// fun1执行完毕
ECStack.pop();

// javascript接着执行下面的代码，但是ECStack底层永远有个globalContext
```

所以 JavaScript 深入之词法作用域和动态作用域中最后一个问题他的两段代码是不是有些许不同

```js
// 1.
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f();
}
checkscope();
// 2.
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

```js

// 1.
ECStack.push(<checkscope> functionContext);
ECStack.push(<f> functionContext);
ECStack.pop();
ECStack.pop();

// 2.
ECStack.push(<checkscope> functionContext);
ECStack.pop();
ECStack.push(<f> functionContext);
ECStack.pop();
```

所以还是有区别的，可以理解为看到这个函数执行，即 checkscope()时，将这个函数 push 到上下文执行栈中，然后 pop
第一个例子我遇到了函数，所以 push 一个，然后有遇到个函数执行，所以还需要 push 一个，然后执行时 pop 出来，第二个函数是因为我执行完了，又执行一次，所以我还需要 push 和 pop
