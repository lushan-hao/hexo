---
layout: post
title: "JavaScript 深入(4, 5, 6)"
date: 2022-07-15 20:00
comments: true
tags:
  - javaScript
---

> 莫语常言道知足，万事至终总是空。理想现实一线隔，心无旁骛脚踏实。谁无暴风劲雨时，守得云开见月明。花开复见却飘零，残憾莫使今生留

<!-- more -->

[本文为我在冴羽大佬 github 上学习](https://github.com/mqyqingfeng/Blog/issues/5)

首先接上篇，说到当 JavaScript 代码执行一段可执行代码时，会创建对应的执行上下文。
对于执行上下文都有三个属性， 本文以这三个为主

- 变量对象（VO）
- 作用域链
- this

#### JavaScript 深入之变量对象

变量对象是与执行上下文相关的数据作用域，存储了在上下文中定义的变量和函数声明。
因为不同执行上下文下的变量对象稍有不同，主要说全局上下文下的变量对象和函数上下文下的变量对象。

1. 全局上下文
   全局上下文中的变量对象就是全局对象

那什么是全局对象呢？

> 全局对象是预定义的对象，作为 JavaScript 的全局函数和全局属性的占位符。通过使用全局对象，可以访问所有其他所有预定义的对象、函数和属性。

> 在顶层 JavaScript 代码中，可以用关键字 this 引用全局对象。因为全局对象是作用域链的头，这意味着所有非限定性的变量和函数名都会作为该对象的属性来查询。

> 例如，当 JavaScript 代码引用 parseInt() 函数时，它引用的是全局对象的 parseInt 属性。全局对象是作用域链的头，还意味着在顶层 JavaScript 代码中声明的所有变量都将成为全局对象的属性。

我看着也是很懵，不过下面有详细一点的介绍

- 可以通过 this 引用，在客户端 JavaScript 中，全局对象就是 Window 对象。
  `console.log(this);`
- 全局对象是由 Object 构造函数实例化的一个对象。
  `console.log(this instanceof Object);`
- 预定义了一大堆函数和属性。
  `console.log(this.Math.random());`
- 作为全局变量的宿主。
  `var a = 1; console.log(this.a);`
- 客户端 JavaScript 中，全局对象有 window 属性指向自身。

```js
var a = 1;
console.log(window.a);
this.window.b = 2;
console.log(this.b);
```

2. 函数上下文
   函数上下文中的变量对象是活动对象(AO)

通俗点讲就是：活动对象和变量对象其实是一个东西，只是变量对象不可在 JavaScript 环境中访问，只有到当进入一个执行上下文中，这个执行上下文的变量对象才会被激活，所以才叫 activation object (AO)，而只有被激活的变量对象，也就是活动对象上的各种属性才能被访问。VO 和 AO 它们其实都是同一个对象，只是处于执行上下文的不同生命周期

重点就是这句话：活动对象是在进入函数上下文时刻被创建的，它通过函数的 arguments 属性初始化。arguments 属性值是 Arguments 对象。

3. 执行过程
   执行上下文的代码会经历两个过程

- 进入执行上下文
- 代码执行

**进入执行上下文**

进入到执行上下文时，变量对象会包括

- 函数的所有形参
  由名称和对应值组成的一个变量对象的属性被创建
  没有实参，属性值设为 undefined
- 函数声明
  由名称和对应值（函数对象(function-object)）组成一个变量对象的属性被创建
  如果变量对象已经存在相同名称的属性，则完全替换这个属性
- 变量声明
  由名称和对应值（undefined）组成一个变量对象的属性被创建
  如果变量名称跟已经声明的形式参数或函数相同，则变量声明不会干扰已经存在的这类属性

总结一下上面几点：(注意变量声明和函数声明以 var 为主)
变量对象会包括三点：1. 函数的形参 2. 函数声明 3. 变量声明

- 对于函数形参，变量对象会创建形参名称的属性，如果有实参，则赋值给该属性，没有实参赋值为 undefined
- 对于函数声明，函数名称被创建，其对应值为 function-object，如之前声明过则被覆盖
- 对于变量声明，变量名称被创建，其对应值为 undefined，对于已经存在由形参和函数创建的相同名称的则会不影响，即不改变

来个例子：

```js
function foo(a) {
  var b = 2;
  function c() {}
  console.log(b);
  var d = function () {};
  b = 3;
}
foo(1);
```

进入执行上下文，活动对象（AO）为：

```js
AO = {
    arguments: {
        0: 1,
        length: 1
    },
    a: 1, // 形参创建
    b: undefined,
    c: reference to function c(){},
    d: undefined
}
```

**代码执行**
在代码执行阶段，会顺序执行代码，根据代码，修改变量对象的值
还是上面的例子，当代码执行完后，这时候的 AO 是：

```js
AO = {
    arguments: {
        0: 1,
        length: 1
    },
    a: 1,
    b: 3,
    c: reference to function c(){},
    d: reference to FunctionExpression "d"
}
```

上面代码里我加了一行的 console,打印出的 b 为 2，主要想表达的是执行按顺序来的，不会出现后面代码进行替换的问题

4. 总结：

- 全局上下文的变量对象初始化是全局对象
- 函数上下文的变量对象初始化只包括 Arguments 对象
- 在进入执行上下文时会给变量对象添加形参、函数声明、变量声明等初始的属性值
- 在代码执行阶段，会再次修改变量对象的属性值

5. 思考：

```js
function foo() {
  console.log(a);
  a = 1;
}

foo(); // ERROR： Uncaught ReferenceError: a is not defined

function bar() {
  console.log(a);
  var a = 1;
}
bar(); // undefined
```

例子我修改了一下，感觉这样更能体现出，通过 var 声明的进入 AO 中，值为 undefined，没有 var 声明的不会进 AO 中

```js
console.log(foo);

function foo() {
  console.log("foo");
}

var foo = 1;
```

这个例子打印函数，主要展现的是`对于变量声明，变量名称被创建，其对应值为 undefined，对于已经存在由形参和函数创建的相同名称的则会不影响，即不改变`

其实看完之后可以看看评论区，[JavaScript 深入之变量对象](https://github.com/mqyqingfeng/Blog/issues/5)，里面有好多例子可以验证自己是否已经完全掌握了

#### JavaScript 深入之作用域链

接下来讲解每个执行上下文中的第二个属性——作用域链， 因为这里看起来比较生涩，所以尽量使用原文章了，以免误导—\_—||
说这个之前，说一个方法`console.dir()`，可以更好的帮我们查看对应的[[Scopes]]

> 当查找变量的时候，会先从当前上下文的变量对象中查找，如果没有找到，就会从父级(词法层面上的父级)执行上下文的变量对象中查找，一直找到全局上下文的变量对象，也就是全局对象。这样由多个执行上下文的变量对象构成的链表就叫做作用域链。

以一个函数的创建和激活两个时期来讲解作用域链是如何创建和变化的:

1. 函数创建

首先确定函数的作用域在函数定义的时候就决定了，这是因为函数有一个内部属性 [[scope]]，当函数创建的时候，就会保存所有父变量对象到其中，你可以理解 [[scope]] 就是所有父变量对象的层级链，但是注意：[[scope]] 并不代表完整的作用域链！

```js
function foo() {
    function bar() {
        ...
    }
}
```

函数创建时：

```js
foo.[[scope]] = [
  globalContext.VO // 全局变量
];

bar.[[scope]] = [
    fooContext.AO, // 保存父变量的活动对象 - 函数上下文中的变量对象
    globalContext.VO
];
```

2. 函数激活

当函数激活时，进入函数上下文，创建 VO/AO 后，就会将活动对象添加到作用链的前端。这时候执行上下文的作用域链，我们命名为 Scope：

```js
Scope = [AO].concat([[Scope]]);
```

3. 捋一捋
   以下面的例子为例，结合着之前讲的变量对象和执行上下文栈，我们来总结一下函数执行上下文中作用域链和变量对象的创建过程：

```js
var scope = "global scope";
function checkscope() {
  var scope2 = "local scope";
  return scope2;
}
checkscope();
```

1.checkscope 函数被创建，保存作用域链到 内部属性[[scope]]

```js
checkscope.[[scope]] = [
    globalContext.VO
];
```

2.执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 函数执行上下文被压入执行上下文栈

```js
// 即之前的ECStack.push(<checkscope> functionContext);
ECStack = [checkscopeContext, globalContext];
```

3. checkscope 函数并不立刻执行，开始做准备工作，第一步：复制函数[[scope]]属性创建作用域链

```js
checkscopeContext = {
    Scope: checkscope.[[scope]],
}
```

4.第二步：用 arguments 创建活动对象，随后初始化活动对象，加入形参、函数声明、变量声明

```js
checkscopeContext = {
  AO: {
      arguments: {
          length: 0
      },
      scope2: undefined
  }，
  Scope: checkscope.[[scope]],
}
```

5.第三步：将活动对象压入 checkscope 作用域链顶端

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0,
    },
    scope2: undefined,
  },
  Scope: [AO, [[Scope]]],
};
```

6.准备工作做完，开始执行函数，随着函数的执行，修改 AO 的属性值

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0,
    },
    scope2: "local scope",
  },
  Scope: [AO, [[Scope]]],
};
```

