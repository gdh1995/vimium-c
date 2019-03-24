var HelpDialog = {
  inited_: false,
  templateEl_: null as HTMLTableDataCellElement | null,
  render_: (function (this: void, request: FgReq[kFgReq.initHelp]): string {
    if (!HelpDialog.inited_) {
      const noShadow = (Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinShadowDOMV0)
          && Settings.CONST_.StyleCacheId_.split(",", 2)[1].indexOf("s") < 0,
      noContain = Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
          && ChromeVer === BrowserVer.CSS$Contain$BreaksHelpDialogSize;
      if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinShadowDOMV0) && noShadow
          || Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
              && noContain) {
        let template = Settings.cache_.helpDialog as string, styleEnd = template.indexOf("</style>"),
        left = template.substring(0, styleEnd), right = template.substring(styleEnd);
        if (Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize && Build.BTypes & BrowserType.Chrome
            && noContain) {
          left = left.replace(<RegExpG> /contain:\s?[\w\s]+/g, "contain: none !important");
        }
        if ((Build.BTypes & ~BrowserType.Chrome || Build.MinCVer < BrowserVer.MinShadowDOMV0) && noShadow) {
          left = left.replace(<RegExpG> /[#.][A-Z]/g, "#VimiumUI $&"
            ).replace("HelpAdvanced #VimiumUI .HelpAdv", "HelpAdvanced .HelpAdv");
        }
        Settings.set_("helpDialog", left + right);
      }
      HelpDialog.inited_ = true;
    }
    Object.setPrototypeOf(request, null);
    const commandToKeys = Object.create<Array<[string, CommandsNS.Item]>>(null),
    ref = CommandsData_.keyToCommandRegistry_, hideUnbound = !request.b, showNames = !!request.n;
    for (const key in ref) {
      const registry = ref[key] as NonNullable<(typeof ref)[string]>;
      let command = registry.command;
      if (command.endsWith(".activateMode")) {
        command = command.substring(0, command.length - 4);
      } else if (command.indexOf("EditUrl") > 0) {
        command = command.replace("EditUrl", "Url");
      } else if (command === "quickNext") {
        command = "nextTab";
      }
      (commandToKeys[command] || (commandToKeys[command] = [])).push([key, registry]);
    }
    const result = Object.setPrototypeOf({
      homePage: Settings.CONST_.HomePage_,
      version: Settings.CONST_.VerName_,
      title: request.t || "Help",
      tip: showNames ? "Tip: click command names to copy them to the clipboard." : "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    }, null) as SafeDict<string>;
    const html = (<string> Settings.cache_.helpDialog).replace(
        <RegExpSearchable<1>> /\{\{(\w+)}}/g, function (_, group: string) {
      let s = result[group];
      return s != null ? s
        : HelpDialog.groupHtml_(group, commandToKeys, hideUnbound, showNames);
    });
    HelpDialog.templateEl_ = null;
    return html;
  }) as BaseHelpDialog["render_"],
  groupHtml_: (function (this: {}, group: string, commandToKeys: SafeDict<Array<[string, CommandsNS.Item]>>
      , hideUnbound: boolean, showNames: boolean): string {
    const renderItem = (this as typeof HelpDialog).commandHtml_
      , availableCommands = CommandsData_.availableCommands_ as Readonly<EnsuredSafeDict<CommandsNS.Description>>;
    let html = "";
    for (const command of (this as typeof HelpDialog).commandGroups_[group] || []) {
      let keys = commandToKeys[command];
      if (hideUnbound && !keys) { continue; }
      const isAdvanced = command in (this as typeof HelpDialog).advancedCommands_
        , description = availableCommands[command][0];
      let klen = -2, bindings = "";
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">';
        for (const item of keys) {
          const help = item[1].help as Partial<CommandsNS.NormalizedCustomHelpInfo> | null;
          help && (this as typeof HelpDialog).normalizeHelpInfo_(help);
          const key = help && help.$key || Utils.escapeText_(item[0]);
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
    let a = this.templateEl_;
    a || (a = this.templateEl_ = document.createElement("td"));
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
  safeHTML_ (raw: string, parent: HTMLElement): string {
    parent.innerHTML = raw;
    for (let arr = parent.querySelectorAll("*"), i = 0, end = arr.length; i < end; i++) {
      const el = arr[i];
      if (el instanceof HTMLFormElement || el instanceof HTMLFrameSetElement) {
        el.remove();
        continue;
      }
      if (!((el.tagName + "").toLowerCase() in this.safeTags) && !(el instanceof HTMLUnknownElement)) {
        el.remove();
        continue;
      }
      const attrsToRemove = [] as Attr[];
      for (let attrs = el.attributes, len2 = attrs.length, j = 0; j < len2; j++) {
        const attrName = attrs[j].name.toLowerCase();
        if (attrName.startsWith("on") || attrName.indexOf(":on") >= 0 || attrName.endsWith("href")) {
          attrsToRemove.push(attrs[j]);
        }
      }
      for (let attr of attrsToRemove) {
        el.removeAttributeNode(attr);
      }
    }
    return parent.innerHTML;
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
    findCommands: ["enterFindMode", "performFind", "performBackwardsFind", "clearFindHistory"],
    tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
      , "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab", "moveTabToNextWindow"
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
    , "LinkHints.activateModeToOpenIncognito": 1, passNextKey: 1
    , goNext: 1, goPrevious: 1, "Marks.clearLocal": 1, "Marks.clearGlobal": 1
    , moveTabLeft: 1, moveTabRight: 1, closeTabsOnLeft: 1, closeTabsOnRight: 1, closeOtherTabs: 1
    , scrollPxDown: 1, scrollPxUp: 1, scrollPxLeft: 1, scrollPxRight: 1, debugBackground: 1, blank: 1
    , "LinkHints.activateModeToHover": 1, "LinkHints.unhoverLast": 1
    , toggleLinkHintCharacters: 1, toggleSwitchTemp: 1, "LinkHints.activateModeToLeave": 1
    , "Vomnibar.activateUrl": 1, "Vomnibar.activateUrlInNewTab": 1
  } as SafeEnum
};
