<span style="color: #2f508e;">Vim</span>ium <span style="color: #8e5e2f;">C</span>
========
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
[![Version 1.72](https://img.shields.io/badge/release-1.72-orange.svg
  )](https://github.com/gdh1995/vimium-c/releases)
[![Current Build Status](https://travis-ci.org/gdh1995/vimium-c.svg?branch=master
  )](https://travis-ci.org/gdh1995/vimium-c)
**[Visit Vimium C on Chrome Web Store](
  https://chrome.google.com/webstore/detail/vimium-c/hfjbmagddngcpeloejdejnfgbamkjaeg
  )**

A <span style="color: #8e5e2f;">C</span>ustomized
  [<span style="color: #2f508e;">Vim</span>ium](https://github.com/philc/vimium)
  having <span style="color: #8e5e2f;">C</span>hinese support,
    global <span style="color: #8e5e2f;">C</span>ommands
    and injection functionality,
  in <span style="color: #8e5e2f;">C</span>-style code for better speed and less resource cost.
It supports Chrome and other Chromium-based browsers whose core versions are >= 35,
  and partly supports latest Firefox.

This project is developed by [gdh1995](https://github.com/gdh1995)
  and licensed under the [MIT license](LICENSE.txt).

![Usage Demo of Vimium C](https://gdh1995.github.io/vimium-c/demo.gif)

An old name of this project is "Vimium++", which has been given up on 2018-08-21.

The branch [`basic-on-edge`](https://github.com/gdh1995/vimium-c/tree/basic-on-edge)
  is able to run on lastest Microsoft Edge,
  though some function are broken because Edge always lacks many features.
This extension can also work on lastest Firefox, but there're still some errors.

# Project Introduction

__<span style="color: #2f508e;">Vim</span>ium <span style="color: #8e5e2f;">C</span>:__

* a Chrome extension that provides keyboard-based navigation and control
    of the web in the spirit of the Vim editor.
* forked from [philc/vimium:master](https://github.com/philc/vimium).
* customized after translating it from CoffeeScript into JavaScript.
* add some powerful functions and provide more convenience (for me, at least ^_^).
* here is its [license](LICENSE.txt) and [privacy policy](PRIVACY-POLICY.md)

__Other extensions supporting Vimium C:__

* [PDF Viewer for Vimium C](https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium%20%20/nacjakoppgmdcpemlfnfegmlhipddanj)
  : a modified version of [PDF Viewer](https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
    from [PDF.js](https://github.com/mozilla/pdf.js/)

# Known Issues

Here're some issues still existing on the master branch, which are mostly caused by Chrome bugs:

1. If a page in another extension is the preferred Vomnibar page, and the extension is disabled in incognito mode,
  Vomnibar might break in such a situation, and there seems no way to detect it.
  So Vimium C has disabled other extension Vomnibar pages in incognito mode.
2. *Before ver 42*, Chrome has a flag `#enable-embedded-extension-options` causing wrong dialog width on high-DPI screens,
  which can not be worked-around.
3. *Before ver 49*, Chrome has bugs in `Window.postMessage` if the flag `#enable-site-per-process` is on,
  which breaks `Vomnibar`. Then `Vomnibar` would only work well on Vimium C Options pages.
4. If a http/file/... Vomnibar page is preferred, then there're some cases where it breaks,
  such as on some websites with very strict Content Security Policies (CSP),
  so users may need to wait about 1 second to let Vimium C retry the inner page.<br/>
  *Before ver 50*, such vomnibar webpages won't work because Chrome lacks some features,
  so Vimium C will use the inner page directly.
5. *Since ver 56*, Chrome does not apply content settings (at least images) on file:// URLs.
  Currently, no effective ways have been found (up to Chrome 69).
6. *Before ver 68*, Chrome has a bug on sandboxed pages without an `allow-scripts` permission in their CSP.
  So HUD will always be visible in order to solve some browser issues on Chrome *from ver 52 to 67*.<br/>
  While *before ver 52*, all functions of Vimium C will be broken on such pages.
7. *When ver 64 and 65*, Chrome always cleans console logs if only Vomnibar is opened, and there's nothing we can do for it.
8. *When ver 69*, Chrome disables `requestAnimationFrame` on some sandboxed pages, so Vimium C can not scroll them smoothly.

# Release Notes

1.73:
* in LinkHints mode, press `<a-f2>` to fix that some hint markers are covered

1.72:
* fix broken UI on some pages using a global *flex* layout (the key CSS is `html { display: flex; }`)
  * this problem only occurs since Chrome 70, so it seems a bug of Chromium browsers.
* be able to read the system clipboard since Firefox 63.
* VisualMode: support cursor movement on `<input type=number>` correctly
* make usages of command count consistent, for `removeTab`, `removeRightTab`, `reloadTab`, `moveTabToNewWindow` and `togglePinTab`
* add a dark theme of Vomnibar, and use `gn` to toggle it
* search engines: support default URLs when a query is empty
* custom CSS: now can specify styles for FindMode HUD and Vomnibar, and live preview any changes
* VisualMode: `<f1>` to flash selection area
* help dialog: support customized key mapping names and descriptions

1.71.3:
* fix broken code on Vimium C's background process
* a few bug fixes and improvements of `FindMode` and `VisualMode`
* Firefox: fix Vomnibar UI and broken `FindMode`
* `vimium://show` now supports history actions and stores history data safely and secretly

1.71:
* use Google, instead of Baidu, as the default search engine, for non-Chinese users
* LinkHints: always match all links under Shadow DOMs
* LinkHints.activateModeToOpenImage / `vimium://show#image` : try to auto parse higher-res image URLs
* VisualMode: rewrite all code and make commands cost much less CPU and energy
* redesign the whole message + build systems: smaller code size
* fix lots of regressions and edge bugs
* now can run absolutely safely on all malformed HTML webpages, and avoid potential crashes or dead loops
* inject Vimium C into other extensions: auto reload content scripts when Vimium C updates to a new version

1.69.2:
* fix that Vomnibar often shows and disappears on reopening
* fix that some web pages can not be scrolled without a click
* fix the functionality of syncing with the cloud which is broken for a long time
* fix some old bugs of the options page

1.69.0:
* FindMode: `\w` means to enable whole-word searching
  * now it ensures search results to match regexp queries, so `\bword\b` will work well
* fix that Vimium C could not scroll on some pages
  * some of scrolling failures are because of a bug of Chrome 69, which will be fixed on Chrome 70
* LinkHints: fix that the drawer menu hides unexpectedly on google docs
* fix that `visitPreviousTab` breaks if some new tabs are not visited yet
* LinkHints: add `focus` mode and `hideHUD` switch
* limit command count: must between `-9999` and `9999`
* fix that it might break some pages in case Vimium C got disabled suddenly
* fix many edge cases

1.68.2:
* rename this project into "Vimium C"

1.68.1:
* Vomnibar: fix a broken feature of editing HTTPS URLs
* Vomnibar: always show type icons instead of type letters (even before Chrome 52 or on Firefox and MS Edge)
  * (for advanced users) custom Vomnibar page: update version limit to 1.68.1
* Note: Vomnibar uses `Shift+Delete` to delete history/tab items (the old `Shift+Enter` is just a typo)

1.68:
* tons of small fixes and updates making it easier to use
* fix the broken sync feature, which didn't work if only key mappings / exclusion rules were changed
* now LinkHints auto exits if typing in an text box when IME is enabled
* Vomnibar: sort only by last visit time if a query is just like `.pdf` or `.html`
* Vomnibar now shows the `https://` prefix of such URLs on its input box
* Vomnibar now supports `Shift+Delete` to delete history and tab items, just like what Chrome supports on omnibox
* local marks: now remember a url's hash part and recover it if nothing to scroll
* fix that Scroller might fail to scroll some areas
* detect IPv6 hosts in URLs correctly

1.67:
* Now most commands support negative count, and `'-'` is used to begin a negative count.
* 4 global shortcuts: support count again; support maps like `shortcut createTab position=end`
* redesign the Vomnibar: new type icons, translucent on blur, clear on high DPI, and smarter
* Now `focusInput` can select text, and auto exit when a current input loses its focus
* rewrite Marks: all changes made in incognito are invisible to normal pages and not persistent
* rewrite `LinkHints` to support much more strange pages
* parse url-in-text shared from Baidu Net Disk; add vimium://avg to compute math average quickly
* fix tons of bugs, including that settings can't be exported on Chrome 65
* fix that `LinkHints` couldn't click targets before Chrome 41
* fix many crashes on old versions and rarely-used flags of Chrome

1.64.1:
* global shortcuts support count prefix and custom options
* for some options, show possible errors when they're saved
* unhook click listener to be more compatible with web pages if they're totally excluded
* fix that Vomnibar flickered when switching tabs
* avoid throwing tons of errors on console of a sandboxed page
* fix some issues about Vomnibar before Chrome 58

1.64:
* fix that Vimium C didn't work on some websites or with some libraries,
  like [Angular Material](https://material.angular.io/),
    [Zeplin](https://zeplin.io/) and CKEditor 5 (1.0.0-alpha.2).
* fix that omnibox "v" mode might not work when meeting some types of input
* Vomnibar is now translucent if blurred
* fix a bug that a real `<f1>` was mistakenly translated into `<ff1>`
* For some IMEs like Chinese, Vomnibar cuts all single quotes if input is composing in the middle of text
* add some new small features and fix found bugs

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
* fix a rare case that some web page may break because Vimium C's code throws errors
* fix a regression that some tips on HUD were missing
* fix a long-term bug that history cache may not be cleaned out when some history items are removed

1.61.2:
* fix some regression bugs

1.61.1:
* fix new UI bugs on Chrome 61
* fix that content settings commands didn't work on some special URLs containing port or username info
* on most pages, it will focus a parent frame to press `<Esc>`,
  if the current is an iframe and nothing is focused or selected
* re-enable supports on about:blank iframes
* FindMode has a safer HUD

1.61:
* rework Marks so that local marks work on websites on which cookies are disabled manually
  * in `Marks.activate`, old local marks are still supported
  * **WARNING**: but `Marks.clearLocal` won't clear old local marks
  * the stored data of local marks is not compatible with Vimium any more
* completely fix Vomnibar flickering on showing and hiding
* **WARNING**: add a version limit to the preferred Vomnibar page
  * please use `<html data-version="1.61">` to tell Vimium C the page's version
  * if your custom page has no such a tag, it will be replaced with the inner one at run time
  * its styles have changed a lot, so old pages need comparison and updates before adding version attribute
* loosen limits on URL format validation: accept unknown 3-char TLDs in more cases
  * now "http://example.aab" is valid, although "example.aab" is usually not (unless it has occurred in history)
* allow "custom key mappings" to override Vimium C's default mappings without an error message
* LinkHints supports a new mode "Open multiple links in current tab" and `f-<Alt>-<Shift>` will activate it
* add a new shortcut `vimium://status <toggle | enable | disable | reset>`
    to enforce a new status on the current tab
  * you may use it on Vomnibar / Chrome Omnibox
  * the popup page has an improved UI and you may also use new buttons on it to do so
* Vimium C now tries its best to re-enable key mappings on some special child iframes using `document.open`
  * if the whole page is reopened, Vimium C can not know it directly,
    so please eval the new `vimium://status enable` URL to enforce a new "enabled" status
* improved performance: now Vimium C UI shows faster for the first command on a page

# Building

If you want to compile this project manually, please run:

``` bash
npm install typescript@next
node scripts/tsc all
#./scripts/make.sh output-file.zip
```

`gulp local` can also compile files in place, while `gulp dist` compiles and minimizes files into `dist/`.

# Thanks & Licenses

Vimium C: Copyright (c) Dahan Gong, Phil Crosby, Ilya Sukhar.
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
  ([Modified by gdh1995](https://github.com/gdh1995/viewerjs/tree/for-vimium-c)):
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
