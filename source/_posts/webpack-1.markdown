---
layout: post
title: "浅谈webpack"
date: 2022-07-07 15:50
comments: true
tags: 
	- webpack
---

> 这个世上不如人意的事情太多了，我们不能去干涉别人的选择和生活。有人会选择脚踏实地勤勤恳恳地活着，觉得平淡就是幸福。而有些人会觉得人生大梦一场，不必活的太认真，觉得放纵和自由就是幸福。每个人的追求都不一样，我们要做的，就是坚持住自己的底线守住自己的内心，活得简单的人是很容易获得幸福的。

<!-- more -->

#### 一、为什么需要使用 webpack

概念：本质上，_webpack_ 是一个现代 JavaScript 应用程序的*静态模块打包器(module bundler)*。当 webpack 处理应用程序时，它会递归地构建一个*依赖关系图(dependency graph)*，其中包含应用程序需要的每个模块，然后将所有这些模块打包成一个或多个 _bundle_。

作用：将浏览器无法执行的语法编译成浏览器可以执行的语法

![image-20220705111408447](../../assets/blogImg/webpack/webpack.png)

优点：

- 社区⽣生态丰富
- 配置灵活和插件化扩展
- 官⽅方更更新迭代速度快(目前最新是 webpack5)

安装：

```bash
// 初始化
npm init -y

// 安装 webpack 和 webpack-cli
npm install webpack webpack-cli --save-dev

// 检查是否安装成功
./node_modules/.bin/webpack -v
```

使用： 创建 webpack.config.js 文件

#### 二、核心概念

```js
module.exports = {
    entry: './src/index.js',				// 打包的⼊入⼝口⽂文件
    output: './dist/main.js',				// 打包的输出
    mode: 'production',						// 环境
    module: {
        rules: [							// Loader 配置
            { test: /\.txt$/, use: 'raw-loader' }
        ]
    },
    plugins: [								// 插件配置
        new HtmlwebpackPlugin({
            template: './src/index.html’
        })
    ]
};
```

##### entry

作用： 指示 webpack 应该使用哪个模块，来作为构建其内部*依赖图*的开始。进入入口起点后，webpack 会找出有哪些模块和库是入口起点（直接和间接）依赖的

