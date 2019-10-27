<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>
![Icon](icons/icon32.png)
========

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.txt)
[![Version 1.78.4](https://img.shields.io/badge/release-1.78.4-orange.svg
  )](https://github.com/gdh1995/vimium-c/releases)
[![Current Build Status](https://travis-ci.org/gdh1995/vimium-c.svg?branch=master
  )](https://travis-ci.org/gdh1995/vimium-c)
**Visit Vimium C on [Chrome Web Store](
  https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg/reviews
  )** /
**[Firefox Add-ons](
  https://addons.mozilla.org/firefox/addon/vimium-c/
  )**

A <span style="color: #a55e18;">C</span>ustomized
  [<span style="color: #2f508e;">Vim</span>ium](https://github.com/philc/vimium)
  having <span style="color: #a55e18;">**C**</span>hinese support,
    global <span style="color: #a55e18;">**C**</span>ommands
    and inje**c**tion functionality,
  in <span style="color: #a55e18;">**C**</span>-style code for qui**c**ker action and less resource **c**ost.

It (the version in Web Store) supports Chrome and other Chromium-based browsers whose core versions are >= 38,
  and supports almost all of the functionality on a latest Firefox (since version 64.0).
If re-compiled from the source code, Vimium C is able to support Chromium 32.

This project is developed by [gdh1995](https://github.com/gdh1995)
  and licensed under the [MIT license](LICENSE.txt).

![Usage Demo of Vimium C](https://gdh1995.github.io/vimium-c/demo.gif)

An old name of this project is "Vimium++", which has been given up on 2018-08-21.

On MS Edge (Chromium), it works well, and it can even run on MS Edge (EdgeHTML), though there're still some errors.

# Project Introduction

__<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>:__

* a web extension on Chrome and Firefox that provides keyboard-based navigation and control
    of the web, in the spirit of the Vim editor.
* add some powerful functions and provide more configurable details and convenience.
* here is its [license](LICENSE.txt) and [privacy policy](PRIVACY-POLICY.md)
* the initial code is forked from [philc/vimium:master](https://github.com/philc/vimium) on 2014.
* customized after translating it from CoffeeScript into JavaScript and then TypeScript.

__Other extensions supporting Vimium C:__

* PDF Viewer for Vimium C
  : a modified version of [PDF Viewer](https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
    from [PDF.js](https://github.com/mozilla/pdf.js/)
  * Visit it on [Chrome WebStore](
      https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium-c/nacjakoppgmdcpemlfnfegmlhipddanj)
* Modified Weidu New Tab (微度新标签页修改版)
  : a modified, lite version of [www.weidunewtab.com](http://www.weidunewtab.com/) (or
      [www.newtabplus.com](http://www.newtabplus.com/) )
  * Visit it on [Chrome WebStore](
      https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)

# Release Notes

1.78.4:
* Chrome: add a feature to hook in-page "access keys" and enable it by default
* Firefox: support 63+ and more conditions
* VHints: <kbd>Tab</kbd>: now only switch visibility in limited ranges
* add `zoomIn` and `zoomOut` commands, and use a huge count like `1111` to reset zoom
  ([#83](https://github.com/gdh1995/vimium-c/issues/83), [philc#2978](https://github.com/philc/vimium/pull/2978))
* fix some old bugs

1.78.3
* LinkHints: fix a regression since v1.78.0 that Vimium C might fail in clicking targets inside shadow-DOM trees
* image filename extension: add support for `.apng`
* `exitOnClick` option: fix a bug so that Vomnibar won't exit on simulated mouse events from page scripts

1.78.2
* LinkHints: `touch` mode: now disabled by default; use `touch=true` or `touch="auto"` to enable it
* Scroller: support `visualViewport` when computing view size
* Scroller: a try to support `scroll-snap-type` on Chrome
* `goNext`: add "上一封" / "下一封" (Chinese words) to the default patterns
* options page: `drag-and-drop` exclusion rules to reorder them
* fix some bugs

1.78.1
* Firefox: fix broken `LinkHints`

1.78.0:
* its UI uses Simplified Chinese (简体中文) for all `zh-*` language regions
* the default value of `ignore keyboard layout` option rolls back to `false` again
* the `passKeys` will only exclude key strokes when the "current key" sequence is empty
* `closeTabsOnRight` now closes *all tabs* on the right, just like what Vimium does (so does `closeTabsOnLeft`)
* `LinkHints` now uses a single <kbd>F2</kbd> to re-find new page nodes with `onclick` event listeners
* `LinkHints.activateModeToCopyLinkText`: add an option `join:string/boolean` to join selected text pieces
* `LinkHints`: better support for "weibo.com" and pages using Material Design
* `LinkHints`: better support for pinch zooming on laptops
* `LinkHints.activate button="right"`: now simulate `auxclick` events
* add a command `copyWindowInfo` to copy title and URL info of all tabs
* Vomnibar and Help Dialog now support an option `exitOnClick`
* Firefox: when browser data is cleared, Vimium C's local data is erased, too, so auto recover those data in time
* Chrome: fix broken `importing settings` on v1.77.1
* `LinkHints.activateModeToCopyLinkUrl`: fix not finding those in shadow DOM trees
* fix some other small bugs

1.77.3:
* 1.77.3: only for Firefox; fix that it could not open "about:newtab"
* 1.77.2: only for Firefox; avoid some error logs in the console of background process
* **not manage browser NewTab any more** in released versions ([#53](https://github.com/gdh1995/vimium-c/issues/53),
    [#51](https://github.com/gdh1995/vimium-c/issues/51), [#42](https://github.com/gdh1995/vimium-c/issues/42),
    [#28](https://github.com/gdh1995/vimium-c/issues/28), [#14](https://github.com/gdh1995/vimium-c/issues/14))
* `ignoreKeyboardLayout` is enabled by default, to **support most keyboard layouts by default**
* the [PRIVACY POLICY](PRIVACY-POLICY.md) has been updated
* translated into Chinese
* some other bug fixes

1.76.8:
* fix Vomnibar might lose focus on YouTube and GMail
* history completer: fix some old items are skipped in prefix matching mode
* Commands: add option `$if={"sys":"win","browser":1}/...` to filter mappings
  * `"sys"` can be `"win"`, `"mac"` or `"linux"`
  * `"browser"` can be `1` (Chrome) | `2` (Firefox) | `4` (EdgeHTML)
* now most commands support shortcuts well
* "`dark`" in `vomnibarOptions` now overrides the status of `autoDarkMode`
* some other bug fixes

1.76.6:
* fix a bug <kbd>Escape</kbd> can not work when ignoring keyboard layout
* fix a regression of v1.76.0 that in LinkHints mode `<c-a>` was not treated as `a`
* Firefox: FindMode now wraps around, like the behavior of Chrome
* FindMode history now limits query words as one line and not more than 99 characters on saving by <kbd>Enter</kbd>
* some other bug fixes

1.76.5:
* fix a bug in the popup page ([#64](https://github.com/gdh1995/vimium-c/issues/64))
* extension whitelist: allow [Vimium C's helpers](https://github.com/gdh1995/vimium-c-helpers) by default

1.76.4:
* fix that <kbd>Alt+Shift+F</kbd> was not translated into <kbd>&lt;a-s-f&gt;</kbd> when CapsLock is on
* Now the feature of overriding browser newtab settings is deprecated
* add an option to ignore keyboard layout (fix [#39](https://github.com/gdh1995/vimium-c/issues/39) completely)
  * Most of its logic is the same as [philc/vimium:lib/keyboard_utils.coffee:21](
      https://github.com/philc/vimium/blob/8c9404f84fd4310b89818e132c0ef0822cbcd059/lib/keyboard_utils.coffee#L21-L46)
* add an option to ignore CapsLock status, which is useful on macOS if using CapsLock to switch IMEs
* most backend commands are allowed for user-customized shortcuts ([#55](https://github.com/gdh1995/vimium-c/issues/55))
* `removeTab`: add an option "highlighted" to remove those tabs ([#58](https://github.com/gdh1995/vimium-c/issues/58))
* LinkHints: auto enable modal UI when needed (<kbd>&lt;a-f2&gt;</kbd> to toggle it)
* Vomnibar: add some text-handling shortcuts on Firefox ([#59](https://github.com/gdh1995/vimium-c/issues/59))
* Vomnibar: disable tab tree mode by default, unless there's an option "`tree=true`" ([#60](
    https://github.com/gdh1995/vimium-c/issues/60))
* fix some other edge cases

1.76.3:
* Chrome: fix that Vomnibar can not show favicons

1.76.2:
* fix a regression "Custom CSS" could not work on Vomnibar ([#57](https://github.com/gdh1995/vimium-c/issues/57))
* add a new feature to support user-customized shortcuts ([#55 (comment)](
      https://github.com/gdh1995/vimium-c/issues/55#issuecomment-515323624))
  * add 4 shortcuts, and 2 items are to go in a tab's history list, and the other 2 are for user to customize
* support  `vimium://status toggle ["^" ...hooked-keys]` to switch between "enabled" mode and "exclusion-matched" mode
  * for example, `map <a-s-v> openUrl url="vimium://status\u0020toggle\u0020^\u0020<a-s-v>"`
    will make <kbd>`<a-s-v>`</kbd> a shortcut to enable Vimium C or disable Vimium C (almost) completely
  * if you have configured global shortcuts, then
   `shortcut userCustomized1 command="openUrl" url="vimium://status\u0020toggle\u0020^\u0020<a-s-v>"`
   will make the shortcut a convenient switch button of Vimium C's working status
* `goBack` now tries its best to simulate the feature of "duplicate-and-go-back" on older versions of Chrome (before 72)
* the behavior of `removeTab goto=previous` is changed, and the new logic is simpler and easier to use
* now mapped <kbd>`<esc>`</kbd> and <kbd>`<escape>`</kbd> keys work the same as native <kbd>`<esc>`</kbd> keys
* LinkHints: now <kbd>`<c-f2>`</kbd> will hint all elements with non-null "onclick" properties
* Firefox: now can show a confirmation dialog if a command count is too large
* fix a bug of parsing failures if a line in key mapping rules ends with the <kbd>\\</kbd> character

1.76.1 for Firefox:
* fix broken FindMode

1.76:
* add a new command `closeDownloadBar` to close Chrome's download bar at the bottom
* `mapKey`: now apply mappings for lower-case characters to every keys including it
  * for example, if `mapKey f g`, then `<c-f>` will be translated into `<c-g>`
  * also work in LinkHints mode ([#39 (comment)](https://github.com/gdh1995/vimium-c/issues/39#issuecomment-504303346)),
    unless there's an option of `mapKey=false`
  * so if your IME is not English, you may map alphabets to the English versions (in Vimium C) using a list of `mapKey`
* LinkHints: now always search shadow DOMs and the related boolean option is useless and removed
* LinkHints: if press <kbd>Ctrl</kbd> in "text"/"url" modes, then it will copy multiple lines to the clipboard
* Vomnibar supports a new mode "`bomni`" in which bookmarks' priority is higher ([#50](
    https://github.com/gdh1995/vimium-c/issues/50))
* Vomnibar now shows a "tab tree" when in "current window tabs" mode
* now it can sync much longer (bigger than 8KB) key mapping list and search engines through the browser syncing service
  * all the synced data is still limited under 100KB
* in case you clean all browsing data, now it can recover most settings (at most 5MB) even if syncing is off
* now LinkHints and Vomnibar are faster
* partly work around a bug of Chrome 70+, which affects command `toggleCS`
* if the confirmation dialog is forbidden by mistake, then now a too large count will be treated as 1
  * the old behavior was to do nothing, which is somehow inconvenient
  * the dialog works again if you reload this extension, or just restart Chrome
* Firefox: fix a potential vulnerability in v1.75.7 and v1.75.8
* update some notes in PRIVACY POLICY about which permissions may be removed safely

1.75.8 (only released on Firefox):
* LinkHints: smarter hinting and now `<video>` and `<audio>` are clickable
* on Google Docs, now can press `<esc>` for a while to move focus from document content to the window
* `removeTab` command now supports an option of `goto=""/left/right/previous`
* click listener watcher: fix a vulnerability in v1.75.7
* the options page won't be dark if the option "auto-dark-mode" is unchecked
* Firefox: the options page now shows a tip if the value of New tab URL has a mistake

1.75.7:
* LinkHints: add some new rules to exclude useless hints for container nodes
  * much smarter on Google search result pages
* a global dark mode for Chrome 76+ and Firefox 67+ is now enabled by default
  * include new styles for hint markers, HUD, options page and the help dialog
* Scroller: fix it might scroll too far in some cases (for example, a long page is loading) ([#45](
    https://github.com/gdh1995/vimium-c/issues/45))
* Scroller: fix a bug of losing current active elements after switching scrolling directions
* Firefox: fix broken FindMode ([#48](https://github.com/gdh1995/vimium-c/issues/48
    )) and some other issues on pages with multiple iframes
* Firefox: fix LinkHints may cause scrollbars to show in some cases
* Firefox: now both auto-dark-mode and auto-reduce-motion can response to system setting changes
* goNext: stricter: not match long text

1.75.6:
* fix that Vomnibar can not acquire focus on the first activation on a new page since Chrome 75
* fix `mapKey` could not map a key of printable characters to `<esc>` (only fixed in the Firefox version)
* Firefox: fix LinkHints can not exit itself when clicking an `<iframe>`
* `goBack` command supports an option `reuse`=`-2`/`-1` to open a previous URL in the tab history in a new tab
  * just like you <kbd>Ctrl+Click</kbd> / <kbd>Ctrl+Shift+Click</kbd> the browser's "Back" button
  * this feature can only work since Chrome 72, and currently not on Firefox

1.75.5:
* support `prefers-reduced-motion` and `prefers-color-scheme` media queries
  * be able to auto disable animation and enter dark mode when some options are enabled
  * enable the option "Auto reduce UI motions following your system settings" by default
* LinkHints: add a new option `mapKey` to translated typed keys to match marker text
  * use a subset of translation rules of `Custom key mappings`
  * require both sources and targets are single characters (can not map keys like `<a-d>`)
* LinkHints: by default, detect and use touch mode automatically since Chrome 48
* Vomnibar has a default style named `mono-url`. Remove it to switch monospace fonts for suggestion URLs
* fix that LinkHints and Vomnibar might fail to switch to other tabs
* fix more issues about `passNextKey`
* `discardTab` only discards those auto-discardable tabs which are marked by the browser if count is greater than 1
* vimium://show : upgrade the embed Viewer.js
* Firefox: fix that help dialog may fail to show in rare cases

1.75.2:
* use new icons
* exclusion: make passKeys take precedence over mappedKeys
* now `mapKey` can map any key to `<esc>` and map `<esc>` and `<c-[>` to others
* LinkHints/Scroller/Vomnibar: activate on a parent frame if needed
* FindMode: auto fill/search with selected text by default
  * a new option `selected=false` can prevent this behavior
* fix some bugs of `passNextKey`
* fix some rare edge cases on malformed webpages


### Known Issues

There're some known issues on previous or latest versions of Chrome,
and please read https://github.com/gdh1995/vimium-c/wiki/Known-issues-on-various-versions-of-Chrome
  for more information.


# Building

If you want to compile this project manually, please run:

``` bash
npm install typescript@3.4.3
node scripts/tsc all
#./scripts/make.sh output-file.zip
```

`gulp local` can also compile files in place (using configurable build options),
while `gulp dist` compiles and minimizes files into `dist/`.

The options including `MinCVer` and `BTypes` in [gulp.tsconfig.json](scripts/gulp.tsconfig.json)
  are used to control supported target browsers and set a minimum browser version.

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
* The Orange in icon is from https://pixabay.com/vectors/orange-fruit-mandarin-citrus-fruit-158258/
