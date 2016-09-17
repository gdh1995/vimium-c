Vimium++
========
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](MIT-LICENSE.txt)
![version](https://img.shields.io/badge/release-1.56.1-orange.svg)

A custom [Vimium](https://github.com/philc/vimium)
  by [gdh1995](https://github.com/gdh1995),
  supporting Chrome with the session functionalities only (ver >= 37).
  For older version, it would try to work ^_^

The branch [`basic-on-edge`](https://github.com/gdh1995/vimium-plus/tree/basic-on-edge)
  is able to run on lastest Microsoft Edge,
  though some function are broken because Edge lacks some features.
The branch [`firefox`](https://github.com/gdh1995/vimium-plus/tree/firefox)
  is able to run on lastest Firefox, but only tests for `LinkHints` have been done.

In the *weidu* directory is 微度新标签页.

__Vimium:__

* a Chrome extension that provides keyboard-based navigation and control
    of the web in the spirit of the Vim editor.
* from [philc/vimium:master](https://github.com/philc/vimium).
* optimized after translating it from CoffeeScript into JavaScript.
* more functions, more powerful, and more convenient (for me, at least).

__微度新标签页 (X New Tab Page):__

* in folder [*weidu*](https://github.com/gdh1995/vimium-plus/tree/master/weidu)
* 一款基于Html5的Chrome浏览器扩展程序。
  它提供了网站快速拨号、网站云添加、数据云备份等功能来增强 Chrome
    原生新标签页（New Tab）；
  另外微度还提供了：
    天气、云壁纸、快速搜索等插件，为用户提供最快捷的上网方式。
* 微度新标签页: [www.weidunewtab.com](http://www.weidunewtab.com/);
    X New Tab Page: [www.newtabplus.com](http://www.newtabplus.com/).
* its official online version supporting multi browsers:
    [www.94994.com](http://www.94994.com/).
* selected only one language: zh_CN.UTF-8.
* some is customized.
* the official settings file is OK for it, but not the other way around.

Release Notes
-------------

1.56:
* Vomnibar is re-implemented using `<iframe>`, which is much safer than shadowDOM.
* Backend completer procedure is reworked and Vomnibar works faster for continuous input.
* remove the setting item "Try to reduce Vimium++'s memory cost" (`tinyMemory`).
* fix a bug that Vimium++ would break on Chrome 37 to 47.
* version 1.56.1: fix a bug of lacking tips for vimium://copy urls in vomnibar.
* small bug fixes; try to avoid unnecessary forced reflows.

1.55:
* add **Visual Mode**, and support all commands of philc/Vimium's.
  This implementation works well on `<textarea>`s and `shadowDOM`s.
* add commend `clearFindHistory` to remove all find mode history,
    in normal mode incognito mode.
* use a small `options_ui.html` to jump to the options page on Chrome's settings page,
  and this manifest item makes a warning on installation before Chrome 40,
    though it has not any influence.
* some bug fixes.

1.54:
* **WARNING**: change modifier keys' order into `m-c-a-` (breaking)
* add `LinkHints.activateModeToEdit` to select an editable area with hints
* deprecate `clearGlobalMarks` and please use `Marks.clearGlobal` instead
* rework `goUp` and `goToRoot`: try to support different forms of hash bangs
* use `event.key` if it exists, to disable warning on Chrome 52
* the default `tinyMemory` is set `true`,
  and the history completer loads slower but has a smaller memory peak
* Chrome 52 doesn't allow Vimium to create an incognito window
    using a normal tab,
  so those tricks which allow Vimium++ to show normal tabs in incognito windows
    won't work any more.
  Also fix a bug that `createTab` may not work properly on a popup window.
* lots of bug fixes
* add a branch `basic-on-edge` to make Vimium++ work on Microsoft Edge,
    although many commands become broken after the migration
* rename front-end global variables to `V***`,
  in order to avoid potential name collisions when injected into other hosts

X New Tab Page: 4.8.2 (2015-03-19)

* All merged.

Thanks & License
-------
* Vimium: Copyright (c) Phil Crosby, Ilya Sukhar.
* 微度新标签页: ©2012 杭州佐拉网络有限公司. 保留所有权利.
* [JavaScript Expression Evaluator
    ](https://github.com/silentmatt/js-expression-eval):
    Copyright (c) 2015 Matthew Crumley
* [Viewer.js](https://github.com/fengyuanchen/viewerjs):
    Copyright (c) 2015-2016 Fengyuan Chen