使用方法 [entry](https://www.webpackjs.com/concepts/entry-points/#%E5%8D%95%E4%B8%AA%E5%85%A5%E5%8F%A3-%E7%AE%80%E5%86%99-%E8%AF%AD%E6%B3%95)：

```js
module.exports = {
  entry: "./src/app.js",
};
```

```js
module.exports = {
  entry: {
    app: "./src/app.js",
    home: "./src/home.js",
  },
};
```

##### output

作用： 配置 `output` 选项可以控制 webpack 如何向硬盘写入编译文件。注意，即使可以存在多个`入口`起点，但只指定一个`输出`配置。

使用方法 [output](https://www.webpackjs.com/concepts/output/):

```js
module.exports = {
  entry: "./src/app.js",
  output: {
    filename: "bundle.js",
    path: path.join(__dirname, "dist"),
  },
};
```

```js
  module.export = {
      entry: {
          app: './app.js',
          home: './src/home.js'
      }，
      output: {
          filename: '[name].js', // 通过占位符确保文件名称的唯一
          path: path.join(__dirname, 'dist'),
  	},
  }
```

##### mode

作用： mode 用来指定当前的构建环境是：production（生产）、development（开发）还是 none（什么都不做）,设置 mode 可以使用 webpack 内置的函数，默认值是 production

使用方法 [mode](https://www.webpackjs.com/concepts/mode/)

```js
module.exports = {
  mode: 'production'
};
// 或者webpack命令传参
webpack --mode=production
```

![image-20220705151502831](../../assets/blogImg/webpack/webpack-mode.png)

##### loader

作用： webpack 开箱即用只支持 JS 和 JSON 两种文件类型，通过 Loaders 去支持其它文件类型并且把它们转化成有效的模块，并且可以添加到依赖图中。本身是一个函数，接受源文件作为参数，返回转换的结果。

常见 loader：

![image-20220705152020447](../../assets/blogImg/webpack/webpack-loaders.png)

使用方法 [loader](https://www.webpackjs.com/concepts/loader/):

```js
// 需要终端安装相应loader
// 配置
const path = require('path');
module.exports = {
    output: {
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,				// test 指定匹配规则
                use: 'css-loader',			// use 指定使⽤用的 loader 名称
                options: {					// 值可以传递到 loader 中
                        importLoaders: 1
                    }
            }
        ]
    }
};

// 内联, 这两种我没使用过-_-
import Styles from 'style-loader!css-loader?modules!./styles.css';

// cli
webpack --module-bind jade-loader --module-bind 'css=style-loader!css-loader'
```

> 需要注意一点, loader 加载的过程中,是从右往左的(从后往前)

##### Plugins(插件)

作用： 插件用于 bundle 文件的优化，资源管理和环境变量的注入, 作用于整个构建过程（任何 loader 没办法的事情，plugins 可以完成）

常见 plugins：

![image-20220705153519016](../../assets/blogImg/webpack/webpack-plugins.png)

使用方法 [plugins](https://www.webpackjs.com/concepts/plugins/):

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  output: {
    filename: "bundle.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      // 实例化一个进行使用
      template: path.join(__dirname, "src/index.html"), // 传参
      filename: "index.html",
      chunks: ["index"],
      inject: true,
      minify: {
        html5: true,
        collapseWhitespace: true,
        preserveLineBreaks: false,
        minifyCSS: true,
        minifyJS: true,
        removeComments: false,
      },
    }),
  ],
};
```

> 注意一下,官网上这句话"由于**插件**可以携带参数/选项，你必须在 webpack 配置中，向 `plugins` 属性传入 `new` 实例。",这是自己编写一个 plugins 的基础

#### 三、简单例子

##### 解析 ES6

```bash
npm i @babel/core @babel/preset-env babel-loader -D
```

```js
// package.json
"scripts": {
    "build": "webpack",
  },
// webpack.config.js
const path = require('path');
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle[chunkhash:8].js',
  },
  module: {
  	rules: [
    	{
            test: /\.js/,
            use: 'babel-loader',
            include: path.resolve(__dirname, 'src'),		// 需要转换的文件夹
            exclude: /node_modules/							// 排除转换的文件夹
        }
    ]
  }
}
// .babelrc
{
  "presets": [
    [
      "@babel/preset-env"
    ]
  ]
}
```

- babel-loader 的作用 只是在 webpack 打包时遇到 js 文件，交给 babel 处理，至于怎么处理，跟 webpack 就没有关系了，跟 babel 的配置有关；

- @babel/core : babel 核心文件，它的作用是按照配置的文件进行转码；

- @babel/preset-env：是一个智能预设，允许您使用最新的 JavaScript，而无需微观管理目标环境需要哪些语法转换, 比如 es6 转 es5,但是无法转高级 API 如 Array.from,需要再安装 babel-polyfill；

[babel 链接](https://www.babeljs.cn/docs/)

##### 解析 jsx

```bash
npm i react react-dom @babel/preset-react -D
```

```js
// .babelrc
{
	"presets": ["@babel/preset-env", "@babel/preset-react"]
}
```

```js
// index.js
import React from "react";
import ReactDOM from "react-dom";
import say from "./say";
import "./index.less";
document.write(say("zs"));

class Index extends React.Component {
  render() {
    return <div className="text">主页</div>;
  }
}

ReactDOM.render(<Index />, document.getElementById("root"));
```

##### html-webpack-plugins

```bash
npm install html-webpack-plugin -D
```

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  mode: "production",
  entry: {
    index: "./src/index.js",
    search: "./src/search.js",
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name]_[chunkhash:8].js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/index.html"),
      filename: "index.html",
      chunks: ["index"],
      inject: true,
      minify: {
        html5: true,
        collapseWhitespace: true,
        preserveLineBreaks: false,
        minifyCSS: true,
        minifyJS: true,
        removeComments: false,
      },
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src/search.html"),
      filename: "search.html",
      chunks: ["search"],
      inject: true,
      minify: {
        html5: true,
        collapseWhitespace: true,
        preserveLineBreaks: false,
        minifyCSS: true,
        minifyJS: true,
        removeComments: false,
      },
    }),
  ],
};
```