7.查找到 scope2 的值，返回后函数执行完毕，函数上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

其中 2、7 是和前面说的和 js 的静态作用域的，4 和 6 是和上面说的变量对象有关逻辑，1、3、5 是刚才说的作用域链相关（1，3 函数创建，5 函数激活）

自己捋一下内容哈：
首先函数 checkscope 被创建，函数的作用域链保存到[[scope]]属性中，然后执行函数前，将其压入到执行上下文栈中，然后开始函数准备，就是讲之前创建的上下文复制到 Scope 中并创建活动对象 Ao 到其中，然后将 AO 压入到 Scope 中，此时函数准备工作结束，开始执行函数，修改 AO 属性值，这样 Scope 中就存在完整的作用域链（包含最新 AO 的），然后从上下文执行栈中弹出，此时已经就完毕了

#### JavaScript 深入之从 ECMAScript 规范解读 this

接下来就是 this，文章这里从从 ECMASciript 规范讲解 this 的指向，翻阅文档查看 this 指向 Σ( ° △ °|||)︴
开头一定得先说 ECMAScript 5.1 规范地址：（为什么先说，因为从规范角度出发，得熟读规范，我还没熟读。。。）

- 英文版：http://es5.github.io/#x15.1

- 中文版：http://yanhaijing.com/es5/#115

