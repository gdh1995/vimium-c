// eslint-disable-next-line no-var
var HelpDialog = {
  html_: null as [string, string] | null,
  template_: null as HTMLTableDataCellElement | DOMParser | null,
  render_: (function (this: {}, isOptionsPage: boolean): ReturnType<BaseHelpDialog["render_"]> {
    const a = this as typeof HelpDialog;
    if (!a.html_
        || !Build.NDEBUG && /** {@link ../pages/loader.ts#updateUI} */Settings_.cache_.helpDialog) {
      const noShadow = !( (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
          && !(Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                ? window.ShadowRoot || document.documentElement!.webkitCreateShadowRoot : window.ShadowRoot),
      template = Settings_.cache_.helpDialog!,
      noContain = Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
          && CurCVer_ === BrowserVer.CSS$Contain$BreaksHelpDialogSize;
      let pos = template.indexOf("</style>") + 8, head = template.slice(0, pos), body = template.slice(pos).trim();
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)) {
        const arr = head.match(<RegExpOne> /<style.*?>/)!;
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
          head = head.replace(<RegExpG> /[#.][A-Z][^,{};]*[,{]/g, "#VimiumUI $&");
        }
        Settings_.set_("helpDialog", "");
      }
      body = body.replace(<RegExpG & RegExpSearchable<1>> /\$(\w+)/g
          , (_, s) => trans_(s) || (s[0] === "_" || s === "NS" ? "" : s))
      const consts = BgUtils_.safer_<Dict<string>>({
      homePage: Settings_.CONST_.HomePage_,
      version: Settings_.CONST_.VerName_,
      release: BgUtils_.convertToUrl_("vimium://release"),
      reviewPage: !(Build.BTypes & ~BrowserType.Firefox)
              || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? GlobalConsts.FirefoxAddonPrefix + "vimium-c/reviews/?src=external-help-dialog"
          : (Build.BTypes & BrowserType.Chrome && IsEdg_
              ? GlobalConsts.EdgStorePage : GlobalConsts.ChromeWebStorePage).replace("$id", chrome.runtime.id),
      webStore: !(Build.BTypes & ~BrowserType.Firefox)
            || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
          ? trans_("addons") : trans_(IsEdg_ ? "edgestore" : "webstore"),
      browserHelp: !(Build.BTypes & ~BrowserType.Firefox)
          || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox ? GlobalConsts.FirefoxHelp as string
          : Build.BTypes & BrowserType.Chrome && IsEdg_ ? GlobalConsts.EdgHelp
          : GlobalConsts.ChromeHelp
      });
      body = body.replace(<RegExpSearchable<1>> /\{\{(\w+)}}/g, (_, group: string) => consts[group] || _);
      a.html_ = [head, body];
    }
    const commandToKeys = new Map<string, [string, CommandsNS.BaseItem][]>(),
    ref = CommandsData_.keyToCommandRegistry_, hideUnbound = !isOptionsPage, showNames = isOptionsPage;
    ref.forEach((registry, key): void => {
      let command: string = registry.command_;
      if (command.endsWith(".activateMode")) {
        command = command.slice(0, -4);
      } else if (command.endsWith("GotoMode")) {
      } else if (command.endsWith("Leave")) {
        command = command.slice(0, -5) + "Unhover";
      } else if (command.includes("EditUrl")) {
        command = command.replace("EditUrl", "Url");
      } else if (command === <string> <unknown> kShortcutAliases.nextTab1) {
        command = CNameLiterals.nextTab;
      } else if (command === CNameLiterals.newTab) {
        command = CNameLiterals.createTab
      }
      let keys = commandToKeys.get(command)
      keys || commandToKeys.set(command, keys = [])
      keys.push([key, registry])
    })
    const result = BgUtils_.safer_<Dict<string>>({
      className: Settings_.payload_.d,
      title: trans_(isOptionsPage ? "cmdList" : "help"),
      tip: showNames ? trans_("tipClickToCopy")  : "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    });
    const html = a.html_, div = html[1].replace(
        <RegExpSearchable<1>> /\{\{(\w+)}}/g, function (_, group: string) {
      let s = result[group];
      return s != null ? s
        : HelpDialog.groupHtml_(group, commandToKeys, hideUnbound, showNames);
    });
    a.template_ = null;
    return Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        ? { h: html[0], b: div } : (html[0].replace("{{className}}", Settings_.payload_.d) + div) as any as "html"
  }) as BaseHelpDialog["render_"],
  // eslint-disable-next-line object-shorthand
  groupHtml_: (function (this: {}, group: string, commandToKeys: Map<string, [string, CommandsNS.BaseItem][]>
      , hideUnbound: boolean, showNames: boolean): string {
    const a = this as typeof HelpDialog;
    const renderItem = a.commandHtml_
      , cmdParams = trans_("cmdParams")
      , cachedDescriptions = a.descriptions_;
    let html = "";
    for (const command of a.commandGroups_[group]) {
      let keys = commandToKeys.get(command)
      if (hideUnbound && !keys) { continue; }
      const isAdvanced = a.advancedCommands_[command] === 1;
      let keyLen = -2, bindings = "", description = cachedDescriptions.get(command)
      if (!description) {
        let key = command.replace(".", "_"), params = trans_(key + "_p");
        description = trans_(key).replace("<", "&lt;").replace(">", "&gt;") // lgtm [js/incomplete-sanitization]
            + (params ? cmdParams.replace("*", params) : " "); // lgtm [js/incomplete-sanitization]
        cachedDescriptions.set(command, description)
        if (!(Build.NDEBUG || description)) {
          console.log("Assert error: lack a description for %c%s", "color:red", command);
        }
      }
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">';
        for (const item of keys) {
          const help = item[1].help_ as Partial<CommandsNS.NormalizedCustomHelpInfo> | null;
          help && a.normalizeHelpInfo_(help);
          const key = help && help.$key_ || BgUtils_.escapeText_(item[0]), desc2 = help && help.$desc_;
          if (desc2) {
            let singleBinding = `\n\t\t<span class="HelpKey">${key}</span>\n\t`;
            html += renderItem(isAdvanced, singleBinding, showNames ? desc2 + " " : desc2, showNames ? command : "");
            continue;
          }
          if (keyLen >= 0) {
            bindings += '</span> <span class="HelpKey">';
          }
          bindings += key;
          keyLen += item[0].length + 2;
        }
        bindings += "</span>\n\t";
      }
      // keep rendering if not hideUnbound
      if (keyLen <= 12) {
        html += renderItem(isAdvanced, bindings, description, showNames ? command : "");
      } else {
        html += renderItem(isAdvanced, bindings, "", "");
        html += renderItem(isAdvanced, "", description, showNames ? command : "");
      }
    }
    return html;
  }),
  commandHtml_: ((isAdvanced: boolean, bindings: string, description: string, command: string): string => {
    let html = isAdvanced ? '<tr class="HelpAdv">\n\t' : "<tr>\n\t";
    if (description) {
      html += '<td class="HelpTd HelpKeys">';
      html += bindings;
      html += '</td>\n\t<td class="HelpTd HelpCommandInfo">';
      html += description;
      if (command) {
        html += '<span class="HelpCommandName" role="button">(';
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
    if (help.$key_ != null) { return; }
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
    help.$key_ = help.key_ ? this.safeHTML_(help.key_, a) : "";
    help.$desc_ = help.desc_ ? this.safeHTML_(help.desc_, a) : "";
  },
  // https://support.zendesk.com/hc/en-us/articles/115015895948-Allowing-unsafe-HTML-in-articles
  _safeTags: {
    a: 1, abbr: 1, acronym: 1, address: 1, b: 1, big: 1, blockquote: 1, br: 1,
    cite: 1, code: 1, colgroup: 1, dd: 1, del: 1, dfn: 1, div: 1, dl: 1, dt: 1,
    em: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, hr: 1, i: 1, id: 1, img: 1,
    ins: 1, kbd: 1, li: 1, ol: 1, p: 1, pre: 1, samp: 1, small: 1, span: 1,
    strong: 1, sub: 1, sup: 1, table: 1, tbody: 1, td: 1, tfoot: 1, th: 1,
    thead: 1, tr: 1, tt: 1, u: 1, ul: 1, var: 1,
    svg: 1, path: 1,
    __proto__: null as never
  } as SafeEnum,
  safeHTML_ (raw: string, root: HTMLTableDataCellElement | HTMLBodyElement | DOMParser): string {
    type RootElement = Exclude<typeof root, DOMParser>;
    if (Build.BTypes & ~BrowserType.Firefox) {
      (root as RootElement).innerHTML = raw;
    } else {
      root = (root as DOMParser).parseFromString(`<td>${raw}</td>`, "text/html"
          ).body.firstChild as HTMLTableDataCellElement;
      if (!root) { return ""; }
    }
    for (let arr = (root as RootElement).querySelectorAll("*"), i = 0, end = arr.length; i < end; i++) {
      const el = arr[i];
      // here force to match ignoring cases - safer
      if (!((Build.BTypes & ~BrowserType.Firefox ? el.localName + "" : el.localName as string
            ) in this._safeTags)
          && !(el instanceof HTMLUnknownElement)) {
        el.remove();
        continue;
      }
      const attrsToRemove: Attr[] = [];
      for (let attrs = el.attributes, len2 = attrs.length, j = 0; j < len2; j++) {
        const attrName = attrs[j].name.toLowerCase();
        if ((<RegExpI> /^on|[^\w\-]|href$|^is/i).test(attrName)) {
          attrsToRemove.push(attrs[j]);
        }
      }
      for (let attr of attrsToRemove) {
        el.removeAttributeNode(attr);
      }
    }
    return (root as RootElement).innerHTML;
  },
  commandGroups_: As_<{ readonly [key: string]: readonly (kCName)[] } & SafeObject>({
    __proto__: null as never,
    pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
      , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
      , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
      , "scrollFullPageDown", "scrollFullPageUp", "scrollSelect"
      , "reload", "reloadTab", "reloadGivenTab"
      , "zoomIn", "zoomOut", "toggleViewSource"
      , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
      , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
      , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
      , "focusInput", "LinkHints.activate", "LinkHints.activateModeToOpenInNewTab"
      , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
      , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
      , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
      , "LinkHints.activateModeToHover", "LinkHints.activateModeToLeave", "LinkHints.unhoverLast"
      , "LinkHints.activateModeToSearchLinkText", "LinkHints.activateModeToEdit"
      , "LinkHints.activateModeToSelect"
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
    findCommands: ["enterFindMode", "performFind", "performBackwardsFind", "performAnotherFind"
      , "clearFindHistory"],
    tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab"
      , "duplicateTab", "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab"
      , "discardTab", "moveTabToNextWindow", "moveTabToNewWindow", "moveTabToIncognito"
      , "joinTabs"
      , "togglePinTab", "toggleMuteTab", "visitPreviousTab", "closeTabsOnLeft"
      , "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
      , "enableCSTemp", "toggleCS", "clearCS", "copyWindowInfo", "captureTab"],
    misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "searchInAnother"
      , "addBookmark"
      , "toggleStyle", "toggleLinkHintCharacters"
      , "toggleSwitchTemp", "passNextKey", "debugBackground", "closeDownloadBar"
      , "sendToExtension", "runKey", "blank"]
  }),
  advancedCommands_: As_<{ readonly [k in kCName]?: 1 | 0; } & SafeObject>({ __proto__: null as never,
    toggleViewSource: 1, clearFindHistory: 1
    , scrollToLeft: 1, scrollToRight: 1, moveTabToNextWindow: 1
    , moveTabToNewWindow: 1, moveTabToIncognito: 1, reloadGivenTab: 1
    , focusOrLaunch: 1
    , goUp: 1, goToRoot: 1, focusInput: 1, "LinkHints.activateModeWithQueue": 1
    , enableCSTemp: 1, toggleCS: 1, toggleStyle: 1, clearCS: 1
    , "LinkHints.activateModeToDownloadImage": 1, reopenTab: 1
    , "LinkHints.activateModeToOpenImage": 1, removeRightTab: 1
    , "LinkHints.activateModeToDownloadLink": 1, restoreGivenTab: 1, runKey: 1, sendToExtension: 1
    , discardTab: 1, copyWindowInfo: 1
    , "LinkHints.activateModeToOpenIncognito": 1, passNextKey: 1
    , goNext: 1, goPrevious: 1, "Marks.clearLocal": 1, "Marks.clearGlobal": 1
    , moveTabLeft: 1, moveTabRight: 1, closeTabsOnLeft: 1, closeTabsOnRight: 1
    , closeOtherTabs: 1, scrollPxDown: 1, scrollPxUp: 1, scrollPxLeft: 1
    , scrollPxRight: 1, debugBackground: 1, blank: 1
    , "LinkHints.activateModeToHover": 1, "LinkHints.unhoverLast": 1
    , toggleLinkHintCharacters: 1, toggleSwitchTemp: 1, "LinkHints.activateModeToLeave": 1
    , "Vomnibar.activateUrl": 1, "Vomnibar.activateUrlInNewTab": 1
    , closeDownloadBar: Build.BTypes & BrowserType.Chrome ? 0 : 1
  }),
  descriptions_: new Map<kCName, string>()
};
if (Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
    || Build.BTypes & BrowserType.Chrome && IsEdg_) {
  (HelpDialog.commandGroups_.tabManipulation as Writable<typeof HelpDialog.commandGroups_.tabManipulation>
      ).push("toggleReaderMode")
}
