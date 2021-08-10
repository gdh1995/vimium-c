Release Notes of Vimium C
=========================

ReadMe: https://github.com/gdh1995/vimium-c/#readme .<br/>
说明文档: https://gitee.com/gdh1995/vimium-c#readme , https://github.com/gdh1995/vimium-c/blob/master/README-zh.md .

#### 1.92.0
* **improved key mappings**
* `Vomnibar`: fix URLs with space characters would break
* `map`: fix bugs of `$then` and `$else`, and apply them to much more commands
  * for example, `enterFindMode` supports `$then="enterVisualMode"`, and `scroll*` runs `$then` when something is scrolled
  * most commands operating tabs support `$then` and `$else`
* `runKey` command: change syntax of `.keys`, to **support command trees**
  * see https://github.com/gdh1995/vimium-c/wiki/Auto-run-a-tree-of-commands
* `env`: now `host` only considers about top frame URL; add `iframe: boolean | string` to match iframes
* `mapKey`: support `<...:n>` and they will only take effect in normal mode
* `LinkHints`: image mode: now can open simple SVG images
* Firefox: some commands operating tabs will run faster when repeating count is 1
* fix `w` and `e` in `VisualMode` on Chrome 90+ on Windows
* fix `passNextKey` on macOS
* fix a bug about `filter` in `closeOtherTabs`; `joinTabs` and `sortTabs` now supports `filter`
* some other improvements and bug fixes

#### 1.90.2
* fix broken `mapKey`
* fix simulated `mouseenter` and `mouseleave`
* improve logic about `$then` and `$else`
* add a basic support for tab containers on Firefox

#### 1.90.1
* fix broken `goBack`
* fix `moveTabToNextWindow` would create an extra tab

#### 1.90.0
* key mappings: now a name of key can include <kbd>_</kbd> ("underscore")
  * so a key can be named `<v-hint_mode1>` - much more readable
  * now all directives support `$if`
  * add `$then:Key $else:Key` for many commands, to run a sequence of commands
    * please search `Req.FallbackOptions` in source code to find which support them
  * `runKey`: add a simpler syntax: `expect="envName1:keySeq1,env2:key2"`