1. Types
   ECMAScript 的类型分为语言类型和规范类型。

- ECMAScript 语言类型是开发者直接使用 ECMAScript 可以操作的。其实就是我们常说的 Undefined, Null, Boolean, String, Number, 和 Object。
- 而规范类型相当于 meta-values，作用是用来描述语言底层行为逻辑，其中包含 Reference 类型。它与 this 的指向有着密切的关联

2. Reference
   Reference 类型就是用来解释诸如 delete、typeof 以及赋值等操作行为的。

> 尤大大说：这里的 Reference 是一个 Specification Type，也就是 “只存在于规范里的抽象类型”。它们是为了更好地描述语言的底层行为逻辑才存在的，但并不存在于实际的 js 代码中。

Reference 的构成，由三个组成部分，分别是：

- base value（就是属性所在的对象或者就是 EnvironmentRecord，它的值只可能是 undefined, an Object, a Boolean 等其中的一种）
- referenced name（就是属性的名称）
- strict reference

```js
var foo = 1;

// 对应的Reference是：
var fooReference = {
  base: EnvironmentRecord,
  name: "foo",
  strict: false,
};
```

```js
var foo = {
  bar: function () {
    return this;
  },
};
foo.bar(); // foo
// bar对应的Reference是：
var BarReference = {
  base: foo,
  propertyName: "bar",
  strict: false,
};
```

