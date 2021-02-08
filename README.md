<a name="readme"></a><h2 align="center">
  <img src="icons/icon128.png" width="32" height="32" alt="" />
  <span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span> - All by Keyboard
</h2>

[![Version](https://img.shields.io/github/v/release/gdh1995/vimium-c?logo=GitHub&label=gdh1995%2Fvimium-c&color=critical
  )](https://github.com/gdh1995/vimium-c/releases)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE.txt)
[![GitHub stars](https://img.shields.io/github/stars/gdh1995/vimium-c?logo=GitHub&labelColor=181717&color=critical
  )](https://github.com/gdh1995/vimium-c/stargazers)
[![Gitee star](https://gitee.com/gdh1995/vimium-c/badge/star.svg?theme=dark
  )](https://gitee.com/gdh1995/vimium-c/stargazers)
[![Current build status](https://travis-ci.org/gdh1995/vimium-c.svg?branch=master
  )](https://travis-ci.org/gdh1995/vimium-c)
[![Code alerts](https://img.shields.io/lgtm/alerts/g/gdh1995/vimium-c?logo=lgtm&logoWidth=18
  )](https://lgtm.com/projects/g/gdh1995/vimium-c/alerts/)

[![Firefox 63+](https://img.shields.io/amo/v/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=Firefox%2063%2B&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![users](https://img.shields.io/amo/users/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=users&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![rating](https://img.shields.io/amo/rating/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=rating&labelColor=FF7139&color=blue
  )](https://addons.mozilla.org/firefox/addon/vimium-c/reviews/?src=external-readme)
[![Chrome 47+](https://img.shields.io/chrome-web-store/v/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=Chrome%2043%2B&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
[![users](https://img.shields.io/chrome-web-store/users/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=users&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)

**Visit on [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme) /
[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo) /
[Chrome Web Store](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg
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
  style="color: #a55e18;">全局快捷键</span>功能，还能运行在某些接受 Vimium C 的扩展程序的私有页面里，并且对CPU和内存资源的<span
  style="color: #a55e18;">消耗很低</span>。

[阅读中文介绍 (description in Chinese) 。](README-zh.md)

This project is mainly developed and maintained by [gdh1995](https://github.com/gdh1995),
and licensed under the [MIT license](LICENSE.txt).

本项目主要由 [gdh1995](https://github.com/gdh1995) 开发并维护，且以 [MIT 许可协议](LICENSE.txt) 开源。

It (the released version) supports the new MS Edge, Chrome and other Chromium-based browsers
  whose core versions are >= 47, and has a prefect support for a recent Firefox (since version 63.0).
It can even run on MS Edge (EdgeHTML), though there're still some errors.
If re-compiled from the source code, Vimium C is able to support Chromium 32~42.

它支持内核版本不低于 47 的新版 Microsoft Edge、Chrome 和其它以 Chromium 为内核的浏览器，
同时也能完美运行在近些年发布的 Firefox 63 和更高版本上，甚至在 Edge (EdgeHTML 内核) 上也能正常执行大部分命令。
如果从源码重新编译，Vimum C 还可以支持 Chromium 32~42。

![Usage Demo of Vimium C](https://gdh1995.cn/vimium-c/demo.gif)

This project is hosted on https://github.com/gdh1995/vimium-c and https://gitee.com/gdh1995/vimium-c .

An old name of this project is "Vimium++", which has been given up on 2018-08-21.


# Project Introduction

__<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>:__

* [中文介绍 (description in Chinese)](README-zh.md)
* a web extension for MS Edge, Firefox and Chrome that provides keyboard-based navigation and control
    of the web, in the spirit of the Vim editor.
* add some powerful functions and provide more configurable details and convenience.
* here is its [license](LICENSE.txt) and [privacy policy](PRIVACY-POLICY.md)
* the initial code is forked from [philc/vimium:master](https://github.com/philc/vimium) on 2014.
* customized after translating it from CoffeeScript into JavaScript and then TypeScript.

__Other extensions supporting Vimium C:__

* PDF Viewer for Vimium C
  * built from (modified) [PDF.js](https://github.com/mozilla/pdf.js/),
    and is a replacement for the extension named [PDF Viewer](
      https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
  * visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium-c/nacjakoppgmdcpemlfnfegmlhipddanj)
  * Project home: [vimium-c-helpers/pdf-viewer](https://github.com/gdh1995/vimium-c-helpers/tree/master/pdf-viewer)
* NewTab Adapter
  * take over browser's new tab settings and open another configurable URL
  * visit it on [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/newtab-adapter/?src=external-vc-readme) /
    [Chrome Web Store](https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn)
  * project home: [vimium-c-helpers/newtab](https://github.com/gdh1995/vimium-c-helpers/tree/master/newtab#readme)
* Shortcut Forwarding Tool
  * provide 32 configurable shortcuts and forward them to another extension like Vimium C
  * visit it on
    [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/shortcut-forwarding-tool/?src=external-vc-readme) /
    [Chrome Web Store](
      https://chrome.google.com/webstore/detail/shortcut-forwarding-tool/clnalilglegcjmlgenoppklmfppddien)
  * project home: [vimium-c-helpers/shortcuts](https://github.com/gdh1995/vimium-c-helpers/tree/master/shortcuts#readme)
* Modified Weidu New Tab (微度新标签页修改版)
  * a modified and lite version of [www.weidunewtab.com](http://www.weidunewtab.com/) (or
      [www.newtabplus.com](http://www.newtabplus.com/) ), with Chinese translation only
  * it does not take over browser's new tab settings; if needed then [NewTab Adapter](
      https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn) is recommended
  * visit it on [Chrome Web Store](
      https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)


<a name="changelog"></a>

# Release Notes

#### 1.88.2
* refuse to open known "harmful" URLs and show a tip: for example, the `...\condrv\kernelconnect` will trigger an error
* key mappings: `env`: add `fullscreen: boolean` to detect element-wise fullscreen mode
* `LinkHints.click`: add `direct="element" match=... index=<number>|"count"` to directly select any element and click
* Scroller: support `keepHover=true|"auto"|false|"never"|<number>`
* Scroller: fix broken `scrollPx*` and some other issues
* Vomnibar: if in domain mode (query starts with `:d `), then show a list of matched domains
* Vomnibar: fix an order bug on pagedown
* `goNext`: prefer the value of `[aria-label]` if text is very short (up to 2 characters, like icons)
* improved `vimium://show #!image`

#### 1.88.0
* add `map *** runKey expect={env1:key1} keys=<default_key>` with `env name ...conditions`
  * now Vimium C can trigger different commands on different websites / for different active elements
  * see https://github.com/gdh1995/vimium-c/wiki/Map-a-key-to-different-commands-on-different-websites
* add `LinkHints.click` to click selected text, focused element or the nearest clicked
* `ignoreKeyboardLayout`: add a partly-checked state which requires <kbd>Alt</kbd> to ignore layouts
* FindMode: use `normalize` to normalize text before finding and get a more accurate count
* when operate multiple tabs, not limit the range to one side if count \< 10
* `gotoRoot`: if there're sed rules marked with `"r"`, then use them to learn sub roots
* some other enhancements
* fix some bugs including that `goToRoot` and `showTip` may break

Refer to [RELEASE-NOTES.md](RELEASE-NOTES.md).

#### Known Issues

There're some known issues on previous or latest versions of Chrome,
and please read https://github.com/gdh1995/vimium-c/wiki/Known-issues-on-various-versions-of-Chrome
  for more information.


# Building

If you want to compile this project manually, then you need a Node.js 13+ and npm. Please run:

``` bash
npm install typescript
npm install pngjs # only needed for Chromium-based browsers
node scripts/tsc
# ./scripts/make.sh vimium_c-debug.zip
```

`gulp local` can also compile files in place (using configurable build options),
while `gulp dist` compiles and minimizes files into `dist/`.

The options including `MinCVer` and `BTypes` in [gulp.tsconfig.json](scripts/gulp.tsconfig.json)
  are used to control supported target browsers and set a minimum browser version.

<a name="donate"></a><a name="donating"></a><a name="donation"></a>

# Donating / 捐赠

Vimium C is an open-source browser extension, and everyone can install and use it free of charge.
If you indeed want to give its author ([gdh1995@qq.com](https://github.com/gdh1995)) financial support,
you may donate any small amount of money to him through
  [Open Collective](https://opencollective.com/vimium-c), [PayPal](https://www.paypal.me/gdh1995),
  [Alipay](https://intl.alipay.com/) or [WeChat](https://www.wechat.com/). Thanks a lot!

Vimium C 是一款开源的浏览器扩展程序，任何人都可以安装使用它而无需支付任何费用。
如果您确实想要资助它的开发者（[gdh1995@qq.com](https://github.com/gdh1995)），
可以通过[支付宝](https://www.alipay.com/)、[微信](https://weixin.qq.com/)、[Open Collective](
    https://opencollective.com/vimium-c)
或 [PayPal](https://www.paypal.me/gdh1995) 无偿赠与他一小笔钱。谢谢您的支持！

A donation list is in / 捐赠列表详见: https://github.com/gdh1995/vimium-c/wiki/Donation-List .

<img width="240" alt="gdh1995 的支付宝二维码" src="https://gdh1995.cn/alipay-recv-money.png"
  /> <img width="240" alt="gdh1995 的微信赞赏码" src="https://gdh1995.cn/wechat-recv-money.png"
  /> <img width="240" alt="PayPal QRCode of gdh1995" src="https://gdh1995.cn/paypal-recv-money.png" />

# Thanks & Licenses

Vimium C: Copyright (c) Dahan Gong, Phil Crosby, Ilya Sukhar.
See the [MIT license](LICENSE.txt) for details.

The translation files in [_locales/](https://github.com/gdh1995/vimium-c/tree/master/_locales) belong to
  [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/),
except some of those English sentences which are the same as [philc/vimium](https://github.com/philc/vimium)'s
  are under Vimium's MIT license.

* [Vimium](https://github.com/philc/vimium):
  Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
  Licensed under the [MIT license](https://github.com/philc/vimium/blob/master/MIT-LICENSE.txt).
* [TypeScript](https://github.com/Microsoft/TypeScript):
    and modified `es.d.ts`, `es/*`, `dom.d.ts` and `chrome.d.ts` in `types/`:
  Copyright (c) Microsoft Corporation (All rights reserved).
  Licensed under the [Apache License 2.0](https://github.com/microsoft/TypeScript/blob/master/LICENSE.txt).
  See more on [www.typescriptlang.org](http://www.typescriptlang.org/).
* [Viewer.js](https://github.com/fengyuanchen/viewerjs)
  ([Modified](https://github.com/gdh1995/viewerjs)):
  Copyright (c) 2015-present Chen Fengyuan.
  Licensed under the [MIT license](https://github.com/fengyuanchen/viewerjs/blob/master/LICENSE).
* [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval)
  ([Modified](https://github.com/gdh1995/js-expression-eval)):
  Copyright (c) 2015 Matthew Crumley.
  Licensed under the [MIT license](
    https://github.com/silentmatt/expr-eval/blob/4327f05412a3046a9b527b6ec3b50843cb0428e8/LICENSE.txt).
* The orange picture in the icon is from https://pixabay.com/vectors/orange-fruit-mandarin-citrus-fruit-158258/
* [微度新标签页](http://www.weidunewtab.com/):
  (c) 2012 杭州佐拉网络有限公司 保留所有权利.
* [PDF.js](https://github.com/mozilla/pdf.js/):
  Copyright (c) Mozilla and individual contributors.
  Licensed under the [Apache License 2.0](https://github.com/mozilla/pdf.js/blob/master/LICENSE).

# Declaration for Applicable Regions

The [Vimium C](https://microsoftedge.microsoft.com/addons/detail/vimium-c/aibcglbfblnogfjhbcmmpobjhnomhcdo)
    and other extensions published by [gdh1995](https://github.com/gdh1995)
    are available for all people in *"all regions"*
    of Microsoft Edge Add-ons, Chrome Web Store and some other markets.
This behavior is only to make these extensions easier to use, but<br>
**DOES NOT EXPRESS OR IMPLIED** the author (gdh1995) "agrees or has no objection to"
    that "Taiwan" can be parallel to "China",
    which was an **inappropriate** status quo in the stores' pages on 2020-07-30.

According to [The Constitution of the People's Republic of China](
    http://www.npc.gov.cn/npc/c505/201803/e87e5cd7c1ce46ef866f4ec8e2d709ea.shtml)
    and international consensus,
***Taiwan is an inalienable part of the sacred territory of the People's Republic of China***.
