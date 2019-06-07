var HelpDialog = {
  html_: null as [string, string] | null,
  template_: null as HTMLTableDataCellElement | DOMParser | null,
  render_: (function (this: {}, request: FgReq[kFgReq.initHelp]): BgReq[kBgReq.showHelpDialog]["h"] {
    const a = this as typeof HelpDialog;
    if (!a.html_
        && (Build.NDEBUG || /** {@link ../pages/loader.ts#updateUI} */Settings_.cache_.helpDialog)) {
      const noShadow = !( (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
          && Settings_.CONST_.StyleCacheId_.indexOf("s") < 0,
      template = Settings_.cache_.helpDialog as string,
      noContain = Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
          && CurCVer_ === BrowserVer.CSS$Contain$BreaksHelpDialogSize;
      let pos = template.indexOf("</style>") + 8, head = template.slice(0, pos), body = template.slice(pos).trim();
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        const arr = head.match("<style.*?>") as RegExpMatchArray;
        body = head.slice(0, arr.index).trim() + body;
        head = head.slice(arr.index + arr[0].length, -8);
      }
      if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
          && noShadow
          || Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
              && noContain) {
        if (Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
            && noContain) {
          head = head.replace(<RegExpG> /contain:\s?[\w\s]+/g, "contain: none !important");
        }
        if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
              && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
              && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
            && noShadow) {
          head = head.replace(<RegExpG> /[#.][A-Z]/g, "#VimiumUI $&"
            ).replace("HelpAdvanced #VimiumUI .HelpAdv", "HelpAdvanced .HelpAdv");
        }
        Settings_.set_("helpDialog", "");
      }
      a.html_ = [head, body];
    }
    BgUtils_.safer_(request);
    const commandToKeys = BgUtils_.safeObj_<Array<[string, CommandsNS.Item]>>(),
    ref = CommandsData_.keyToCommandRegistry_, hideUnbound = !request.b, showNames = !!request.n;
    for (const key in ref) {
      const registry = ref[key] as NonNullable<(typeof ref)[string]>;
      let command = registry.command_;
      if (command.endsWith(".activateMode")) {
        command = command.slice(0, -4);
      } else if (command.indexOf("EditUrl") > 0) {
        command = command.replace("EditUrl", "Url");
      } else if (command === kShortcutAliases.nextTab1) {
        command = kShortcutNames.nextTab;
      }
      (commandToKeys[command] || (commandToKeys[command] = [])).push([key, registry]);
    }
    const result = BgUtils_.safer_<Dict<string>>({
      homePage: Settings_.CONST_.HomePage_,
      version: Settings_.CONST_.VerName_,
      title: request.t ? "Command Listing" : "Help",
      reviewPage: (!(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
            ? BuildStr.FirefoxAddonPage : BuildStr.ChromeWebStorePage
          ).replace("$id", chrome.runtime.id),
      webStore: !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? "Firefox Add-ons" : "Web Store",
      tip: showNames ? "Tip: click command names to copy them to the clipboard." : "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    });
    const html = (a as Ensure<typeof a, "html_">).html_, div = html[1].replace(
        <RegExpSearchable<1>> /\{\{(\w+)}}/g, function (_, group: string) {
      let s = result[group];
      return s != null ? s
        : HelpDialog.groupHtml_(group, commandToKeys, hideUnbound, showNames);
    });
    a.template_ = null;
    return Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        ? { h: html[0], b: div } : html[0] + div;
  }) as BaseHelpDialog["render_"],
  groupHtml_: (function (this: {}, group: string, commandToKeys: SafeDict<Array<[string, CommandsNS.Item]>>
      , hideUnbound: boolean, showNames: boolean): string {
    const renderItem = (this as typeof HelpDialog).commandHtml_
      , secondDescriptions = (this as typeof HelpDialog).descriptions
      , firstDescriptions = CommandsData_.cmdDescriptions_;
    let html = "";
    for (const command of (this as typeof HelpDialog).commandGroups_[group] || []) {
      let keys = commandToKeys[command];
      if (hideUnbound && !keys) { continue; }
      const isAdvanced = command in (this as typeof HelpDialog).advancedCommands_
        , description = secondDescriptions[command] || <string> firstDescriptions[command];
      if (!Build.NDEBUG) {
        if (!description) {
          console.log("Error: lack a description for %c%s", "color:red", command);
        } else if (secondDescriptions[command] && firstDescriptions[command]) {
          console.log("Error: duplicated descriptions for %c%s", "color:red", command);
        }
      }
      let klen = -2, bindings = "";
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">';
        for (const item of keys) {
          const help = item[1].help_ as Partial<CommandsNS.NormalizedCustomHelpInfo> | null;
          help && (this as typeof HelpDialog).normalizeHelpInfo_(help);
          const key = help && help.$key || BgUtils_.escapeText_(item[0]);
          if (help && help.$desc) {
            let singleBinding = `\n\t\t<span class="HelpKey">${key}</span>\n\t`;
            html += renderItem(isAdvanced, singleBinding, help.$desc, showNames ? command : "");
            continue;
          }
          if (klen >= 0) {
            bindings += '</span>, <span class="HelpKey">';
          }
          bindings += key;
          klen += item[0].length + 2;
        }
        bindings += "</span>\n\t";
      }
      if (klen <= 12) {
        html += renderItem(isAdvanced, bindings, description, showNames ? command : "");
      } else {
        html += renderItem(isAdvanced, bindings, "", "");
        html += renderItem(isAdvanced, "", description, showNames ? command : "");
      }
    }
    return html;
  }),
  commandHtml_: (function (this: void, isAdvanced: boolean, bindings: string
      , description: string, command: string): string {
    let html = isAdvanced ? '<tr class="HelpAdv">\n\t' : "<tr>\n\t";
    if (description) {
      html += '<td class="HelpTd HelpKeys">';
      html += bindings;
      html += '</td>\n\t<td class="HelpTd HelpCommandInfo">';
      html += description;
      if (command) {
        html += '\n\t\t<span class="HelpCommandName" role="button">(';
        html += command;
        html += ")</span>\n\t";
      }
    } else {
      html += '<td class="HelpTd HelpKeys HelpLongKeys" colspan="2">';
      html += bindings;
    }
    return html + "</td>\n</tr>\n";
  }),
  normalizeHelpInfo_ (help: Partial<CommandsNS.NormalizedCustomHelpInfo>): void {
    if (help.$key != null) { return; }
    let a = this.template_;
    if (Build.BTypes & ~BrowserType.Firefox && !a) {
      const template = document.createElement("template"),
      td = document.createElement("td");
      template.content.appendChild(td);
      // make `<td>` inert, so that "onclick" won't be parsed
      a = this.template_ = td;
    } else if (!a) {
      a = this.template_ = new DOMParser();
    }
    help.$key = help.key ? this.safeHTML_(help.key, a) : "";
    help.$desc = help.desc ? this.safeHTML_(help.desc, a) : "";
  },
  // https://support.zendesk.com/hc/en-us/articles/115015895948-Allowing-unsafe-HTML-in-articles
  safeTags: {
    a: 1, abbr: 1, acronym: 1, address: 1, b: 1, big: 1, blockquote: 1, br: 1,
    cite: 1, code: 1, colgroup: 1, dd: 1, del: 1, dfn: 1, div: 1, dl: 1, dt: 1,
    em: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1, id: 1, img: 1,
    ins: 1, kbd: 1, li: 1, ol: 1, p: 1, pre: 1, samp: 1, small: 1, span: 1,
    strong: 1, sub: 1, sup: 1, table: 1, tbody: 1, td: 1, tfoot: 1, th: 1,
    thead: 1, tr: 1, tt: 1, u: 1, ul: 1, var: 1,
    __proto__: null as never
  } as SafeEnum,
  _invalidAttrNameRe: <RegExpI> /^on|[^0-9a-z\-]|href$/i,
  safeHTML_ (raw: string, parent: HTMLTableDataCellElement | HTMLBodyElement | DOMParser): string {
    type ParentElement = Exclude<typeof parent, DOMParser>;
    if (Build.BTypes & ~BrowserType.Firefox) {
      (parent as ParentElement).innerHTML = raw;
    } else {
      parent = (parent as DOMParser).parseFromString(`<td>${raw}</td>`, "text/html"
          ).body.firstChild as HTMLTableDataCellElement;
      if (!parent) { return ""; }
    }
    for (let arr = (parent as ParentElement).querySelectorAll("*"), i = 0, end = arr.length; i < end; i++) {
      const el = arr[i];
      if (!((Build.BTypes & ~BrowserType.Firefox ? el.tagName + "" : el.tagName as string
            ).toLowerCase() in this.safeTags)
          && !(el instanceof HTMLUnknownElement)) {
        el.remove();
        continue;
      }
      const attrsToRemove = [] as Attr[];
      for (let attrs = el.attributes, len2 = attrs.length, j = 0; j < len2; j++) {
        const attrName = attrs[j].name.toLowerCase();
        if (this._invalidAttrNameRe.test(attrName)) {
          attrsToRemove.push(attrs[j]);
        }
      }
      for (let attr of attrsToRemove) {
        el.removeAttributeNode(attr);
      }
    }
    return (parent as ParentElement).innerHTML;
  },
  commandGroups_: { __proto__: null as never,
    pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
      , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
      , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
      , "scrollFullPageDown", "scrollFullPageUp", "reload", "reloadTab", "reloadGivenTab"
      , "toggleViewSource"
      , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
      , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
      , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
      , "focusInput", "LinkHints.activate", "LinkHints.activateModeToOpenInNewTab"
      , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
      , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
      , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
      , "LinkHints.activateModeToHover", "LinkHints.activateModeToLeave", "LinkHints.unhoverLast"
      , "LinkHints.activateModeToSearchLinkText", "LinkHints.activateModeToEdit"
      , "goPrevious", "goNext", "nextFrame", "mainFrame", "parentFrame"
      , "enterInsertMode", "enterVisualMode", "enterVisualLineMode"
      , "Marks.activateCreateMode", "Marks.activate"
      , "Marks.clearLocal", "Marks.clearGlobal", "openUrl", "focusOrLaunch"
      ],
    vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
      , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
      , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabSelection"
      , "Vomnibar.activateUrl", "Vomnibar.activateUrlInNewTab"
      , "LinkHints.activateModeToOpenVomnibar", "toggleVomnibarStyle"],
    historyNavigation: ["goBack", "goForward", "reopenTab"],
    findCommands: ["enterFindMode", "performFind", "performBackwardsFind", "performAnotherFind", "clearFindHistory"],
    tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
      , "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab", "discardTab", "moveTabToNextWindow"
      , "moveTabToNewWindow", "moveTabToIncognito", "togglePinTab", "toggleMuteTab", "visitPreviousTab"
      , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
      , "enableCSTemp", "toggleCS", "clearCS"],
    misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "searchInAnother", "toggleLinkHintCharacters"
      , "toggleSwitchTemp", "passNextKey", "debugBackground", "blank"]
  } as Readonly< EnsuredSafeDict<ReadonlyArray<string>> >,
  advancedCommands_: { __proto__: null as never,
    toggleViewSource: 1, clearFindHistory: 1
    , scrollToLeft: 1, scrollToRight: 1, moveTabToNextWindow: 1
    , moveTabToNewWindow: 1, moveTabToIncognito: 1, reloadGivenTab: 1, focusOrLaunch: 1
    , goUp: 1, goToRoot: 1, focusInput: 1, "LinkHints.activateModeWithQueue": 1, enableCSTemp: 1
    , toggleCS: 1, clearCS: 1, "LinkHints.activateModeToDownloadImage": 1, reopenTab: 1
    , "LinkHints.activateModeToOpenImage": 1, removeRightTab: 1
    , "LinkHints.activateModeToDownloadLink": 1, restoreGivenTab: 1
    , discardTab: 1
    , "LinkHints.activateModeToOpenIncognito": 1, passNextKey: 1
    , goNext: 1, goPrevious: 1, "Marks.clearLocal": 1, "Marks.clearGlobal": 1
    , moveTabLeft: 1, moveTabRight: 1, closeTabsOnLeft: 1, closeTabsOnRight: 1, closeOtherTabs: 1
    , scrollPxDown: 1, scrollPxUp: 1, scrollPxLeft: 1, scrollPxRight: 1, debugBackground: 1, blank: 1
    , "LinkHints.activateModeToHover": 1, "LinkHints.unhoverLast": 1
    , toggleLinkHintCharacters: 1, toggleSwitchTemp: 1, "LinkHints.activateModeToLeave": 1
    , "Vomnibar.activateUrl": 1, "Vomnibar.activateUrlInNewTab": 1
  } as SafeEnum,
  descriptions: { __proto__: null as never,
    "LinkHints.activate": `Open a link in the current tab (use button=""/"right"${
        Build.BTypes & BrowserType.Chrome ? ', touch="auto"/true/false' : ""
      })`,
    "LinkHints.activateMode": "Open a link in the current tab",
    "LinkHints.activateModeToCopyLinkText": "Copy a link text to the clipboard",
    "LinkHints.activateModeToCopyLinkUrl": "Copy a link URL to the clipboard",
    "LinkHints.activateModeToDownloadImage": "Download image",
    "LinkHints.activateModeToDownloadLink": "Download link URL",
    "LinkHints.activateModeToEdit": "Select an editable area",
    "LinkHints.activateModeToHover": "select an element and hover",
    "LinkHints.activateModeToLeave": "let mouse leave link",
    "LinkHints.activateModeToOpenImage": "Show image in a new tab (use auto=true)",
    "LinkHints.activateModeToOpenIncognito": "Open a link in incognito window",
    "LinkHints.activateModeToOpenInNewForegroundTab": "Open a link in a new tab and switch to it",
    "LinkHints.activateModeToOpenInNewTab": "Open a link in a new tab",
    "LinkHints.activateModeToOpenVomnibar": "Edit a link text on Vomnibar (use url, newtab)",
    "LinkHints.activateModeToSearchLinkText": "Open or search a link text",
    "LinkHints.activateModeWithQueue": "Open multiple links in a new tab",
    "LinkHints.unhoverLast": "Stop hovering at last location",
    "Marks.activate": "Go to a mark (use prefix=true, swap)",
    "Marks.activateCreateMode": "Create a new mark (use swap)",
    "Marks.clearGlobal": "Remove all global marks",
    "Marks.clearLocal": "Remove all local marks for this site",
    "Vomnibar.activate": 'Open URL, bookmark, or history entry<br/> (use keyword="", url=false/true/&lt;string&gt;)',
    "Vomnibar.activateBookmarks": "Open a bookmark",
    "Vomnibar.activateBookmarksInNewTab": "Open a bookmark in a new tab",
    "Vomnibar.activateEditUrl": "Edit the current URL",
    "Vomnibar.activateEditUrlInNewTab": "Edit the current URL and open in a new tab",
    "Vomnibar.activateHistory": "Open a history",
    "Vomnibar.activateHistoryInNewTab": "Open a history in a new tab",
    "Vomnibar.activateInNewTab": "Open URL, history, etc,<br/> in a new tab (use keyword, url)",
    "Vomnibar.activateTabSelection": "Search through your open tabs",
    "Vomnibar.activateUrl": "Edit the current URL",
    "Vomnibar.activateUrlInNewTab": "Edit the current URL and open in a new tab",
    autoCopy: "Copy selected text or current frame's title or URL (use url, decoded)",
    autoOpen: "Open selected or copied text in a new tab",
    blank: "Do nothing",
    clearCS: "clear extension's content settings (use type=images)",
    clearFindHistory: "Clear find mode history",
    clearGlobalMarks: "Remove all global marks (deprecated)",
    closeOtherTabs: "Close all other tabs",
    closeTabsOnLeft: "Close tabs on the left",
    closeTabsOnRight: "Close tabs on the right",
    copyCurrentTitle: "Copy current tab's title",
    copyCurrentUrl: "Copy page's info (use type=url/frame, decoded)",
    debugBackground: "Debug the background page",
    enableCSTemp: "enable the site's CS in incognito window (use type=images)",
    enterFindMode: "Enter find mode (use last, selected=true)",
    enterInsertMode: "Enter insert mode (use code=27, stat=0)",
    enterVisualLineMode: "Enter visual line mode",
    enterVisualMode: "Enter visual mode",
    firstTab: "Go to the first N-th tab",
    focusInput:
      'Focus the N-th visible text box on the page and cycle using tab (use keep, select=""/all/all-line/start/end)',
    focusOrLaunch: 'focus a tab with given URL or open it (use url="", prefix)',
    goBack: "Go back in history",
    goForward: "Go forward in history",
    goNext: "Follow the link labeled next or &gt;",
    goPrevious: "Follow the link labeled previous or &lt;",
    goToRoot: "Go to root of current URL hierarchy",
    goUp: "Go up the URL hierarchy (use trailing_slash=null/&lt;boolean&gt;)",
    lastTab: "Go to the last N-th tab",
    mainFrame: "Select the tab's main/top frame",
    moveTabLeft: "Move tab to the left",
    moveTabRight: "Move tab to the right",
    moveTabToIncognito: "Make tab in incognito window",
    moveTabToNextWindow: "Move tab to next window (use right)",
    nextFrame: "Cycle forward to the next frame on the page",
    nextTab: "Go one tab right",
    openCopiedUrlInCurrentTab: "Open the clipboard's URL in the current tab",
    parentFrame: "Focus a parent frame",
    passNextKey: "Pass the next key(s) to the page (use normal)",
    performAnotherFind: "Find the second or even eariler query words",
    performBackwardsFind: "Cycle backward to the previous find match",
    performFind: "Cycle forward to the next find match",
    previousTab: "Go one tab left",
    quickNext: "Go one tab right",
    reload: "Reload current frame (use hard)",
    reloadGivenTab: "Reload N-th tab (use hard)",
    removeRightTab: "Close N-th tab on the right",
    reopenTab: "Reopen current page",
    restoreGivenTab: "Restore the last N-th tab",
    scrollDown: "Scroll down",
    scrollFullPageDown: "Scroll a full page down",
    scrollFullPageUp: "Scroll a full page up",
    scrollLeft: "Scroll left",
    scrollPageDown: "Scroll a page down",
    scrollPageUp: "Scroll a page up",
    scrollPxDown: "Scroll 1px down",
    scrollPxLeft: "Scroll 1px left",
    scrollPxRight: "Scroll 1px right",
    scrollPxUp: "Scroll 1px up",
    scrollRight: "Scroll right",
    scrollTo: "Scroll to custom position",
    scrollToBottom: "Scroll to the bottom of the page",
    scrollToLeft: "Scroll all the way to the left",
    scrollToRight: "Scroll all the way to the right",
    scrollToTop: "Scroll to the top of the page",
    scrollUp: "Scroll up",
    searchAs: "Search selected or copied text using current search engine (use copied=true, selected=true)",
    searchInAnother: "Redo search in another search engine (use keyword, reuse=0)",
    showHelp: "Show help",
    simBackspace: "simulate backspace for once if focused",
    switchFocus: "blur activeElement or refocus it",
    toggleCS: "turn on/off the site's CS (use type=images)",
    toggleLinkHintCharacters: "Toggle the other link hints (use value)",
    toggleMuteTab: "Mute or unmute current tab (use all, other)",
    toggleSwitchTemp: "Toggle switch only on current page (use key[, value])",
    toggleViewSource: "View page source",
    toggleVomnibarStyle: "Toggle style(s) of vomnibar page (use style=dark, current)",
    visitPreviousTab: "Go to previously-visited tab on current window"
  } as ReadonlySafeDict<string>
};
