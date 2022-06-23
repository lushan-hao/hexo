/*
 * @LastEditors: haols
 */
let nextUnitOfWork = null;

function workLoop(deadline) {
  let shouldYield = false;
  //render整个过程被分为许多unit，每执行完一个unit判断是否到允许中断的时间
  //当render完毕（没有unit）或到系统中断时间跳出循环
  while (nextUnitOfWork && !shouldYield) {
    //操作当前unit并返回下一个work unit
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  //用来做一个循环，浏览器会在主线程空闲时运行回调
  requestIdleCallback(workLoop);
}

//可以看作是一个没有明确时延的setTimeout，当主线程空闲时它将会执行回调函数
requestIdleCallback(workLoop); //react现在用scheduler package代替了这个方法，但是他们在思想上是一致的

function performUnitOfWork(nextUnitOfWork) {
  // TODO
}