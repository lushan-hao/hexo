/*
 * @LastEditors: haols
 */
// createElement
export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// render
function render(element, container) {
  // 我们首先使用元素类型创建 DOM 节点，然后将新节点附加到容器中。
  // const dom = document.createElement(element.type)
  // 上面的替换为下面，因为需要处理文本元素，如果元素类型是TEXT_ELEMENT我们创建一个文本节点而不是常规节点
  element.type == "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type)

  // 元素道具分配给节点。
  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  // 递归地为每个孩子做相同的操作。
  element.props.children.forEach(child =>
    render(child, dom)
  )

  container.appendChild(dom)
}

const ownReact = {
  createElement,
  render,
};

export default ownReact


/** @jsx ownReact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);
const container = document.getElementById("root");
ownReact.render(element, container);