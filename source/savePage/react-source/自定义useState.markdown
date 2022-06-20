```js
export default function App() {
  // 首次render时是mount
  let isMount = true;
  let workInProgressHook;

  const fiber = {
    // 保存该FunctionComponent对应的Hooks链表
    memoizedState: null,
    // 指向App函数
    stateNode: App,
  };

  function schedule() {
    // 更新前将workInProgressHook重置为fiber保存的第一个Hook
    workInProgressHook = fiber.memoizedState;
    // 触发组件render
    fiber.stateNode();
    // 组件首次render为mount，以后再触发的更新为update
    isMount = false;
  }
  function dispatchAction(queue, action) {
    // 创建update
    const update = {
      // 触发行为
      action,
      // 与同个hook其他更新形成链表
      next: null,
    };
    // 环状单向链表操作
    if (queue.pending === null) {
      // 产生第一个update-u0，与自身形成环
      update.next = update;
    } else {
      // 第二次更新u1，这一步是把此次更新插到u0前面
      update.next = queue.pending.next;
      // 这一步是将结尾处的next指向此次更新，完成环的操作
      queue.pending.next = update;
    }
    // 放在queue.pending中
    queue.pending = update;

    // 模拟React开始调度更新
    schedule();

    // 捋一下流程
    /*
    第一次更新u0:
      1. 创建update（用update0代替）, update0 = { next = null }， 此时queue.pending = null
      2. 执行update.next = update; 即update0 = { next = update0 }， 此时和自身形成了一个环, 即u0 -> u0
      3. 将update赋值给queue.pending  即  queue.pending = update0 = { next = update0 }
    第二次更新u1：
      1. 创建update， update1 = { next = null }， 此时queue.pending = update0 = { next = update0 }
      2. 执行update.next = queue.pending.next; 即update1 = { next = update0 },即 u1 -> u0 -> u0 -> u0
      3. 执行queue.pending.next = update; 即update0.next = update1, 即 u0 -> u1 -> u0，形成环
      4. 执行queue.pending = update; 即 queue.pending = update1 = { next = update0 }
    第三次执行更新u2：
      1. 创建update， update2 = { next = null }， 此时queue.pending = update1 = { next = update0 }
      2. 执行update.next = queue.pending.next; 即update2 = { next = update0 },即 u2 -> u0 -> u1 -> u0 -> u1
      3. 执行queue.pending.next = update; 即update1.next = update2, 即 u2 -> u0 -> u1 -> u2，形成环
      4. 执行queue.pending = update; 即 queue.pending = update2 = { next = update0（里面{ next = update1 }） }
    最后：
    queue.pending始终指向最后一个插入的update。当我们要遍历update时，queue.pending.next指向第一个插入的update。
    **/
  }

  function useState(initialState) {
    let hook;

    if (isMount) {
      hook = {
        queue: {
          pending: null,
        },
        memoizedState: initialState,
        next: null,
      };
      if (!fiber.memoizedState) {
        fiber.memoizedState = hook;
      } else {
        workInProgressHook.next = hook;
      }
      workInProgressHook = hook;
    } else {
      hook = workInProgressHook;
      workInProgressHook = workInProgressHook.next;
    }

    let baseState = hook.memoizedState;
    if (hook.queue.pending) {
      let firstUpdate = hook.queue.pending.next;

      do {
        const action = firstUpdate.action;
        baseState = action(baseState);
        firstUpdate = firstUpdate.next;
      } while (firstUpdate !== hook.queue.pending);

      hook.queue.pending = null;
    }
    hook.memoizedState = baseState;
    console.log("object :>> ", baseState);
    return [baseState, dispatchAction.bind(null, hook.queue)];
  }

  const [num, updateNum] = useState(0);
  console.log("num :>> ", num);
  // 1. 发生更新，更新触发重新render   - mount更新，更新为initState  - updateNum更新，更新值为计算后的结果
  // 2. render时，useState返回的值为更新后的值
  return (
    <p
      onClick={() => {
        console.log("1", 1);
        updateNum((num) => num + 1);
      }}
    >
      {num}
    </p>
  );
}
```
