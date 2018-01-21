Vimium++
========
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
![Version 1.63.0](https://img.shields.io/badge/release-1.63.0-orange.svg)
[![Current Build Status](https://travis-ci.org/gdh1995/vimium-plus.svg?branch=master)
  ](https://travis-ci.org/gdh1995/vimium-plus)

**[Visit Vimium++ in Chrome Web Store](https://chrome.google.com/webstore/detail/vimium%2B%2B/hfjbmagddngcpeloejdejnfgbamkjaeg)**.

A customized [Vimium](https://github.com/philc/vimium)
  licensed under the [MIT license](LICENSE.txt)
  by [gdh1995](https://github.com/gdh1995),
  supporting Chrome with the session functionalities (ver >= 37).
  For older version, it would try to work ^_^

The branch [`basic-on-edge`](https://github.com/gdh1995/vimium-plus/tree/basic-on-edge)
  is able to run on lastest Microsoft Edge,
  though some function are broken because Edge lacks some features.
The branch [`firefox`](https://github.com/gdh1995/vimium-plus/tree/firefox)
  is able to run on lastest Firefox, but only tests for `LinkHints` have been done.

In the *weidu* directory is 微度新标签页.


# Project Introduction

__Vimium++:__

* a Chrome extension that provides keyboard-based navigation and control
    of the web in the spirit of the Vim editor.
* forked from [philc/vimium:master](https://github.com/philc/vimium).
* optimized after translating it from CoffeeScript into JavaScript.
* more functions, more powerful, and more convenient (for me, at least).
* here is its [license](LICENSE.txt) and [privacy policy](PRIVACY-POLICY.md)

__Vomnibar Page:__

* [visit it on Chrome Web Store](https://chrome.google.com/webstore/detail/vomnibar-page-for-vimium%20/ekohaelnhhdhbccgefjmjpdjoijhojgd)
* is an extension to replace Vimium++'s inner Vomnibar page.
* With this, Vimium++'s memory cost will be smaller since Chrome 57.

__微度新标签页修改版 (Modified X New Tab Page):__

* [visit it on Chrome Web Store](https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)
* in folder [*weidu*](https://github.com/gdh1995/vimium-plus/tree/master/weidu)
* support Vimium++ and provide a vomnibar page: chrome-extension://hdnehngglnbnehkfcidabjckinphnief/vomnibar.html
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

__Other extensions supporting Vimium++:__

* [PDF Viewer for Vimium++](https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium%20%20/nacjakoppgmdcpemlfnfegmlhipddanj)
  a modified version of [PDF Viewer](https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
    from [PDF.js](https://github.com/mozilla/pdf.js/)

# Release Notes

Known issues (Up to the master branch):
1. Chrome before version 49 has bugs in `Window.postMessage` if the flag `#enable-site-per-process` is on,
  which breaks `Vomnibar`. Then `Vomnibar` would only work well on Vimium++ Options pages.
2. `Preferred Vomnibar Page` can not support http/file URLs before Chrome 41.
3. the Chrome flag `#enable-embedded-extension-options` has a bug about dialog width on high-DPI screen,
  which can not be worked-around before Chrome 42.
4. If an extension page is the preferred Vomnibar page, and the extension is disabled in incognito mode,
  Vomnibar might break in such a situation, and there seems no way to detect it.
  So Vimium++ has disabled other extension Vomnibar pages in incognito mode.
5. If a http/file/... Vomnibar page is preferred, then there're some cases where it breaks,
  such as on some websites with very strict Content Security Policies (CSP),
  so users may need to wait about 1 second to let Vimium++ retry the inner page.
6. Chrome 58 stable hides some necessary infomation of page's selection,
  so some commands on `VisualMode` cann't work as expected if editable text is being selected.
  This Chrome feature/bug has been removed since version 59, so Vimium++ works well again.
7. Chrome does not apply content settings (at least images) on file:// URLs since version 56.
  Currently, no effective ways have been found (up to Chrome 59).

1.63.1 (Not released yet):
* fix some crashes with other libraries including CKEditor 5 (1.0.0-alpha.2)
* fix a bug that a real '<f1>' was mistakenly translated into `<ff1>`
* For some IMEs like Chinese, Vomnibar cuts all single quotes if input is composing in the middle of text

1.63:
* FindMode and VisualMode will ensure document is selectable when they are active
* always focus the parent frame and show a yellow border when touch & hold `<esc>`
* fix bugs and memory leaks on pages having ShadowDOM UI.
* `passNextKey normal` will also exit if the page blurs
* rename command `LinkHints.activate` to `LinkHints.activateMode` (the old keeps supported)
* `LinkHints.activateMode` supports option `action=hover/unhover/leave/text/url/image`
* change behaviors of some commands like `parentFrame` and `focusInput`
* Vomnibar now prefers a domain starting with "www."
* now custom CSS takes precedence over default styles like the help dialog's
* limit max length of Vomnibar's query to 200 chars
* perfectly support pages which are zoomed by themselves: better `LinkHints` and `focusInput`
* fix some other bugs

1.62.0:
* on an editable rich text iframe box: `<Esc>` will not focus the upper frame unless it's held on
* image viewer: support `<c-+>` (also `<c-=>`) and `<c-->` to zoom in/out images
* fix vomnibar may shake on the list's length changing
* fix a rare case that some web page may break because Vimium++'s code throws errors
* fix a regression that some tips on HUD were missing
* fix a long-term bug that history cache may not be cleaned out when some history items are removed

1.61.2:
* fix some regression bugs

1.61.1:
* fix new UI bugs on Chrome 61
* fix that content settings commands didn't work on some special URLs containing port or username info
* in most pages, it will focus a parent frame to press `<Esc>`,
  if the current is an iframe and nothing is focused or selected
* re-enable supports on about:blank iframes
* FindMode has a safer HUD

1.61:
* rework Marks so that local marks work on websites on which cookies are disabled manually
  * in `Marks.activate`, old local marks are still supported
  * **WARNING**: but `Marks.clearLocal` won't clear old local marks
  * the stored data of local marks is not compatible with Vimium any more
* completely fix Vomnibar flickering on showing and hiding since Chrome 57
* **WARNING**: add a version limit to the preferred Vomnibar page
  * please use `<html data-version="1.61">` to tell Vimium++ the page's version
  * if your custom page has no such a tag, it will be replaced with the inner one at run time
  * its styles have changed a lot, so old pages need comparison and updates before adding version attribute
* loosen limits on URL format validation: accept unknown 3-char TLDs in more cases
  * now "http://example.aab" is valid, although "example.aab" is usually not (unless it has occurred in history)
* allow "custom key mappings" to override Vimium++'s default mappings without an error message
* LinkHints supports a new mode "Open multiple links in current tab" and `f-<Alt>-<Shift>` will activate it
* add a new shortcut `vimium://status <toggle | enable | disable | reset>`
    to enforce a new status on the current tab
  * you may use it on Vomnibar / Chrome Omnibox
  * the popup page has an improved UI and you may also use new buttons on it to do so
* Vimium++ now tries its best to re-enable key mappings on some special child iframes using `document.open`
  * if the whole page is reopened, Vimium++ can not know it directly,
    so please eval the new `vimium://status enable` URL to enforce a new "enabled" status
* improved performance: now Vimium++ UI shows faster for the first command on a page

# Building

If you want to compile this project manually, please run:

``` bash
npm install typescript@next
# remove options "narrowFormat" in `tsconfig.json`
node scripts/tsc all
#./scripts/make.sh output-file.zip
```

The option `narrowFormat` are for another version of [TypeScript](https://github.com/gdh1995/TypeScript).

`gulp local` can also compile files in place, while `gulp dist` compiles and minimizes files into `dist/`.

# Thanks & License

Vimium++: Copyright (c) Dahan Gong, Phil Crosby, Ilya Sukhar.
See the [MIT LICENSE](LICENSE.txt) for details.

* [Vimium](https://github.com/philc/vimium):
  Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
  [MIT-licensed](https://github.com/philc/vimium/blob/master/MIT-LICENSE.txt).
* [微度新标签页](http://www.weidunewtab.com/):
  ©2012 杭州佐拉网络有限公司 保留所有权利.
* [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval)
  ([Modified](https://github.com/gdh1995/js-expression-eval)):
  Copyright (c) 2015 Matthew Crumley.
  [MIT-licensed](https://github.com/silentmatt/expr-eval/blob/master/LICENSE.txt).
* [Viewer.js](https://github.com/fengyuanchen/viewerjs)
  ([Modified by gdh1995](https://github.com/gdh1995/viewerjs/tree/for-vimium-plus)):
  Copyright (c) 2015-2017 Chen Fengyuan.
  [MIT-licensed](https://github.com/fengyuanchen/viewerjs/blob/master/LICENSE).
* [TypeScript](https://github.com/Microsoft/TypeScript):
    and modified `es.d.ts`, `es/*`, `dom.d.ts` and `chrome.d.ts` in `types/`:
  Copyright (c) Microsoft Corporation (All rights reserved).
  Licensed under the Apache License, Version 2.0.
  See more in [www.typescriptlang.org](http://www.typescriptlang.org/).
* [PDF.js](https://github.com/mozilla/pdf.js/):
  Copyright (c) Mozilla and individual contributors.
  Licensed under the Apache License, Version 2.0.