3. 获取 Reference 组成部分的方法

- GetBase: 返回 reference 的 base value。
- IsPropertyReference: 如果 base value 是一个对象，就返回 true。
- GetValue: 于从 Reference 类型获取对应值的方法, GetValue 返回对象属性真正的值,例如上面例子中的 1 和函数

4. 如何确定 this 的值

首先先说一下 MemberExpression

```js
function foo() {
  console.log(this);
}
foo(); // MemberExpression 是 foo

function foo() {
  return function () {
    console.log(this);
  };
}
foo()(); // MemberExpression 是 foo()

var foo = {
  bar: function () {
    return this;
  },
};
foo.bar(); // MemberExpression 是 foo.bar
```

所以简单理解 MemberExpression 其实就是()左边的部分。

**接着说如何确定 this 的值**

1.计算 MemberExpression 的结果赋值给 ref

2.判断 ref 是不是一个 Reference 类型

```text
2.1 如果 ref 是 Reference，并且 IsPropertyReference(ref) 是 true, 那么 this 的值为 GetBase(ref)
2.2 如果 ref 是 Reference，并且 base value 值是 Environment Record, 那么this的值为 ImplicitThisValue(ref)
2.3 如果 ref 不是 Reference，那么 this 的值为 undefined
```

MemberExpression 已经知道是什么，那么接下来说一说第二步，判断 ref 是不是一个 Reference 类型

上例子：

```js
var value = 1;
var foo = {
  value: 2,
  bar: function () {
    return this.value;
  },
};

//示例1
console.log(foo.bar());
//示例2
console.log(foo.bar());
//示例3
console.log((foo.bar = foo.bar)());
//示例4
console.log((false || foo.bar)());
//示例5
console.log((foo.bar, foo.bar)());
```

- 示例 1：
  第一步得 MemberExpression 为 foo.bar，
  第二步得查看规范 11.2.1 Property Accessors，这里展示了一个计算的过程，什么都不管了，就看最后一步：得知该表达式返回了一个 Reference 类型，然后得知：

```js
var Reference = {
  base: foo,
  name: "bar",
  strict: false,
};
```

> 2.1 如果 ref 是 Reference，并且 IsPropertyReference(ref) 是 true, 那么 this 的值为 GetBase(ref)

推断出此时的 this 为 base value 也就是 foo，可以输出 foo.value 为 2

- 示例 2：
  实际上 () 并没有对 MemberExpression 进行计算，所以其实跟示例 1 的结果是一样的。

- 示例 3.4.5；
  有赋值操作符，使用了 GetValue，所以返回的不是 Reference 类型，所以 this 为 undefinedthis 为 undefined，然后就像上找，输出结果为 1， 可以直接打印一下 this，你会发现返回的是 window 对象（这是因为非严格模式下， this 的值如果为 undefined，默认指向全局对象）

5. 补充
   一个最最普通的情况：

```js
function foo() {
  console.log(this);
}

foo();
```

MemberExpression 是 foo，解析标识符，查看规范 10.3.1 Identifier Resolution，会返回一个 Reference 类型的值：

```js
var fooReference = {
  base: EnvironmentRecord,
  name: "foo",
  strict: false,
};
```

接下来进行判断：

> 2.1 如果 ref 是 Reference，并且 IsPropertyReference(ref) 是 true, 那么 this 的值为 GetBase(ref)
> 2.2 如果 ref 是 Reference，并且 base value 值是 Environment Record, 那么 this 的值为 ImplicitThisValue(ref)

ImplicitThisValue 方法的介绍：该函数始终返回 undefined,所以最后 this 的值就是 undefined

emm，最后这部分判断出来的我很懵，看看 github，然后先简单读一读后面的，看看有没有继续拓展这部分
