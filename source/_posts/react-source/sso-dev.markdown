---
layout: post
title: "sso（单点登录）的开发模式"
date: 2022-09-30 18:20
comments: true
tags:
  - sso
  - 开发思考
---

> 世人日复一日慌慌张张，也不过是为了碎银几两，可偏偏这碎银几两，能解世间各种慌张。

<!-- more -->

emm, 生于忧患，死于安乐， 好久没更新这个博客了，今天来说一说我对于单点登录的项目，前端怎么开发的思考

#### 单点登录

百度百科：单点登录（Single Sign On），简称为 SSO，是比较流行的企业业务整合的解决方案之一。SSO 的定义是在多个应用系统中，用户只需要登录一次就可以访问所有相互信任的应用系统。

#### 背景

简单点来说就是，登录一次系统就可以访问其他相关的系统，但是今天不是想表达的重点。
背景: 公司有好几个不同的项目，但是每个项目都是互相关联的，所以额外有个项目叫用户中心，用于登录和管理各个应用的用户，所有系统通过用户中心进行登录，但是这样前端开发就很苦恼，接下具体说一说哪些地方让人感到苦恼。

#### 流程

首先，需要知道整体流程，即打开项目地址，接口进行请求，判断当前无用户登录，这样接口返回 302、和用户中心地址，用于登录，前端进行跳转，跳转到用户中心，用户登录，选择项目进入

项目 1 -> 用户中心（登录） -> 用户中心（选择项目进入） -> 项目 1

#### 问题

前端开发启动项目，需要连接服务获取数据，正常开发是前端连后端服务进行开发、联调。也可以直接连测试环境，获取测试环境数据，进行开发排错
但是基于单点登录的就有下面几种方式

对于连接后端开发人员服务：

1. 需要前端、后端再启动用户中心项目，然后需要一些很繁琐的配置修改，相当于将所有服务放到后端
2. 前端该项目使用该项目原本 login 页面，登录该页面，后端通过该请求参数，调用用户中心的服务、库等返回用户信息，实现登录系统

对于上面这种，联调不会出现什么问题，我一般使用第二种，毕竟前后端多启动一个服务也太繁琐，问题不大， 想重点说的是下面这种情况

**对于前端直接连接测试环境服务（这个比较常用吧，因为后端开发人员服务不是一直存在的，而且后端开发人员还需要重启、打断点等等）:**

前端无法直接连接，因为测试环境返回的地址是用户中心的测试地址，这就很难受了，所以下面有几种方案

#### 方案

首先想一下，为什么会出现这个原因，问题就是 302 重定向了，但是导致重定向的原因是当前用户没有登录，也就是当前 cookie 中并没有存在当前用户的信息，那我们让 cookie 存在浏览器中就可以

测试环境： https://test.haols.com

1.使用 cookie 子域名共享的办法，配置 host

```text
127.0.0.1 dev.test.haols.com
```

本地启动，proxy 配置测试环境，先登录测试环境，启动本地项目地址为`dev.test.haols.com:8000`(默认项目启动 8000 端口)

> 原理就是登录完测试环境，将 cookie 存储在`test.haols.com`域名下，又因为子域名共享， 当我们打开`dev.test.haols.com:8000`时，cookie 就共享了，而我们配置了 hosts，这样我们访问`dev.test.haols.com:8000`时，其实就是在访问`127.0.0.1:8000`了，

缺点： 我认为这样的缺点是，本地得先打开测试环境， 然后打开的地址是`dev.test.haols.com:8000`

2. 使用 google 插件

我们的问题其实就是 cookie 不能共享，那么我们能不能使用插件将 cookie 直接拷贝到`http://localhost:8000`下呢, 使用下面插件也很简单

将该插件加载到浏览器中，然后打开要拷贝的 cookies 的页面，然后点击加载的插件，输入`http://localhost:8000`(这个地址根据实际开发项目启动的地址决定)，点击跳转就可以了

[github](https://github.com/dengwb1991/chrome-extension-cookies-copy)

接下来看看插件代码：

```html
<div class="content-wrap">
  <div class="msg-wrap">
    <p>将当前地址cookies复制到输入框内的地址</p>
  </div>
  <div class="input-wrap">
    <input id="url" placeholder="http://localhost" />
    <div class="btn" id="btn">跳转</div>
  </div>
</div>
```

```js
(function () {
  var main = {
    init() {
      this.bind();
    },
    bind() {
      var btn = document.getElementById("btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var url = document.getElementById("url");
        if (!url.value) {
          // 创建一个提示信息
          chrome.notifications.create(null, {
            type: "basic",
            iconUrl: "images/icon.png",
            title: "错误",
            message: "请输入完整地址",
          });
          return;
        }
        // 获取到当前浏览器地址
        chrome.tabs.getSelected(null, function (tab) {
          // 获取到所有cookies
          chrome.cookies.getAll({ url: tab.url }, function (cookies) {
            cookies.forEach(function (cookie) {
              // 遍历设置到输入的路径中
              chrome.cookies.set({
                url: url.value,
                name: cookie.name,
                value: cookie.value,
              });
            });
            // 打开一个浏览器tab页面，地址为输入的地址
            chrome.tabs.create({ url: url.value });
          });
        });
      });
    },
  };
  main.init();
})();
```

缺点：google 插件，其他浏览器得修改适配，好处是不用改 hosts（其实我就不喜欢改 hosts，如果不使用一些软件、插件进行管理感觉很乱）

#### 总结

这是目前想到的两种方式，其实我之前一直想使用插件 Proxy SwitchyOmega 再配合一些配置进行实现，但是 Proxy SwitchyOmega 配置搞得不太好，而且看看怎么写一个浏览器插件也挺有意思的，以上只是我自己的一点思考，后面我会在想一想，有更好的方法更新这篇文章（总感觉这些对于新上手不太友好， Σ( ° △ °|||)︴）

#### 参考链接：

[手写 chrome 插件解决单点登录本地开发时的尴尬](https://juejin.cn/post/6844903935396986887)
[字节 ——chrome 插件开发指南](https://juejin.cn/post/7114959554709815326)