* open URL: now most options can work together (orthorhombic)
  * change meaning of `reuse=last-wnd-bg`: create an active tab but not activate the last window
  * add `replace:URLPattern` to find (match) a tab by URL and replace it with a target URL
  * improve URL detection when open copied URL, and add `copied=urls|any-urls` to open a list of copied URLs
  * most commands to open URL now support options including `keyword testUrl replace position sed window`
  * `createTab` is now full featured and works just like an alias of `openUrl` (#344)
  * `Vomnibar`: decode `file:///` URLs on Windows system
* `LinkHints`: add lots of options to do whatever needed
  * improve in focus (#328), newtab (#340), downloading (#332) and `video,audio` (#323)
  * add `.evenIf:enum typeFilter:enum textFilter:RegExp anyText:bool` to allow/refuse elements
  * `LinkHints.click`: add an object option `directOptions={}` to iterate in matches
      ([phlic#595](https://github.com/philc/vimium/issues/595))
* text substitution: add some actions and allow non-EN context keys for users to customize rules
* `Vomnibar`: now can remove session items on Firefox
* `goNext`: fix logic of its `match` option
* `performFind`: add `query:string restart:bool` to search given query directly
* `enterInsertMode`: allow non-word character as key (#325)
* UI: support `forced-colors` and use thicker borders on a high-DPI screen (scaling \>= 200%)
* injection: use `[data-block-focus]` to grab focus on other extensions' pages (#164)
* optional permissions: add support for `chrome://*/*`
* fix some bugs

#### 1.89.1
* Firefox: fix breaking before Firefox 79

#### 1.89.0
* add new options to request optional permissions like `downloads`
  * with `downloads`, `closeDownloadBar` will be able to keep your tab groups unchanged
  * if the flag `#extensions-on-chrome-urls` is enabled, now work on the native New Tab Page on Chrome 85+
    * note: only tested on Chrome, and other browsers like MS Edge may refuses this injection
  * `contentSettings` has been moved to optional, so in a fresh installation `toggleCS` may not work but show an error tip
* fix a compatibility issue about fullscreen on new MS Edge
* VisualMode: fix behavior of `w` on Firefox
* `LinkHints`: support `exclude: css-selector` to exclude special elements
* add `vimium://sed`, `sed-p` and `sed2`
  * see https://github.com/gdh1995/vimium-c/commit/41e239654b4652417aec3b9645b2360557842418 for detailed usages
* Firefox: allow restoring an incognito tab if `incognito="force"`
* Chrome: `moveTab` now keeps tab in its group, unless `group="ignore"`
* add some other options to commands like `zoomIn`, `toggleMuteTab`
* fix some bugs

#### 1.88.2
* refuse to open known "harmful" URLs and show a tip: for example, the `...\condrv\kernelconnect` will trigger an error
* key mappings: `env`: add `fullscreen: boolean` to detect element-wise fullscreen mode
* `LinkHints.click`: add `direct="element" match=... index=<number>|"count"` to directly select any element and click
* Scroller: support `keepHover=true|"auto"|false|"never"|<number>`
  * `"auto"` to detect 3 times of losing frames (interval `>` 20ms) and then prevent hover effects
  * `false` means to prevent by default, unless there's selected text; `never` means to ignore selection status
  * `<number>` means a minimum latency for `"auto"`, if it `>=` 20
* Scroller: fix broken `scrollPx*` and some other issues
* Vomnibar: if in domain mode (query starts with `:d `), then show a list of matched domains
* Vomnibar: fix an order bug on pagedown
* `goNext`: prefer the value of `[aria-label]` if text is very short (up to 2 characters, like icons)
* improved `vimium://show #!image`

#### 1.88.1
* fix `ignoreKeyboardLayout` didn't work if it had been enabled
* fix in FindMode RegExp mode could not match non-English letters
* Firefox: `LinkHints.activateModeToDownloadImage` now opens a plain tab, to support <kbd>Ctrl+S</kbd>
* `vimium://show`: add a parameter of `pixel=1` to show pixelated images

#### 1.88.0
* add `map *** runKey expect={env1:key1} keys=<default_key>` with `env name ...conditions`
  * now Vimium C can trigger different commands on different websites / for different active elements
  * see https://github.com/gdh1995/vimium-c/wiki/Map-a-key-to-different-commands-on-different-websites
* add `LinkHints.click` to click selected text, focused element or the nearest clicked
* `ignoreKeyboardLayout`: add a partly-checked state which requires <kbd>Alt</kbd> to ignore layouts
* FindMode: use `normalize` to normalize text before finding and get a more accurate count
* when operate multiple tabs, not limit the range to one side if count \< 10
* `gotoRoot`: if there're sed rules marked with `"r"`, then use them to learn sub roots
* omnibox: move title before URL - just like Firefox/Chrome/Edge
* Vomnibar: now can query an encoded URL in browser history
  * add `noSessions`=false|true|always|start ([#224](https://github.com/gdh1995/vimium-c/issues/224),
      [#261](https://github.com/gdh1995/vimium-c/issues/261#issuecomment-747290671))
  * also add `clickLike` to change behaviors on *-Enter ([#263](https://github.com/gdh1995/vimium-c/issues/263))
* increase `minimum_chrome_version` to `47`
* some other enhancements
* fix some bugs including that `goToRoot` and `showTip` may break

#### 1.87.2
* fix a crash preventing Vomnibar and Scroller from working ([#250](https://github.com/gdh1995/vimium-c/issues/250))

#### 1.87.1
* fix crashes in the Firefox / Edge store versions ([#251](https://github.com/gdh1995/vimium-c/issues/251))

#### 1.87.0

new features:
* `scroll*`: support a monitor with a **high refresh rate**
* `LinkHints`: support `clickable=<CSS-selector>` to **mark any element clickable**
  * also support `match=<CSS-selector>` to show hints for matched elements only
  * `goNext` and `focusInput` also support them
* `goNext`: support **substituting a tab URL** and jumping to it
  * need to convert the index number of URL into `${index[/[min]:[max]:[step]]}` first
  * the default key when substituting is `n`, and `goNext` now supports `sed`
  * the later parts are optional, and the shortest format is `${curIndex}`
  * `goNext` will use a new URL of `index + step`, or find an element as a fallback if a tab URL is not converted
  * if `absolute`, then use command count as the new index
  * now can skip checking the `rel` attribute by `noRel`
* Vomnibar: run sed with a key of "`o`" on enter if the input line is selected
* Vomnibar: math calculator: now support `rad`, `＋−×÷`, `3² + 4²` and `°`
* a new command of `runKey` with `keys:string[]`: act like another key which is selected in its `keys` option using command count
* a new command of `sendToExtension`: send messages to other extensions
* `vimium://status` now supports `toggle-enabled/toggle-disabled/toggle-reset`
  * switch in only 2 statuses, still with an optional list of hooked keys
* when displaying an image, <kbd>Ctrl+C</kbd> will copy a HTML part on a latest Chrome
  * then it can be pasted directly in MS Word

breaking changes:
* add a timeout of 30 seconds after pressing a prefix key
* add a few search engines into the default list
  * some of them are default only when browser language is Chinese
* keyboard event: not use a `code` if it looks like `Key*` while the `event.key` is long ([philc#3317](
    https://github.com/philc/vimium/issues/3317))

bug fixes:
* scroll: fix `keepHover=false` breaks all UI until a `LinkHints` command
* Chrome: the watcher for click event listeners: fix a naive security bug
* fix some edge cases

#### 1.86.2
* fix some bugs

#### 1.86.1
* fix losing some hints on v1.86.0

#### 1.86.0
* add `LinkHints.activateToSelect` which uses `caret: boolean, visual=true`
  * it works just like the `element_text_select` command in [VimFx](https://github.com/akhodakivskiy/VimFx)
* FindMode: press `<c-s-j>` and `<c-s-k>` to **flash rects over all visible matched** text
* FindMode: now enable the multi-line flag when in regexp mode
* `Marks.clearLocal`: add an option `all` to clear local marks of all websites
* Firefox: fix VisualMode might crash when selection met a text box
* fix some other bugs
* now Marks won't erase Vimium's local marks
* now open the command list dialog on a first installation

#### 1.85.2
* UI: fix missing borders on Chrome 85+ if a screen is in some special DPIs
* `LinkHints.activateModeToOpenVomnibar`: fix `url=true` didn't work
* `copyCurrentUrl` with `type=frame` now works on PDF Viewer for Vimium C
* `goUp`/`goToRoot` now uses `type=frame`/`type=tab` to decide their target
* Vomnibar: add a classname of `has-dark` to `<body>` when in dark mode

#### 1.85.1
* fix LinkHints/Vomnibar could not work in some situations on Google Docs ([#211](
    https://github.com/gdh1995/vimium-c/issues/211))
* options page: fix that it might save key mappings in a wrong syntax
* Vomnibar: use a better strategy to replace `。` in Chinese with `.` in English
* PDF Viewer for Vimium C: now only copy the URL of an opened PDF file in `copyCurrentUrl`
* `moveTabToNextWindow`: now support `minimized=false` to skip minimized windows

#### 1.85.0
* Firefox: fix that Vimium C would break some iframes
* Vomnibar: fix a regression which would interrupt inputting by IME
* Vomnibar settings: add `action=""/"opener"` (for [#198](https://github.com/gdh1995/vimium-c/issues/198))
* add an option `opener` to some commands which open URLs, to always set opener
* add an option `richText` to some commands in order to copy HTML content
* FindMode: add a cache for 3~6 seconds, so if a page changes rapidly, shown `count` may be a bit inaccurate
* paste from clipboard: now accept a string of up to 20M characters
* add a command `sortTabs` to sort tabs, and support `sort=""/create/recency` ([#207](
    https://github.com/gdh1995/vimium-c/issues/207))
* LinkHints: add an option `position` and all `position` options accept `"default"` ([#208](
    https://github.com/gdh1995/vimium-c/issues/208))
* add a command `captureTab` to capture the visible area of a current tab
* now open Vimium C Options page on first installation
* add some other command options
* fix some bugs and wrong usages

#### v1.84.3
* fix broken `autoCopy`
* substitution rules: fix some bugs in text substitution
  * now execute actions in their declaration sequence
  * add some actions: base64, btoa, encode, eecodecomp
* Firefox: Vomnibar: not list hidden tabs by default, unless `hiddenTabs=true`
* `goNext`: fix some issues
* `openUrl`: add `title_mask`

#### 1.84.2
* Vomnibar: add a style keyword of `time` to show time string ([#154](https://github.com/gdh1995/vimium-c/issues/154))
* add a new command: `addBookmark` with an option of `path: string`
* `toggleReaderMode`: now work on Edge (Chromium)
* `removeTab`: now support `keepWindow=always`
* `searchInAnother`: fix a regression that the default of `reuse` should be `current`
* substitution rules: add a new filter: `,host=*.example.com`
* fix some edge cases

#### 1.84.1
* FindMode: **better support for regexp queries**, like matching `\ra(?!nd)` in `abc and def`
* mapped **long keys ending with `:i` always work in a plain insert mode**
  * for example, `map <c-j:i> editText run="auto,forward,line"` will move caret down by a line, only in insert mode
  * not in any global insert mode of `enterInsertMode`
* fix it could not enter VisualMode if FindMode had never been activated
* LinkHints: a new option `newtab=last-window` to open links in the other window
* a new command `toggleStyle` to insert/remove CSS styles to pages
* a new command `scrollSelect` to switch selection in `<select>` boxes
* `editText`: support a new action of "`auto`", to switch in `extend` and `move` according to selection type
* `enterInsertMode`: support 2 new options of `unhover` and `reset` to clear old modes

#### 1.84.0
* LinkHints: **better compatibility with Firefox popup blocker** in "newtab" mode
* now **support the high contrast mode** on Firefox and Edge (Chromium) ([#191](
    https://github.com/gdh1995/vimium-c/issues/191))
* fix some bugs, including a regression of custom CSS and broken <kbd>Tab</kbd> during `focusInput`
* substitution rules: extend its usages
  * support post-actions like `decode/unescape/upper/lower/reverse`
  * the syntax is `s/query/replaced/i,decode,upper,reverse`: repeatly append a <kbd>,</kbd> and an action
  * most related commands supports `sedKey: character` to filter pre-defined rules
  * now the prefix of a rule can include up to 6 any English letters, and the rule gets used if only `sedKey` is in it
* `focusInput`: add option `prefer: CSS selector` to choose a desired input
* Vomnibar: use <kbd>Meta+N</kbd> to select the N-th item, like Alfred
* Vomnibar: add an option `incognito=null/boolean/"reverse"` ([#195](https://github.com/gdh1995/vimium-c/issues/195))
* Marks: now allow some host pages to report scrolling position and jump to marks in their own ways ([#193](
    https://github.com/gdh1995/vimium-c/issues/193))
* the UI of options page: use flat mode
* build: record arguments to be able to reproduce the same package, in order to meet requirements of Firefox Add-ons

#### 1.83.4
* **better simulating of mouse events**: wait for 1~2 microticks, so that work better with modern frameworks
* fix some bugs about `LinkHints` and the Display page
* `focusInput`: follow "Detect whether links are completely covered or not"
  * support an option `reachable: boolean` to override this behavior
* `goNext`: now find links in all same-origin frames
* `goUp`: support an option `sed` to use substitution rules with prefix=`g`
* Block list of words: a small change to how to detect comments
* settings: show advanced options and command items by default
* export settings: now support non-English characters in block list of words

#### 1.83.3
* createTab: in an incognito window, now don't open extension pages by default, unless `evenIncognito`
* Scroller: make `keepHover` enabled by default; also use a cheaper way to prevent hover effects
* `autoOpen`/`openUrl`: add an option `testUrl`, which is default to `false` if the option `keyword` is not empty
* LinkHints: use `[aria-label]` and support `html[data-vimium-hints=ordinal]`
* Vomnibar: fix bugs when preferring a web page as the Vomnibar page; fix no favicons on Firefox
* Vomnibar: add an option `engines: enum` to filter out any engines
* scroller: continue scrolling when irrelevant keys get released
* fix some other bugs

#### 1.83.2
* LinkHints: no hint links on an iframe if it's wholly covered
* FindMode: fix an edge case <kbd>Ctrl+J</kbd> may hang at a place
* Vomnibar: fix a bug the `currentWindow` option may affect a next `activateTabSelection` command
* settings: fix a crash during auto-recovering when `localStorage` got cleared
* copy to clipboard: avoid spaces occur in URLs
* export settings: encode the block list of words using base64
* Firefox on Android: highly experimental support
* fix some other bugs

#### 1.83.1
* i18n: support French when showing tips
* releases on the store: increase the required *minimum Chrome version* to 43
* Vomnibar: fix some bugs when a query starts with `vimium://cd`
* options page: if there're errors in custom key mappings, show them directly
* `mapkey`: support `$if={os: "win"|"mac"|"linux", browser: int}`, just like `map`
* text substitution: add a prefix of `i` and two suffixes of `r` and `d`
  * `i` is for `vimium://show image` to parse high-resolution image URLs
  * `r` means "reverse", and treats a first matched group as the result
  * `d` means "decode URL", and it will try to decode result URLs
* LinkHints: show indigenized upper-case characters (experimentally)
* Vomnibar: now expose visit time for customized Vomnibar page [(#154)](https://github.com/gdh1995/vimium-c/issues/154)
* `autoOpen`: add an option of `copy` [(#159)](https://github.com/gdh1995/vimium-c/issues/159)
* fix an error on iframes before Chrome 36 and when `#enable-javascript-harmony` is on


#### 1.81.5
* `LinkHints`: Filtered hints: use <Kbd>Alt+N</Kbd> to filter by link text ([#122](
  https://github.com/gdh1995/vimium-c/issues/122))
* `LinkHints`: add `scroll="force"` to focus and then scroll some special boxes ([#147](
  https://github.com/gdh1995/vimium-c/issues/147))
* `Scroller`: add an option of `passPointer` to pass pointer events
* `Vomnibar`: add an option of `icase` ([#131 (comment)](
  https://github.com/gdh1995/vimium-c/issues/131#issuecomment-608532435))
* `closeOtherTabs`: add `filter=""/url/url+hash/url+title` ([#148](
  https://github.com/gdh1995/vimium-c/issues/148))
* Clipboard text Substitution: now accept empty destination strings
* better support for the flag `#freeze-user-agent` on Chrome 81

#### 1.81.4
* `Vomnibar`: roll back and prefer visited tabs to newly-opened ones ([#60 (comment)](
  https://github.com/gdh1995/vimium-c/issues/60#issuecomment-603148180))
  * support `noTabs` or `":H"` to avoid searching opened tabs in omni mode
  * add `autoSelect` and enable it by default in history/bookmark/tabs mode ([#144](
    https://github.com/gdh1995/vimium-c/issues/144))
  * add `searchInput=false` to prevent default searching
* `mapKey`: support a new mode ID of `e` (NExt) and use it when a prefix sequence of count/key has been typed.
* `LinkHints`: support `autoUnhover` to unhover a link node once it's clicked
  * on Firefox: press <kbd>Esc</kbd> to auto unhover a link node after opening it in a new tab
* `focusInput`: support `act="last"|"last-visible"` ([#127 (comment)](
  https://github.com/gdh1995/vimium-c/issues/127#issuecomment-602038442))
* `goNext`: prefer completely matched text (e.g. `">"` is preferred to `">|"`)
* `goBack`: add an option of `local` to always use `history.go`, instead of async going
* popup page: if an extension wants to run Vimium C but not is allowed, show a button to auto allow it
* some bug fixes

#### 1.81.0
* fix that <kbd>-</kbd> or software-produced <kbd>Escape</kbd> can not be recognized ([#129](
  https://github.com/gdh1995/vimium-c/issues/129))
* **Privacy Policy**: update to **allow short-term and in-memory cache** for Vomnibar suggestions
  * Please see https://github.com/gdh1995/vimium-c/commit/240160ddb931c3fda545e8b7bd06f7c0bba0d56b
* Vomnibar: also match queries in all tabs when in omni mode
* Vomnibar: fix some edge cases and improve performance when matching queries
* Vomnibar: show indexes on <kbd>Alt</kbd> and quickly access items with <kbd>Alt + Number</kbd>
  * on macOs, use <kbd>Ctrl + Alt + Number</kbd> (`<a-c-N>`) instead
  * keys can be re-mapped: see [#135 (comment)](https://github.com/gdh1995/vimium-c/issues/135#issuecomment-597649596)
* LinkHints: Firefox: improve reachability detection for scrollable areas
* LinkHints: Filtered Hints: make hint keys follow page numbers
* Scroller: use a lightweight method to deactivate hover effects globally if smooth scrolling is enabled ([#133](
  https://github.com/gdh1995/vimium-c/issues/133))
* `goNext`: support aria-label
* `switchFocus`: add 2 options of `select` and `flash` to work like `focusInput` ([#127](
  https://github.com/gdh1995/vimium-c/issues/127))
* hooked `Function::toString`: not convert those whose body includes `__VimiumC_` to `()=>1` any more (influence [#130](
  https://github.com/gdh1995/vimium-c/issues/130))
* Chrome release: mark itself offline-enabled

#### 1.80.3
* macOS: LinkHints now works well even if a page zooms in/out many times
* LinkHints: fix a regression some links were not clickable in v1.80.2 ([philc/vimium#3501](
    https://github.com/philc/vimium/issues/3501))
* Scroller: if needed, prevent annoying scroll restoration when a page is still loading
* LinkHints: wait for enter: now can use <kbd>Backspace</kbd> to exit
* `copyWindowInfo`: support `join="json"`

#### 1.80.2
* `LinkHints` now *detects whether links are completely covered or not*, and an option can disable this feature
* macOS: fix broken LinkHints when a page is zoomed in ([#119](https://github.com/gdh1995/vimium-c/issues/119))
* fix a regression some keys were not excluded successfully ([#115](https://github.com/gdh1995/vimium-c/issues/115))
* Chrome: fix a regression the hook for click listeners became unsafe in v1.80.1
* fix some bugs when handling `vimium://***` URLs ([#113](https://github.com/gdh1995/vimium-c/issues/113))
* add a new command of `editText` ([#114](https://github.com/gdh1995/vimium-c/issues/114))
* add an option to stop to show notifications on updates ([#116](https://github.com/gdh1995/vimium-c/issues/116))

#### 1.80.1
* support pre-mode "`mapKey`" directive: ```mapKey <`:o> <f2>```
* Vomnibar: always parse `vimium://` URLs, including `vimium://paste [...sed-rules]`
* add `vimium://cd <level> [URL]`, and "level" can be `....` or `/...`
* add `sed="s/_/_/g\nRule2..."` option to those commands which uses Clipboard
* Chrome 55+: now recognize most elements with click listeners, even under Shadow DOM trees
* `enterInsertMode` drops support for `code` and `stat` options, and turns to the `key` option
* `goToRoot`: if repeats `N` times, then only select `N-1` section parts of URL path
* Edge: fix support of `<c-[>`
* some bug fixes

#### 1.80.0
* LinkHints: Firefox: fix broken Filtered Hints mode ([#108](https://github.com/gdh1995/vimium-c/issues/108))
* LinkHints: change some behavior details
* LinkHints: click mode: check `[aria-hidden]` on SVG elements ([#98](https://github.com/gdh1995/vimium-c/issues/98))
* LinkHints: click mode: support plain `Element` nodes
* LinkHints: click mode: add `newtab="window"` to open URLs on a new window
* LinkHints: hover mode: unhover on `<esc>`
* add an advanced option: `Substitution for clipboard text` to replace text before copying and pasting
* URL conversion: now auto replace `vimium://paste` with real text content in system clipboard
  * Firefox: only for commands like `openUrl`; not on Vomnibar because of a bug
* `copyWindowInfo`: add type=tab to copy info of N tabs
* `goNext`: support id/class selectors
* `enterInsertMode`: support `key: string` to declare a (mapped) key as the one to exit
* Vomnibar: dark button: fix it will be overridden when "Auto switch between light and dark mode" is on
* FindMode: apply a new appearance

#### 1.79.3
* fix broken `ignoringKeyboardLayout` in v1.79.2
* LinkHints: filtered hints: fix a crash
* LinkHints: filtered hints: type <kbd>Space</kbd> 3 times to activate a current hint
* clickable targets: add detection for `mousedown` and `dblclick` listeners
* clickable targets: detect SVG nodes with `[role=button]`

#### 1.79.2
* Firefox: fix IME compatibility issues in find mode
* Chrome: fix bugs and IME issues in find mode on old versions of Chrome
* add a new option "`mapModifier`" to generate keys like `<s-modifier>`
* fix some bugs (including some on Edge)

#### 1.79.1
* `LinkHints`: merge logic from Vimium and add new options
  * add "Filtered Hints" mode
    * support filtering by some common non-English letters
    * include a fix for [philc/vimium#3103](https://github.com/philc/vimium/issues/3103)
  * use a new algorithm to assign letters in "Alphabet Hints" mode
  * support and simulate Vivaldi: add boolean options `noCtrlPlusShift` and `swapCtrlAndShift`
  * add `newtab="force"` to skip click and force openUrlInNewTab
  * now support `dblclick` and `button="right"` to double click / click the right button
* always hook in-page access keys
  * completely avoid negative influence on debugging experience
  * the option `hook access keys` which was added in v1.78 is not needed any more
* `toggleSwitchTemp`: apply on all frames of a tab
* `createTab`: if `url: string` is specified, supports `host_mask: string`
* display image: support <kbd>Ctrl+C</kbd> to copy image data on Chrome 76+
* open copied URL: auto convert `0.0.0.0` to `127.0.0.1`
* some other bug fixes and enhancements


#### 1.78.7
* Firefox: fix `focusInput` can not select begin/end of text
* `FindMode`: try to scroll highlighted text into view
* `Vomnibar`: show better favIcons for URLs from search engines
* Firefox: a much more efficient way to detect elements with click listeners
  * also fix detection on CSP-protected pages
* `vimium://show`: notify browser not to cache images from incognito tabs
  * add an option for never writing into caches
* hook access keys: avoid part of negative influence on debugging experience
* fix some other bugs


#### 1.78.6
* Vomnibar: all of its shortcuts, including `<esc>`, now support `mapKey`
  * now Normal Mode, VisualMode and Vomnibar supports full-featured mapKey
  * LinkHints and Marks support mappings from single characters to single characters
    * this is enabled by default for `LinkHints.*`, but not for `Marks.*`
  * others support mappings to Esc (`<esc>` and `<c-[>`)
* fix some bugs

#### 1.78.5
* Edge (Chromium): release its first version
* fix that `LinkHints` may focus wrong iframes
* fix some other bugs

#### 1.78.4

* Chrome: add a feature to hook in-page "access keys" and enable it by default
* Firefox: support 63+ and more conditions
* VHints: <kbd>Tab</kbd>: now only switch visibility in limited ranges
* add `zoomIn` and `zoomOut` commands, and use a huge count like `1111` to reset zoom ([#83](
  https://github.com/gdh1995/vimium-c/issues/83), [philc#2978](https://github.com/philc/vimium/pull/2978))
* fix some old bugs

#### 1.78.3
* LinkHints: fix a regression since v1.78.0 that Vimium C might fail in clicking targets inside shadow-DOM trees
* image filename extension: add support for `.apng`
* `exitOnClick` option: fix a bug so that Vomnibar won't exit on simulated mouse events from page scripts

#### 1.78.2
* LinkHints: `touch` mode: now disabled by default; use `touch=true` or `touch="auto"` to enable it
* Scroller: support `visualViewport` when computing view size
* Scroller: a try to support `scroll-snap-type` on Chrome
* `goNext`: add "上一封" / "下一封" (Chinese words) to the default patterns
* options page: `drag-and-drop` exclusion rules to reorder them
* fix some bugs

#### 1.78.1
* Firefox: fix broken `LinkHints`

#### 1.78.0:
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
* ~~`ignoreKeyboardLayout` is enabled by default, to support most keyboard layouts by default~~ (reverted later)
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
* extension allow list: allow [Vimium C's helpers](https://github.com/gdh1995/vimium-c-helpers) by default

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
