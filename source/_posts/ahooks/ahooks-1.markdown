---
layout: post
title: "ahooks 源代码学习（一）"
date: 2022-06-27 19:00
comments: true
tags:
  - react
  - ahooks
---

> 无论人生上到哪一层台阶，阶下有人在仰望你，阶上亦有人在俯视你。你抬头自卑，低头自得，唯有平视，才能看见真正的自己。

<!-- more -->

ahooks 好久之前就知道，但是几乎不怎么使用，最近正在尝试使用一些，而且也对其中的一些简单的 hooks 的原理感兴趣，下面记录几个吧

#### 1. 第一个当然是最简单的（由浅入深）useToggle

[代码位置](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useToggle/index.ts)

```tsx
// 泛型，接口类型参数D、R，其中defaultValue类型为D，默认值为false；reverseValue可选参数为R
function useToggle<D, R>(
  defaultValue: D = false as unknown as D,
  reverseValue?: R
) {
  // state类型为D、R的联合类型, 默认值为defaultValue， 不传则为false
  const [state, setState] = useState<D | R>(defaultValue);
  // actions是一个对象，可以修改state数据的行为对象
  const actions = useMemo(() => {
    // reverseValue不存在则为defaultValue取反，存在则为reverseValue
    const reverseValueOrigin = (
      reverseValue === undefined ? !defaultValue : reverseValue
    ) as D | R;
    // 判断当前值，取另一个值
    const toggle = () =>
      setState((s) => (s === defaultValue ? reverseValueOrigin : defaultValue));
    // 赋值state为传参的值
    const set = (value: D | R) => setState(value);
    const setLeft = () => setState(defaultValue);
    const setRight = () => setState(reverseValueOrigin);
    return {
      toggle,
      set,
      setLeft,
      setRight,
    };
    // useToggle ignore value change
    // }, [defaultValue, reverseValue]);
  }, []);

  return [state, actions];
}
```

由上面源码可知，使用这个 hooks 时需要注意两个事情：

- 当 defaultValue 不是 boolean 值时， 注意一定要传第二个参数，不然使用 setRight 和 toggle 取反时，会出现问题
- 使用 set 方法时，value 时 D、R 的联合类型，如果不给 useToggle 传递泛型参数，比如'a'和'b'就会自动推断成 string，传参是不会进行严格校验，所以注意需要给 useToggle 传递泛型参数

#### 2. useBoolean

[代码位置](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useBoolean/index.ts)

```tsx
export default function useBoolean(defaultValue = false): [boolean, Actions] {
  const [state, { toggle, set }] = useToggle(defaultValue);

  const actions: Actions = useMemo(() => {
    const setTrue = () => set(true);
    const setFalse = () => set(false);
    return {
      toggle,
      set: (v) => set(!!v),
      setTrue,
      setFalse,
    };
  }, []);

  return [state, actions];
}
```

就是`useToggle`中的方法，而且限制了 defaultValue 的类型为 boolean 类型

#### 3. useMount

[代码位置](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMount/index.ts)

```ts
const useMount = (fn: () => void) => {
  if (process.env.NODE_ENV === "development") {
    if (!isFunction(fn)) {
      console.error(
        `useMount: parameter \`fn\` expected to be a function, but got "${typeof fn}".`
      );
    }
  }
  useEffect(() => {
    fn?.();
  }, []);
};
```

就是这么一段，在 useEffect 中执行传入的这个 fn

#### useLatest

[代码位置](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLatest/index.ts)

```ts
import { useRef } from "react";

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;

  return ref;
}

export default useLatest;
```

这里代码看我上一篇文章`hooks 闭包陷阱`有比较好的解释

#### useUnmount

[代码位置](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmount/index.ts)

```js
import { useEffect } from "react";
import useLatest from "../useLatest";
import { isFunction } from "../utils";

const useUnmount = (fn: () => void) => {
  if (process.env.NODE_ENV === "development") {
    if (!isFunction(fn)) {
      console.error(
        `useUnmount expected parameter is a function, got ${typeof fn}`
      );
    }
  }
  const fnRef = useLatest(fn);
  useEffect(
    () => () => {
      fnRef.current();
    },
    []
  );
};
export default useUnmount;
```

通过上面了解了 useLatest， 就可以发现 useUnmount， 通过 useLatest(fn)，每次都可以获取到最新的值，避免闭包陷阱的问题
