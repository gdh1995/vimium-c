Vimium++
========
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](MIT-LICENSE.txt)
![version](https://img.shields.io/badge/release-1.53.1-orange.svg)

A custom [Vimium](https://github.com/philc/vimium)
  by [gdh1995](https://github.com/gdh1995),
  supporting Chrome with the session functionalities only (ver >= 37).
  For older version, it would try to work ^_^

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

Not yet released:
* **WARNING**: change modifier keys' order into `m-c-a-` (breaking)
* add `LinkHints.activateModeToEdit` to select an editable area with hints
* deprecate `clearGlobalMarks` and please use `Marks.clearGlobal` instead
* use `event.key` if it exists, to disable warning on Chrome 52
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

1.53.1:

* Link hints: filter out those only having one single clickable child
* use a better and more compatible way to get a bookmark's full path
* replace setting item `UILanguage` with simpler `localeEncoding`
* auto load bookmarks if `tinyMemory` is disabled, so Vomnibar's first complement is faster
* bug fixes:
  * fail to get a bookmark's full path
  * fail to decode urls by given character encoding
  * a potential crash in history completer

1.53 includes many improvements about memory, speed and functionalities.

* now Vimium++ use as less memory as possible
* FindMode is rewritten (merged from the origin philc/Vimium) and has lots of custom changes.
* content scripts: fastest initing
* the browser action icon is updated without any indirect cost
* vimium://show now can "display" a image: rotate, zoom-in, drag and so on
* the appearance of help dialog is updated
* `visitPreviousTab` is added.

1.52.1 fixes some serious bugs in Exclusion function, and:

* add a privacy policy document
* use new help dialog styles borrowed from philc/Vimium.

1.52 fixed lots of bugs and add some UX improvements:

* Fix crashes on Chrome 48-50 caused by removed APIs including `Promise.defer` and `Object.observe`
* Fix some logic bugs
* Vomnibar now support full mouse operations:
  * use mousewheel to pageup/pagedown
  * click the right corner of input area to close the vomnibar
* LinkHints:
  * auto-activates child frame's LinkHints mode
  * support count like 3 to specify the max step count (merged from philc/vimium)
* And other features merged from philc/vimium, such as using ports instead of frontend frameId.

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
