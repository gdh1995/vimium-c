<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>
![Icon](icons/icon32.png) - Everything by Keyboard
===========================================

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
[![Version 1.81.4](https://img.shields.io/badge/release-1.81.4-orange.svg
  )](https://github.com/gdh1995/vimium-c/releases)
[![Current Build Status](https://travis-ci.org/gdh1995/vimium-c.svg?branch=master
  )](https://travis-ci.org/gdh1995/vimium-c)
**Visit on [Chrome Web Store](
  https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg
  ) /
[Firefox Add-ons](
  https://addons.mozilla.org/firefox/addon/vimium-c/
  ) /
[MS Edge Addons](
  https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo
  )**

A <span style="color: #a55e18;">C</span>ustomized
  [<span style="color: #2f508e;">Vim</span>ium](https://github.com/philc/vimium)
  (to click web page content and manipulate browser windows using only keyboard)
  having <span style="color: #a55e18;">**C**</span>hinese support,
    global <span style="color: #a55e18;">**C**</span>ommands
    and inje**c**tion functionality,
  in <span style="color: #a55e18;">**C**</span>-style code for qui**c**ker action and less resource **c**ost.

[<span style="color: #2f508e;">Vim</span>ium](https://github.com/philc/vimium) 的一款<span
  style="color: #a55e18;">修改版</span>（可以用键盘点击网页内容、操作浏览器窗口），添加了完整的<span
  style="color: #a55e18;">中文</span>支持、<span
  style="color: #a55e18;">全局快捷键</span>功能，还能运行在某些接受Vimium C的扩展程序的私有页面里，并且对CPU和内存资源的<span
  style="color: #a55e18;">消耗很低</span>。

This project is mainly developed and maintained by [gdh1995](https://github.com/gdh1995),
and licensed under the [MIT license](LICENSE.txt).

本项目主要由 [gdh1995](https://github.com/gdh1995) 开发并维护，且以 [MIT 许可协议](LICENSE.txt) 开源。

It (the version in Web Store) supports Chrome and other Chromium-based browsers whose core versions are >= 38,
  and supports almost all of the functionality on a recent Firefox (since version 63.0).
On MS Edge (Chromium), it works well, and it can even run on MS Edge (EdgeHTML), though there're still some errors.
If re-compiled from the source code, Vimium C is able to support Chromium 32~37.

它支持内核版本不低于 38 的 Chrome 和其它以 Chromium 为内核的浏览器，也能运行在最近发布的 Firefox 63 和更高版本上。
同时它完美支持了新版 Microsoft Edge (Chromium 内核) 浏览器，甚至在 Edge (EdgeHTML 内核) 上也能正常执行大部分命令。
如果从源码重新编译，Vimum C 还可以支持 Chromium 32~37。

![Usage Demo of Vimium C](https://gdh1995.cn/vimium-c/demo.gif)

An old name of this project is "Vimium++", which has been given up on 2018-08-21.


# Project Introduction

__<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>:__

* [中文介绍 (description in Chinese)](README_zh.md)
* a web extension for Chrome and Firefox that provides keyboard-based navigation and control
    of the web, in the spirit of the Vim editor.
* add some powerful functions and provide more configurable details and convenience.
* here is its [license](LICENSE.txt) and [privacy policy](PRIVACY-POLICY.md)
* the initial code is forked from [philc/vimium:master](https://github.com/philc/vimium) on 2014.
* customized after translating it from CoffeeScript into JavaScript and then TypeScript.

__Other extensions supporting Vimium C:__

* PDF Viewer for Vimium C
  : a modified version of [PDF Viewer](https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
    from [PDF.js](https://github.com/mozilla/pdf.js/)
  * Visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium-c/nacjakoppgmdcpemlfnfegmlhipddanj)
* Shortcut Forwarding Tool
  * Provide 32 configurable shortcuts and forward them to another extension like Vimium C
  * Visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/shortcut-forwarding-tool/clnalilglegcjmlgenoppklmfppddien) /
    [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/shortcut-forwarding-tool/)
* NewTab Adapter
  * Take over browser's new tab settings and open another configurable URL
  * Visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn) /
    [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/newtab-adapter/)
* Modified Weidu New Tab (微度新标签页修改版)
  : a modified and lite version of [www.weidunewtab.com](http://www.weidunewtab.com/) (or
      [www.newtabplus.com](http://www.newtabplus.com/) )
  * Visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)


# Release Notes

#### 1.81.4
* `Vomnibar`: roll back and prefer visited tabs to newly-opened ones
* `mapKey`: support a new mode ID of `e` (NExt) and use it when a prefix sequence of count/key has been typed.
* `LinkHints`: support `autoUnhover` to unhover a link node once it's clicked
  * on Firefox: press <kbd>Esc</kbd> to auto unhover a link node after opening it in a new tab
* `Vomnibar`: support `noTabs` or `":H"` to avoid searching opened tabs in omni mode
* `focusInput`: support `act="last"|"last-visible"`
  ([#127 (comments)](https://github.com/gdh1995/vimium-c/issues/127#issuecomment-602038442))
* `goNext`: prefer completely matched text (e.g. `">"` is preferred to `">|"`)
* `goBack`: add an option of `local` to always use `history.go`, instead of async going
* popup page: if an extension wants to run Vimium C but not is allowed, show a button to auto allow it
* some bug fixes

#### 1.81.0
* fix that <kbd>-</kbd> or software-produced <kbd>Escape</kbd> can not be recognized
  ([#129](https://github.com/gdh1995/vimium-c/issues/129))
* **Privacy Policy**: update to **allow short-term and in-memory cache** for Vomnibar suggestions
  * Please see https://github.com/gdh1995/vimium-c/commit/240160ddb931c3fda545e8b7bd06f7c0bba0d56b
* Vomnibar: also match queries in all tabs when in omni mode
* Vomnibar: fix some edge cases and improve performance when matching queries
* Vomnibar: show indexes on <kbd>Alt</kbd> and quickly access items with <kbd>Alt + Number</kbd>
  * on macOs, use <kbd>Ctrl + Alt + Number</kbd> (`<a-c-N>`) instead
  * keys can be re-mapped: see [#135 (comment)](https://github.com/gdh1995/vimium-c/issues/135#issuecomment-597649596)
* LinkHints: Firefox: improve reachability detection for scrollable areas
* LinkHints: Filtered Hints: make hint keys follow page numbers
* Scroller: use a lightweight method to deactivate hover effects globally if smooth scrolling is enabled
  ([#133](https://github.com/gdh1995/vimium-c/issues/133))
* `goNext`: support aria-label
* `switchFocus`: add 2 options of `select` and `flash` to work like `focusInput`
  ([#127](https://github.com/gdh1995/vimium-c/issues/127))
* hooked `Function::toString`: not convert those whose body includes `__VimiumC_` to `()=>1` any more
  (influence [#130](https://github.com/gdh1995/vimium-c/issues/130))
* Chrome release: mark itself offline-enabled

See more on [RELEASE-NOTES.md](https://github.com/gdh1995/vimium-c/blob/master/RELEASE-NOTES.md).

### Known Issues

There're some known issues on previous or latest versions of Chrome,
and please read https://github.com/gdh1995/vimium-c/wiki/Known-issues-on-various-versions-of-Chrome
  for more information.


# Building

If you want to compile this project manually, please run:

``` bash
npm install typescript@3.7.4
npm install pngjs # needed for Chromium-based browsers
node scripts/tsc
# ./scripts/make.sh released-file.zip
```

`gulp local` can also compile files in place (using configurable build options),
while `gulp dist` compiles and minimizes files into `dist/`.

The options including `MinCVer` and `BTypes` in [gulp.tsconfig.json](scripts/gulp.tsconfig.json)
  are used to control supported target browsers and set a minimum browser version.


# Donate / 捐赠

<a name="donate"></a>
Vimium C is an open-source browser extension, and everyone can install and use it free of charge.
If you indeed want to give its author ([gdh1995](https://gdh1995.cn/)) financial support,
you may donate any small amount of money to him through [PayPal](https://www.paypal.com/)
  or [Alipay](https://intl.alipay.com/). Thanks a lot!

Vimium C 是一款开源的浏览器扩展程序，任何人都可以安装使用它而无需支付任何费用。
如果您确实想要资助它的开发者（[gdh1995](https://gdh1995.cn/)），
可以通过[支付宝](https://www.alipay.com/)或 [PayPal](https://www.paypal.com/)
无偿赠与他一小笔钱。谢谢您的支持！

PayPal: https://www.paypal.me/gdh1995 (accout: gdh1995@qq.com)

Alipay / 支付宝 : <br/>
![Alipay QRCode of gdh1995](https://gdh1995.cn/alipay-recv-money.png)


# Thanks & Licenses

Vimium C: Copyright (c) Dahan Gong, Phil Crosby, Ilya Sukhar.
See the [MIT LICENSE](LICENSE.txt) for details.

* [Vimium](https://github.com/philc/vimium):
  Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
  [MIT-licensed](https://github.com/philc/vimium/blob/master/MIT-LICENSE.txt).
* [微度新标签页](http://www.weidunewtab.com/):
  (c) 2012 杭州佐拉网络有限公司 保留所有权利.
* [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval)
  ([Modified](https://github.com/gdh1995/js-expression-eval)):
  Copyright (c) 2015 Matthew Crumley.
  [MIT-licensed](https://github.com/silentmatt/expr-eval/blob/master/LICENSE.txt).
* [Viewer.js](https://github.com/fengyuanchen/viewerjs)
  ([Modified by gdh1995](https://github.com/gdh1995/viewerjs)):
  Copyright (c) 2015-present Chen Fengyuan.
  [MIT-licensed](https://github.com/fengyuanchen/viewerjs/blob/master/LICENSE).
* [TypeScript](https://github.com/Microsoft/TypeScript):
    and modified `es.d.ts`, `es/*`, `dom.d.ts` and `chrome.d.ts` in `types/`:
  Copyright (c) Microsoft Corporation (All rights reserved).
  Licensed under the Apache License, Version 2.0.
  See more on [www.typescriptlang.org](http://www.typescriptlang.org/).
* [PDF.js](https://github.com/mozilla/pdf.js/):
  Copyright (c) Mozilla and individual contributors.
  Licensed under the Apache License, Version 2.0.
* The orange picture in the icon is from https://pixabay.com/vectors/orange-fruit-mandarin-citrus-fruit-158258/

# Declaration for Applicable Regions

The [Vimium C](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
    and other extensions published by [gdh1995](https://github.com/gdh1995)
    are available for all people in *"all regions"*
    of Chrome Web Store, Microsoft Edge Addons and some other markets.
This behavior is only to make these extensions easier to use, but<br>
**DOES NOT EXPRESS OR IMPLIED** the author (gdh1995) "agrees or has no objection to"
    that "Taiwan" can be parallel to "China",
    which was an **inappropriate** status quo in the stores' pages on 2019-11-16.

According to [The Constitution of the People's Republic of China](
    http://www.npc.gov.cn/npc/c505/201803/e87e5cd7c1ce46ef866f4ec8e2d709ea.shtml)
    and international consensus,
*Taiwan is **an inalienable part** of the sacred territory of the People's Republic of China*.
