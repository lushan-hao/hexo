---
layout: post
title: "git stash 妙用"
date: 2022-05-20 18:20
comments: true
tags:
  - git
---

> 上帝已经明目张胆的不公平，凡人就应该保留偏执的权利

<!-- more -->

我承认，有标题党的嫌疑 ⊙▽⊙

#### 起因

今天整理项目时，发现好多自己之前多需求并行开发时，遗留的 stash，下面是删除过一部分的了
![stash列表](../assets/blogImg/git/git-stash-1.png)

我平时开发时感觉还算常用，但是我之前完全用 vscode 操作，git 命令都是现用现查，现在用博客记录一下我的操作吧（简单操作）

#### 场景

![对话](../assets/blogImg/git/git-stash-2.png)

还能怎么办，笑着答应，但是 b 需求我做了 1/3 了啊，我可以重新创建个分支，但是我本地这些更改的代码怎么办，提交？我的 commit 记录我不允许出现半成品，git stash 走起

还有一个场景，那就是你改完代码，突然发现开发的分支错误了，怎么办，难道代码白写了，你也可以先存储起来，切换到要修改的分支，弹出，有冲突解决就好了

#### 使用

- git-stash - Stash the changes in a dirty working directory away 将更改隐藏在工作目录中

我本地假如有许多更改（这两个文件代表着很多的文件）
![change文件列表](../assets/blogImg/git/git-stash-3.png)

使用 vscode 怎么操作
![git存储](../assets/blogImg/git/git-stash-4.gif)

怎么取出我们存储的变更文件呢
![git存储](../assets/blogImg/git/git-stash-5.gif)

剩下的操作看文字顾名思义就知道是做什么的了，我之前都是这种使用界面操作，但是上周突然发现，命令好久不用都忘记了，这怎么可以，虽说不用，但是不能不会，命令走起～(￣ ▽ ￣～)(～￣ ▽ ￣)～

> 注意一点，这里有两个，一个是应用存储，一个是弹出存储，两个的区别是，应用存储仅仅是将改变展示，但是 stash 列表中依然存在这个 stash， 但是弹出存储，当不发生冲突的时候，这个存储就会从存储列表中消失，个人认为弹出储存更常用一些

下面都以弹出第一个演示

```bash
// 首先存储更改文件
git stash

// 存储文件携带信息（最好使用这个，方便多个stash时弹出我们想要的）
git stash save "balabala"

// 查看本地存储的所有stash
git stash list
```

上图片
![git存储](../assets/blogImg/git/git-stash-6.gif)

```bash
// 查看这个stash有哪些变更（注：window电脑下，一定要使用bash，使用powershell会报错的）
git stash show stash@{0}

// 功能是上面说的应用存储
git stash apply stash@{0}

// 功能是上面说的弹出存储
git stash pop stash@{0}

// 删除某个存储（注：window电脑下，一定要使用bash，使用powershell会报错的）
git stash drop stash@{0}
```

上图片,这个动图时间有点长

![git存储](../assets/blogImg/git/git-stash-7.gif)

**注意：**

- window 电脑下，最好使用 bash，使用 powershell 可能部分命令会报错的
- 新增的文件执行 `git stash` 不会添加进去，怎么办？`git add .`然后就可以了

以上就是大部分，vscode 操作+git 命令操作了，个人认为还是很好用的
