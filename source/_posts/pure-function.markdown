---
layout: post
title: 浅谈函数式编程
date: 2022-05-09 22:00
comments: true
tags:
  - 函数式编程
---

> 十几岁的偷懒，二十岁的日夜弥补，曾经以为二十岁很遥远，却发现十八岁是很久之前的事情了

<!-- more -->

### 简介

百度百科、维基百科： 函数式编程是种编程方式，它将电脑运算视为函数的计算。函数编程语言最重要的基础是 λ 演算（lambda calculus），而且 λ 演算的函数可以接受函数当作输入（参数）和输出（返回值）。

简单说，"函数式编程"是一种"编程范式"，也就是如何编写程序的方法论。

众所周知 JavaScript 是一种典型的多范式编程语言（所谓编程范式(programming paradigm),指的是计算机编程的基本风格或典范模式。）

下面讲解一些函数式编程的知识和概念

### 纯函数

纯函数的定义是，对于相同的输入，永远会得到相同的输出，输出只依赖输入，而且没有任何可观察的副作用，也不依赖外部环境的状态

两个重点： **相同输入会有相同的输出， 输出只依赖输入**、**没有任何副作用**

```javascript
Array.concat(); // 纯函数
Array.splice(); // 非纯函数
```

下面列举 Array 的几种会改变数组的方法，

```javascript
fill()、pop()、push()、reverse()、shift()、sort()、splice()、unshift()、
```

下面有个例子：

```javascript
var zs = 18;
var checkage = (age) => age > zs;

var checkage = (age) => age > 18;

checkage(19);
```

结果都是 true，但是下面的是纯函数

#### 优点：

1. 因其在相同的输入总能得到相同的输出。而且纯函数能够根据输入来做缓存。
2. 纯函数让测试更方便，特别是可以编写单元测试
3. 可读性更强，函数就做自己做的事情，不用担心出现预期外的问题

#### 缺点：

1.  拓展性较差

#### 例子：

```javascript
function setColor (R, G, B) {
	cnost hex = rgbToHex(R, G, B)
	const colorMe = document.getElementById('root');
	colorMe.setAttribute('style', 'color' + hex);
} //  1.  2.
```

```javascript
const changeTable = (add) => {
  const arr = [1, 2];
  const table = [];
  table.push(add(arr[1], arr[2]));
  return table;
}; // add
```

#### 解决方法：

拿第一个那个非纯函数来说，依赖外面的变量`zs`，而且内部容易修改这个变量，这不是我们想要的

> 可以让 immutableState 成为一个不可变（immutable）对象，以保留纯粹性。实现方式为创建一个对象，然后调用[Object.freeze](<https://link.zhihu.com/?target=https%3A//msdn.microsoft.com/library/ff806186(v%3Dvs.94).aspx>)方法。

```javascript
let immutableState = Object.freeze ( {
   age：18
} )；
```

还有一种产生副作用，将副作用作为参数传进函数

```javascript
// 非纯函数
function logSomething(something) {
    const dt = (new Date())toISOString();
    console.log(`${dt}: ${something}`);
    return something;
}

// 改为纯函数
function logSomething(date, console, something) {
    const dt = date.toISOString();
    console.log(`${dt}: ${something}`);
    return something;
}
```

但是有时候需要和外界进行交互，产生副作用是必不可少的，所以说

> 并不是说，要禁止一切副作用，而是说，要让它们在可控的范围内发生。

接下来先说一个概念：

> 函数作为 JS 中的一级公民，可以被看作成值并用作数据使用。
>
> - 从常量和变量中引用它。
> - 将其作为参数传递给其他函数。
> - 作为其他函数的结果返回它。
>
> 其思想是将函数视为值，并将函数作为数据传递。通过这种方式，我们可以组合不同的函数来创建具有新行为的新函数。正因为 js 的这种特性，所以不可避免的衍生出下面几个概念

### 函数柯里化

> 通过**函数调用继续返回函数**的方式，实现**多次接收参数最后统一处理**的函数编码形式。

函数柯里化的定义很简单：传递给函数一部分参数来调用它，让它返回一个函数去处理剩下的参数。

柯里化可以帮我们做函数的缓存

```javascript
var add = function (x) {
  return function (y) {
    return x + y;
  };
};

//ES6写法，也是比较正统的函数式写法
var add = (x) => (y) => x + y;

var add2 = add(2); // 将值进行缓存 type function

add2(2); // 4
add2(3); // 5
```

> 事实上柯里化是一种“预加载”函数的方法，通过传递较少的参数，得到一个已经记住了这些参数的新函数，某种意义上讲，这是一种对参数的“缓存”，是一种非常高效的编写函数的方法

### 高阶函数

> 如果一个函数符合下面 2 个规范中的任何一个，那该函数就是高阶函数。
>
> ​ 1.若 A 函数，**接收的参数是一个函数**，那么 A 就可以称之为高阶函数。
>
> ​ 2.若 A 函数，**调用的返回值依然是一个函数**，那么 A 就可以称之为高阶函数

可以将回调函数作为参数传进另一个函数， 类似于 array 的 filter、map 和 reduce 他们都传进一个函数，他们都是高阶函数

并且都会返回新的元素，所以经常使用他们，会比较好

### 迭代和递归

迭代： while 和 for 循环

递归的好处：迭代时每次 i 和 total 都会发生改变，递归的好处就是每次他都接受变量，然后操作变量得到我们想要的值， 他每次都会保持相同的值

```
求和函数
function add (arr: string[]) {
	const total = 0;
    for (let i = 0; i < arr.length; i++) {
        total += arr[i]
    }
    return total
}
```

```
递归方式
function add (arr: string[]) {
	if (arr.length === 1) {
		return 1
	}
	return arr[0] + add(arr.slice(1))
}
```

### 声明式与命令式代码

命令式代码的意思就是，我们通过编写一条又一条指令去让计算机执行一些动作，这其中一般都会涉及到很多繁杂的细节。

而声明式就要优雅很多了，我们通过写表达式的方式来声明我们想干什么，而不是通过一步一步的指示。

```js
//命令式
var CEOs = [];
for (var i = 0; i < companies.length; i++) {
  CEOs.push(companies[i].CEO);
}

//声明式
var CEOs = companies.map((c) => c.CEO);
```

命令式的写法要先实例化一个数组，然后再对 companies 数组进行 for 循环遍历，手动命名、判断、增加计数器，就好像你开了一辆零件全部暴露在外的汽车一样，虽然很机械朋克风，但这并不是优雅的程序员应该做的。

声明式的写法是一个表达式，如何进行计数器迭代，返回的数组如何收集，这些细节都隐藏了起来。它指明的是做什么，而不是怎么做。

函数式编程的一个明显的好处就是这种声明式的代码，对于无副作用的纯函数，我们完全可以不考虑函数内部是如何实现的，专注于编写业务代码。优化代码时，目光只需要集中在这些稳定坚固的函数内部即可。

相反，不纯的函数式的代码会产生副作用或者依赖外部系统环境，使用它们的时候总是要考虑这些不干净的副作用。在复杂的系统中，这对于程序员的心智来说是极大的负担。

### 自己总结

个人感觉函数式编程是一种思想，优点还是蛮多的，可以帮我们避免许多预期之外的问题

### 链接：

书籍： JavaScript 函数式编程

链接：[JS 函数式编程指南中文版](https://www.bookstack.cn/books/mostly-adequate-guide-chinese)