html-webpack-plugin： 创建 html 文件去承载输出的 bundle，可以设置一些压缩的参数， 注意一个 html 页面需要使用一个 HtmlWebpackPlugin 插件

> Tips: 这里出现一个问题, 我在 js 中使用 document.write('name')，但是页面不展示，查询原因发现是 webpack5 版本默认 scriptLoading: 'defer'， 换成 scriptLoading: 'blocking'

##### 解析 less、css

```bash
npm install style-loader css-loader less less-loader -D
```

```js
module.exports = {
  module: {
    rules: [
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      { test: /\.less$/, use: ["style-loader", "css-loader", "less-loader"] },
    ],
  },
};
```

- css-loaderc 用于加载.css 文件，并且转换为 common.js 对象
- style-loader 将样式通过`<style>`标签插入到 head 中
- less-loader 用于将 less 转换为 css, 还安装 less 是因为因为 less-loader 需要依赖 less

> 从上面解析顺序，注意顺序是不能改变的，因为是从右往左解析 所以 css-loader 要在最后，最先调用，再调用 style-loader 插入

>     Tip：想给loader传参，可以如下写法：
>     rules: [
>         	{ test: /\.(woff|woff2|eto|ttf|otf)$/,
>            	use: [{
>               loader: 'url-loader',
>               options: { // 可以进行给loader传参
>               	limit: 10240
>               }
>             }]
>           }
>         ]

##### 自动清理构建目录

clean-webpack-plugin： 默认会删除 output 指定的输出⽬目录

```bash
npm i clean-webpack-plugin -D
```

```js
// webpack.config.js
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
module.export = {
  plugins: [new CleanWebpackPlugin()],
};
```

##### 拆分

为了更好的演示，我拆分一下 webpack 的配置文件(development、production)

```js
// package.json
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "webpack --config webpack.prod.js",
    "dev": "webpack --config webpack.dev.js",
  },
```

这里推荐一个比较好用的包：webpack-merge，可以将公共的 webpack 抽离出来，有区别的进行差异化配置

详见规则：[webpack-merge 合并规则](https://www.jianshu.com/p/13229b672d66)

##### 热更新

webpack-dev-server： webpack-dev-server 不不输出⽂文件，⽽而是放在内存中，使⽤ HotModuleReplacementPlugin 插件

```bash
npm install webpack-dev-server -D
```

```js
// package.json
"scripts": {
    "build": "webpack",
    "dev": "webpack-dev-server --config webpack.dev.js --open"
  },

// webpack.dev.js
const webpack = require("webpack");
module.exports = {
	mode: 'development',
  	plugins: [
    	new webpack.HotModuleReplacementPlugin()
    ],
  	devServer: {
    	static: './dist',
      	hot: true
    }
}
```

#### 四、loader 和 plugins

##### 自定义 loader

loader 只是一个导出为函数的 JavaScript 模块,记住模块加载从右往左

```bash
npm install loader-utils@2.0.0
```

> 这里我发现 loader-utils 2.0.0 版本可以获取到参数，但是 3.0.0 就没有了这个方法，暂时没有寻找，安装时先固定使用 2.0.0 版本

```js
const loaderUtils = require("loader-utils");
module.exports = function(source){
  const { importLoaders } = loaderUtils.getOptions(this); // 可以获取到参数
  return source;
};
// webpack.prod.js
{
    test: /\.js/,
        use: [
            path.resolve('./loaders/loader'),
        ],
            options: {					// 值可以传递到 loader 中
                importLoaders: 1
            }
}
```

##### 自定义 plugins

```js
module.exports = class MyPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    // 可以上网查一下compiler，主要实例化了一个compiler， 执行相应hooks
    console.log("apply", this.options);
  }
};
```

#### 结尾

webpack 插件太多了，剩下想要什么功能可以上网搜索一下 (￣ ▽ ￣)～ ■ 干杯 □ ～(￣ ▽ ￣)
