---
layout: post
title: '开发实用工具'
date: 2023-08-25 21:00
comments: true
tags:
  - 工具
---

> 其实人就是生和死两个点，从前往后看都是大事，从后往前看都是小事。所有的困惑都是一时的，但可能你一生总有困惑，有的事很快就想明白了，有的事可能永远都想不明白，但是也无所谓了。所以，总会好起来的

<!-- more -->

<p><img src="/assets/blogImg/tools/react-tools.jpg" width="60%" height="400px"></p>

最近发现一个比较好的开发工具，还有之前用到的一个 google 插件，推荐给大家

#### react-render-tracker

React Render Tracker: 一个用于发现与意外重新渲染相关的性能问题的工具。

[React Render Tracker](https://github.com/lahmatiy/react-render-tracker)

##### 使用方法

github 上其实上就有，对于我个人来说，更喜欢在 chrome 上使用，下面简单说下 google devtools 上怎么使用

1. 安装 google 插件：[Rempl](https://chrome.google.com/webstore/detail/rempl/hcikjlholajopgbgfmmlbmifdfbkijdj?utm_source=ext_sidebar&hl=zh-CN)
2. 打开 react 项目，配置 script 标签，个人建议引入 cdn 文件，配置如下
   ```js
   <script
     src='https://cdn.jsdelivr.net/npm/react-render-tracker'
     data-config='inpage:false'
   ></script>
   ```
   我项目是 umi3.x，里面有 document.ejs 文件, 直接在这里面配置就好了，后面如果项目升级到 umi4 版本，可能会弄个 umi 的插件，这样方便其他项目进行直接使用

效果如下：
<img src="/assets/blogImg/tools/react-render-tracker-screen.png">

然后你点击更新的时候可以看到哪些有更新，和渲染的多少次和更新的事件等等，感觉很好用，我也是刚发现不久，后面我再挖掘其中的点

#### LocatorJS （google 插件）

LocatorJS: 单击浏览器中的任何组件，在 IDE 中打开其代码。

[LocatorJS](https://chrome.google.com/webstore/detail/locatorjs/npbfdllefekhdplbkdigpncggmojpefi?utm_source=ext_sidebar&hl=zh-CN)

mac：快捷方式是 opt + 页面点击

> 只要打开 vscode 项目，然后按照上面点击页面就可以 直接打开代码所在位置，十分好用

效果如下：

<img src="/assets/blogImg/tools/locatorjs-screen1.png">

<img src="/assets/blogImg/tools/locatorjs-screen2.png">
